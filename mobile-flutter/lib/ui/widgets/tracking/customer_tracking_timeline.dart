import 'package:flutter/material.dart';

import '../../../models/customer_tracking_event.dart';
import 'customer_tracking_step_tile.dart';

class CustomerTrackingTimeline extends StatelessWidget {
  final List<CustomerTrackingEvent> events;

  const CustomerTrackingTimeline({super.key, required this.events});

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const Text('Aucun événement de suivi disponible.');
    }

    return Column(
      children: List.generate(events.length, (index) => CustomerTrackingStepTile(
        event: events[index],
        isLast: index == events.length - 1,
      )),
    );
  }
}
