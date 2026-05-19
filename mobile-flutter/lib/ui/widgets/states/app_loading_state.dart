import 'package:flutter/material.dart';

import '../../../core/theme/app_spacing.dart';

class AppLoadingState extends StatelessWidget {
  final String? message;
  final double size;
  final bool expanded;

  const AppLoadingState({
    super.key,
    this.message,
    this.size = 36,
    this.expanded = true,
  });

  @override
  Widget build(BuildContext context) {
    final child = Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: const CircularProgressIndicator(),
          ),
          if (message != null) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );

    return expanded ? Expanded(child: child) : child;
  }
}