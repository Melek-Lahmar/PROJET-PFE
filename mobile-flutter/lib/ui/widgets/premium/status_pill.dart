import 'package:flutter/material.dart';

import '../../../core/theme/app_status_palette.dart';

/// Badge statut premium utilisé partout (listes, détail, timeline).
/// Rendu cohérent : icône + label dans une pastille arrondie avec
/// bordure teintée et fond doux.
class StatusPill extends StatelessWidget {
  final int statut;
  final String? apiStatus;
  final bool compact;
  final StatusVisual? visualOverride;

  const StatusPill({
    super.key,
    required this.statut,
    this.apiStatus,
    this.compact = false,
  }) : visualOverride = null;

  const StatusPill.fromVisual({
    super.key,
    required StatusVisual visual,
    this.compact = false,
  })  : statut = -1,
        apiStatus = null,
        visualOverride = visual;

  @override
  Widget build(BuildContext context) {
    final v = visualOverride ??
        AppStatusPalette.forStatut(statut, apiStatus: apiStatus);
    final textSize = compact ? 11.0 : 12.5;
    final iconSize = compact ? 13.0 : 15.0;
    final hPad = compact ? 8.0 : 10.0;
    final vPad = compact ? 4.0 : 6.0;

    return Container(
      padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
      decoration: BoxDecoration(
        color: v.bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: v.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(v.icon, size: iconSize, color: v.fg),
          SizedBox(width: compact ? 4 : 6),
          Text(
            v.label,
            style: TextStyle(
              color: v.fg,
              fontWeight: FontWeight.w800,
              fontSize: textSize,
            ),
          ),
        ],
      ),
    );
  }
}
