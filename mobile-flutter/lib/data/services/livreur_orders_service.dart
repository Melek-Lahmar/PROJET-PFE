import '../../core/api_client.dart';
import '../../models/livreur_order_details.dart';

/// 2.A — Service léger pour récupérer le détail enrichi d'une commande
/// (cart + client + history) côté livreur. L'endpoint backend est
/// `GET /api/livreur/orders/{piece}/full-details`.
class LivreurOrdersService {
  final ApiClient api;

  LivreurOrdersService(this.api);

  Future<LivreurOrderDetails> fetchFullDetails(String piece) async {
    final data = await api.getMap('/api/livreur/orders/$piece/full-details');
    return LivreurOrderDetails.fromMap(data);
  }
}
