import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/admin_dashboard_service.dart';
import '../../../models/admin_dashboard_overview.dart';
import '../../../state/admin_dashboard_provider.dart';
import '../../../state/admin_filters_provider.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';
import '../widgets/admin_chart_card.dart';
import '../widgets/admin_filter_bar.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/kpi_drill_down_resolver.dart' show KpiDomain;
import '../widgets/charts/admin_deliveries_returns_chart.dart';
import '../widgets/charts/admin_governorate_bar_chart.dart';
import '../widgets/charts/admin_status_donut_chart.dart';
import '../widgets/charts/admin_volume_trend_chart.dart';

/// Cockpit Dashboard global admin : KPI animés (12) + 4 graphiques + filtres.
/// S'auto-rafraîchit dès que l'utilisateur change un filtre dans la barre du shell.
class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => AdminDashboardProvider(
        AdminDashboardService(ctx.read<ApiClient>()),
      ),
      child: const _AdminDashboardBody(),
    );
  }
}

class _AdminDashboardBody extends StatefulWidget {
  const _AdminDashboardBody();

  @override
  State<_AdminDashboardBody> createState() => _AdminDashboardBodyState();
}

class _AdminDashboardBodyState extends State<_AdminDashboardBody> {
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
    context.read<AdminDashboardProvider>().refresh(
          governorate: filters.gouvernorat,
          period: filters.period,
        );
  }

  @override
  Widget build(BuildContext context) {
    // Re-fetch quand le filtre change.
    context.watch<AdminFiltersProvider>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh();
    });

    return Column(
      children: [
        const AdminFilterBar(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              await context.read<AdminDashboardProvider>().refresh(
                    governorate: context.read<AdminFiltersProvider>().gouvernorat,
                    period: context.read<AdminFiltersProvider>().period,
                  );
            },
            child: const _DashboardContent(),
          ),
        ),
      ],
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<AdminDashboardProvider>();

    if (prov.loading && prov.data == null) {
      return const _DashboardSkeleton();
    }

    if (prov.error != null && prov.data == null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PremiumCard(
            child: EmptyView(
              icon: Icons.cloud_off_rounded,
              title: 'Impossible de charger le dashboard',
              subtitle: prov.error!,
              ctaLabel: 'Réessayer',
              onCta: () {
                final f = context.read<AdminFiltersProvider>();
                context
                    .read<AdminDashboardProvider>()
                    .refresh(governorate: f.gouvernorat, period: f.period);
              },
            ),
          ),
        ],
      );
    }

    final data = prov.data;
    if (data == null) {
      return const SizedBox.shrink();
    }

    return _DashboardLoaded(data: data);
  }
}

class _DashboardLoaded extends StatelessWidget {
  final AdminDashboardOverview data;

  const _DashboardLoaded({required this.data});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        // Grille KPIs : toujours ≥ 2 colonnes (jamais 1 par ligne).
        // 2 (mobile) / 3 (tablette) / 4 (desktop) — cible produit.
        final kpiColumns = w >= 1300 ? 4 : w >= 900 ? 3 : 2;
        final twoColCharts = w >= 1100;

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _KpiGrid(kpis: data.kpis, columns: kpiColumns),
            const SizedBox(height: 16),
            if (twoColCharts) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: AdminChartCard(
                      icon: Icons.show_chart_rounded,
                      accent: const Color(0xFF22C55E),
                      title: 'Livrées vs retournées',
                      subtitle: 'Évolution sur la période',
                      height: 260,
                      child: AdminDeliveriesReturnsChart(
                        data: data.deliveriesVsReturns,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: AdminChartCard(
                      icon: Icons.donut_large_rounded,
                      accent: const Color(0xFF3B82F6),
                      title: 'Répartition par statut',
                      subtitle: 'Commandes (BC) sur la période',
                      height: 260,
                      child: AdminStatusDonutChart(items: data.statusBreakdown),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: AdminChartCard(
                      icon: Icons.timeline_rounded,
                      accent: const Color(0xFFA855F7),
                      title: 'Volume commandes',
                      subtitle: 'Tendance période',
                      height: 240,
                      child: AdminVolumeTrendChart(data: data.volumeTrend),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: AdminChartCard(
                      icon: Icons.bar_chart_rounded,
                      accent: const Color(0xFFF59E0B),
                      title: 'Top gouvernorats',
                      subtitle: 'Volume cmds (top ${data.appliedFilters.topN})',
                      height: 240,
                      child: AdminGovernorateBarChart(
                        items: data.governorateBreakdown,
                      ),
                    ),
                  ),
                ],
              ),
            ] else ...[
              AdminChartCard(
                icon: Icons.show_chart_rounded,
                accent: const Color(0xFF22C55E),
                title: 'Livrées vs retournées',
                subtitle: 'Évolution sur la période',
                height: 260,
                child: AdminDeliveriesReturnsChart(
                  data: data.deliveriesVsReturns,
                ),
              ),
              const SizedBox(height: 16),
              AdminChartCard(
                icon: Icons.donut_large_rounded,
                accent: const Color(0xFF3B82F6),
                title: 'Répartition par statut',
                subtitle: 'Commandes (BC) sur la période',
                height: 260,
                child: AdminStatusDonutChart(items: data.statusBreakdown),
              ),
              const SizedBox(height: 16),
              AdminChartCard(
                icon: Icons.timeline_rounded,
                accent: const Color(0xFFA855F7),
                title: 'Volume commandes',
                subtitle: 'Tendance période',
                height: 240,
                child: AdminVolumeTrendChart(data: data.volumeTrend),
              ),
              const SizedBox(height: 16),
              AdminChartCard(
                icon: Icons.bar_chart_rounded,
                accent: const Color(0xFFF59E0B),
                title: 'Top gouvernorats',
                subtitle: 'Volume cmds',
                height: 240,
                child: AdminGovernorateBarChart(
                  items: data.governorateBreakdown,
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final List<AdminKpi> kpis;
  final int columns;

  const _KpiGrid({required this.kpis, required this.columns});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        // padding + icon row + valeur + sparkline + delta + marge confort
        mainAxisExtent: 142,
      ),
      itemCount: kpis.length,
      itemBuilder: (ctx, i) {
        final k = kpis[i];
        return AdminKpiCard(
          kpi: k,
          icon: _iconFor(k.key),
          accent: _accentFor(k.key),
          domain: _domainFor(k.key),
        );
      },
    );
  }

  /// A.1 — Mappe les keys KPI du dashboard vers le bon endpoint admin
  /// pour le drill-down (orders / claims / drivers / etc.).
  static KpiDomain _domainFor(String key) {
    switch (key) {
      case 'claims':
      case 'demandes':
      case 'claimRate':
        return KpiDomain.claims;
      case 'orders':
      case 'delivered':
      case 'returned':
      case 'postponed':
      case 'inProgress':
      case 'pending':
      case 'deliveryRate':
      case 'returnRate':
      case 'postponedRate':
        return KpiDomain.orders;
      default:
        return KpiDomain.orders;
    }
  }

  static IconData _iconFor(String key) {
    switch (key) {
      case 'orders':
        return Icons.inventory_2_rounded;
      case 'delivered':
        return Icons.check_circle_rounded;
      case 'returned':
        return Icons.assignment_return_rounded;
      case 'postponed':
        return Icons.schedule_rounded;
      case 'inProgress':
        return Icons.local_shipping_rounded;
      case 'pending':
        return Icons.hourglass_top_rounded;
      case 'claims':
        return Icons.report_problem_rounded;
      case 'demandes':
        return Icons.help_outline_rounded;
      case 'deliveryRate':
        return Icons.trending_up_rounded;
      case 'returnRate':
        return Icons.trending_down_rounded;
      case 'postponedRate':
        return Icons.event_repeat_rounded;
      case 'claimRate':
        return Icons.percent_rounded;
      default:
        return Icons.bar_chart_rounded;
    }
  }

  static Color _accentFor(String key) {
    switch (key) {
      case 'orders':
        return const Color(0xFF3B82F6);
      case 'delivered':
        return const Color(0xFF22C55E);
      case 'returned':
        return const Color(0xFFEF4444);
      case 'postponed':
        return const Color(0xFFF59E0B);
      case 'inProgress':
        return const Color(0xFF14B8A6);
      case 'pending':
        return const Color(0xFFA855F7);
      case 'claims':
        return const Color(0xFFEF4444);
      case 'demandes':
        return const Color(0xFFF59E0B);
      case 'deliveryRate':
        return const Color(0xFF22C55E);
      case 'returnRate':
        return const Color(0xFFEF4444);
      case 'postponedRate':
        return const Color(0xFFF59E0B);
      case 'claimRate':
        return const Color(0xFF6366F1);
      default:
        return const Color(0xFF6366F1);
    }
  }
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.4,
          children: List.generate(
            8,
            (_) => const SkeletonBlock(height: 158, borderRadius: 16),
          ),
        ),
        const SizedBox(height: 16),
        const SkeletonBlock(height: 280, borderRadius: 16),
        const SizedBox(height: 16),
        const SkeletonBlock(height: 280, borderRadius: 16),
      ],
    );
  }
}
