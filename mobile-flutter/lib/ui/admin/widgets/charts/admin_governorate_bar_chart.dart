import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../../models/admin_dashboard_overview.dart';

/// Barres horizontales : top gouvernorats par volume de commandes.
class AdminGovernorateBarChart extends StatelessWidget {
  final List<AdminBreakdownItem> items;

  const AdminGovernorateBarChart({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    if (items.isEmpty) {
      return Center(
        child: Text(
          'Aucune donnée par gouvernorat.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
        ),
      );
    }

    final maxCount = items
        .map((e) => e.count)
        .fold<int>(0, (a, b) => a > b ? a : b)
        .toDouble();
    final maxX = (maxCount * 1.2).clamp(4, double.infinity).toDouble();

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxX,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: true,
          drawHorizontalLine: false,
          getDrawingVerticalLine: (_) => FlLine(
            color: scheme.outlineVariant.withOpacity(0.4),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: List.generate(items.length, (i) {
          return BarChartGroupData(
            x: i,
            barRods: [
              BarChartRodData(
                toY: items[i].count.toDouble(),
                width: 22,
                borderRadius: BorderRadius.circular(6),
                gradient: LinearGradient(
                  colors: [
                    scheme.primary,
                    scheme.primary.withOpacity(0.6),
                  ],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ],
          );
        }),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              getTitlesWidget: (v, _) => Text(
                v.toInt().toString(),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= items.length) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    items[i].label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              },
            ),
          ),
        ),
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            tooltipRoundedRadius: 8,
            getTooltipItem: (group, gIdx, rod, rIdx) {
              final it = items[group.x];
              return BarTooltipItem(
                '${it.label}\n${it.count} cmds (${it.percentage.toStringAsFixed(1)}%)',
                TextStyle(
                  color: scheme.onPrimary,
                  fontWeight: FontWeight.w800,
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
