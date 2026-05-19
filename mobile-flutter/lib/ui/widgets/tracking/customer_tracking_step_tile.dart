import 'package:flutter/material.dart';

import '../../../models/customer_tracking_event.dart';

class CustomerTrackingStepTile extends StatelessWidget {
  final CustomerTrackingEvent event;

  const CustomerTrackingStepTile({super.key, required this.event});

  @override
  Widget build(BuildContext context) {
    final active = event.isDone;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
            Container(
              width: 2,
              height: 42,
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.label,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                if ((event.description ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(event.description!),
                ],
                const SizedBox(height: 4),
                Text(
                  event.date == null ? 'En attente' : _fmt(event.date!),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _fmt(DateTime value) {
    return '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')} ${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
  }
}
