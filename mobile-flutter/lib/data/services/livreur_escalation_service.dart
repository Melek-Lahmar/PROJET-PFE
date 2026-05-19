import '../../core/api_client.dart';
import '../../models/order_escalation_status.dart';

/// Service mince qui expose l'état d'escalade d'une commande côté livreur.
/// Utilisé par OrderSheet pour afficher le bandeau 3-tentatives.
class LivreurEscalationService {
  final ApiClient api;

  LivreurEscalationService(this.api);

  /// Récupère l'état d'escalade pour une pièce. Retourne un état neutre
  /// en cas d'erreur (on ne bloque pas l'ouverture de la fiche).
  Future<OrderEscalationStatus> fetchEscalationStatus(String doPiece) async {
    final piece = doPiece.trim();
    if (piece.isEmpty) return OrderEscalationStatus.empty;
    try {
      final data = await api.getMap(
        '/api/livreur/reclamations/commandes/$piece/escalation-status',
      );
      return OrderEscalationStatus.fromMap(data);
    } catch (_) {
      return OrderEscalationStatus.empty;
    }
  }
}
