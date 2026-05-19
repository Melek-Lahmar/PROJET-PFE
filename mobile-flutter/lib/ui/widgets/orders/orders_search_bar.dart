import 'package:flutter/material.dart';

import '../../../core/theme/app_spacing.dart';
import '../common/app_card.dart';
import '../common/app_search_field.dart';

class OrdersSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onClear;
  final String hintText;

  const OrdersSearchBar({
    super.key,
    required this.controller,
    this.onChanged,
    this.onClear,
    this.hintText = 'Rechercher une commande, client, téléphone...',
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: AppSearchField(
        controller: controller,
        hintText: hintText,
        onChanged: onChanged,
        onClear: onClear,
      ),
    );
  }
}