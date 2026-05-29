import 'package:flutter/material.dart';

/// Panneau d'aperçu de tournée premium — affiché en haut de la carte.
///
/// Design : carte arrondie blanche avec micro-ombre, header gradient
/// indiquant l'état GPS, chiffres clés en évidence (ETA, distance, stops),
/// puis une rangée de pills compactes pour les états secondaires (mode,
/// off-route, priorité).
class MapSummaryPanel extends StatelessWidget {
  final String routeLabel;
  final String etaLabel;
  final String distanceLabel;
  final String modeLabel;
  final bool gpsActive;
  final bool offRoute;
  final String? offRouteLabel;
  final String? urgentLabel;

  const MapSummaryPanel({
    super.key,
    required this.routeLabel,
    required this.etaLabel,
    required this.distanceLabel,
    required this.modeLabel,
    required this.gpsActive,
    this.offRoute = false,
    this.offRouteLabel,
    this.urgentLabel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 22,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(context),
          _buildBody(theme, scheme),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final color = gpsActive ? scheme.primary : scheme.error;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withValues(alpha: 0.78)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Row(
        children: [
          if (gpsActive)
            const _PulseDot(color: Colors.white)
          else
            const Icon(Icons.gps_off_rounded, size: 14, color: Colors.white),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              gpsActive ? 'Tournée active' : 'GPS indisponible',
              style: theme.textTheme.titleSmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.2,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.20),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withValues(alpha: 0.30)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.tune_rounded, size: 11, color: Colors.white),
                const SizedBox(width: 4),
                Text(modeLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(ThemeData theme, ColorScheme scheme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                _StatColumn(
                  icon: Icons.route_rounded,
                  label: 'Stops',
                  value: routeLabel.replaceAll(' stops', '').replaceAll(' stop', ''),
                  hint: routeLabel.contains('stop') ? 'restants' : null,
                  color: scheme.primary,
                ),
                _Divider(color: scheme.outlineVariant.withValues(alpha: 0.5)),
                _StatColumn(
                  icon: Icons.schedule_rounded,
                  label: 'ETA total',
                  value: etaLabel,
                  color: const Color(0xFF6366F1),
                ),
                _Divider(color: scheme.outlineVariant.withValues(alpha: 0.5)),
                _StatColumn(
                  icon: Icons.straighten_rounded,
                  label: 'Distance',
                  value: distanceLabel,
                  color: const Color(0xFF22C55E),
                ),
              ],
            ),
          ),
          if ((offRoute && offRouteLabel != null) || urgentLabel != null) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6, runSpacing: 6,
              children: [
                if (offRoute && offRouteLabel != null)
                  _SecondaryPill(
                    icon: Icons.warning_amber_rounded,
                    text: offRouteLabel!,
                    color: scheme.error,
                  ),
                if (urgentLabel != null)
                  _SecondaryPill(
                    icon: Icons.priority_high_rounded,
                    text: urgentLabel!,
                    color: Colors.deepOrange,
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? hint;
  final Color color;
  const _StatColumn({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    this.hint,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Expanded(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
              Text(label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w800,
                    fontSize: 10,
                  )),
            ],
          ),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(value,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.3,
                  color: color,
                )),
          ),
          if (hint != null)
            Text(hint!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontSize: 9,
                )),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  final Color color;
  const _Divider({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, color: color, margin: const EdgeInsets.symmetric(horizontal: 6));
  }
}

class _SecondaryPill extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _SecondaryPill({required this.icon, required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(text,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w800,
                fontSize: 11,
              )),
        ],
      ),
    );
  }
}

class _PulseDot extends StatefulWidget {
  final Color color;
  const _PulseDot({required this.color});

  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    duration: const Duration(milliseconds: 1400),
    vsync: this,
  )..repeat();

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
        return SizedBox(
          width: 14, height: 14,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Opacity(
                opacity: 1 - t,
                child: Transform.scale(
                  scale: 0.6 + t * 1.2,
                  child: Container(
                    decoration: BoxDecoration(
                      color: widget.color.withValues(alpha: 0.55),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
              Container(
                width: 7, height: 7,
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
