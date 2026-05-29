import 'package:flutter/material.dart';

import '../../../core/theme/app_status_palette.dart';

/// Carte premium : coins arrondis, bordure subtile, ombre diffuse,
/// tap feedback sans ripple agressif. Utilisée comme conteneur de base
/// pour toutes les listes et blocs de détail refactorés.
///
/// Quand `onTap` est fourni, ajoute en plus :
/// - `MouseRegion` (cursor.click + hover overlay)
/// - `AnimatedScale` au pressed (0.985, 110ms)
/// - élévation subtile au hover (border + shadow renforcés)
class PremiumCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Color? color;
  final Color? borderColor;
  final double borderRadius;

  const PremiumCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.onLongPress,
    this.color,
    this.borderColor,
    this.borderRadius = PremiumTokens.rLg,
  });

  @override
  State<PremiumCard> createState() => _PremiumCardState();
}

class _PremiumCardState extends State<PremiumCard> {
  bool _hover = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bg = widget.color ?? theme.cardColor;
    final hasOnTap = widget.onTap != null || widget.onLongPress != null;

    // Couleur de bordure : plus marquée au hover si interactif.
    final baseBorder = widget.borderColor ??
        theme.colorScheme.outlineVariant.withValues(alpha: isDark ? 0.35 : 0.5);
    final border = (hasOnTap && _hover)
        ? theme.colorScheme.primary.withValues(alpha: 0.45)
        : baseBorder;

    // Ombre plus diffuse au hover pour un effet de léger lift.
    final shadow = (hasOnTap && _hover)
        ? PremiumTokens.cardShadowElevated(isDark)
        : PremiumTokens.cardShadow(isDark);

    final decoration = BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(widget.borderRadius),
      border: Border.all(color: border),
      boxShadow: shadow,
    );

    final content = Padding(
      padding: widget.padding ?? const EdgeInsets.all(16),
      child: widget.child,
    );

    if (!hasOnTap) {
      return Container(
        margin: widget.margin,
        decoration: decoration,
        child: content,
      );
    }

    return AnimatedScale(
      scale: _pressed ? 0.985 : 1.0,
      duration: const Duration(milliseconds: 110),
      curve: Curves.easeOut,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hover = true),
        onExit: (_) => setState(() => _hover = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          margin: widget.margin,
          decoration: decoration,
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            child: InkWell(
              borderRadius: BorderRadius.circular(widget.borderRadius),
              onTap: widget.onTap,
              onLongPress: widget.onLongPress,
              onTapDown: (_) => setState(() => _pressed = true),
              onTapUp: (_) => setState(() => _pressed = false),
              onTapCancel: () => setState(() => _pressed = false),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}
