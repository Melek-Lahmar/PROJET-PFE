import 'package:flutter/material.dart';

import '../../../core/theme/app_status_palette.dart';

/// Effet shimmer léger utilisé pour les états de chargement.
/// Évite le classique `CircularProgressIndicator` qui fait vide.
class SkeletonBlock extends StatefulWidget {
  final double height;
  final double? width;
  final double borderRadius;

  const SkeletonBlock({
    super.key,
    required this.height,
    this.width,
    this.borderRadius = 10,
  });

  @override
  State<SkeletonBlock> createState() => _SkeletonBlockState();
}

class _SkeletonBlockState extends State<SkeletonBlock>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      duration: const Duration(milliseconds: 1300),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? Colors.white10 : const Color(0xFFE8ECF2);
    final highlight = isDark ? Colors.white24 : Colors.white;

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        return Container(
          height: widget.height,
          width: widget.width,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(_ctrl.value * 2 - 1, 0),
              end: Alignment(_ctrl.value * 2 + 1, 0),
              colors: [base, highlight, base],
              stops: const [0.25, 0.5, 0.75],
            ),
          ),
        );
      },
    );
  }
}

/// Carte squelette équivalente à une tuile commande. Affichée pendant
/// le premier fetch d'une liste.
class SkeletonOrderCard extends StatelessWidget {
  const SkeletonOrderCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(PremiumTokens.rLg),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withOpacity(isDark ? 0.3 : 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Row(
            children: [
              Expanded(child: SkeletonBlock(height: 16)),
              SizedBox(width: 12),
              SkeletonBlock(height: 22, width: 80, borderRadius: 999),
            ],
          ),
          SizedBox(height: 12),
          SkeletonBlock(height: 14, width: 180),
          SizedBox(height: 8),
          SkeletonBlock(height: 12, width: 140),
          SizedBox(height: 16),
          Row(
            children: [
              SkeletonBlock(height: 14, width: 90),
              Spacer(),
              SkeletonBlock(height: 32, width: 120, borderRadius: 12),
            ],
          ),
        ],
      ),
    );
  }
}
