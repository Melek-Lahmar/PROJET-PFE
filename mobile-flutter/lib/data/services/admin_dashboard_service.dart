import '../../core/api_client.dart';
import '../../models/admin_dashboard_overview.dart';

/// Client HTTP du dashboard admin.
class AdminDashboardService {
  final ApiClient api;

  AdminDashboardService(this.api);

  /// Récupère l'overview cockpit avec filtre optionnel par gouvernorat
  /// et code de période ("today" | "7d" | "30d" | "3m" | "12m").
  Future<AdminDashboardOverview> getOverview({
    String? governorate,
    String period = '30d',
  }) async {
    final q = <String, String>{
      'period': period,
      if (governorate != null && governorate.isNotEmpty)
        'governorate': governorate,
    };

    final body = await api.getMap('/api/admin/dashboard/overview', q: q);
    return AdminDashboardOverview.fromMap(body);
  }
}
