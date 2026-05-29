import 'package:flutter/material.dart';

import '../../../core/theme/app_spacing.dart';
import '../common/app_button.dart';

class NavigationControls extends StatelessWidget {
  final String? nextStopLabel;
  final String primaryLabel;
  final VoidCallback? onPrimaryPressed;
  final VoidCallback? onRecomputePressed;
  final VoidCallback? onZoomInPressed;
  final VoidCallback? onZoomOutPressed;

  const NavigationControls({
    super.key,
    this.nextStopLabel,
    required this.primaryLabel,
    this.onPrimaryPressed,
    this.onRecomputePressed,
    this.onZoomInPressed,
    this.onZoomOutPressed,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 430),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: scheme.surface.withValues(alpha: 0.97),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: scheme.outline.withValues(alpha: 0.20),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (nextStopLabel != null) ...[
                Row(
                  children: [
                    Icon(
                      Icons.flag_rounded,
                      size: 16,
                      color: scheme.primary,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        nextStopLabel!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
              ],
              Row(
                children: [
                  Expanded(
                    child: AppButton(
                      label: primaryLabel,
                      onPressed: onPrimaryPressed,
                      icon: Icons.navigation_rounded,
                      height: 46,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _MiniActionButton(
                    icon: Icons.refresh_rounded,
                    onPressed: onRecomputePressed,
                    tooltip: 'Recalculer',
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _MiniActionButton(
                    icon: Icons.add_rounded,
                    onPressed: onZoomInPressed,
                    tooltip: 'Zoom +',
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _MiniActionButton(
                    icon: Icons.remove_rounded,
                    onPressed: onZoomOutPressed,
                    tooltip: 'Zoom -',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String tooltip;

  const _MiniActionButton({
    required this.icon,
    required this.onPressed,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onPressed,
        child: Ink(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: scheme.surfaceVariant.withValues(alpha: 0.75),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: scheme.outline.withValues(alpha: 0.20),
            ),
          ),
          child: Icon(
            icon,
            size: 20,
            color: scheme.onSurface,
          ),
        ),
      ),
    );
  }
}