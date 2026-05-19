enum ChatMessageRole { user, assistant, system }

enum ChatChartType { bar, line, none }

/// Point d'une série/graphe inline dans une bulle chatbot.
class ChatChartPoint {
  final String bucket;
  final double value;
  final double? lower;
  final double? upper;
  const ChatChartPoint({
    required this.bucket,
    required this.value,
    this.lower,
    this.upper,
  });
}

/// Ligne d'une liste compacte (top produits, top gouvernorats, etc.).
class ChatRowItem {
  final String label;
  final double? value;
  final String? subtitle;
  const ChatRowItem({
    required this.label,
    this.value,
    this.subtitle,
  });
}

/// Message du chat admin (LLM via n8n + Groq + couches query/analyze/predict).
class ChatMessage {
  final String id;
  final ChatMessageRole role;
  final String text;
  final DateTime timestamp;
  final String? action;             // kb | query | analyze | predict | chitchat | action
  final ChatChartType chartType;
  final List<ChatChartPoint> chartPoints;
  final List<ChatRowItem> rows;
  final bool isError;

  // Section 5 — refonte 2026-05-10
  final List<String>? suggestions;  // quick-replies sous la bulle assistant
  final String? language;           // fr | ar | tounsi (utilisé par TTS)
  final bool isStreaming;           // affiche un curseur pendant le streaming SSE

  const ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.timestamp,
    this.action,
    this.chartType = ChatChartType.none,
    this.chartPoints = const [],
    this.rows = const [],
    this.isError = false,
    this.suggestions,
    this.language,
    this.isStreaming = false,
  });
}
