import '../../../core/api_client.dart';

class SupervisorService {
  final ApiClient api;
  SupervisorService(this.api);

  Future<Map<String, dynamic>> stats() =>
      api.getMap('/api/supervisor/dashboard/stats');
  Future<List<dynamic>> alerts() =>
      api.getList('/api/supervisor/issues', q: {'includeRead': 'true'});
  Future<List<dynamic>> issues() =>
      api.getList('/api/supervisor/issues', q: {'includeRead': 'true'});
  Future<List<dynamic>> livreurs() => api.getList('/api/supervisor/livreurs');
  Future<List<dynamic>> transferts() =>
      api.getList('/api/supervisor/transit-missions');
  Future<List<dynamic>> transitMissions() =>
      api.getList('/api/supervisor/transit-missions');

  Future<void> acknowledge(String id) async {
    await api.putEmpty(
      '/api/supervisor/alerts/$id/acknowledge',
      <String, dynamic>{},
    );
  }

  Future<void> resolveIssue(String id) async {
    await api.postEmpty('/api/supervisor/issues/$id/resolve');
  }

  Future<Map<String, dynamic>> retryAssignment(String commandeId) =>
      api.postJson('/api/supervisor/orders/$commandeId/retry-assignment', {});

  Future<Map<String, dynamic>> changeTransitStatus({
    required String missionId,
    required String status,
    required String justification,
    int? version,
  }) => api
      .postJson('/api/supervisor/transit-missions/$missionId/change-status', {
        'transitMissionId': missionId,
        'transfertId': missionId,
        'status': status,
        'justification': justification,
        if (version != null) 'version': version,
      });
}
