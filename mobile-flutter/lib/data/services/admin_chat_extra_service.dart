import '../../core/api_client.dart';

/// Section 3.4 + 3.6 — services chatbot admin pour insights + KB refresh.
class AdminChatInsightsService {
  final ApiClient api;
  AdminChatInsightsService(this.api);

  Future<List<Map<String, dynamic>>> getPending() async {
    final raw = await api.getList('/api/admin/chat/insights/pending');
    return raw.whereType<Map<String, dynamic>>().toList();
  }

  Future<void> feedback(int insightId, {String? feedback, bool dismiss = false}) async {
    await api.postJson('/api/admin/chat/insights/$insightId/feedback', {
      if (feedback != null) 'feedback': feedback,
      'dismiss': dismiss,
    });
  }

  Future<void> refreshKb() async {
    await api.postJson('/api/admin/chat/kb/refresh', {});
  }
}
