import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../state/admin_orders_provider.dart';

/// Barre filtres locaux de l'onglet Commandes :
/// - chips statut (commande + livraison)
/// - champ recherche (debouncé dans le provider)
/// - menu tri
class AdminOrdersFilterBar extends StatefulWidget {
  const AdminOrdersFilterBar({super.key});

  @override
  State<AdminOrdersFilterBar> createState() => _AdminOrdersFilterBarState();
}

class _AdminOrdersFilterBarState extends State<AdminOrdersFilterBar> {
  late final TextEditingController _searchCtrl;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController(
      text: context.read<AdminOrdersProvider>().search,
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final prov = context.watch<AdminOrdersProvider>();

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(
          bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.4)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Recherche + tri
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => prov.setSearch(v),
                  decoration: InputDecoration(
                    hintText: 'Rechercher (n° pièce, client, ville…)',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    suffixIcon: prov.search.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.close_rounded, size: 18),
                            onPressed: () {
                              _searchCtrl.clear();
                              prov.clearSearch();
                            },
                          ),
                    isDense: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              _SortMenu(
                value: prov.sort,
                onChanged: prov.setSort,
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Chips statuts
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final s in _statuses)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(s.label),
                      selected: prov.status == s.key,
                      onSelected: (_) => prov.setStatus(s.key),
                      avatar: Icon(
                        s.icon,
                        size: 16,
                        color: prov.status == s.key
                            ? scheme.onPrimary
                            : scheme.onSurfaceVariant,
                      ),
                      selectedColor: scheme.primary,
                      labelStyle: TextStyle(
                        color: prov.status == s.key
                            ? scheme.onPrimary
                            : scheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static const _statuses = <_StatusOption>[
    _StatusOption('all', 'Tous', Icons.list_alt_rounded),
    _StatusOption('pending', 'En attente', Icons.schedule_rounded),
    _StatusOption('confirmed', 'Confirmées', Icons.check_circle_outline_rounded),
    _StatusOption('inDelivery', 'En livraison', Icons.local_shipping_rounded),
    _StatusOption('delivered', 'Livrées', Icons.verified_rounded),
    _StatusOption('returned', 'Retournées', Icons.undo_rounded),
    _StatusOption('postponed', 'Reportées', Icons.event_busy_rounded),
    _StatusOption('refused', 'Refusées', Icons.cancel_outlined),
    _StatusOption('tentative', 'Tentatives', Icons.history_rounded),
  ];
}

class _StatusOption {
  final String key;
  final String label;
  final IconData icon;
  const _StatusOption(this.key, this.label, this.icon);
}

class _SortMenu extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const _SortMenu({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return PopupMenuButton<String>(
      tooltip: 'Tri',
      onSelected: onChanged,
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'date_desc', child: Text('Date (plus récent)')),
        PopupMenuItem(value: 'date_asc', child: Text('Date (plus ancien)')),
        PopupMenuItem(value: 'amount_desc', child: Text('Montant (décroissant)')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          border: Border.all(color: scheme.outlineVariant),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.sort_rounded, size: 18),
            const SizedBox(width: 6),
            Text(_sortLabel(value),
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                )),
            const SizedBox(width: 4),
            const Icon(Icons.arrow_drop_down_rounded, size: 18),
          ],
        ),
      ),
    );
  }

  String _sortLabel(String v) {
    switch (v) {
      case 'date_asc':
        return 'Plus ancien';
      case 'amount_desc':
        return 'Montant';
      default:
        return 'Plus récent';
    }
  }
}
