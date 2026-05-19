import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/services/commande_lock_service.dart';
import '../../models/commande_lock.dart';
import '../../models/confirmatrice_order.dart';
import '../../state/confirmatrice_orders_provider.dart';
import '../widgets/premium/animated_entry.dart';
import 'confirmatrice_order_details_screen.dart';

class ConfirmatriceOrdersScreen extends StatefulWidget {
  const ConfirmatriceOrdersScreen({super.key});

  @override
  State<ConfirmatriceOrdersScreen> createState() =>
      _ConfirmatriceOrdersScreenState();
}

class _ConfirmatriceOrdersScreenState extends State<ConfirmatriceOrdersScreen> {
  bool _initialized = false;
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  Timer? _debounce;

  static const List<int?> _statusItems = [
    null,
    0,
    1,
    2,
    3,
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;

    // Démarrage : on passe par `setFilter(0)` pour installer explicitement
    // le filtre "En attente" (le plus utile en ouvrant). `setFilter` recharge
    // la liste. Évite le bug historique où `refresh(status:)` re-utilisait
    // `currentStatus` et empêchait de revenir à "Tous".
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ConfirmatriceOrdersProvider>().setFilter(0);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _applyFilter(int? status) async {
    await context.read<ConfirmatriceOrdersProvider>().setFilter(status);
  }

  void _onSearchChanged(String raw) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) return;
      setState(() => _query = raw.trim().toLowerCase());
    });
  }

  List<ConfirmatriceOrder> _visibleItems(List<ConfirmatriceOrder> all) {
    if (_query.isEmpty) return all;
    return all.where((o) => _matches(o, _query)).toList();
  }

  bool _matches(ConfirmatriceOrder o, String q) {
    final piece = o.piece.toLowerCase();
    if (piece.contains(q)) return true;
    final client = (o.clientDisplay ?? '').toLowerCase();
    if (client.contains(q)) return true;
    final tiers = (o.tiers ?? '').toLowerCase();
    if (tiers.contains(q)) return true;
    final c = o.client;
    if (c != null) {
      for (final f in [
        c.gouvernorat,
        c.delegation,
        c.adresse,
        c.telephone,
        c.nomComplet,
        c.nomSociete,
      ]) {
        if (f != null && f.toLowerCase().contains(q)) return true;
      }
    }
    return false;
  }

  Future<void> _openDetails(ConfirmatriceOrder order) async {
    final provider = context.read<ConfirmatriceOrdersProvider>();

    final AcquireLockResult acquired;
    try {
      acquired = await provider.acquireLock(order.piece);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur verrou : $e')),
      );
      return;
    }

    if (!mounted) return;

    if (!acquired.acquired) {
      final who = (acquired.conflictOwnerEmail ?? '').isNotEmpty
          ? ' par ${acquired.conflictOwnerEmail}'
          : ' par une autre confirmatrice';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            acquired.conflictMessage ??
                'Commande en cours de traitement$who.',
          ),
        ),
      );
      return;
    }

    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: provider,
          child: ConfirmatriceOrderDetailsScreen(piece: order.piece),
        ),
      ),
    );

    if (!mounted) return;

    if (provider.isLockedByMe(order.piece)) {
      await provider.releaseLock(order.piece);
    }

    if (!mounted) return;
    if (changed == true) {
      await provider.refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ConfirmatriceOrdersProvider>();
    final filtered = _visibleItems(state.items);

    return Scaffold(
      body: Column(
        children: [
          // Barre de recherche + bouton actualiser.
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: _onSearchChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Rechercher par numéro, client, ville…',
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close_rounded),
                              onPressed: () {
                                _searchCtrl.clear();
                                setState(() => _query = '');
                              },
                            ),
                      isDense: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  tooltip: 'Actualiser',
                  onPressed: state.loading
                      ? null
                      : () => context
                          .read<ConfirmatriceOrdersProvider>()
                          .refresh(),
                  icon: const Icon(Icons.refresh_rounded),
                ),
              ],
            ),
          ),
          // Chips de filtre statut premium (gradient quand sélectionné).
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _statusItems.map((status) {
                  final selected = state.currentStatus == status;
                  final spec = _filterSpec(status);
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: _ConfFilterChip(
                      label: spec.label,
                      icon: spec.icon,
                      color: spec.color,
                      selected: selected,
                      onTap: () => _applyFilter(status),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          if (state.loading) const LinearProgressIndicator(),
          if (state.error != null && state.items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .errorContainer
                      .withOpacity(0.45),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  state.error!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () =>
                  context.read<ConfirmatriceOrdersProvider>().refresh(),
              child: Builder(
                builder: (context) {
                  if (state.loading && state.items.isEmpty) {
                    return const Center(
                      child: CircularProgressIndicator(),
                    );
                  }

                  if (state.error != null && state.items.isEmpty) {
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(24),
                      children: [
                        const SizedBox(height: 80),
                        Icon(
                          Icons.error_outline_rounded,
                          size: 56,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Impossible de charger les commandes.',
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          state.error!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Center(
                          child: FilledButton.icon(
                            onPressed: () => context
                                .read<ConfirmatriceOrdersProvider>()
                                .refresh(),
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Réessayer'),
                          ),
                        ),
                      ],
                    );
                  }

                  if (state.items.isEmpty) {
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(24),
                      children: [
                        const SizedBox(height: 90),
                        Icon(
                          Icons.inventory_2_outlined,
                          size: 64,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Aucune commande à afficher',
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Change le filtre ou actualise pour recharger.',
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                        ),
                      ],
                    );
                  }

                  if (filtered.isEmpty) {
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(24),
                      children: [
                        const SizedBox(height: 90),
                        Icon(
                          Icons.search_off_rounded,
                          size: 56,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Aucun résultat pour "$_query".',
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                        ),
                      ],
                    );
                  }

                  return ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      final lock = state.lockFor(item.piece);
                      return EntryAnimation(
                        duration: const Duration(milliseconds: 320),
                        delay: Duration(milliseconds: 40 + index * 35),
                        slide: 12,
                        child: _OrderTile(
                          order: item,
                          lock: lock,
                          onTap: () => _openDetails(item),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  ({String label, IconData icon, Color color}) _filterSpec(int? status) {
    switch (status) {
      case 0:
        return (
          label: 'En attente',
          icon: Icons.schedule_rounded,
          color: const Color(0xFF64748B),
        );
      case 1:
        return (
          label: 'Confirmées',
          icon: Icons.verified_rounded,
          color: const Color(0xFF22C55E),
        );
      case 2:
        return (
          label: 'Tentatives',
          icon: Icons.error_outline_rounded,
          color: const Color(0xFFFB923C),
        );
      case 3:
        return (
          label: 'Refusées',
          icon: Icons.cancel_rounded,
          color: const Color(0xFFEF4444),
        );
      default:
        return (
          label: 'Toutes',
          icon: Icons.list_rounded,
          color: const Color(0xFF6366F1),
        );
    }
  }
}

class _ConfFilterChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;
  const _ConfFilterChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          gradient: selected
              ? LinearGradient(
                  colors: [color, color.withOpacity(0.78)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: selected ? null : color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: selected ? Colors.transparent : color.withOpacity(0.25)),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.32),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: selected ? Colors.white : color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : color,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  final ConfirmatriceOrder order;
  final CommandeLock? lock;
  final VoidCallback onTap;

  const _OrderTile({
    required this.order,
    required this.lock,
    required this.onTap,
  });

  bool get _lockedByOther => lock != null && !lock!.isMine;
  bool get _lockedByMe => lock != null && lock!.isMine;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final card = InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: _lockedByMe
                ? scheme.primary.withOpacity(0.5)
                : scheme.outline.withOpacity(0.12),
            width: _lockedByMe ? 1.4 : 1,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x12000000),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.piece,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _StatusBadge(
                  label: order.displayStatus,
                  normalized: order.normalizedStatus,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              order.clientDisplay ?? 'Client',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              order.tiers ?? '--',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            // Ligne ville/gouvernorat si disponible.
            if (_cityLine(order).isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.location_on_outlined,
                      size: 14, color: scheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      _cityLine(order),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined, size: 16),
                const SizedBox(width: 6),
                Expanded(child: Text(_fmt(order.date))),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.payments_outlined, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: Text('${order.netAPayer.toStringAsFixed(3)} TND'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (_lockedByMe)
              _LockBanner(
                color: scheme.primary,
                bg: scheme.primary.withOpacity(0.10),
                icon: Icons.lock_outline_rounded,
                label: 'Tu traites cette commande. Appuie pour continuer.',
              )
            else if (_lockedByOther)
              _LockBanner(
                color: scheme.error,
                bg: scheme.error.withOpacity(0.08),
                icon: Icons.lock_person_outlined,
                label: _otherOwnerLabel(lock!),
              )
            else
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withOpacity(0.45),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Appuyer pour ouvrir le détail de la commande',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded),
                  ],
                ),
              ),
          ],
        ),
      ),
    );

    if (!_lockedByOther) return card;

    return Opacity(
      opacity: 0.55,
      child: IgnorePointer(
        ignoring: true,
        child: card,
      ),
    );
  }

  static String _cityLine(ConfirmatriceOrder o) {
    final c = o.client;
    if (c == null) return '';
    final parts = <String>[
      if ((c.delegation ?? '').trim().isNotEmpty) c.delegation!.trim(),
      if ((c.gouvernorat ?? '').trim().isNotEmpty) c.gouvernorat!.trim(),
    ];
    return parts.join(' • ');
  }

  static String _otherOwnerLabel(CommandeLock lock) {
    final email = (lock.lockedByEmail ?? '').trim();
    if (email.isEmpty) {
      return 'En cours de traitement par une autre confirmatrice.';
    }
    return 'En cours de traitement par $email.';
  }

  static String _fmt(DateTime? value) {
    if (value == null) return '--';
    final d = value.toLocal();
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
  }
}

class _LockBanner extends StatelessWidget {
  final Color color;
  final Color bg;
  final IconData icon;
  final String label;

  const _LockBanner({
    required this.color,
    required this.bg,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final String normalized;

  const _StatusBadge({
    required this.label,
    required this.normalized,
  });

  @override
  Widget build(BuildContext context) {
    Color border;
    Color text;
    Color bg;

    switch (normalized) {
      case 'EN_ATTENTE':
        border = const Color(0xFFE4D58A);
        text = const Color(0xFF8A6D1A);
        bg = const Color(0xFFFFF6CC);
        break;
      case 'CONFIRME':
        border = const Color(0xFF8FD19E);
        text = const Color(0xFF1F7A35);
        bg = const Color(0xFFE7F8EC);
        break;
      case 'TENTATIVE':
        border = const Color(0xFFF4B183);
        text = const Color(0xFFB85C00);
        bg = const Color(0xFFFFEAD9);
        break;
      case 'REFUSE':
        border = const Color(0xFFF2A0A0);
        text = const Color(0xFFB42318);
        bg = const Color(0xFFFDECEC);
        break;
      default:
        border = Colors.grey.shade300;
        text = Colors.grey.shade800;
        bg = Colors.grey.shade100;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}
