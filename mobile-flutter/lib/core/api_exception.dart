/// Exception typée pour TOUTES les erreurs HTTP/réseau côté Flutter.
///
/// Refonte 2026-05-11 — toutes les apps (livreur/client/confirmatrice/admin)
/// consomment ce type via `try { ... } on ApiException catch (e)` et savent :
///  - quel statut HTTP (401, 403, 404, 500, ...) → routage UI précis ;
///  - le message lisible côté serveur ([extrait du JSON `message`]) ;
///  - si la cause est réseau (`network=true`) ou timeout (`timeout=true`).
///
/// Voir aussi : `core/api_client.dart` (lance), `ui/widgets/error_retry_widget.dart`
/// (rend une UI standard pour la plupart des écrans).
class ApiException implements Exception {
  /// 0 = pas de réponse HTTP (timeout ou erreur réseau).
  final int statusCode;
  final String message;
  final dynamic body;
  final bool isNetwork;
  final bool isTimeout;

  ApiException({
    required this.statusCode,
    required this.message,
    this.body,
    this.isNetwork = false,
    this.isTimeout = false,
  });

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode >= 500 && statusCode < 600;
  bool get isClientError => statusCode >= 400 && statusCode < 500;

  /// Message lisible adapté au type d'erreur (utilisé tel quel par les UI).
  String get displayMessage {
    if (isTimeout) return 'Connexion lente, réessayez.';
    if (isNetwork) return 'Mode hors ligne — l\'action est en file d\'attente.';
    if (statusCode == 401) return 'Session expirée. Veuillez vous reconnecter.';
    if (statusCode == 403) return 'Vous n\'avez pas la permission d\'effectuer cette action.';
    if (statusCode == 404) return 'Ressource introuvable.';
    if (statusCode == 408) return 'Délai d\'attente dépassé.';
    if (statusCode == 409) return message; // utilise le message serveur (conflit métier)
    if (statusCode == 422) return message;
    if (statusCode == 429) return 'Trop de requêtes — patientez quelques secondes.';
    if (isServerError) return 'Erreur serveur, réessayez dans un instant.';
    return message;
  }

  @override
  String toString() => 'ApiException($statusCode): $message';
}
