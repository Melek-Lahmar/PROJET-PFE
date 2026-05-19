import '../../core/api_client.dart';
import '../../models/admin_confirmatrice.dart';
import '../../models/admin_confirmatrice_work_stats.dart';

class AdminConfirmatricesService {
  final ApiClient api;
  AdminConfirmatricesService(this.api);

  /// A.2 — Stats temps de travail vs temps de pause par confirmatrice sur
  /// une période arbitraire (dates+heures).
  Future<AdminConfirmatricesWorkStats> getWorkStats({
    required DateTime from,
    required DateTime to,
  }) async {
    final body = await api.getMap(
      '/api/admin/confirmatrices/work-stats',
      q: {
        'from': from.toUtc().toIso8601String(),
        'to': to.toUtc().toIso8601String(),
      },
    );
    return AdminConfirmatricesWorkStats.fromMap(body);
  }

  Future<AdminConfirmatricesPage> getPage({
    String period = '30d',
    String? search,
  }) async {
    final q = <String, String>{
      'period': period,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    };
    final body = await api.getMap('/api/admin/confirmatrices', q: q);
    return AdminConfirmatricesPage.fromMap(body);
  }

  Future<AdminConfirmatriceDetail> getDetail(String userId,
      {String period = '30d'}) async {
    final body = await api.getMap('/api/admin/confirmatrices/$userId',
        q: {'period': period});
    return AdminConfirmatriceDetail.fromMap(body);
  }
}
