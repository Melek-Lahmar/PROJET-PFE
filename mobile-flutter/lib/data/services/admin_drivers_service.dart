import '../../core/api_client.dart';
import '../../models/admin_driver.dart';

class AdminDriversService {
  final ApiClient api;
  AdminDriversService(this.api);

  Future<AdminDriversPage> getPage({
    String period = '30d',
    String? governorate,
    String? search,
  }) async {
    final q = <String, String>{
      'period': period,
      if (governorate != null && governorate.isNotEmpty) 'governorate': governorate,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    };
    final body = await api.getMap('/api/admin/drivers', q: q);
    return AdminDriversPage.fromMap(body);
  }

  Future<AdminDriverDetail> getDetail(String userId, {String period = '30d'}) async {
    final body = await api.getMap(
      '/api/admin/drivers/$userId',
      q: {'period': period},
    );
    return AdminDriverDetail.fromMap(body);
  }
}
