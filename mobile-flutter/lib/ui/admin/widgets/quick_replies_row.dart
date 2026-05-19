import 'package:flutter/material.dart';

/// Section 3.4 — Quick-replies sous les bulles assistant. ActionChip wrap.
class QuickRepliesRow extends StatelessWidget {
  final List<String> suggestions;
  final void Function(String text) onTap;
  const QuickRepliesRow({super.key, required this.suggestions, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (suggestions.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: suggestions.map((s) {
          return ActionChip(
            avatar: const Icon(Icons.bolt, size: 16),
            label: Text(s),
            onPressed: () => onTap(s),
          );
        }).toList(),
      ),
    );
  }
}
