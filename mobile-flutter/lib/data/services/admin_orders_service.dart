import '../../core/api_client.dart';
import '../../models/admin_order_detail.dart';
import '../../models/admin_orders_page.dart';

/// Client HTTP de l'onglet Commandes/Colis du cockpit admin.
class AdminOrdersService {
  final ApiClient api;

  AdminOrdersService(this.api);

  /// Liste paginée + KPIs.
  /// [period] : "today" | "7d" | "30d" | "3m" | "12m".
  /// [status] : "all" | "pending" | "confirmed" | "tentative" | "refused"
  ///          | "inDelivery" | "delivered" | "returned" | "postponed".
  /// [sort] : "date_desc" | "date_asc" | "amount_desc".
  Future<AdminOrdersPage> getPage({
    String period = '30d',
    String? governorate,
    String status = 'all',
    String? search,
    String sort = 'date_desc',
    int page = 1,
    int pageSize = 25,
  }) async {
    final q = <String, String>{
      'period': period,
      'status': status,
      'sort': sort,
      'page': page.toString(),
      'pageSize': pageSize.toString(),
      if (governorate != null && governorate.isNotEmpty) 'governorate': governorate,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    };

    final body = await api.getMap('/api/admin/orders', q: q);
    return AdminOrdersPage.fromMap(body);
  }

  /// Détail d'une commande (drawer).
  Future<AdminOrderDetail> getDetail(String piece) async {
    final body = await api.getMap('/api/admin/orders/$piece');
    return AdminOrderDetail.fromMap(body);
  }
}
