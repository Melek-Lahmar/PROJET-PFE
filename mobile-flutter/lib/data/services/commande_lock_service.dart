import 'dart:convert';

import '../../core/api_client.dart';
import '../../models/commande_lock.dart';

/// Résultat d'une tentative d'acquisition de verrou.
/// Si [acquired] vaut `true`, [lock] est renseigné. Sinon la commande est
/// déjà verrouillée par une autre confirmatrice et [conflictMessage] /
/// [conflictOwnerEmail] permettent d'informer l'utilisateur.
class AcquireLockResult {
  final bool acquired;
  final CommandeLock? lock;
  final String? conflictMessage;
  final String? conflictOwnerEmail;

  const AcquireLockResult({
    required this.acquired,
    this.lock,
    this.conflictMessage,
    this.conflictOwnerEmail,
  });
}

/// Phase 4 — Wrapper HTTP pour les 3 endpoints du verrou visuel 15 min :
///   POST /api/confirmateur/commandes/locks         (batch lookup)
///   POST /api/confirmateur/commandes/{piece}/lock  (acquérir / renouveler)
///   POST /api/confirmateur/commandes/{piece}/unlock (libérer explicitement)
class CommandeLockService {
  final ApiClient api;

  CommandeLockService(this.api);

  /// Charge en une fois l'état de verrou de plusieurs commandes.
  /// Les commandes sans verrou actif ne remontent pas dans le résultat.
  Future<List<CommandeLock>> fetchActive(List<String> pieces) async {
    if (pieces.isEmpty) return const <CommandeLock>[];
    final data = await api.postJsonList(
      '/api/confirmateur/commandes/locks',
      pieces,
    );
    return data
        .whereType<Map<String, dynamic>>()
        .map(CommandeLock.fromMap)
        .toList();
  }

  /// Tente d'acquérir ou de renouveler le verrou. Gère explicitement la
  /// réponse 409 (déjà verrouillé par une autre conf.) sans exception.
  Future<AcquireLockResult> acquire(String piece) async {
    final response = await api.rawPostJson(
      '/api/confirmateur/commandes/$piece/lock',
      const <String, dynamic>{},
    );

    dynamic body;
    try {
      body = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      body = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body is Map<String, dynamic>) {
        return AcquireLockResult(
          acquired: true,
          lock: CommandeLock.fromMap(body),
        );
      }
      throw Exception('Réponse inattendue après acquisition du verrou.');
    }

    if (response.statusCode == 409 && body is Map<String, dynamic>) {
      return AcquireLockResult(
        acquired: false,
        conflictMessage: body['message']?.toString(),
        conflictOwnerEmail: body['lockedByEmail']?.toString(),
      );
    }

    final errMsg = body is Map<String, dynamic>
        ? (body['message']?.toString() ?? 'Erreur HTTP ${response.statusCode}')
        : 'Erreur HTTP ${response.statusCode}';
    throw Exception(errMsg);
  }

  /// Libère le verrou si le caller en est le détenteur. Retourne `true`
  /// si quelque chose a été libéré, `false` sinon.
  Future<bool> release(String piece) async {
    final data = await api.postJson(
      '/api/confirmateur/commandes/$piece/unlock',
      const <String, dynamic>{},
    );
    final raw = data['released'];
    if (raw is bool) return raw;
    return raw?.toString().toLowerCase() == 'true';
  }
}
