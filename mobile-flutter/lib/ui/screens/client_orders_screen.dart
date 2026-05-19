import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/customer_order.dart';
import '../../state/client_claims_provider.dart';
import '../../state/customer_orders_provider.dart';
import '../widgets/avis_prompt_dialog.dart';
import '../widgets/client_order_card.dart';
import '../widgets/premium/animated_entry.dart';
import 'client_order_tracking_screen.dart';

/// Écran "Mes commandes" client premium :
/// - hero stats animés (total / livrées / en cours)
/// - barre de recherche stylée
/// - chips statut avec couleurs vives
/// - cards animées en entrée (cascade)
/// - empty states thématisés
class ClientOrdersScreen extends StatefulWidget {
  const ClientOrdersScreen({super.key});

  @override
  State<ClientOrdersScreen> createState() => _ClientOrdersScreenState();
}

class _ClientOrdersScreenState extends State<ClientOrdersScreen> {
  Timer? _polling;
  String _statusFilter = 'ALL';
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  Timer? _debounce;

  static const List<_FilterSpec> _filters = [
    _FilterSpec('ALL', 'Toutes', Icons.list_rounded, Color(0xFF6366F1)),
    _FilterSpec('EN_ATTENTE', 'En attente', Icons.schedule_rounded, Color(0xFF64748B)),
    _FilterSpec('CONFIRME', 'Confirmées', Icons.verified_rounded, Color(0xFF22C55E)),
    _FilterSpec('EN_LIVRAISON', 'En livraison', Icons.local_shipping_rounded, Color(0xFF3B82F6)),
    _FilterSpec('LIVRE', 'Livrées', Icons.check_circle_rounded, Color(0xFF14B8A6)),
    _FilterSpec('REPORTE', 'Reportées', Icons.event_repeat_rounded, Color(0xFFF59E0B)),
    _FilterSpec('RETOUR', 'Retournées', Icons.undo_rounded, Color(0xFF8B5CF6)),
    _FilterSpec('REFUSE', 'Refusées', Icons.cancel_rounded, Color(0xFFEF4444)),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      context.read<CustomerOrdersProvider>().refresh();
      await AvisPromptDialog.tryShowNext(context);
    });
    _polling = Timer.periodic(const Duration(seconds: 20), (_) {
      if (!mounted) return;
      context.read<CustomerOrdersProvider>().refresh();
    });
  }

  @override
  void dispose() {
    _polling?.cancel();
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String raw) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) return;
      setState(() => _query = raw.trim().toLowerCase());
    });
  }

  List<CustomerOrder> _apply(List<CustomerOrder> list) {
    final byStatus = _statusFilter == 'ALL'
        ? list
        : list.where((o) => o.normalizedStatus == _statusFilter).toList();
    if (_query.isEmpty) return byStatus;
    return byStatus.where((o) => _matchesQuery(o, _query)).toList();
  }

  bool _matchesQuery(CustomerOrder o, String q) {
    if (o.piece.toLowerCase().contains(q)) return true;
    if ((o.city ?? '').toLowerCase().contains(q)) return true;
    if ((o.address ?? '').toLowerCase().contains(q)) return true;
    if (o.statusLabel.toLowerCase().contains(q)) return true;
    return false;
  }

  void _openTracking(CustomerOrder order) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MultiProvider(
          providers: [
            ChangeNotifierProvider.value(
              value: context.read<CustomerOrdersProvider>(),
            ),
            ChangeNotifierProvider.value(
              value: context.read<ClientClaimsProvider>(),
            ),
          ],
          child: ClientOrderTrackingScreen(initialOrder: order),
        ),
      ),
    );
  }

  ({int total, int delivered, int inProgress, int pending}) _computeStats(
      List<CustomerOrder> all) {
    int delivered = 0, inProgress = 0, pending = 0;
    for (final o in all) {
      switch (o.normalizedStatus) {
        case 'LIVRE':
          delivered++;
          break;
        case 'EN_LIVRAISON':
        case 'CONFIRME':
          inProgress++;
          break;
        case 'EN_ATTENTE':
          pending++;
          break;
      }
    }
    return (
      total: all.length,
      delivered: delivered,
      inProgress: inProgress,
      pending: pending,
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CustomerOrdersProvider>();
    final sorted = [...provider.orders]..sort(
        (a, b) => (b.date ?? DateTime.fromMillisecondsSinceEpoch(0))
            .compareTo(a.date ?? DateTime.fromMillisecondsSinceEpoch(0)),
      );
    final orders = _apply(sorted);
    final stats = _computeStats(sorted);

    return RefreshIndicator(
      onRefresh: provider.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          if (sorted.isNotEmpty)
            EntryAnimation(
              duration: const Duration(milliseconds: 360),
              slide: 14,
              child: _HeroStats(stats: stats),
            ),
          if (sorted.isNotEmpty) const SizedBox(height: 14),
          EntryAnimation(
            duration: const Duration(milliseconds: 360),
            delay: const Duration(milliseconds: 80),
            slide: 12,
            child: _SearchField(
              controller: _searchCtrl,
              query: _query,
              onChanged: _onSearchChanged,
              onClear: () {
                _searchCtrl.clear();
                setState(() => _query = '');
              },
            ),
          ),
          const SizedBox(height: 10),
          EntryAnimation(
            duration: const Duration(milliseconds: 360),
            delay: const Duration(milliseconds: 140),
            slide: 12,
            child: SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final f = _filters[i];
                  return _FilterChipPremium(
                    spec: f,
                    selected: _statusFilter == f.code,
                    onTap: () => setState(() => _statusFilter = f.code),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 14),
          if (provider.loading && sorted.isEmpty)
            const _LoadingCard()
          else if (provider.error != null && sorted.isEmpty)
            _ErrorCard(message: provider.error!, onRetry: provider.refresh)
          else if (sorted.isEmpty)
            const _EmptyCard()
          else if (orders.isEmpty)
            _NoResultsCard(
              onReset: () {
                _searchCtrl.clear();
                setState(() {
                  _statusFilter = 'ALL';
                  _query = '';
                });
              },
            )
          else
            ...List.generate(orders.length, (i) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: EntryAnimation(
                  duration: const Duration(milliseconds: 320),
                  delay: Duration(milliseconds: 60 + i * 40),
                  slide: 14,
                  child: ClientOrderCard(
                    order: orders[i],
                    onTap: () => _openTracking(orders[i]),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _FilterSpec {
  final String code;
  final String label;
  final IconData icon;
  final Color color;
  const _FilterSpec(this.code, this.label, this.icon, this.color);
}

class _HeroStats extends StatelessWidget {
  final ({int total, int delivered, int inProgress, int pending}) stats;
  const _HeroStats({required this.stats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withOpacity(0.32),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.dashboard_rounded, color: Colors.white, size: 18),
              const SizedBox(width: 6),
              Text('Aperçu',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.3,
                  )),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.20),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('${stats.total} commande${stats.total > 1 ? 's' : ''}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    )),
              ),
            ],
          ),
          const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              children: [
                _StatBlock(
                  icon: Icons.check_circle_rounded,
                  label: 'Livrées',
                  value: stats.delivered.toString(),
                  color: const Color(0xFF22C55E),
                ),
                _ThinDivider(),
                _StatBlock(
                  icon: Icons.local_shipping_rounded,
                  label: 'En cours',
                  value: stats.inProgress.toString(),
                  color: const Color(0xFFFFD43B),
                ),
                _ThinDivider(),
                _StatBlock(
                  icon: Icons.schedule_rounded,
                  label: 'En attente',
                  value: stats.pending.toString(),
                  color: const Color(0xFFFB923C),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatBlock({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.20),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 6),
          Text(value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 22,
                letterSpacing: -0.5,
              )),
          Text(label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.85),
                fontWeight: FontWeight.w700,
                fontSize: 10,
              )),
        ],
      ),
    );
  }
}

class _ThinDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
      color: Colors.white.withOpacity(0.20),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final String query;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _SearchField({
    required this.controller,
    required this.query,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withOpacity(0.55),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant.withOpacity(0.4)),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Rechercher (numéro, ville, adresse...)',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: query.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: onClear,
                ),
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        ),
      ),
    );
  }
}

class _FilterChipPremium extends StatelessWidget {
  final _FilterSpec spec;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChipPremium({
    required this.spec,
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
                  colors: [spec.color, spec.color.withOpacity(0.78)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: selected ? null : spec.color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? Colors.transparent : spec.color.withOpacity(0.25),
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: spec.color.withOpacity(0.32),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(spec.icon,
                size: 14, color: selected ? Colors.white : spec.color),
            const SizedBox(width: 6),
            Text(
              spec.label,
              style: TextStyle(
                color: selected ? Colors.white : spec.color,
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

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 64),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorCard({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: scheme.errorContainer.withOpacity(0.30),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.error.withOpacity(0.25)),
      ),
      child: Column(
        children: [
          Icon(Icons.cloud_off_rounded, size: 40, color: scheme.error),
          const SizedBox(height: 8),
          Text('Impossible de charger',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
                color: scheme.error,
              )),
          const SizedBox(height: 4),
          Text(message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              )),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            scheme.primary.withOpacity(0.06),
            scheme.surfaceContainerHighest.withOpacity(0.4),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.primary.withOpacity(0.16)),
      ),
      child: Column(
        children: [
          EntryScale(
            duration: const Duration(milliseconds: 600),
            child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [scheme.primary, scheme.primary.withOpacity(0.78)],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: scheme.primary.withOpacity(0.30),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(Icons.inventory_2_outlined,
                  color: Colors.white, size: 40),
            ),
          ),
          const SizedBox(height: 14),
          Text('Aucune commande pour l\'instant',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              )),
          const SizedBox(height: 4),
          Text(
            'Dès qu\'une commande sera créée pour toi, elle apparaîtra ici en temps réel.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoResultsCard extends StatelessWidget {
  final VoidCallback onReset;
  const _NoResultsCard({required this.onReset});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withOpacity(0.4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant.withOpacity(0.5)),
      ),
      child: Column(
        children: [
          Icon(Icons.search_off_rounded, size: 48, color: scheme.primary),
          const SizedBox(height: 8),
          Text('Aucun résultat',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              )),
          const SizedBox(height: 4),
          Text('Aucune commande ne correspond à tes filtres.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              )),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: onReset,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Effacer les filtres'),
          ),
        ],
      ),
    );
  }
}
