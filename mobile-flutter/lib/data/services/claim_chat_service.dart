import '../../core/api_client.dart';
import '../../models/claim_message.dart';

class ClaimChatService {
  final ApiClient api;
  final bool isStaff;

  ClaimChatService(this.api, {required this.isStaff});

  String get _base => isStaff
      ? '/api/confirmateur/reclamations'
      : '/api/reclamations';

  Future<List<ClaimMessage>> fetchMessages(int reclamationId) async {
    final data = await api.getList('$_base/$reclamationId/messages');
    return data
        .whereType<Map<String, dynamic>>()
        .map(ClaimMessage.fromMap)
        .toList();
  }

  Future<ClaimMessage> sendMessage(int reclamationId, String text,
      {bool isInternal = false}) async {
    final data = await api.postMap('$_base/$reclamationId/messages', {
      'messageText': text.trim(),
      'isInternal': isInternal,
    });
    return ClaimMessage.fromMap(data);
  }
}
