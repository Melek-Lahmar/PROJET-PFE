import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../../models/admin_dashboard_overview.dart';

/// Donut "répartition par statut" — affiche le total au centre.
class AdminStatusDonutChart extends StatefulWidget {
  final List<AdminBreakdownItem> items;

  const AdminStatusDonutChart({super.key, required this.items});

  @override
  State<AdminStatusDonutChart> createState() => _AdminStatusDonutChartState();
}

class _AdminStatusDonutChartState extends State<AdminStatusDonutChart> {
  int? _hoveredIndex;

  static const _palette = [
    Color(0xFFF59E0B), // EN_ATTENTE
    Color(0xFF22C55E), // CONFIRME
    Color(0xFF3B82F6), // TENTATIVE
    Color(0xFFEF4444), // REFUSE
    Color(0xFFA855F7),
    Color(0xFF14B8A6),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final items = widget.items;
    final total = items.fold<int>(0, (sum, e) => sum + e.count);

    if (items.isEmpty || total == 0) {
      return Center(
        child: Text(
          'Aucune commande sur la période.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
        ),
      );
    }

    return Row(
      children: [
        Expanded(
          flex: 3,
          child: Stack(
            alignment: Alignment.center,
            children: [
              PieChart(
                PieChartData(
                  sectionsSpace: 3,
                  centerSpaceRadius: 56,
                  sections: List.generate(items.length, (i) {
                    final it = items[i];
                    final color = _palette[i % _palette.length];
                    final highlighted = _hoveredIndex == i;
                    return PieChartSectionData(
                      value: it.count.toDouble(),
                      color: color,
                      radius: highlighted ? 38 : 32,
                      title: highlighted ? '${it.percentage.toStringAsFixed(0)}%' : '',
                      titleStyle: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    );
                  }),
                  pieTouchData: PieTouchData(
                    touchCallback: (event, response) {
                      setState(() {
                        if (!event.isInterestedForInteractions ||
                            response == null ||
                            response.touchedSection == null) {
                          _hoveredIndex = null;
                        } else {
                          _hoveredIndex =
                              response.touchedSection!.touchedSectionIndex;
                        }
                      });
                    },
                  ),
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    total.toString(),
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    'commandes',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          flex: 4,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < items.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: _palette[i % _palette.length],
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            items[i].label,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          '${items[i].count}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: scheme.surfaceContainerHighest
                                .withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${items[i].percentage.toStringAsFixed(1)}%',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
