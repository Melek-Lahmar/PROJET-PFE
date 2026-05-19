import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

/// Section 2.13 — FAQ contextuelle (assets/faq.json).
class FaqScreen extends StatefulWidget {
  const FaqScreen({super.key});
  @override
  State<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends State<FaqScreen> {
  List<Map<String, dynamic>> _categories = [];
  String _query = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = await rootBundle.loadString('assets/faq.json');
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      _categories = (decoded['categories'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
    } catch (_) {
      _categories = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final filtered = _categories.map((c) {
      final items = (c['items'] as List)
          .whereType<Map<String, dynamic>>()
          .where((it) {
            if (q.isEmpty) return true;
            return ((it['q'] ?? '').toString().toLowerCase().contains(q)) ||
                ((it['a'] ?? '').toString().toLowerCase().contains(q));
          })
          .toList();
      return {'title': c['title'], 'items': items};
    }).where((c) => (c['items'] as List).isNotEmpty).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Aide & FAQ')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Rechercher dans la FAQ',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
                const SizedBox(height: 12),
                for (final c in filtered) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(c['title']?.toString() ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 16)),
                  ),
                  for (final it in (c['items'] as List).whereType<Map<String, dynamic>>())
                    Card(
                      margin: const EdgeInsets.only(bottom: 6),
                      child: ExpansionTile(
                        title: Text((it['q'] ?? '').toString()),
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text((it['a'] ?? '').toString()),
                          ),
                        ],
                      ),
                    ),
                ],
              ],
            ),
    );
  }
}
