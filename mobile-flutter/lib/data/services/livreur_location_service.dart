import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import 'backend_health_service.dart';
import 'livreur_active_delivery_service.dart';

/// Section 2.14 — Service GPS livreur avec mode hors ligne complet.
///
/// Comportement :
///  - Démarre quand "start-heading" est confirmé côté backend (commande active).
///  - Ping toutes les 15s, accuracy balanced.
///  - Filtrage : ne pas enregistrer si position bougée < 30m.
///  - Si réseau OK → POST /api/livreur/location/ping
///  - Si KO → enqueue Hive (box "gps_positions_queue") et CONTINUE à pinger
///  - Au retour → flush via /location/ping-batch
///
/// Le service ne s'arrête JAMAIS pour cause de réseau. Il s'arrête seulement
/// volontairement (stop-heading, app fermée).
class LivreurLocationService extends ChangeNotifier {
  static const _boxName = 'gps_positions_queue_v1';
  static const _interval = Duration(seconds: 15);
  static const double _movementThresholdMeters = 30;

  final LivreurActiveDeliveryService _api;
  final BackendHealthService _health;
  final Uuid _uuid = const Uuid();

  Box<Map>? _box;
  Timer? _timer;
  Position? _last;
  bool _running = false;

  LivreurLocationService(this._api, this._health);

  bool get isRunning => _running;
  int get pendingCount => _box?.length ?? 0;

  Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox<Map>(_boxName);
    _health.addListener(_onHealth);
  }

  void _onHealth() {
    if (_health.status == BackendStatus.healthy) {
      // ignore: discarded_futures
      _flushBatch();
    }
  }

  Future<void> start() async {
    if (_running) return;

    // 1.A — Permission GPS : ne JAMAIS crasher si refusée, exit propre.
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever ||
          perm == LocationPermission.unableToDetermine) {
        return;
      }
    } catch (_) {
      // Plateforme sans GPS (desktop/test) → on n'active pas le service.
      return;
    }

    _running = true;
    notifyListeners();

    _timer?.cancel();
    _timer = Timer.periodic(_interval, (_) => _capture());
    // capture immédiate
    await _capture();
  }

  Future<void> stop() async {
    _timer?.cancel();
    _timer = null;
    _running = false;
    notifyListeners();
    // flush résiduel (best effort)
    if (_health.status == BackendStatus.healthy) {
      // ignore: discarded_futures
      _flushBatch();
    }
  }

  Future<void> _capture() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        // ignore: deprecated_member_use
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 8),
      );

      // Filtre mouvement
      if (_last != null) {
        final d = Geolocator.distanceBetween(
            _last!.latitude, _last!.longitude, pos.latitude, pos.longitude);
        if (d < _movementThresholdMeters) return;
      }
      _last = pos;

      if (_health.status == BackendStatus.healthy) {
        try {
          await _api.ping(
            lat: pos.latitude,
            lng: pos.longitude,
            accuracy: pos.accuracy,
          );
          return;
        } catch (_) {
          // tombe en queue
        }
      }
      await _enqueue(pos);
    } catch (e) {
      // ignore : on retentera dans 15s
    }
  }

  Future<void> _enqueue(Position pos) async {
    final id = _uuid.v4();
    await _box?.put(id, {
      'lat': pos.latitude,
      'lng': pos.longitude,
      'accuracy': pos.accuracy,
      'capturedAt': DateTime.now().toUtc().toIso8601String(),
      'clientActionId': id,
    });
    notifyListeners();
  }

  Future<void> _flushBatch() async {
    if (_box == null || _box!.isEmpty) return;
    final entries = _box!.toMap().entries.toList()
      ..sort((a, b) {
        final ax = (a.value['capturedAt'] ?? '').toString();
        final bx = (b.value['capturedAt'] ?? '').toString();
        return ax.compareTo(bx);
      });

    final positions = entries
        .map((e) => Map<String, dynamic>.from(e.value))
        .toList();

    try {
      await _api.pingBatch(positions);
      // succès → vide la box
      await _box!.clear();
      notifyListeners();
    } catch (_) {
      // on retentera
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _health.removeListener(_onHealth);
    super.dispose();
  }
}
