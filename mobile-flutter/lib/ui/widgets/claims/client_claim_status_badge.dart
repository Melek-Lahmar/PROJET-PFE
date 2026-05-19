import 'package:flutter/material.dart';

class ClientClaimStatusBadge extends StatelessWidget {
  final String status;

  const ClientClaimStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final normalized = status.trim().toUpperCase();
    final scheme = Theme.of(context).colorScheme;

    Color fg;
    Color bg;
    String label;

    switch (normalized) {
      case 'ENVOYEE':
        fg = scheme.primary;
        bg = scheme.primary.withOpacity(0.12);
        label = 'Envoyée';
        break;
      case 'EN_COURS_DE_TRAITEMENT':
        fg = scheme.tertiary;
        bg = scheme.tertiary.withOpacity(0.14);
        label = 'En cours de traitement';
        break;
      case 'CLOTUREE':
        fg = Colors.green.shade700;
        bg = Colors.green.shade100;
        label = 'Clôturée';
        break;
      case 'REFUSEE':
        fg = scheme.error;
        bg = scheme.error.withOpacity(0.12);
        label = 'Refusée';
        break;
      default:
        fg = scheme.onSurfaceVariant;
        bg = scheme.surfaceContainerHighest;
        label = normalized;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: fg,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}
