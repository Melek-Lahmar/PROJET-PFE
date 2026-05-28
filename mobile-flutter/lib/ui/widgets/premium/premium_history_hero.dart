import 'package:flutter/material.dart';

/// =============================================================================
/// PremiumHistoryHero — bandeau premium pour les écrans d'historique.
///
/// Affiche un gradient accent + titre + sous-titre + 4 stats clés animées
/// (compteurs qui montent de 0 → valeur réelle). Utilisé en haut de chaque
/// écran historique (client / livreur / confirmatrice) pour donner une
/// vue d'ensemble instantanée.
/// =============================================================================
class PremiumHistoryHero extends StatefulWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accent;
  final Color accentDark;

  /// Stats affichées (4 max). Chaque stat = label + valeur + couleur.
  final List<HistoryStat> stats;

  /// Période actuellement sélectionnée (affichée en bas du hero).
  final String? periodLabel;

  const PremiumHistoryHero({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accent,
    required this.accentDark,
    required this.stats,
    this.periodLabel,
  });

  @override
  State<PremiumHistoryHero> createState() => _PremiumHistoryHeroState();
}

class _PremiumHistoryHeroState extends State<PremiumHistoryHero>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic);
    _ctrl.forward();
  }

  @override
  void didUpdateWidget(covariant PremiumHistoryHero old) {
    super.didUpdateWidget(old);
    // Re-animate les compteurs quand la liste des stats change.
    if (old.stats != widget.stats) {
      _ctrl
        ..reset()
        ..forward();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [widget.accent, widget.accentDark],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        boxShadow: [
          BoxShadow(
            color: widget.accent.withValues(alpha: 0.32),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(widget.icon, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                        letterSpacing: 0.1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.subtitle,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (widget.periodLabel != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.calendar_today_rounded,
                          color: Colors.white, size: 12),
                      const SizedBox(width: 4),
                      Text(
                        widget.periodLabel!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 18),
          AnimatedBuilder(
            animation: _anim,
            builder: (_, __) {
              return Row(
                children: [
                  for (var i = 0; i < widget.stats.length; i++) ...[
                    if (i > 0) const SizedBox(width: 10),
                    Expanded(
                      child: _StatTile(
                        stat: widget.stats[i],
                        progress: _anim.value,
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class HistoryStat {
  final String label;
  final num value;

  /// Optionnel : suffixe (ex: "%" ou "TND"). Si null, valeur formatée brute.
  final String? suffix;

  /// Couleur de pastille indicatrice (laisser null → blanc subtil).
  final Color? dotColor;

  /// Quand `true`, le format affiche un décimal (utile pour les pourcentages
  /// ou montants courts). Sinon entier.
  final bool decimal;

  const HistoryStat({
    required this.label,
    required this.value,
    this.suffix,
    this.dotColor,
    this.decimal = false,
  });
}

class _StatTile extends StatelessWidget {
  final HistoryStat stat;
  final double progress;

  const _StatTile({required this.stat, required this.progress});

  @override
  Widget build(BuildContext context) {
    final v = stat.value.toDouble() * progress;
    final display = stat.decimal
        ? v.toStringAsFixed(1)
        : v.toStringAsFixed(0);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: stat.dotColor ?? Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  stat.label,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          RichText(
            text: TextSpan(
              text: display,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 22,
                letterSpacing: -0.5,
              ),
              children: [
                if (stat.suffix != null)
                  TextSpan(
                    text: ' ${stat.suffix}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
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
