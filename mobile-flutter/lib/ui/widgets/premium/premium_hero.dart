import 'package:flutter/material.dart';

import '../../../core/theme/app_status_palette.dart';

/// Hero card premium à gradient. Utilisé en tête des écrans de détail
/// (commande livreur, profil conf, profil client) pour donner un rendu
/// haut de gamme dès l'ouverture.
class PremiumGradientHero extends StatelessWidget {
  final Widget child;
  final Color? baseColor;
  final EdgeInsetsGeometry padding;

  const PremiumGradientHero({
    super.key,
    required this.child,
    this.baseColor,
    this.padding = const EdgeInsets.all(20),
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = baseColor ?? scheme.primary;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PremiumTokens.rXl),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color,
            Color.lerp(color, Colors.black, 0.26) ?? color,
          ],
        ),
        boxShadow: PremiumTokens.cardShadow(false),
      ),
      child: DefaultTextStyle(
        style: const TextStyle(color: Colors.white),
        child: IconTheme(
          data: const IconThemeData(color: Colors.white),
          child: child,
        ),
      ),
    );
  }
}
