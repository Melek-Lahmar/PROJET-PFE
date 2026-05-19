import '../../core/api_client.dart';
import '../../models/client_order_tracking.dart';
import '../../models/customer_order.dart';

class CustomerOrdersService {
  final ApiClient api;

  CustomerOrdersService(this.api);

  Future<List<CustomerOrder>> fetchMine() async {
    final list = await api.getList('/api/orders');
    return list
        .whereType<Map<String, dynamic>>()
        .map(CustomerOrder.fromMap)
        .toList();
  }

  Future<CustomerOrder> fetchByPiece(String piece) async {
    final data = await api.getMap('/api/orders/$piece');
    return CustomerOrder.fromMap(data);
  }

  /// Phase 8 — tracking client en 6 blocs (endpoint dédié).
  Future<ClientOrderTracking> fetchTracking(String piece) async {
    final data = await api.getMap('/api/client/orders/$piece/tracking');
    return ClientOrderTracking.fromMap(data);
  }
}
