import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/admin_chat_extra_service.dart';

/// Section 3.6 — Bandeau d'alertes proactives au-dessus du chatbot admin.
class ProactiveInsightsBanner extends StatefulWidget {
  final void Function(String question)? onAnalyze;
  const ProactiveInsightsBanner({super.key, this.onAnalyze});

  @override
  State<ProactiveInsightsBanner> createState() => _ProactiveInsightsBannerState();
}

class _ProactiveInsightsBannerState extends State<ProactiveInsightsBanner> {
  late final _service = AdminChatInsightsService(context.read<ApiClient>());
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      _items = await _service.getPending();
    } catch (_) {
      _items = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _dismiss(int id) async {
    await _service.feedback(id, dismiss: true);
    if (mounted) {
      setState(() {
        _items.removeWhere((i) => (i['id'] as num?)?.toInt() == id);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox.shrink();
    if (_items.isEmpty) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.all(8),
      color: Colors.orange.shade50,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: Text("🔔 ${_items.length} alerte${_items.length > 1 ? 's' : ''} pour vous",
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          for (final i in _items.take(5))
            ListTile(
              dense: true,
              leading: Icon(_iconFor(i['severity']?.toString() ?? 'info'),
                  color: _colorFor(i['severity']?.toString() ?? 'info')),
              title: Text((i['title'] ?? '').toString()),
              subtitle: Text((i['message'] ?? '').toString()),
              trailing: Wrap(spacing: 4, children: [
                TextButton(
                  onPressed: () {
                    final id = (i['id'] as num?)?.toInt();
                    if (id != null) _dismiss(id);
                  },
                  child: const Text('Ignorer'),
                ),
                FilledButton.tonal(
                  onPressed: () {
                    final title = (i['title'] ?? '').toString();
                    widget.onAnalyze?.call("Analyse-moi : $title");
                    final id = (i['id'] as num?)?.toInt();
                    if (id != null) _dismiss(id);
                  },
                  child: const Text('Analyser'),
                ),
              ]),
            ),
        ],
      ),
    );
  }

  IconData _iconFor(String s) => switch (s) {
        'critical' => Icons.warning_amber,
        'warning' => Icons.priority_high,
        _ => Icons.info_outline,
      };

  Color _colorFor(String s) => switch (s) {
        'critical' => Colors.red,
        'warning' => Colors.orange,
        _ => Colors.blue,
      };
}
