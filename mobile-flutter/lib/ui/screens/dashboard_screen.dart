import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_spacing.dart';
import '../../models/dashboard_models.dart';
import '../../state/dashboard_provider.dart';
import '../widgets/dashboard/chart_card.dart';
import '../widgets/dashboard/metric_tile.dart';
import '../widgets/dashboard/stat_card.dart';
import '../widgets/states/app_empty_state.dart';
import '../widgets/states/app_error_state.dart';
import '../widgets/states/app_loading_state.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.watch<DashboardProvider>();

    if (p.loading && p.data == null) {
      return const Center(
        child: AppLoadingState(
          message: 'Chargement du dashboard...',
          expanded: false,
        ),
      );
    }

    if (p.error != null && p.error!.trim().isNotEmpty) {
      return Center(
        child: AppErrorState(
          message: p.error!,
          onRetry: () => p.load(),
        ),
      );
    }

    if (p.data == null) {
      return Center(
        child: AppEmptyState(
          title: 'Aucune donnée disponible',
          message: 'Le dashboard ne contient pas encore de statistiques.',
          actionLabel: 'Actualiser',
          onAction: () => p.load(),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => p.load(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          _PremiumHeader(data: p.data!),
          const SizedBox(height: AppSpacing.lg),

          _RangeSelector(
            current: p.range,
            onChanged: (r) => p.load(newRange: r),
          ),
          const SizedBox(height: AppSpacing.lg),

          _KpiSection(data: p.data!),
          const SizedBox(height: AppSpacing.xl),

          _MetricsSection(data: p.data!),
          const SizedBox(height: AppSpacing.xl),

          _ChartsSection(data: p.data!),
          const SizedBox(height: AppSpacing.xl),

          _InsightsSection(data: p.data!),

          if (p.loading) ...[
            const SizedBox(height: AppSpacing.lg),
            const LinearProgressIndicator(),
          ],

          const SizedBox(height: 70),
        ],
      ),
    );
  }}

class _RangeSelector extends StatelessWidget {
  final DashboardRange current;
  final ValueChanged<DashboardRange> onChanged;

  const _RangeSelector({
    required this.current,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        _RangeChip(
          label: 'Aujourd’hui',
          active: current == DashboardRange.today,
          onTap: () => onChanged(DashboardRange.today),
        ),
        _RangeChip(
          label: '7 jours',
          active: current == DashboardRange.week7,
          onTap: () => onChanged(DashboardRange.week7),
        ),
        _RangeChip(
          label: '30 jours',
          active: current == DashboardRange.month30,
          onTap: () => onChanged(DashboardRange.month30),
        ),
      ],
    );
  }
}

class _RangeChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _RangeChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
        decoration: BoxDecoration(
          color: active ? scheme.primary : scheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: active
                ? scheme.primary
                : scheme.outline.withValues(alpha: 0.35),
          ),
          boxShadow: active
              ? [
            BoxShadow(
              color: scheme.primary.withValues(alpha: 0.18),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ]
              : null,
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w800,
            color: active ? scheme.onPrimary : scheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _KpiSection extends StatelessWidget {
  final DashboardData data;

  const _KpiSection({required this.data});

  Color _deltaColor(BuildContext context, KpiItem kpi) {
    final delta = kpi.deltaPercent;
    if (delta == null) {
      return Theme.of(context).colorScheme.primary;
    }

    final good = kpi.positiveIsGood ? delta >= 0 : delta <= 0;
    return good ? Colors.green : Colors.red;
  }

  String? _deltaText(KpiItem kpi) {
    final d = kpi.deltaPercent;
    if (d == null) return kpi.subtitle;
    final sign = d >= 0 ? '+' : '';
    final deltaText = '$sign${d.toStringAsFixed(1)}%';
    if (kpi.subtitle == null || kpi.subtitle!.trim().isEmpty) return deltaText;
    return '${kpi.subtitle} • $deltaText';
  }

  IconData _iconForTitle(String title) {
    final t = title.toLowerCase();

    if (t.contains('livr')) return Icons.local_shipping_outlined;
    if (t.contains('retard')) return Icons.schedule_rounded;
    if (t.contains('distance')) return Icons.route_outlined;
    if (t.contains('taux')) return Icons.percent_rounded;
    if (t.contains('échec') || t.contains('echec')) {
      return Icons.error_outline_rounded;
    }
    return Icons.insights_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;

    final crossAxisCount = width >= 1100
        ? 4
        : width >= 760
        ? 3
        : 2;

    final childAspectRatio = width >= 1100
        ? 1.18
        : width >= 760
        ? 1.05
        : 0.92;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'KPIs',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        GridView.builder(
          itemCount: data.kpis.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: AppSpacing.md,
            mainAxisSpacing: AppSpacing.md,
            childAspectRatio: childAspectRatio,
          ),
          itemBuilder: (_, i) {
            final k = data.kpis[i];
            return StatCard(
              title: k.title,
              value: k.value,
              subtitle: _deltaText(k),
              icon: _iconForTitle(k.title),
              accentColor: _deltaColor(context, k),
            );
          },
        ),
      ],
    );
  }}

class _MetricsSection extends StatelessWidget {
  final DashboardData data;

  const _MetricsSection({required this.data});

  String _sumStatus() {
    final total = data.statusBreakdown.fold<double>(0, (a, b) => a + b.value);
    return total.toStringAsFixed(0);
  }

  String _sumLate() {
    final total = data.lateByDriver.fold<double>(0, (a, b) => a + b.lateCount);
    return total.toStringAsFixed(0);
  }

  String _avgTrend() {
    if (data.deliveriesTrend.isEmpty) return '0';
    final total = data.deliveriesTrend.fold<double>(0, (a, b) => a + b.y);
    final avg = total / data.deliveriesTrend.length;
    return avg.toStringAsFixed(1);
  }

  String _bestDriver() {
    if (data.lateByDriver.isEmpty) return '--';

    final sorted = [...data.lateByDriver]..sort((a, b) => a.lateCount.compareTo(b.lateCount));
    return sorted.first.driverName.isEmpty ? '--' : sorted.first.driverName;
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final crossAxisCount = width >= 900 ? 4 : 2;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Résumé rapide',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        GridView.count(
          crossAxisCount: crossAxisCount,
          crossAxisSpacing: AppSpacing.md,
          mainAxisSpacing: AppSpacing.md,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: width >= 900 ? 2.1 : 1.55,
          children: [
            MetricTile(
              label: 'Total statuts enregistrés',
              value: _sumStatus(),
              icon: Icons.pie_chart_outline_rounded,
            ),
            MetricTile(
              label: 'Retards cumulés',
              value: _sumLate(),
              icon: Icons.schedule_rounded,
              color: Colors.orange,
            ),
            MetricTile(
              label: 'Moyenne livraisons / point',
              value: _avgTrend(),
              icon: Icons.show_chart_rounded,
              color: Colors.green,
            ),
            MetricTile(
              label: 'Chauffeur le plus ponctuel',
              value: _bestDriver(),
              icon: Icons.emoji_events_outlined,
              color: Colors.deepPurple,
            ),
          ],
        ),
      ],
    );
  }
}

class _ChartsSection extends StatelessWidget {
  final DashboardData data;

  const _ChartsSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isWide = width >= 980;

    if (isWide) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Performance',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ChartCard(
                  title: 'Livraisons / période',
                  subtitle: 'Évolution sur la plage sélectionnée',
                  child: _LineTrendChart(points: data.deliveriesTrend),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: ChartCard(
                  title: 'Répartition des statuts',
                  subtitle: 'Vue globale des issues',
                  child: _DonutStatusChart(slices: data.statusBreakdown),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          ChartCard(
            title: 'Retards par chauffeur',
            subtitle: 'Suivi de la ponctualité par livreur',
            child: _LateByDriverChart(items: data.lateByDriver),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Performance',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        ChartCard(
          title: 'Livraisons / période',
          subtitle: 'Évolution sur la plage sélectionnée',
          child: _LineTrendChart(points: data.deliveriesTrend),
        ),
        const SizedBox(height: AppSpacing.md),
        ChartCard(
          title: 'Répartition des statuts',
          subtitle: 'Vue globale des issues',
          child: _DonutStatusChart(slices: data.statusBreakdown),
        ),
        const SizedBox(height: AppSpacing.md),
        ChartCard(
          title: 'Retards par chauffeur',
          subtitle: 'Suivi de la ponctualité par livreur',
          child: _LateByDriverChart(items: data.lateByDriver),
        ),
      ],
    );
  }
}

class _InsightsSection extends StatelessWidget {
  final DashboardData data;

  const _InsightsSection({required this.data});

  String _insight1() {
    if (data.deliveriesTrend.isEmpty) {
      return 'Pas assez de données de tendance pour générer un insight.';
    }

    final first = data.deliveriesTrend.first.y;
    final last = data.deliveriesTrend.last.y;

    if (last > first) {
      return 'La tendance des livraisons est en amélioration sur la période.';
    }
    if (last < first) {
      return 'La tendance des livraisons baisse sur la période : vérifie la charge ou la répartition.';
    }
    return 'La tendance des livraisons est globalement stable.';
  }

  String _insight2() {
    if (data.lateByDriver.isEmpty) return 'Aucun retard chauffeur enregistré.';
    final worst = [...data.lateByDriver]..sort((a, b) => b.lateCount.compareTo(a.lateCount));
    return 'Le plus grand volume de retards concerne ${worst.first.driverName.isEmpty ? "un chauffeur non nommé" : worst.first.driverName}.';
  }

  String _insight3() {
    if (data.statusBreakdown.isEmpty) return 'Aucune répartition de statuts disponible.';
    final top = [...data.statusBreakdown]..sort((a, b) => b.value.compareTo(a.value));
    return 'Le statut dominant est "${top.first.label}" avec ${top.first.value.toStringAsFixed(0)} occurrence(s).';
  }

  @override
  Widget build(BuildContext context) {
    return ChartCard(
      title: 'Insights',
      subtitle: 'Lecture rapide des statistiques',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _InsightLine(text: _insight1()),
          const SizedBox(height: AppSpacing.md),
          _InsightLine(text: _insight2()),
          const SizedBox(height: AppSpacing.md),
          _InsightLine(text: _insight3()),
        ],
      ),
    );
  }
}

class _InsightLine extends StatelessWidget {
  final String text;

  const _InsightLine({required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Icon(Icons.lightbulb_outline_rounded, size: 18),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              height: 1.45,
            ),
          ),
        ),
      ],
    );
  }
}

class _LineTrendChart extends StatelessWidget {
  final List<TimePoint> points;

  const _LineTrendChart({required this.points});

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const SizedBox(
        height: 180,
        child: Center(child: Text('Aucune donnée')),
      );
    }

    final scheme = Theme.of(context).colorScheme;
    final spots = <FlSpot>[];

    for (int i = 0; i < points.length; i++) {
      spots.add(FlSpot(i.toDouble(), points[i].y));
    }

    return SizedBox(
      height: 240,
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 1,
            getDrawingHorizontalLine: (_) => FlLine(
              color: scheme.outline.withValues(alpha: 0.20),
              strokeWidth: 1,
            ),
          ),
          borderData: FlBorderData(
            show: true,
            border: Border.all(
              color: scheme.outline.withValues(alpha: 0.30),
            ),
          ),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 34,
              ),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: points.length <= 7 ? 1 : 2,
                getTitlesWidget: (v, meta) {
                  final i = v.toInt();
                  if (i < 0 || i >= points.length) {
                    return const SizedBox.shrink();
                  }
                  final d = points[i].t;
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '${d.day}/${d.month}',
                      style: const TextStyle(fontSize: 10),
                    ),
                  );
                },
              ),
            ),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              barWidth: 3,
              color: scheme.primary,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                color: scheme.primary.withValues(alpha: 0.10),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DonutStatusChart extends StatelessWidget {
  final List<StatusSlice> slices;

  const _DonutStatusChart({required this.slices});

  @override
  Widget build(BuildContext context) {
    if (slices.isEmpty) {
      return const SizedBox(
        height: 180,
        child: Center(child: Text('Aucune donnée')),
      );
    }

    final colors = <Color>[
      Colors.green,
      Colors.orange,
      Colors.red,
      Colors.blue,
      Colors.deepPurple,
      Colors.teal,
    ];

    final total = slices.fold<double>(0, (a, b) => a + b.value);

    final sections = <PieChartSectionData>[];
    for (int i = 0; i < slices.length; i++) {
      final s = slices[i];
      final pct = total == 0 ? 0 : (s.value / total) * 100;

      sections.add(
        PieChartSectionData(
          value: s.value,
          color: colors[i % colors.length],
          title: '${pct.toStringAsFixed(0)}%',
          radius: 58,
          titleStyle: const TextStyle(
            fontWeight: FontWeight.w900,
            color: Colors.white,
            fontSize: 12,
          ),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 440;

        if (!wide) {
          return Column(
            children: [
              SizedBox(
                height: 220,
                child: PieChart(
                  PieChartData(
                    sections: sections,
                    centerSpaceRadius: 44,
                    sectionsSpace: 2,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              ...List.generate(slices.length, (i) {
                final s = slices[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: colors[i % colors.length],
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(child: Text(s.label)),
                      Text(s.value.toStringAsFixed(0)),
                    ],
                  ),
                );
              }),
            ],
          );
        }

        return Row(
          children: [
            SizedBox(
              width: 220,
              height: 220,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  centerSpaceRadius: 44,
                  sectionsSpace: 2,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.lg),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: List.generate(slices.length, (i) {
                  final s = slices[i];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: colors[i % colors.length],
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            s.label,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Text(s.value.toStringAsFixed(0)),
                      ],
                    ),
                  );
                }),
              ),
            ),
          ],
        );
      },
    );
  }
}
class _PremiumHeader extends StatelessWidget {
  final DashboardData data;

  const _PremiumHeader({required this.data});

  String _topStatus() {
    if (data.statusBreakdown.isEmpty) return '--';
    final sorted = [...data.statusBreakdown]
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.first.label;
  }

  String _topValue() {
    if (data.kpis.isEmpty) return '--';
    return data.kpis.first.value;
  }

  /// Calcule un "niveau du jour" basé sur le volume de livraisons.
  /// Mode démo : permet d'afficher une médaille gamifiée pour le jury.
  ({String label, IconData icon, Color color}) _achievement() {
    int volume = 0;
    final raw = data.kpis.isNotEmpty ? data.kpis.first.value : '0';
    final parsed = int.tryParse(raw.replaceAll(RegExp(r'[^0-9]'), ''));
    if (parsed != null) volume = parsed;
    if (volume >= 30) {
      return (label: 'Champion', icon: Icons.workspace_premium_rounded, color: const Color(0xFFFFD700));
    }
    if (volume >= 15) {
      return (label: 'Argent', icon: Icons.military_tech_rounded, color: const Color(0xFFC0C0C0));
    }
    if (volume >= 5) {
      return (label: 'Bronze', icon: Icons.emoji_events_rounded, color: const Color(0xFFCD7F32));
    }
    return (label: 'En route', icon: Icons.flag_rounded, color: const Color(0xFF93C5FD));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ach = _achievement();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            scheme.primary,
            scheme.primary.withValues(alpha: 0.82),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: scheme.primary.withValues(alpha: 0.22),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tableau de bord',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: scheme.onPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Performance du jour, statuts et ponctualité.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onPrimary.withValues(alpha: 0.92),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _HeaderChip(
                      icon: Icons.inventory_2_outlined,
                      label: 'Volume',
                      value: _topValue(),
                    ),
                    _HeaderChip(
                      icon: Icons.pie_chart_outline_rounded,
                      label: 'Top statut',
                      value: _topStatus(),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          _AchievementBadge(
            label: ach.label,
            icon: ach.icon,
            color: ach.color,
          ),
        ],
      ),
    );
  }
}

class _AchievementBadge extends StatefulWidget {
  final String label;
  final IconData icon;
  final Color color;
  const _AchievementBadge({
    required this.label,
    required this.icon,
    required this.color,
  });

  @override
  State<_AchievementBadge> createState() => _AchievementBadgeState();
}

class _AchievementBadgeState extends State<_AchievementBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    duration: const Duration(milliseconds: 2400),
    vsync: this,
  )..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        final t = _ctrl.value;
        return Container(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.30)),
            boxShadow: [
              BoxShadow(
                color: widget.color.withValues(alpha: 0.30 + 0.20 * t),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: widget.color.withValues(alpha: 0.92),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: widget.color.withValues(alpha: 0.50 + 0.30 * t),
                      blurRadius: 14,
                    ),
                  ],
                ),
                child: Icon(widget.icon, color: Colors.white, size: 22),
              ),
              const SizedBox(height: 6),
              Text(widget.label.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 9,
                    letterSpacing: 1.1,
                  )),
            ],
          ),
        );
      },
    );
  }
}

class _HeaderChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _HeaderChip({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.onPrimary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: scheme.onPrimary.withValues(alpha: 0.14),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: scheme.onPrimary),
          const SizedBox(width: 8),
          Text(
            '$label: $value',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: scheme.onPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
class _LateByDriverChart extends StatelessWidget {
  final List<DriverMetric> items;

  const _LateByDriverChart({required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const SizedBox(
        height: 180,
        child: Center(child: Text('Aucune donnée')),
      );
    }

    final scheme = Theme.of(context).colorScheme;

    final groups = <BarChartGroupData>[];
    for (int i = 0; i < items.length; i++) {
      groups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: items[i].lateCount,
              width: 18,
              color: scheme.primary,
              borderRadius: BorderRadius.circular(6),
            ),
          ],
        ),
      );
    }

    return SizedBox(
      height: 260,
      child: BarChart(
        BarChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            getDrawingHorizontalLine: (_) => FlLine(
              color: scheme.outline.withValues(alpha: 0.20),
              strokeWidth: 1,
            ),
          ),
          borderData: FlBorderData(
            show: true,
            border: Border.all(
              color: scheme.outline.withValues(alpha: 0.30),
            ),
          ),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 34,
              ),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (v, meta) {
                  final i = v.toInt();
                  if (i < 0 || i >= items.length) {
                    return const SizedBox.shrink();
                  }

                  final text = items[i].driverName.isEmpty
                      ? 'N/A'
                      : items[i].driverName;

                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      text,
                      style: const TextStyle(fontSize: 10),
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                },
              ),
            ),
          ),
          barGroups: groups,
        ),
      ),
    );
  }

}