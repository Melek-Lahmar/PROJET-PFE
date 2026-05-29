import 'package:flutter/material.dart';

import '../../../models/admin_dashboard_overview.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/sparkline_painter.dart';
import 'admin_kpi_detail_sheet.dart';
import 'kpi_drill_down_resolver.dart';

/// Carte KPI premium : icône en pastille colorée, libellé, compteur animé,
/// pastille delta vs période précédente, et mini-courbe sparkline cliquable
/// qui ouvre un detail sheet (valeur + 7 jours + min/max/moyenne).
class AdminKpiCard extends StatefulWidget {
  final AdminKpi kpi;
  final IconData icon;
  final Color accent;

  /// Si fourni, série temporelle réelle ; sinon série synthétique calculée
  /// à partir de la valeur courante et du delta (mode démo).
  final List<double>? series;

  /// A.1 — Domaine du KPI (orders, drivers, confirmatrices, claims, products,
  /// dashboard). Détermine quel endpoint la liste détaillée appelle au tap.
  final KpiDomain domain;

  const AdminKpiCard({
    super.key,
    required this.kpi,
    required this.icon,
    required this.accent,
    this.series,
    this.domain = KpiDomain.dashboard,
  });

  @override
  State<AdminKpiCard> createState() => _AdminKpiCardState();
}

class _AdminKpiCardState extends State<AdminKpiCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  double _from = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _controller.forward();
  }

  @override
  void didUpdateWidget(covariant AdminKpiCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.kpi.value != widget.kpi.value) {
      _from = oldWidget.kpi.value;
      _controller
        ..reset()
        ..forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final kpi = widget.kpi;

    final series = widget.series ??
        demoSeriesAround(
          current: kpi.value,
          deltaPercent: kpi.deltaPercent,
          points: 7,
        );

    return PremiumCard(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      // A.1 — tap court : push le drill-down avec la VRAIE liste d'entités
      // (commandes, livreurs, etc.) selon le domaine du KPI.
      // long press : ancien sheet rapide pour stats min/max/moyenne.
      onLongPress: () => AdminKpiDetailSheet.show(
        context,
        kpi: kpi,
        icon: widget.icon,
        accent: widget.accent,
        series: widget.series,
      ),
      onTap: () => KpiDrillDownResolver.openDrillDown(
        context: context,
        kpi: kpi,
        icon: widget.icon,
        accent: widget.accent,
        domain: widget.domain,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      widget.accent.withValues(alpha: 0.22),
                      widget.accent.withValues(alpha: 0.10),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(widget.icon, color: widget.accent, size: 17),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  kpi.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                    fontSize: 11.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: AnimatedBuilder(
              animation: _animation,
              builder: (ctx, _) {
                final v = _from + (kpi.value - _from) * _animation.value;
                return Text(
                  _formatValue(v, kpi),
                  maxLines: 1,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                    fontSize: 22,
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 2),
          Sparkline(
            values: series,
            color: widget.accent,
            height: 18,
            showLastDot: false,
          ),
          const SizedBox(height: 4),
          _DeltaPill(kpi: kpi),
        ],
      ),
    );
  }

  String _formatValue(double v, AdminKpi kpi) {
    if (kpi.format == 'percent') {
      return '${v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1)} %';
    }
    return v.round().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ');
  }
}

class _DeltaPill extends StatelessWidget {
  final AdminKpi kpi;

  const _DeltaPill({required this.kpi});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final delta = kpi.deltaPercent;

    Color bg;
    Color fg;
    IconData icon;
    String text;

    if (delta == null) {
      bg = scheme.surfaceContainerHighest.withValues(alpha: 0.6);
      fg = scheme.onSurfaceVariant;
      icon = Icons.remove_rounded;
      text = '—';
    } else if (kpi.deltaDirection == 'up') {
      // "up" sur taux retour est mauvais — mais pour la V1 on garde green=up,
      // red=down de manière neutre. Étape 7 affinera le coloriage par sens.
      bg = const Color(0xFF22C55E).withValues(alpha: 0.12);
      fg = const Color(0xFF15803D);
      icon = Icons.arrow_upward_rounded;
      text = '+${delta.abs().toStringAsFixed(1)} %';
    } else if (kpi.deltaDirection == 'down') {
      bg = const Color(0xFFEF4444).withValues(alpha: 0.12);
      fg = const Color(0xFFB91C1C);
      icon = Icons.arrow_downward_rounded;
      text = '-${delta.abs().toStringAsFixed(1)} %';
    } else {
      bg = scheme.surfaceContainerHighest.withValues(alpha: 0.6);
      fg = scheme.onSurfaceVariant;
      icon = Icons.trending_flat_rounded;
      text = '0 %';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 3),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelSmall?.copyWith(
                color: fg,
                fontWeight: FontWeight.w800,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

