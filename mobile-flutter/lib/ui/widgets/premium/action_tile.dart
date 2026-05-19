import 'package:flutter/material.dart';

import '../../../core/theme/app_status_palette.dart';

/// Tuile d'action premium : icône colorée à gauche, label principal,
/// sous-label discret, chevron droite. Utilisée pour les actions
/// rapides du détail commande (appeler, maps, SMS) ou pour les choix
/// de motif dans les bottom sheets.
class ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subLabel;
  final Color? iconColor;
  final Color? iconBg;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool destructive;

  const ActionTile({
    super.key,
    required this.icon,
    required this.label,
    this.subLabel,
    this.iconColor,
    this.iconBg,
    this.onTap,
    this.trailing,
    this.destructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final effectiveIconColor = destructive
        ? scheme.error
        : (iconColor ?? scheme.primary);
    final effectiveIconBg = iconBg ?? effectiveIconColor.withOpacity(0.12);

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(PremiumTokens.rMd),
      child: InkWell(
        borderRadius: BorderRadius.circular(PremiumTokens.rMd),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: effectiveIconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: effectiveIconColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                        color: destructive ? scheme.error : null,
                      ),
                    ),
                    if ((subLabel ?? '').isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        subLabel!,
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              trailing ??
                  Icon(
                    Icons.chevron_right_rounded,
                    color: scheme.onSurfaceVariant,
                  ),
            ],
          ),
        ),
      ),
    );
  }
}
