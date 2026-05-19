import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/services/livreur_location_service.dart';
import '../../../data/services/offline_queue_service.dart';

/// Section 2.16 — Écran de synchronisation en attente.
/// Lecture seule, auto-refresh 10s.
class SyncQueueScreen extends StatefulWidget {
  const SyncQueueScreen({super.key});
  @override
  State<SyncQueueScreen> createState() => _SyncQueueScreenState();
}

class _SyncQueueScreenState extends State<SyncQueueScreen> {
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final queue = context.watch<OfflineQueueService?>();
    final loc = context.watch<LivreurLocationService?>();
    final actions = queue?.snapshot() ?? [];
    final gpsCount = loc?.pendingCount ?? 0;
    final total = actions.length + (gpsCount > 0 ? 1 : 0);
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const Text('Synchronisation'),
          const SizedBox(width: 8),
          if (total > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.orange,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text("$total",
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
        ]),
      ),
      body: total == 0
          ? const Center(child: Text('Tout est synchronisé.'))
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                for (final a in actions)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.sync_problem, color: Colors.orange),
                      title: Text("${a['method']} ${a['endpoint']}"),
                      subtitle: Text(
                        "Capturé : ${a['createdAt']} · Retries : ${a['retries'] ?? 0}",
                      ),
                    ),
                  ),
                if (gpsCount > 0)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.location_on_outlined, color: Colors.blue),
                      title: Text('$gpsCount positions GPS'),
                      subtitle: const Text('Envoi en lot dès la reconnexion'),
                    ),
                  ),
              ],
            ),
    );
  }
}
