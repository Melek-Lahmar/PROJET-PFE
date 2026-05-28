import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/admin_dashboard_overview.dart'
    show AdminKpi, AdminBreakdownItem;
import '../../../models/admin_products_overview.dart';
import '../../../state/admin_filters_provider.dart';
import '../../../state/admin_products_provider.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';
import '../widgets/admin_filter_bar.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/kpi_drill_down_resolver.dart' show KpiDomain;

class AdminProductsScreen extends StatefulWidget {
  const AdminProductsScreen({super.key});

  @override
  State<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends State<AdminProductsScreen> {
  String? _lastGov;
  AdminPeriod? _lastPeriod;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh(force: true);
    });
  }

  void _maybeRefresh({bool force = false}) {
    final f = context.read<AdminFiltersProvider>();
    if (!force && _lastGov == f.gouvernorat && _lastPeriod == f.period) return;
    _lastGov = f.gouvernorat;
    _lastPeriod = f.period;
    context.read<AdminProductsProvider>().refresh(
          governorate: f.gouvernorat,
          period: f.period,
        );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AdminFiltersProvider>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh();
    });
    return Column(
      children: const [
        AdminFilterBar(),
        Expanded(child: _Body()),
      ],
    );
  }
}

class _Body extends StatelessWidget {
  const _Body();
  @override
  Widget build(BuildContext context) {
    final prov = context.watch<AdminProductsProvider>();
    if (prov.loading && prov.data == null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonBlock(height: 110),
          SizedBox(height: 12),
          SkeletonBlock(height: 220),
          SizedBox(height: 12),
          SkeletonBlock(height: 220),
        ],
      );
    }
    if (prov.error != null && prov.data == null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: PremiumCard(
          child: EmptyView(
            icon: Icons.cloud_off_rounded,
            title: 'Erreur',
            subtitle: prov.error!,
            ctaLabel: 'Réessayer',
            onCta: prov.reload,
          ),
        ),
      );
    }
    final d = prov.data;
    if (d == null) return const SizedBox.shrink();
    return RefreshIndicator(
      onRefresh: prov.reload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _Kpis(kpis: d.kpis),
          const SizedBox(height: 18),
          _ProductsCard(
            title: 'Top produits par quantité',
            icon: Icons.trending_up_rounded,
            items: d.topByQuantity,
            valueLabel: 'Qté',
            valueOf: (r) => r.quantity.toStringAsFixed(0),
            color: const Color(0xFF3B82F6),
          ),
          _ProductsCard(
            title: 'Top produits par CA',
            icon: Icons.attach_money_rounded,
            items: d.topByRevenue,
            valueLabel: 'CA',
            valueOf: (r) => '${r.revenue.toStringAsFixed(3)} TND',
            color: const Color(0xFF10B981),
          ),
          _ProductsCard(
            title: 'Top produits retournés',
            icon: Icons.undo_rounded,
            items: d.topByReturns,
            valueLabel: 'Retours',
            valueOf: (r) => r.returnsCount.toString(),
            color: const Color(0xFFEF4444),
          ),
          LayoutBuilder(
            builder: (ctx, c) {
              final wide = c.maxWidth >= 720;
              if (wide) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _GovBreakdown(
                        title: 'Ventes par gouvernorat',
                        items: d.revenueByGovernorate,
                        color: const Color(0xFF22C55E),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _GovBreakdown(
                        title: 'Retours par gouvernorat',
                        items: d.returnsByGovernorate,
                        color: const Color(0xFFEF4444),
                      ),
                    ),
                  ],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _GovBreakdown(
                    title: 'Ventes par gouvernorat',
                    items: d.revenueByGovernorate,
                    color: const Color(0xFF22C55E),
                  ),
                  const SizedBox(height: 12),
                  _GovBreakdown(
                    title: 'Retours par gouvernorat',
                    items: d.returnsByGovernorate,
                    color: const Color(0xFFEF4444),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _Kpis extends StatelessWidget {
  final List<AdminKpi> kpis;
  const _Kpis({required this.kpis});

  @override
  Widget build(BuildContext context) {
    if (kpis.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (ctx, c) {
        final w = c.maxWidth;
        final cols = w >= 1200 ? 6 : w >= 900 ? 4 : w >= 600 ? 3 : 2;
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
            final k = kpis[i];
            final v = _visual(k.key);
            return AdminKpiCard(
              kpi: k,
              icon: v.$1,
              accent: v.$2,
              domain: KpiDomain.products,
            );
          },
        );
      },
    );
  }

  (IconData, Color) _visual(String k) => switch (k) {
        'products' => (Icons.shopping_bag_rounded, const Color(0xFF3B82F6)),
        'quantity' => (Icons.numbers_rounded, const Color(0xFF6366F1)),
        'orders' => (Icons.receipt_long_rounded, const Color(0xFF0EA5E9)),
        'returns' => (Icons.undo_rounded, const Color(0xFFEF4444)),
        'revenue' => (Icons.attach_money_rounded, const Color(0xFF10B981)),
        'returnRate' => (Icons.percent_rounded, const Color(0xFFF59E0B)),
        _ => (Icons.bar_chart_rounded, const Color(0xFF6B7280)),
      };
}

class _ProductsCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<AdminProductRow> items;
  final String valueLabel;
  final String Function(AdminProductRow) valueOf;
  final Color color;

  const _ProductsCard({
    required this.title,
    required this.icon,
    required this.items,
    required this.valueLabel,
    required this.valueOf,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return PremiumCard(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 18, color: color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    )),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (items.isEmpty)
            Text('Aucune donnée.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ))
          else
            for (int i = 0; i < items.length; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    SizedBox(
                      width: 22,
                      child: Text('#${i + 1}',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                          )),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(items[i].designation ?? items[i].articleRef,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              )),
                          Text(items[i].articleRef,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                              )),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(valueOf(items[i]),
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: color,
                        )),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

class _GovBreakdown extends StatelessWidget {
  final String title;
  final List<AdminBreakdownItem> items;
  final Color color;
  const _GovBreakdown({required this.title, required this.items, required this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return PremiumCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w900,
              )),
          const SizedBox(height: 10),
          if (items.isEmpty)
            Text('Aucune donnée.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ))
          else
            for (final it in items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(it.label,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          )),
                    ),
                    SizedBox(
                      width: 80,
                      height: 6,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: (it.percentage / 100).clamp(0.0, 1.0),
                          backgroundColor: scheme.surfaceContainerHighest,
                          valueColor: AlwaysStoppedAnimation(color),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 60,
                      child: Text(
                        '${it.count} (${it.percentage.toStringAsFixed(0)}%)',
                        textAlign: TextAlign.right,
                        style: theme.textTheme.bodySmall?.copyWith(
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
}
