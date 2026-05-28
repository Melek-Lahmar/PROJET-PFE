import 'package:flutter/material.dart';

class GpsStatusPill extends StatelessWidget {
  final bool active;
  final String label;

  const GpsStatusPill({
    super.key,
    required this.active,
    this.label = 'GPS',
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: active
            ? scheme.primary.withValues(alpha: 0.12)
            : scheme.error.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: active
              ? scheme.primary.withValues(alpha: 0.25)
              : scheme.error.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            active ? Icons.gps_fixed_rounded : Icons.gps_off_rounded,
            size: 16,
            color: active ? scheme.primary : scheme.error,
          ),
          const SizedBox(width: 6),
          Text(
            active ? '$label actif' : '$label indisponible',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: active ? scheme.primary : scheme.error,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}