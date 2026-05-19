import 'package:flutter/material.dart';

import '../../../core/premium_routing.dart';

/// Panel premium au-dessus de la carte : ETA factorisée trafic, distance,
/// coût essence estimé, niveau de trafic actuel + 2 boutons d'action
/// (optimiser ordre TSP / réorganiser manuellement par drag-and-drop).
class RoutePremiumPanel extends StatelessWidget {
  final PremiumRoutePlan plan;
  final FuelParams fuel;
  final bool optimizing;
  final VoidCallback onOptimize;
  final VoidCallback onReorder;
  final VoidCallback onTuneFuel;

  const RoutePremiumPanel({
    super.key,
    required this.plan,
    required this.fuel,
    required this.optimizing,
    required this.onOptimize,
    required this.onReorder,
    required this.onTuneFuel,
  });

  String _fmtEta(double sec) {
    if (sec <= 0) return '—';
    final m = (sec / 60).round();
    if (m < 60) return '${m}min';
    final h = m ~/ 60;
    final r = m % 60;
    return '${h}h${r.toString().padLeft(2, '0')}';
  }

  String _fmtKm(double meters) {
    if (meters <= 0) return '—';
    if (meters < 1000) return '${meters.toStringAsFixed(0)} m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  String _fmtTnd(double v) => '${v.toStringAsFixed(2)} TND';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final traffic = plan.overallTraffic;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            scheme.primary.withOpacity(0.94),
            scheme.primary.withOpacity(0.78),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: scheme.primary.withOpacity(0.32),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: traffic.color.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: [
                    BoxShadow(
                      color: traffic.color.withOpacity(0.45),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(traffic.icon, color: Colors.white, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      traffic.label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                '${plan.stops.length} stop${plan.stops.length > 1 ? "s" : ""}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Metric(
                icon: Icons.schedule_rounded,
                label: 'ETA',
                value: _fmtEta(plan.totalDurationSecondsFactored),
                hint: 'avec trafic',
              ),
              _Divider(),
              _Metric(
                icon: Icons.route_rounded,
                label: 'Distance',
                value: _fmtKm(plan.totalDistanceMeters),
              ),
              _Divider(),
              _Metric(
                icon: Icons.local_gas_station_rounded,
                label: 'Essence',
                value: _fmtTnd(plan.totalFuelCostTnd),
                hint:
                    '${fuel.consumptionPer100Km.toStringAsFixed(1)} L/100',
                onTap: onTuneFuel,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _ActionButton(
                  icon: Icons.auto_awesome_rounded,
                  label: optimizing
                      ? 'Optimisation…'
                      : 'Optimiser ordre',
                  onPressed: optimizing ? null : onOptimize,
                  loading: optimizing,
                  primary: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ActionButton(
                  icon: Icons.drag_handle_rounded,
                  label: 'Réorganiser',
                  onPressed: plan.stops.length < 2 ? null : onReorder,
                  loading: false,
                  primary: false,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? hint;
  final VoidCallback? onTap;

  const _Metric({
    required this.icon,
    required this.label,
    required this.value,
    this.hint,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: Colors.white.withOpacity(0.85), size: 14),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.85),
                fontWeight: FontWeight.w700,
                fontSize: 11,
                letterSpacing: 0.2,
              ),
            ),
            if (onTap != null)
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Icon(Icons.tune_rounded,
                    color: Colors.white.withOpacity(0.7), size: 12),
              ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 16,
            height: 1.05,
          ),
        ),
        if (hint != null)
          Text(
            hint!,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 10,
            ),
          ),
      ],
    );

    final wrapped = Expanded(
      child: onTap != null
          ? Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: onTap,
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  child: content,
                ),
              ),
            )
          : Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: content,
            ),
    );

    return wrapped;
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 36,
      color: Colors.white.withOpacity(0.20),
      margin: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final bool primary;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    required this.loading,
    required this.primary,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    final bg = primary
        ? Colors.white
        : Colors.white.withOpacity(disabled ? 0.06 : 0.15);
    final fg = primary
        ? Theme.of(context).colorScheme.primary
        : Colors.white;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onPressed,
        child: Ink(
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: primary
                  ? Colors.white.withOpacity(0.0)
                  : Colors.white.withOpacity(disabled ? 0.10 : 0.30),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (loading)
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.0,
                    valueColor: AlwaysStoppedAnimation(fg),
                  ),
                )
              else
                Icon(icon, color: fg, size: 16),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: fg.withOpacity(disabled ? 0.5 : 1.0),
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
