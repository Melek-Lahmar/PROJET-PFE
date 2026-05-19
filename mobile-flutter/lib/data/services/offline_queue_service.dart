import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import 'backend_health_service.dart';

/// Section 2.15 — Service de queue offline unifié (livreur + client).
///
/// Toutes les actions métier qui modifient le serveur passent par ce service :
///  1. Si BackendHealth.healthy → envoi direct
///  2. Si KO → enqueue dans Hive avec X-Client-Action-Id généré
///  3. UI confirme immédiatement (optimiste)
///  4. Au retour réseau → flush automatique en série
///  5. Après 5 retries persistants → escalade utilisateur
///
/// PAS de support photo binaire ici (cas spécial photos_queue).
class OfflineQueueService extends ChangeNotifier {
  static const _boxName = 'offline_actions_v1';
  final ApiClient _api;
  final BackendHealthService _health;
  Box<Map>? _box;
  bool _flushing = false;
  Timer? _watcher;
  final _uuid = const Uuid();

  OfflineQueueService(this._api, this._health) {
    _health.addListener(_onHealthChange);
  }

  Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox<Map>(_boxName);
    _watcher?.cancel();
    _watcher = Timer.periodic(const Duration(seconds: 30), (_) => _maybeFlush());
  }

  int get pendingCount => _box?.length ?? 0;
  bool get isFlushing => _flushing;

  /// Appelée par chaque service métier. Si réseau OK, tente l'appel direct.
  /// Sinon enqueue. Retourne le ClientActionId pour traçabilité.
  Future<String> enqueueOrSend({
    required String method, // POST, PUT, DELETE
    required String endpoint,
    Map<String, dynamic>? body,
    bool optimistic = true,
  }) async {
    final result = await sendOrQueue(method: method, endpoint: endpoint, body: body);
    return result.actionId;
  }

  /// V2-2 — variante qui retourne le body de réponse parsé quand l'envoi
  /// direct réussit (utile pour les services qui veulent l'objet créé côté
  /// serveur). Quand le payload est mis en queue, `responseBody` est null
  /// et `wasSent` vaut false : le caller doit alors utiliser une instance
  /// optimiste locale.
  Future<OfflineQueueResult> sendOrQueue({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
  }) async {
    final actionId = _uuid.v4();
    final payload = <String, dynamic>{
      'clientActionId': actionId,
      'method': method,
      'endpoint': endpoint,
      'body': body ?? <String, dynamic>{},
      'createdAt': DateTime.now().toIso8601String(),
      'retries': 0,
    };

    if (_health.status == BackendStatus.healthy) {
      try {
        final resp = await _sendAndReturn(payload);
        return OfflineQueueResult(
          actionId: actionId,
          wasSent: true,
          responseBody: resp,
        );
      } catch (_) {
        // fall through to enqueue
      }
    }
    await _box?.put(actionId, payload);
    notifyListeners();
    return OfflineQueueResult(actionId: actionId, wasSent: false);
  }

  Future<void> _send(Map<String, dynamic> payload) async {
    await _sendAndReturn(payload);
  }

  Future<Map<String, dynamic>?> _sendAndReturn(Map<String, dynamic> payload) async {
    final method = (payload['method'] ?? 'POST').toString().toUpperCase();
    final endpoint = payload['endpoint'].toString();
    final body = (payload['body'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    final actionId = payload['clientActionId'].toString();

    // Construit l'URL avec X-Client-Action-Id en header
    final uri = Uri.parse('${_api.baseUrl}$endpoint');
    final token = await _api.tokenStore.readToken();
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Client-Action-Id': actionId,
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final encoded = jsonEncode(body);

    http.Response resp;
    switch (method) {
      case 'PUT':
        resp = await http.put(uri, headers: headers, body: encoded);
        break;
      case 'DELETE':
        resp = await http.delete(uri, headers: headers, body: encoded);
        break;
      case 'POST':
      default:
        resp = await http.post(uri, headers: headers, body: encoded);
        break;
    }

    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception('HTTP ${resp.statusCode}: ${resp.body}');
    }
    if (resp.body.isEmpty) return null;
    try {
      final decoded = jsonDecode(resp.body);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {/* tolère les réponses non-JSON */}
    return null;
  }

  void _onHealthChange() {
    if (_health.status == BackendStatus.healthy && pendingCount > 0) {
      _maybeFlush();
    }
  }

  Future<void> _maybeFlush() async {
    if (_flushing) return;
    if (_box == null || _box!.isEmpty) return;
    if (_health.status != BackendStatus.healthy) return;
    _flushing = true;
    notifyListeners();
    try {
      final entries = _box!.toMap().entries.toList()
        ..sort((a, b) {
          final ax = (a.value['createdAt'] ?? '').toString();
          final bx = (b.value['createdAt'] ?? '').toString();
          return ax.compareTo(bx);
        });
      for (final entry in entries) {
        final data = Map<String, dynamic>.from(entry.value);
        try {
          await _send(data);
          await _box!.delete(entry.key);
          notifyListeners();
        } catch (e) {
          data['retries'] = ((data['retries'] as num?)?.toInt() ?? 0) + 1;
          if ((data['retries'] as int) >= 5) {
            // escalade : suppression et notification
            await _box!.delete(entry.key);
            // ignore: avoid_print
            print('[OfflineQueue] action $entry.key abandonnée après 5 retries : $e');
          } else {
            await _box!.put(entry.key, data);
          }
          break; // Stoppe la cascade pour garder l'ordre
        }
      }
    } finally {
      _flushing = false;
      notifyListeners();
    }
  }

  /// Liste lecture seule pour l'écran SyncQueueScreen.
  List<Map<String, dynamic>> snapshot() {
    if (_box == null) return [];
    return _box!.values
        .map((m) => Map<String, dynamic>.from(m))
        .toList(growable: false);
  }

  @override
  void dispose() {
    _health.removeListener(_onHealthChange);
    _watcher?.cancel();
    super.dispose();
  }
}

/// V2-2 — résultat d'un appel `sendOrQueue` : indique si l'envoi a réussi
/// directement (et fournit le body côté serveur), ou s'il a été mis en
/// queue offline (le caller doit alors construire une instance optimiste).
class OfflineQueueResult {
  final String actionId;
  final bool wasSent;
  final Map<String, dynamic>? responseBody;

  const OfflineQueueResult({
    required this.actionId,
    required this.wasSent,
    this.responseBody,
  });
}
