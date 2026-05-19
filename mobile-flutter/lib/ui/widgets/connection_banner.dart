import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/services/backend_health_service.dart';

/// Section 1.7.4 — bandeau persistant qui informe le livreur (ou client)
/// que sa connexion est instable, sans bloquer l'UI. À placer sous l'AppBar
/// du Scaffold de chaque rôle.
///
/// Convention : tant que [BackendHealthService.status] est healthy, le widget
/// ne prend AUCUN espace (SizedBox.shrink). Aucune animation lourde.
class ConnectionBanner extends StatelessWidget {
  const ConnectionBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final health = context.watch<BackendHealthService?>();
    if (health == null) return const SizedBox.shrink();
    if (health.status == BackendStatus.healthy) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final isOffline = health.status == BackendStatus.offline;
    final bg = isOffline
        ? Colors.red.shade100
        : Colors.orange.shade100;
    final fg = isOffline
        ? Colors.red.shade900
        : Colors.orange.shade900;
    final icon = isOffline ? Icons.wifi_off : Icons.cloud_off;
    final label = isOffline
        ? 'Hors ligne — vos actions seront envoyées dès que possible.'
        : 'Connexion instable — vos actions seront envoyées dès que possible.';

    return Material(
      color: bg,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              Icon(icon, color: fg, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(color: fg, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
