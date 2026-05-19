import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/tunisie_gouvernorats.dart';
import '../../../state/admin_filters_provider.dart';

/// Barre de filtres globale du shell admin (gouvernorat + période).
/// Les filtres sont persistés dans `AdminFiltersProvider` et observés par
/// chaque onglet pour rafraîchir leurs données.
class AdminFilterBar extends StatelessWidget {
  const AdminFilterBar({super.key});

  @override
  Widget build(BuildContext context) {
    final filters = context.watch<AdminFiltersProvider>();
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            theme.cardColor,
            scheme.primary.withOpacity(0.04),
          ],
        ),
        border: Border(
          bottom: BorderSide(
            color: scheme.outlineVariant.withOpacity(0.5),
          ),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _GovernorateChip(
              value: filters.gouvernorat,
              onChanged: (v) => context
                  .read<AdminFiltersProvider>()
                  .setGouvernorat(v),
            ),
            const SizedBox(width: 12),
            ...AdminPeriod.values.map((p) {
              final selected = filters.period == p;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(p.label),
                  selected: selected,
                  onSelected: (_) => context
                      .read<AdminFiltersProvider>()
                      .setPeriod(p),
                ),
              );
            }),
            const SizedBox(width: 8),
            if (filters.gouvernorat != null ||
                filters.period != AdminPeriod.last30Days)
              TextButton.icon(
                onPressed: () =>
                    context.read<AdminFiltersProvider>().reset(),
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Réinitialiser'),
              ),
          ],
        ),
      ),
    );
  }
}

class _GovernorateChip extends StatelessWidget {
  final String? value;
  final ValueChanged<String?> onChanged;

  const _GovernorateChip({
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final selected = value != null;

    return Material(
      color: selected
          ? scheme.primaryContainer
          : scheme.surfaceContainerHighest.withOpacity(0.6),
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _openSelector(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.place_outlined,
                size: 18,
                color: selected ? scheme.onPrimaryContainer : scheme.primary,
              ),
              const SizedBox(width: 6),
              Text(
                value ?? 'Tous gouvernorats',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: selected
                      ? scheme.onPrimaryContainer
                      : scheme.onSurface,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.expand_more_rounded,
                size: 18,
                color: selected
                    ? scheme.onPrimaryContainer
                    : scheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openSelector(BuildContext context) async {
    final selected = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _GovernorateSheet(currentValue: value),
    );

    if (selected == null && value == null) return;
    if (selected == '__CLEAR__') {
      onChanged(null);
    } else if (selected != null) {
      onChanged(selected);
    }
  }
}

class _GovernorateSheet extends StatefulWidget {
  final String? currentValue;

  const _GovernorateSheet({required this.currentValue});

  @override
  State<_GovernorateSheet> createState() => _GovernorateSheetState();
}

class _GovernorateSheetState extends State<_GovernorateSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final filtered = TunisieGouvernorats.all
        .where((g) => g.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: scheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                children: [
                  Text(
                    'Gouvernorat',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop('__CLEAR__'),
                    child: const Text('Tous'),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                autofocus: false,
                onChanged: (v) => setState(() => _query = v),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search_rounded),
                  hintText: 'Rechercher…',
                  filled: true,
                  fillColor: scheme.surfaceContainerHighest.withOpacity(0.4),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: filtered.length,
                itemBuilder: (ctx, i) {
                  final g = filtered[i];
                  final selected = g == widget.currentValue;
                  return ListTile(
                    title: Text(g),
                    trailing: selected
                        ? Icon(Icons.check_rounded, color: scheme.primary)
                        : null,
                    onTap: () => Navigator.of(context).pop(g),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
