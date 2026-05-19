import '../../core/api_client.dart';
import '../../models/admin_products_overview.dart';

class AdminProductsService {
  final ApiClient api;
  AdminProductsService(this.api);

  Future<AdminProductsOverview> getOverview({
    String period = '30d',
    String? governorate,
    int topN = 10,
  }) async {
    final q = <String, String>{
      'period': period,
      'topN': topN.toString(),
      if (governorate != null && governorate.isNotEmpty) 'governorate': governorate,
    };
    final body = await api.getMap('/api/admin/products/overview', q: q);
    return AdminProductsOverview.fromMap(body);
  }
}
