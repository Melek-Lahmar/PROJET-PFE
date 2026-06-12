import '../../core/api_exception.dart';
import 'package:flutter/foundation.dart';

import '../../data/services/admin_chat_service.dart';
import '../../models/chat_message.dart';

class AdminChatProvider extends ChangeNotifier {
  final AdminChatService _service;
  AdminChatProvider(this._service);

  final List<ChatMessage> _messages = [];
  bool _sending = false;
  String? _lastError;
  String? _sessionId; // Section 5.2 — mémoire conversationnelle

  int _totalQuestions = 0;
  int _successCount = 0;
  int _errorCount = 0;

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get sending => _sending;
  String? get lastError => _lastError;
  int get totalQuestions => _totalQuestions;
  int get successCount => _successCount;
  int get errorCount => _errorCount;

  String _newId() => DateTime.now().microsecondsSinceEpoch.toString();

  Future<void> send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _sending) return;

    _messages.add(ChatMessage(
      id: _newId(),
      role: ChatMessageRole.user,
      text: trimmed,
      timestamp: DateTime.now(),
    ));
    _sending = true;
    _lastError = null;
    _totalQuestions++;
    notifyListeners();

    try {
      final response = await _service.ask(question: trimmed, sessionId: _sessionId);
      final ok = response['success'] == true;
      // Garde le sessionId retourné pour les questions suivantes (mémoire)
      final newSession = response['sessionId']?.toString();
      if (newSession != null && newSession.isNotEmpty) _sessionId = newSession;
      final msg = (response['message'] ?? 'Réponse vide').toString();
      final action = response['action']?.toString();

      final parsedChart = _parseChart(response['chart']);
      final parsedRows = _parseRows(response['rows']);

      // Section 5.8 — Quick-replies + Section 5.3 — langue + Section 5.5 — pendingAction
      final suggestions = (response['suggestions'] as List?)
              ?.whereType<String>()
              .toList() ??
          const <String>[];
      final language = response['language']?.toString();

      _messages.add(ChatMessage(
        id: _newId(),
        role: ChatMessageRole.assistant,
        text: msg,
        timestamp: DateTime.now(),
        action: action,
        chartType: parsedChart.$1,
        chartPoints: parsedChart.$2,
        rows: parsedRows,
        isError: !ok,
        suggestions: suggestions.isEmpty ? null : suggestions,
        language: language,
      ));
      if (ok) {
        _successCount++;
      } else {
        _errorCount++;
      }
    } catch (e) {
      _errorCount++;
      _lastError = friendlyError(e);
      _messages.add(ChatMessage(
        id: _newId(),
        role: ChatMessageRole.assistant,
        text: 'Désolé, une erreur est survenue : $e',
        timestamp: DateTime.now(),
        isError: true,
      ));
    } finally {
      _sending = false;
      notifyListeners();
    }
  }

  (ChatChartType, List<ChatChartPoint>) _parseChart(dynamic raw) {
    if (raw is! Map) return (ChatChartType.none, const []);
    final typeStr = (raw['type'] ?? '').toString();
    final type = switch (typeStr) {
      'bar' => ChatChartType.bar,
      'line' => ChatChartType.line,
      _ => ChatChartType.none,
    };
    if (type == ChatChartType.none) return (type, const []);
    final points = <ChatChartPoint>[];
    final list = raw['points'];
    if (list is List) {
      for (final p in list) {
        if (p is Map) {
          final bucket = (p['bucket'] ?? p['date'] ?? '').toString();
          final v = _toDouble(p['value']);
          if (bucket.isEmpty || v == null) continue;
          points.add(ChatChartPoint(
            bucket: bucket,
            value: v,
            lower: _toDouble(p['lower']),
            upper: _toDouble(p['upper']),
          ));
        }
      }
    }
    return (type, points);
  }

  List<ChatRowItem> _parseRows(dynamic raw) {
    if (raw is! List) return const [];
    final items = <ChatRowItem>[];
    for (final r in raw.take(8)) {
      if (r is! Map) continue;
      final label = (r['label'] ?? r['key'] ?? '').toString();
      if (label.isEmpty) continue;
      final fields = r['fields'];
      String? subtitle;
      if (fields is Map) {
        if (fields['governorate'] != null) {
          subtitle = fields['governorate'].toString();
        } else if (fields['client'] != null) {
          subtitle = fields['client'].toString();
        } else if (fields['statut'] != null) {
          subtitle = fields['statut'].toString();
        } else if (fields['designation'] != null) {
          subtitle = fields['designation'].toString();
        }
      }
      items.add(ChatRowItem(
        label: label,
        value: _toDouble(r['value']),
        subtitle: subtitle,
      ));
    }
    return items;
  }

  double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  void clear() {
    _messages.clear();
    _lastError = null;
    _sessionId = null; // Section 5.2 — repart sur une nouvelle session
    notifyListeners();
  }
}
