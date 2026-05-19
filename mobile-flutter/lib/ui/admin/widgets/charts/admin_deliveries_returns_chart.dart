import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../../models/admin_dashboard_overview.dart';

/// Courbe livrées (vert) vs retournées (rouge) par bucket.
class AdminDeliveriesReturnsChart extends StatelessWidget {
  final List<AdminTrendPoint> data;

  const AdminDeliveriesReturnsChart({super.key, required this.data});

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

    final livreesSpots = <FlSpot>[];
    final retoursSpots = <FlSpot>[];
    for (var i = 0; i < data.length; i++) {
      livreesSpots.add(FlSpot(i.toDouble(), data[i].primary));
      retoursSpots.add(FlSpot(i.toDouble(), data[i].secondary ?? 0));
    }

    final maxY = _findMaxY(livreesSpots, retoursSpots);
    final stepX = _stepX(data.length);

    return Padding(
      padding: const EdgeInsets.only(top: 8, right: 8),
      child: Column(
        children: [
          Row(
            children: [
              _LegendDot(color: const Color(0xFF22C55E), label: 'Livrées'),
              const SizedBox(width: 16),
              _LegendDot(color: const Color(0xFFEF4444), label: 'Retournées'),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: maxY,
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
                  _line(livreesSpots, const Color(0xFF22C55E)),
                  _line(retoursSpots, const Color(0xFFEF4444)),
                ],
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    tooltipRoundedRadius: 8,
                    getTooltipItems: (touched) => touched.map((s) {
                      final c = s.bar.color ?? scheme.primary;
                      return LineTooltipItem(
                        '${s.y.toInt()}',
                        TextStyle(
                          color: c,
                          fontWeight: FontWeight.w800,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static LineChartBarData _line(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      curveSmoothness: 0.25,
      color: color,
      barWidth: 3,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(
        show: true,
        color: color.withOpacity(0.12),
      ),
    );
  }

  static double _findMaxY(List<FlSpot> a, List<FlSpot> b) {
    var max = 0.0;
    for (final s in [...a, ...b]) {
      if (s.y > max) max = s.y;
    }
    return (max * 1.2).clamp(4, double.infinity);
  }

  static double _stepX(int n) {
    if (n <= 8) return 1;
    if (n <= 15) return 2;
    if (n <= 30) return 5;
    return (n / 6).ceilToDouble();
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
