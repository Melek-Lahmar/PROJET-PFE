import 'package:flutter/foundation.dart';

import '../data/services/claim_chat_service.dart';
import '../models/claim_message.dart';

class ClaimChatProvider extends ChangeNotifier {
  final ClaimChatService service;

  ClaimChatProvider(this.service);

  List<ClaimMessage> messages = const [];
  bool loading = false;
  bool sending = false;
  String? error;
  int? _currentReclamationId;

  Future<void> loadMessages(int reclamationId) async {
    _currentReclamationId = reclamationId;
    loading = true;
    error = null;
    notifyListeners();
    try {
      messages = await service.fetchMessages(reclamationId);
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<bool> sendMessage(String text, {bool isInternal = false}) async {
    final id = _currentReclamationId;
    if (id == null || text.trim().isEmpty) return false;
    sending = true;
    notifyListeners();
    try {
      final msg = await service.sendMessage(id, text, isInternal: isInternal);
      messages = [...messages, msg];
      error = null;
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      sending = false;
      notifyListeners();
    }
  }

  void clear() {
    messages = const [];
    _currentReclamationId = null;
    error = null;
    notifyListeners();
  }
}
