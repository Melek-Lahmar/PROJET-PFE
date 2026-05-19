import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';

/// Section 2.5 — Bloc Tentatives dans le détail cas confirmatrice.
class TentativesBlock extends StatefulWidget {
  final int reclamationId;
  const TentativesBlock({super.key, required this.reclamationId});

  @override
  State<TentativesBlock> createState() => _TentativesBlockState();
}

class _TentativesBlockState extends State<TentativesBlock> {
  bool _loading = true;
  List<Map<String, dynamic>> _items = [];
  int _total = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      final data = await api.getMap(
          '/api/confirmatrice/reclamations/${widget.reclamationId}/tentatives');
      _total = (data['total'] as num?)?.toInt() ?? 0;
      _items = (data['tentatives'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .toList() ??
          [];
    } catch (_) {
      _items = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              const Text('Tentatives',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(width: 8),
              if (_total > 0) TentativeBadge(numero: _total),
              const Spacer(),
              IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
            ]),
            const SizedBox(height: 8),
            if (_loading)
              const Center(child: Padding(
                padding: EdgeInsets.all(8),
                child: CircularProgressIndicator(),
              ))
            else if (_items.isEmpty)
              const Text('Aucune tentative enregistrée.')
            else
              for (final t in _items) _TentativeItem(t: t),
          ],
        ),
      ),
    );
  }
}

class _TentativeItem extends StatelessWidget {
  final Map<String, dynamic> t;
  const _TentativeItem({required this.t});
  @override
  Widget build(BuildContext context) {
    final numero = (t['numero'] as num?)?.toInt() ?? 0;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TentativeBadge(numero: numero),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("${t['date'] ?? ''}",
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text("Motif : ${t['motif'] ?? '-'}"),
                if (t['latitude'] != null && t['longitude'] != null)
                  Text("Position : ${t['latitude']}, ${t['longitude']}"),
                if (t['photoUrl'] != null)
                  Text("Photo : ${t['photoUrl']}",
                      style: const TextStyle(fontSize: 11, color: Colors.blue)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Badge "Tentative N" coloré dynamiquement.
class TentativeBadge extends StatelessWidget {
  final int numero;
  const TentativeBadge({super.key, required this.numero});

  @override
  Widget build(BuildContext context) {
    final color = numero >= 4
        ? Colors.red.shade700
        : numero == 3
            ? Colors.red
            : numero == 2
                ? Colors.orange
                : Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text("Tentative $numero",
          style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}
