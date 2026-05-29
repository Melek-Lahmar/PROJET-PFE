import 'package:flutter/material.dart';
import 'package:projet_pfe_flutter/core/theme/app_spacing.dart';
import 'package:projet_pfe_flutter/ui/widgets/common/app_button.dart';
import 'package:projet_pfe_flutter/ui/widgets/common/app_card.dart';

class AppErrorState extends StatelessWidget {
  final String title;
  final String? message;
  final String actionLabel;
  final VoidCallback? onRetry;
  final IconData icon;
  final bool compact;

  const AppErrorState({
    super.key,
    this.title = 'Une erreur est survenue',
    this.message,
    this.actionLabel = 'Réessayer',
    this.onRetry,
    this.icon = Icons.error_outline_rounded,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: AppCard(
          child: Padding(
            padding: EdgeInsets.symmetric(
              vertical: compact ? AppSpacing.lg : AppSpacing.xl,
              horizontal: compact ? AppSpacing.md : AppSpacing.lg,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: compact ? 56 : 72,
                  height: compact ? 56 : 72,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.error.withValues(alpha: 0.10),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon,
                    size: compact ? 28 : 34,
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (message != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    message!,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
                if (onRetry != null) ...[
                  const SizedBox(height: AppSpacing.xl),
                  AppButton(
                    label: actionLabel,
                    onPressed: onRetry,
                    width: compact ? 180 : 220,
                    icon: Icons.refresh_rounded,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}