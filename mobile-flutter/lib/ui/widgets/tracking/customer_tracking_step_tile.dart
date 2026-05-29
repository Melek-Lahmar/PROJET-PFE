import 'package:flutter/material.dart';

import '../../../models/customer_tracking_event.dart';

class CustomerTrackingStepTile extends StatelessWidget {
  final CustomerTrackingEvent event;
  final bool isLast;

  const CustomerTrackingStepTile({
    super.key,
    required this.event,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final state = event.state;

    Color circleColor;
    Color lineColor;
    Widget circleChild;

    switch (state) {
      case 'DONE':
        circleColor = Colors.green.shade600;
        lineColor = Colors.green.shade300;
        circleChild = const Icon(Icons.check_rounded, size: 11, color: Colors.white);
      case 'ACTIVE':
        circleColor = scheme.primary;
        lineColor = scheme.primary.withValues(alpha: 0.4);
        circleChild = Container(
          width: 6,
          height: 6,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
          ),
        );
      case 'ERROR':
        circleColor = scheme.error;
        lineColor = scheme.error.withValues(alpha: 0.3);
        circleChild = const Icon(Icons.close_rounded, size: 11, color: Colors.white);
      default: // PENDING
        circleColor = scheme.outlineVariant;
        lineColor = scheme.outlineVariant.withValues(alpha: 0.5);
        circleChild = const SizedBox();
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: circleColor,
              ),
              child: Center(child: circleChild),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 36,
                color: lineColor,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.label,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: state == 'PENDING'
                            ? scheme.onSurfaceVariant
                            : state == 'ERROR'
                                ? scheme.error
                                : state == 'ACTIVE'
                                    ? scheme.primary
                                    : scheme.onSurface,
                      ),
                ),
                if ((event.description ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    event.description!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                ],
                const SizedBox(height: 3),
                Text(
                  event.date == null ? 'En attente' : _fmt(event.date!),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: state == 'DONE'
                            ? Colors.green.shade700
                            : state == 'ACTIVE'
                                ? scheme.primary
                                : scheme.onSurfaceVariant.withValues(alpha: 0.6),
                      ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _fmt(DateTime value) {
    return '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')} '
        '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
  }
}
