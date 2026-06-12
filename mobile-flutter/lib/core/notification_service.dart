import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Notification payload format:
///   `ARRIVAL|<doPiece>`        → livreur arrivé (existant)
///   `CAS|<id>`                 → un cas (Réclamation / Demande)
///   `ORDER|<doPiece>`          → une commande (tracking)
class NotificationService {
  NotificationService._();
  static final NotificationService I = NotificationService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();

  final StreamController<String> _arrivalTapCtrl = StreamController.broadcast();
  final StreamController<int> _casTapCtrl = StreamController.broadcast();
  final StreamController<String> _orderTapCtrl = StreamController.broadcast();

  Stream<String> get onArrivalTap => _arrivalTapCtrl.stream;
  Stream<int> get onCasTap => _casTapCtrl.stream;
  Stream<String> get onOrderTap => _orderTapCtrl.stream;

  bool _inited = false;

  // Phase 10 — Channels Android. Pas d'assets audio embarqués : on s'appuie
  // sur les sons système via l'importance du channel.
  //   cas_urgent   → importance max, son système, bandeau.
  //   cas_standard → importance default, son système léger.
  //   cas_silent   → importance low, silencieux (infos type changement statut).
  static const _chUrgent = AndroidNotificationChannel(
    'cas_urgent',
    'Cas urgents',
    description: 'Cas prioritaires : colis endommagé, refus, seuil tentatives atteint.',
    importance: Importance.max,
  );
  static const _chStandard = AndroidNotificationChannel(
    'cas_standard',
    'Nouveaux cas',
    description: 'Nouveaux cas attribués et réponses client.',
    importance: Importance.defaultImportance,
  );
  static const _chSilent = AndroidNotificationChannel(
    'cas_silent',
    'Mises à jour',
    description: 'Changements de statut et corrections appliquées.',
    importance: Importance.low,
    playSound: false,
  );

  Future<void> init() async {
    if (_inited) return;
    _inited = true;

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');

    const initSettings = InitializationSettings(
      android: androidInit,
    );

    await _plugin.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: _handleTap,
    );

    // Création idempotente des channels système Phase 10 + channel existant
    // Arrivée livreur.
    final androidImpl =
        _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidImpl?.createNotificationChannel(_chUrgent);
    await androidImpl?.createNotificationChannel(_chStandard);
    await androidImpl?.createNotificationChannel(_chSilent);

    // Android 13+ runtime permission
    await androidImpl?.requestNotificationsPermission();
  }

  void _handleTap(NotificationResponse resp) {
    final payload = resp.payload ?? '';
    if (payload.startsWith('ARRIVAL|')) {
      final parts = payload.split('|');
      final doPiece = parts.length >= 2 ? parts[1] : '';
      if (doPiece.isNotEmpty) _arrivalTapCtrl.add(doPiece);
    } else if (payload.startsWith('CAS|')) {
      final parts = payload.split('|');
      final id = parts.length >= 2 ? int.tryParse(parts[1]) ?? 0 : 0;
      if (id > 0) _casTapCtrl.add(id);
    } else if (payload.startsWith('ORDER|')) {
      final parts = payload.split('|');
      final piece = parts.length >= 2 ? parts[1] : '';
      if (piece.isNotEmpty) _orderTapCtrl.add(piece);
    }
  }

  Future<void> showArrival({
    required String doPiece,
    String? title,
    String? body,
  }) async {
    const channelId = 'arrival_channel';
    const channelName = 'Arrivées livraison';
    const channelDesc = 'Notifications quand le livreur arrive à un stop';

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      category: AndroidNotificationCategory.status,
    );

    final details = NotificationDetails(android: androidDetails);

    await _plugin.show(
      id: (doPiece.hashCode & 0x7fffffff),
      title: title ?? 'Arrivée',
      body: body ?? 'Arrivé chez $doPiece — Ouvrir l’app',
      notificationDetails: details,
      payload: 'ARRIVAL|$doPiece',
    );
  }

  /// Phase 10 — Notification urgente (cas prioritaire). Son système fort.
  Future<void> showUrgent({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _show(
      id: id,
      title: title,
      body: body,
      payload: payload,
      channelId: _chUrgent.id,
      channelName: _chUrgent.name,
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
    );
  }

  /// Phase 10 — Notification standard. Son système normal.
  Future<void> showStandard({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _show(
      id: id,
      title: title,
      body: body,
      payload: payload,
      channelId: _chStandard.id,
      channelName: _chStandard.name,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      playSound: true,
    );
  }

  /// Phase 10 — Notification d'information silencieuse (changement de statut,
  /// correction appliquée). Pas de son insistant.
  Future<void> showSilent({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _show(
      id: id,
      title: title,
      body: body,
      payload: payload,
      channelId: _chSilent.id,
      channelName: _chSilent.name,
      importance: Importance.low,
      priority: Priority.low,
      playSound: false,
    );
  }

  Future<void> _show({
    required int id,
    required String title,
    required String body,
    required String channelId,
    required String channelName,
    required Importance importance,
    required Priority priority,
    required bool playSound,
    String? payload,
  }) async {
    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      importance: importance,
      priority: priority,
      playSound: playSound,
      category: AndroidNotificationCategory.message,
    );
    final details = NotificationDetails(android: androidDetails);

    await _plugin.show(
      id: id & 0x7fffffff,
      title: title,
      body: body,
      notificationDetails: details,
      payload: payload,
    );
  }

  void dispose() {
    _arrivalTapCtrl.close();
    _casTapCtrl.close();
    _orderTapCtrl.close();
  }
}
