import 'dart:async';

import 'package:flutter/material.dart';

/// Badge premium qui affiche le temps restant avant déblocage automatique
/// d'une commande en report partiel. Compte à rebours mis à jour chaque
/// minute (suffisant — pas besoin de seconde près sur une UI livreur).
///
/// Quand l'heure est atteinte, le badge bascule en vert et affiche
/// « Maintenant ». L'écran parent doit aussi écouter pour faire repasser la
/// commande dans la section « Actives ».
class HeureSouhaiteeBadge extends StatefulWidget {
  final DateTime heureSouhaitee;

  /// Style condensé sur 1 ligne (pour les cards de liste).
  final bool compact;

  const HeureSouhaiteeBadge({
    super.key,
    required this.heureSouhaitee,
    this.compact = false,
  });

  @override
  State<HeureSouhaiteeBadge> createState() => _HeureSouhaiteeBadgeState();
}

class _HeureSouhaiteeBadgeState extends State<HeureSouhaiteeBadge> {
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final diff = widget.heureSouhaitee.difference(now);
    final reached = diff.isNegative || diff.inSeconds < 30;

    final hh = widget.heureSouhaitee.hour.toString().padLeft(2, '0');
    final mm = widget.heureSouhaitee.minute.toString().padLeft(2, '0');
    final hourLabel = '$hh:$mm';

    final color = reached
        ? const Color(0xFF16A34A)
        : const Color(0xFFEA580C);
    final icon = reached ? Icons.check_circle_rounded : Icons.schedule_rounded;

    String trailing;
    if (reached) {
      trailing = 'Maintenant';
    } else if (diff.inHours >= 1) {
      final h = diff.inHours;
      final m = diff.inMinutes.remainder(60);
      trailing = m == 0 ? 'dans ${h}h' : 'dans ${h}h${m.toString().padLeft(2, '0')}';
    } else {
      trailing = 'dans ${diff.inMinutes} min';
    }

    if (widget.compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withValues(alpha: 0.35), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
            Text(
              hourLabel,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w800,
                fontSize: 11,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            hourLabel,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '• $trailing',
            style: TextStyle(
              color: color.withValues(alpha: 0.85),
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
