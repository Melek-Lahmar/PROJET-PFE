import '../../core/api_client.dart';
import '../../models/admin_claims_overview.dart';

class AdminClaimsOverviewService {
  final ApiClient api;
  AdminClaimsOverviewService(this.api);

  Future<AdminClaimsOverview> getOverview({
    String period = '30d',
    String? governorate,
  }) async {
    final q = <String, String>{
      'period': period,
      if (governorate != null && governorate.isNotEmpty) 'governorate': governorate,
    };
    final body = await api.getMap('/api/admin/claims/overview', q: q);
    return AdminClaimsOverview.fromMap(body);
  }
}
