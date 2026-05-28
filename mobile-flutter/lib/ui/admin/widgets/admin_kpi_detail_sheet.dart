import 'package:flutter/material.dart';

import '../../../models/admin_dashboard_overview.dart';
import '../../widgets/premium/animated_entry.dart';
import '../../widgets/premium/sparkline_painter.dart';

/// Bottom sheet de détail d'une KPI : valeur courante, delta, mini courbe
/// 7 points, et 3 stats secondaires (min / max / moyenne).
///
/// La série temporelle vient soit du backend (si fournie), soit d'une
/// génération synthétique cohérente avec `value` + `deltaPercent` (mode démo).
class AdminKpiDetailSheet extends StatelessWidget {
  final AdminKpi kpi;
  final IconData icon;
  final Color accent;
  final List<double>? series;

  const AdminKpiDetailSheet({
    super.key,
    required this.kpi,
    required this.icon,
    required this.accent,
    this.series,
  });

  static Future<void> show(
    BuildContext context, {
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
    List<double>? series,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AdminKpiDetailSheet(
        kpi: kpi,
        icon: icon,
        accent: accent,
        series: series,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final pts = series ??
        demoSeriesAround(
          current: kpi.value,
          deltaPercent: kpi.deltaPercent,
          points: 7,
        );

    final minV = pts.fold<double>(double.infinity, (a, b) => a < b ? a : b);
    final maxV = pts.fold<double>(double.negativeInfinity, (a, b) => a > b ? a : b);
    final avg = pts.fold<double>(0, (a, b) => a + b) / pts.length;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        20, 12, 20, 20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: scheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          EntryAnimation(
            duration: const Duration(milliseconds: 360),
            slide: 12,
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: accent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(kpi.label,
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          )),
                      const SizedBox(height: 2),
                      Text(kpi.formattedValue.isEmpty
                              ? _format(kpi.value, kpi.format)
                              : kpi.formattedValue,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                          )),
                    ],
                  ),
                ),
                _DeltaBadge(kpi: kpi),
              ],
            ),
          ),
          const SizedBox(height: 18),
          EntryAnimation(
            delay: const Duration(milliseconds: 120),
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: accent.withValues(alpha: 0.18)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.show_chart_rounded, size: 16, color: accent),
                      const SizedBox(width: 6),
                      Text('7 derniers jours',
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: accent,
                          )),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Sparkline(
                    values: pts,
                    color: accent,
                    height: 90,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _AxisLabel(text: 'J-6', color: scheme.onSurfaceVariant),
                      _AxisLabel(text: "Aujourd'hui", color: accent, bold: true),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          EntryAnimation(
            delay: const Duration(milliseconds: 200),
            child: Row(
              children: [
                Expanded(
                    child: _StatChip(
                        label: 'Min',
                        value: _format(minV, kpi.format),
                        color: const Color(0xFF64748B))),
                const SizedBox(width: 8),
                Expanded(
                    child: _StatChip(
                        label: 'Moy',
                        value: _format(avg, kpi.format),
                        color: const Color(0xFF6366F1))),
                const SizedBox(width: 8),
                Expanded(
                    child: _StatChip(
                        label: 'Max',
                        value: _format(maxV, kpi.format),
                        color: const Color(0xFF22C55E))),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  String _format(double v, String format) {
    if (format == 'percent') {
      return '${v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1)} %';
    }
    if (format == 'currency') {
      return '${v.round().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} TND';
    }
    return v.round().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ');
  }
}

class _DeltaBadge extends StatelessWidget {
  final AdminKpi kpi;
  const _DeltaBadge({required this.kpi});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final delta = kpi.deltaPercent;
    Color bg, fg;
    IconData icon;
    String text;
    if (delta == null) {
      bg = scheme.surfaceContainerHighest;
      fg = scheme.onSurfaceVariant;
      icon = Icons.remove_rounded;
      text = '—';
    } else if (kpi.deltaDirection == 'up') {
      bg = const Color(0xFF22C55E).withValues(alpha: 0.15);
      fg = const Color(0xFF15803D);
      icon = Icons.arrow_upward_rounded;
      text = '+${delta.abs().toStringAsFixed(1)} %';
    } else if (kpi.deltaDirection == 'down') {
      bg = const Color(0xFFEF4444).withValues(alpha: 0.15);
      fg = const Color(0xFFB91C1C);
      icon = Icons.arrow_downward_rounded;
      text = '-${delta.abs().toStringAsFixed(1)} %';
    } else {
      bg = scheme.surfaceContainerHighest;
      fg = scheme.onSurfaceVariant;
      icon = Icons.trending_flat_rounded;
      text = '0 %';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Text(text,
              style: theme.textTheme.labelMedium?.copyWith(
                color: fg,
                fontWeight: FontWeight.w900,
              )),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w800,
              )),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                maxLines: 1,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w900,
                )),
          ),
        ],
      ),
    );
  }
}

class _AxisLabel extends StatelessWidget {
  final String text;
  final Color color;
  final bool bold;
  const _AxisLabel({required this.text, required this.color, this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
        ));
  }
}
