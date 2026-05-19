import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/admin_dashboard_overview.dart' show AdminKpi;
import '../../../state/admin_filters_provider.dart';
import '../../../state/admin_orders_provider.dart';
import '../../widgets/premium/animated_entry.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';
import '../widgets/admin_filter_bar.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/kpi_drill_down_resolver.dart' show KpiDomain;
import '../widgets/orders/admin_order_detail_drawer.dart';
import '../widgets/orders/admin_order_row.dart';
import '../widgets/orders/admin_orders_filter_bar.dart';
import '../widgets/orders/admin_orders_pagination.dart';

/// Onglet Commandes/Colis du cockpit admin :
/// - filtres globaux (période + gouvernorat)
/// - filtres locaux (statut, recherche, tri)
/// - KPIs sur la période
/// - liste paginée
/// - drawer détail au clic
class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  String? _lastGov;
  AdminPeriod? _lastPeriod;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _maybeRefresh(force: true);
    });
  }

  void _maybeRefresh({bool force = false}) {
    final filters = context.read<AdminFiltersProvider>();
    if (!force &&
        _lastGov == filters.gouvernorat &&
        _lastPeriod == filters.period) {
      return;
    }
    _lastGov = filters.gouvernorat;
    _lastPeriod = filters.period;
    context.read<AdminOrdersProvider>().refresh(
          governorate: filters.gouvernorat,
          period: filters.period,
        );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AdminFiltersProvider>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh();
    });

    return Column(
      children: [
        const AdminFilterBar(),
        const AdminOrdersFilterBar(),
        const Expanded(child: _OrdersBody()),
        const _PaginationBar(),
      ],
    );
  }
}

class _OrdersBody extends StatelessWidget {
  const _OrdersBody();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<AdminOrdersProvider>();

    if (prov.loading && prov.data == null) {
      return const _OrdersSkeleton();
    }

    if (prov.error != null && prov.data == null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PremiumCard(
            child: EmptyView(
              icon: Icons.cloud_off_rounded,
              title: 'Impossible de charger les commandes',
              subtitle: prov.error!,
              ctaLabel: 'Réessayer',
              onCta: () => context.read<AdminOrdersProvider>().reload(),
            ),
          ),
        ],
      );
    }

    final data = prov.data;
    if (data == null) return const SizedBox.shrink();

    return RefreshIndicator(
      onRefresh: () => context.read<AdminOrdersProvider>().reload(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        children: [
          if (prov.refreshing)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          _KpiGrid(kpis: data.kpis),
          const SizedBox(height: 18),
          if (data.items.isEmpty)
            const PremiumCard(
              child: EmptyView(
                icon: Icons.inbox_rounded,
                title: 'Aucune commande',
                subtitle: 'Aucun résultat pour ces filtres.',
              ),
            )
          else
            for (int i = 0; i < data.items.length; i++)
              EntryAnimation(
                duration: const Duration(milliseconds: 320),
                delay: Duration(milliseconds: 30 + i * 28),
                slide: 12,
                child: AdminOrderRow(
                  item: data.items[i],
                  onTap: () =>
                      AdminOrderDetailDrawer.show(context, data.items[i].piece),
                ),
              ),
        ],
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final List<AdminKpi> kpis;
  const _KpiGrid({required this.kpis});

  @override
  Widget build(BuildContext context) {
    if (kpis.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (ctx, constraints) {
        final w = constraints.maxWidth;
        int cols;
        if (w >= 1200) {
          cols = 5;
        } else if (w >= 900) {
          cols = 4;
        } else if (w >= 600) {
          cols = 3;
        } else if (w >= 360) {
          cols = 2;
        } else {
          cols = 1;
        }
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            mainAxisExtent: 142,
          ),
          itemCount: kpis.length,
          itemBuilder: (_, i) {
            final kpi = kpis[i];
            final visual = _kpiVisual(kpi.key);
            return AdminKpiCard(
              kpi: kpi,
              icon: visual.icon,
              accent: visual.color,
              domain: KpiDomain.orders,
            );
          },
        );
      },
    );
  }

  _KpiVisual _kpiVisual(String key) {
    switch (key) {
      case 'orders':
        return const _KpiVisual(Icons.inventory_2_rounded, Color(0xFF3B82F6));
      case 'pending':
        return const _KpiVisual(Icons.schedule_rounded, Color(0xFFF59E0B));
      case 'confirmed':
        return const _KpiVisual(Icons.check_circle_outline_rounded, Color(0xFF6366F1));
      case 'inDelivery':
        return const _KpiVisual(Icons.local_shipping_rounded, Color(0xFF0EA5E9));
      case 'delivered':
        return const _KpiVisual(Icons.verified_rounded, Color(0xFF22C55E));
      case 'returned':
        return const _KpiVisual(Icons.undo_rounded, Color(0xFFEF4444));
      case 'postponed':
        return const _KpiVisual(Icons.event_busy_rounded, Color(0xFFF97316));
      case 'refused':
        return const _KpiVisual(Icons.cancel_outlined, Color(0xFF991B1B));
      case 'deliveryRate':
        return const _KpiVisual(Icons.percent_rounded, Color(0xFF10B981));
      default:
        return const _KpiVisual(Icons.bar_chart_rounded, Color(0xFF6B7280));
    }
  }
}

class _KpiVisual {
  final IconData icon;
  final Color color;
  const _KpiVisual(this.icon, this.color);
}

class _PaginationBar extends StatelessWidget {
  const _PaginationBar();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<AdminOrdersProvider>();
    final data = prov.data;
    if (data == null) return const SizedBox.shrink();

    return AdminOrdersPagination(
      page: data.page,
      totalPages: data.totalPages,
      total: data.total,
      pageSize: data.pageSize,
      onGoTo: (p) => context.read<AdminOrdersProvider>().goToPage(p),
    );
  }
}

class _OrdersSkeleton extends StatelessWidget {
  const _OrdersSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 4,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.45,
          children: List.generate(8, (_) => const SkeletonBlock(height: 100)),
        ),
        const SizedBox(height: 18),
        for (int i = 0; i < 6; i++) ...[
          const SkeletonBlock(height: 78),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}
