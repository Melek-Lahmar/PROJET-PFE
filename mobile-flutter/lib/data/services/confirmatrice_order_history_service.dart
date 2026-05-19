import '../../core/api_client.dart';
import '../../models/livreur_order_details.dart' show LivreurOrderHistoryItem;

/// Récupère la timeline événementielle d'une commande pour la confirmatrice.
/// Backend : GET /api/confirmatrice/orders/{piece}/history
///
/// Renvoie la même structure que `LivreurOrderHistoryItem` (At, StatusCode,
/// StatusLabel, UpdatedBy, Motif, Note) — la confirmatrice et le livreur
/// affichent la même timeline.
class ConfirmatriceOrderHistoryService {
  final ApiClient _api;

  ConfirmatriceOrderHistoryService(this._api);

  Future<List<LivreurOrderHistoryItem>> fetch(String piece) async {
    final raw = await _api.getList('/api/confirmatrice/orders/$piece/history');
    return raw
        .whereType<Map<String, dynamic>>()
        .map(LivreurOrderHistoryItem.fromMap)
        .toList();
  }
}
