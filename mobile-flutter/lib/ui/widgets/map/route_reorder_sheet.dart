import 'package:flutter/material.dart';

import '../../../core/premium_routing.dart';
import '../../../models/delivery.dart';

/// Bottom sheet de réorganisation manuelle : drag-and-drop sur les stops.
/// Le caller injecte une fonction `recompute(List<Delivery>)` qui rebuild
/// le plan en temps réel pour l'aperçu live (ETA, distance, essence).
class RouteReorderSheet extends StatefulWidget {
  final List<Delivery> initialOrder;
  final Set<String> priorityPieces;
  final PremiumRoutePlan Function(List<Delivery>) recompute;
  final ValueChanged<List<Delivery>> onApply;

  const RouteReorderSheet({
    super.key,
    required this.initialOrder,
    required this.priorityPieces,
    required this.recompute,
    required this.onApply,
  });

  @override
  State<RouteReorderSheet> createState() => _RouteReorderSheetState();
}

class _RouteReorderSheetState extends State<RouteReorderSheet> {
  late List<Delivery> _order;
  late PremiumRoutePlan _preview;

  @override
  void initState() {
    super.initState();
    _order = List<Delivery>.from(widget.initialOrder);
    _preview = widget.recompute(_order);
  }

  void _onReorder(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final item = _order.removeAt(oldIndex);
      _order.insert(newIndex, item);
      _preview = widget.recompute(_order);
    });
  }

  String _fmtEta(double sec) {
    if (sec <= 0) return '—';
    final m = (sec / 60).round();
    if (m < 60) return '${m}min';
    final h = m ~/ 60;
    final r = m % 60;
    return '${h}h${r.toString().padLeft(2, '0')}';
  }

  String _fmtKm(double meters) =>
      meters < 1000 ? '${meters.toStringAsFixed(0)} m' : '${(meters / 1000).toStringAsFixed(1)} km';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: scheme.outlineVariant,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Icon(Icons.drag_indicator_rounded, color: scheme.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Réorganiser la tournée',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Annuler'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              _PreviewBar(plan: _preview, fmtEta: _fmtEta, fmtKm: _fmtKm),
              const SizedBox(height: 6),
              Flexible(
                child: ReorderableListView.builder(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
                  itemCount: _order.length,
                  onReorder: _onReorder,
                  itemBuilder: (_, i) {
                    final d = _order[i];
                    final stop = i < _preview.stops.length
                        ? _preview.stops[i]
                        : null;
                    final isPriority =
                        widget.priorityPieces.contains(d.doPiece);

                    return _StopRow(
                      key: ValueKey(d.doPiece),
                      index: i + 1,
                      delivery: d,
                      stop: stop,
                      isPriority: isPriority,
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      widget.onApply(_order);
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.check_rounded),
                    label: const Text('Appliquer cet ordre'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
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

class _PreviewBar extends StatelessWidget {
  final PremiumRoutePlan plan;
  final String Function(double) fmtEta;
  final String Function(double) fmtKm;

  const _PreviewBar({
    required this.plan,
    required this.fmtEta,
    required this.fmtKm,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          _Pill(
            icon: Icons.schedule_rounded,
            label: fmtEta(plan.totalDurationSecondsFactored),
            color: scheme.primary,
          ),
          const SizedBox(width: 8),
          _Pill(
            icon: Icons.route_rounded,
            label: fmtKm(plan.totalDistanceMeters),
            color: scheme.tertiary,
          ),
          const SizedBox(width: 8),
          _Pill(
            icon: Icons.local_gas_station_rounded,
            label: '${plan.totalFuelCostTnd.toStringAsFixed(2)} TND',
            color: const Color(0xFFEA580C),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: plan.overallTraffic.color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(plan.overallTraffic.icon,
                    color: plan.overallTraffic.color, size: 12),
                const SizedBox(width: 4),
                Text(
                  plan.overallTraffic.label,
                  style: TextStyle(
                    color: plan.overallTraffic.color,
                    fontWeight: FontWeight.w800,
                    fontSize: 10,
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

class _Pill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _Pill({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 14),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w900,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class _StopRow extends StatelessWidget {
  final int index;
  final Delivery delivery;
  final PremiumRouteStop? stop;
  final bool isPriority;

  const _StopRow({
    super.key,
    required this.index,
    required this.delivery,
    required this.stop,
    required this.isPriority,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tone = isPriority ? const Color(0xFFEA580C) : scheme.primary;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(10, 10, 12, 10),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPriority
              ? const Color(0xFFEA580C).withValues(alpha: 0.5)
              : scheme.outlineVariant.withValues(alpha: 0.6),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [tone, tone.withValues(alpha: 0.78)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: tone.withValues(alpha: 0.36),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: Text(
                '$index',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        delivery.doPiece,
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                    ),
                    if (isPriority)
                      const Padding(
                        padding: EdgeInsets.only(left: 6),
                        child: Icon(Icons.priority_high_rounded,
                            size: 16, color: Color(0xFFEA580C)),
                      ),
                  ],
                ),
                Text(
                  [
                    if (delivery.adresse.trim().isNotEmpty) delivery.adresse.trim(),
                    if (delivery.ville.trim().isNotEmpty) delivery.ville.trim(),
                  ].join(' • '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                if (stop != null && stop!.distanceFromPrevMeters > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '${(stop!.distanceFromPrevMeters / 1000).toStringAsFixed(1)} km '
                      '· ${(stop!.durationFromPrevSecondsFactored / 60).round()} min '
                      '· ${stop!.fuelCostFromPrevTnd.toStringAsFixed(2)} TND',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant.withValues(alpha: 0.78),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Icon(Icons.drag_handle_rounded, color: scheme.onSurfaceVariant),
        ],
      ),
    );
  }
}

/// Petite bottom sheet pour ajuster les paramètres essence (prix L, conso L/100).
class FuelParamsSheet extends StatefulWidget {
  final FuelParams initial;
  final ValueChanged<FuelParams> onChanged;

  const FuelParamsSheet({
    super.key,
    required this.initial,
    required this.onChanged,
  });

  @override
  State<FuelParamsSheet> createState() => _FuelParamsSheetState();
}

class _FuelParamsSheetState extends State<FuelParamsSheet> {
  late TextEditingController _priceCtrl;
  late TextEditingController _consoCtrl;

  @override
  void initState() {
    super.initState();
    _priceCtrl = TextEditingController(
      text: widget.initial.pricePerLiter.toStringAsFixed(3),
    );
    _consoCtrl = TextEditingController(
      text: widget.initial.consumptionPer100Km.toStringAsFixed(1),
    );
  }

  @override
  void dispose() {
    _priceCtrl.dispose();
    _consoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 12,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: scheme.outlineVariant,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Icon(Icons.local_gas_station_rounded, color: scheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Paramètres essence',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _priceCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Prix du litre (TND)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _consoCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Consommation (L / 100 km)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  final price = double.tryParse(
                          _priceCtrl.text.replaceAll(',', '.')) ??
                      widget.initial.pricePerLiter;
                  final conso = double.tryParse(
                          _consoCtrl.text.replaceAll(',', '.')) ??
                      widget.initial.consumptionPer100Km;
                  widget.onChanged(FuelParams(
                    pricePerLiter: price,
                    consumptionPer100Km: conso,
                  ));
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.check_rounded),
                label: const Text('Enregistrer'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
