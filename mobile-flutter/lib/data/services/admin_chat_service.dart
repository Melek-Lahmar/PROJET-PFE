import '../../core/api_client.dart';

/// Client du chatbot admin : appelle directement l'endpoint backend
/// `POST /api/admin/chat/ask` (sans n8n). L'orchestration LLM (Groq router →
/// query/analyze/predict → Groq formatter) se fait côté backend.
///
/// Schéma de réponse :
/// `{ success, message, action, data, rows, chart }`
/// - action : kb | query | analyze | predict | chitchat | error
/// - chart  : `{ type: 'bar'|'line', points: [...] }` ou null
/// - rows   : tableau d'items pour liste compacte ou null
class AdminChatService {
  final ApiClient _api;

  AdminChatService({required ApiClient api}) : _api = api;

  Future<Map<String, dynamic>> ask({
    required String question,
    String? sessionId,
  }) async {
    final response = await _api.postJson('/api/admin/chat/ask', {
      'question': question,
      'sessionId': sessionId,
    });
    return response;
  }
}
