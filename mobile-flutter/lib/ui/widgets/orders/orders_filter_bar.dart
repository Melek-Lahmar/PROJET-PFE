import 'package:flutter/material.dart';

import '../../../core/theme/app_spacing.dart';

class OrdersFilterBar extends StatelessWidget {
  final List<String> options;
  final String selected;
  final ValueChanged<String> onSelected;

  const OrdersFilterBar({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: options.map((option) {
          final isSelected = option == selected;

          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: ChoiceChip(
              label: Text(option),
              selected: isSelected,
              onSelected: (_) => onSelected(option),
              avatar: isSelected
                  ? Icon(
                Icons.check_rounded,
                size: 18,
                color: scheme.primary,
              )
                  : null,
              labelStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: isSelected
                    ? scheme.primary
                    : Theme.of(context).colorScheme.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}