import 'package:flutter/material.dart';

import '../../../models/orders_filters.dart';

class OrdersActiveFiltersBar extends StatelessWidget {
  final OrdersFilters filters;
  final ValueChanged<OrdersFilters> onChanged;
  final VoidCallback onClearAll;

  const OrdersActiveFiltersBar({
    super.key,
    required this.filters,
    required this.onChanged,
    required this.onClearAll,
  });

  @override
  Widget build(BuildContext context) {
    if (!filters.hasAny) return const SizedBox.shrink();

    final chips = <Widget>[];

    if (filters.statut != null) {
      chips.add(
        _chip(
          label: 'Statut: ${OrdersFilters.statusLabel(filters.statut!)}',
          onDeleted: () => onChanged(
            filters.copyWith(clearStatut: true),
          ),
        ),
      );
    }

    if (filters.urgentOnly) {
      chips.add(
        _chip(
          label: 'Urgent',
          onDeleted: () => onChanged(
            filters.copyWith(urgentOnly: false),
          ),
        ),
      );
    }

    if (filters.todayOnly) {
      chips.add(
        _chip(
          label: 'Aujourd’hui',
          onDeleted: () => onChanged(
            filters.copyWith(todayOnly: false),
          ),
        ),
      );
    }

    if (filters.normalizedPaymentMethod != null) {
      chips.add(
        _chip(
          label: 'Paiement: ${filters.normalizedPaymentMethod!}',
          onDeleted: () => onChanged(
            filters.copyWith(clearPaymentMethod: true),
          ),
        ),
      );
    }

    if (filters.minMontant != null) {
      chips.add(
        _chip(
          label: 'Min: ${filters.minMontant!.toStringAsFixed(2)} DT',
          onDeleted: () => onChanged(
            filters.copyWith(clearMinMontant: true),
          ),
        ),
      );
    }

    if (filters.maxMontant != null) {
      chips.add(
        _chip(
          label: 'Max: ${filters.maxMontant!.toStringAsFixed(2)} DT',
          onDeleted: () => onChanged(
            filters.copyWith(clearMaxMontant: true),
          ),
        ),
      );
    }

    if (filters.dateFrom != null) {
      chips.add(
        _chip(
          label: 'Du: ${_fmtDate(filters.dateFrom!)}',
          onDeleted: () => onChanged(
            filters.copyWith(clearDateFrom: true),
          ),
        ),
      );
    }

    if (filters.dateTo != null) {
      chips.add(
        _chip(
          label: 'Au: ${_fmtDate(filters.dateTo!)}',
          onDeleted: () => onChanged(
            filters.copyWith(clearDateTo: true),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Filtres actifs',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            TextButton(
              onPressed: onClearAll,
              child: const Text('Tout effacer'),
            ),
          ],
        ),
        const SizedBox(height: 6),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: chips
                .map(
                  (w) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: w,
              ),
            )
                .toList(),
          ),
        ),
      ],
    );
  }

  Widget _chip({
    required String label,
    required VoidCallback onDeleted,
  }) {
    return InputChip(
      label: Text(label),
      onDeleted: onDeleted,
    );
  }

  String _fmtDate(DateTime date) {
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    final y = date.year.toString();
    return '$d/$m/$y';
  }
}