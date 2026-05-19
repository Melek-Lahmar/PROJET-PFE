import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../../core/constants.dart';

/// État de connexion vu côté app livreur/client.
///
/// - [healthy] : tout va bien.
/// - [degraded] : 5xx ou latence anormale, le backend répond mais mal.
/// - [offline] : pas de réseau ou backend totalement injoignable.
enum BackendStatus { healthy, degraded, offline }

/// Section 1.7.3 — surveille la santé du backend pour basculer l'app
/// en "mode dégradé" sans casser l'expérience livreur (queue locale +
/// idempotence via X-Client-Action-Id côté serveur).
///
/// Les services HTTP appellent [reportSuccess] / [reportFailure] depuis
/// leur intercepteur. Un heartbeat périodique tente de revenir en
/// [BackendStatus.healthy] quand on n'est plus healthy.
class BackendHealthService extends ChangeNotifier {
  BackendStatus _status = BackendStatus.healthy;
  int _consecutiveFailures = 0;
  Timer? _heartbeat;
  final _healthUrl = Uri.parse('$apiBaseUrl/api/health');

  BackendStatus get status => _status;
  int get consecutiveFailures => _consecutiveFailures;

  /// Appelé après chaque réponse 2xx/3xx d'une requête HTTP.
  void reportSuccess() {
    _consecutiveFailures = 0;
    if (_status != BackendStatus.healthy) {
      _status = BackendStatus.healthy;
      notifyListeners();
    }
  }

  /// Appelé après chaque erreur réseau ou réponse 5xx.
  /// Les 4xx ne déclenchent pas de mode dégradé (problème de payload, pas de réseau).
  void reportFailure({bool isNetwork = false, int? statusCode}) {
    final isServer5xx = statusCode != null && statusCode >= 500;
    if (!isNetwork && !isServer5xx) return;

    _consecutiveFailures++;
    if (_consecutiveFailures >= 3) {
      final next = isNetwork ? BackendStatus.offline : BackendStatus.degraded;
      if (_status != next) {
        _status = next;
        notifyListeners();
      }
    }
  }

  /// Démarre un ping périodique (15s) qui vérifie le retour du backend.
  void startHeartbeat() {
    _heartbeat?.cancel();
    _heartbeat = Timer.periodic(const Duration(seconds: 15), (_) async {
      if (_status == BackendStatus.healthy) return;
      try {
        final r = await http
            .get(_healthUrl)
            .timeout(const Duration(seconds: 4));
        if (r.statusCode == 200) {
          reportSuccess();
        }
      } catch (_) {
        // toujours degraded/offline
      }
    });
  }

  @override
  void dispose() {
    _heartbeat?.cancel();
    super.dispose();
  }
}
