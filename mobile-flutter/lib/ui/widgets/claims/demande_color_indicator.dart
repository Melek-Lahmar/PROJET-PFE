import 'package:flutter/material.dart';

/// Indicateur visuel rouge / vert / gris pour une Demande visible client.
/// Règle métier (UX pure, jamais stockée en base) :
///   - ENVOYEE                → rouge, « À corriger »
///   - EN_COURS_DE_TRAITEMENT → vert, « Corrigé, en attente validation »
///   - CLOTUREE / REFUSEE     → gris, « Terminé »
///
/// N'est utilisé que pour les Demandes livreur visibles client (motifs A).
/// Les Réclamations client utilisent le badge métier standard.
class DemandeColorIndicator extends StatelessWidget {
  final String statut;
  final bool compact;

  const DemandeColorIndicator({
    super.key,
    required this.statut,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final normalized = statut.trim().toUpperCase();
    final Color bg;
    final Color fg;
    final IconData icon;
    final String label;

    switch (normalized) {
      case 'ENVOYEE':
        bg = Colors.red.shade100;
        fg = Colors.red.shade800;
        icon = Icons.priority_high_rounded;
        label = 'À corriger';
        break;
      case 'EN_COURS_DE_TRAITEMENT':
        bg = Colors.green.shade100;
        fg = Colors.green.shade800;
        icon = Icons.check_circle_outline_rounded;
        label = 'Corrigé, en attente validation';
        break;
      case 'CLOTUREE':
      case 'REFUSEE':
        final scheme = Theme.of(context).colorScheme;
        bg = scheme.surfaceContainerHighest;
        fg = scheme.onSurfaceVariant;
        icon = Icons.done_all_rounded;
        label = 'Terminé';
        break;
      default:
        final scheme = Theme.of(context).colorScheme;
        bg = scheme.surfaceContainerHighest;
        fg = scheme.onSurfaceVariant;
        icon = Icons.info_outline_rounded;
        label = statut;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 10 : 14,
        vertical: compact ? 6 : 10,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: fg.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: fg, size: compact ? 16 : 18),
          SizedBox(width: compact ? 6 : 8),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                color: fg,
                fontWeight: FontWeight.w800,
                fontSize: compact ? 12 : 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
