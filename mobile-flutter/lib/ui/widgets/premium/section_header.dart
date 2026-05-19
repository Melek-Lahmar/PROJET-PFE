import 'package:flutter/material.dart';

/// En-tête de section standardisé : petite icône primary + titre gras.
/// Utilisé partout (détail commande livreur, profil conf, profil client,
/// claim details) pour garantir la cohérence visuelle.
class PremiumSectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? trailing;
  final VoidCallback? onTrailingTap;

  const PremiumSectionHeader({
    super.key,
    required this.icon,
    required this.title,
    this.trailing,
    this.onTrailingTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 2),
      child: Row(
        children: [
          Icon(icon, size: 18, color: scheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ),
          if (trailing != null)
            TextButton(
              onPressed: onTrailingTap,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 32),
              ),
              child: Text(trailing!),
            ),
        ],
      ),
    );
  }
}
