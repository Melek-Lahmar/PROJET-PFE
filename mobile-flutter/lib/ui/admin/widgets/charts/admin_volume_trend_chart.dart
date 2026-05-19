import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../../models/admin_dashboard_overview.dart';

/// Courbe volume commandes (line + zone gradient en dessous).
class AdminVolumeTrendChart extends StatelessWidget {
  final List<AdminTrendPoint> data;

  const AdminVolumeTrendChart({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    if (data.isEmpty) {
      return Center(
        child: Text(
          'Aucune donnée sur la période.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
        ),
      );
    }

    final spots = <FlSpot>[];
    for (var i = 0; i < data.length; i++) {
      spots.add(FlSpot(i.toDouble(), data[i].primary));
    }
    final maxY = spots.fold<double>(
      0,
      (a, s) => s.y > a ? s.y : a,
    );
    final clampedMaxY = (maxY * 1.25).clamp(4, double.infinity).toDouble();
    final stepX = _stepX(data.length);

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: clampedMaxY,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(
            color: scheme.outlineVariant.withOpacity(0.4),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
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
              reservedSize: 28,
              interval: stepX,
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= data.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    data[i].label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
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
            curveSmoothness: 0.3,
            color: scheme.primary,
            barWidth: 3,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  scheme.primary.withOpacity(0.25),
                  scheme.primary.withOpacity(0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ],
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            tooltipRoundedRadius: 8,
            getTooltipItems: (touched) => touched.map((s) {
              final i = s.x.toInt();
              final label = (i >= 0 && i < data.length) ? data[i].label : '';
              return LineTooltipItem(
                '${s.y.toInt()}\n$label',
                TextStyle(
                  color: scheme.onPrimary,
                  fontWeight: FontWeight.w800,
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  static double _stepX(int n) {
    if (n <= 8) return 1;
    if (n <= 15) return 2;
    if (n <= 30) return 5;
    return (n / 6).ceilToDouble();
  }
}
