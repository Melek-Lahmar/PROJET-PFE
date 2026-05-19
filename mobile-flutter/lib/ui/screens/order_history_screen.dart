import 'package:flutter/material.dart';

import '../widgets/premium/mapbox_static_preview.dart';

/// =============================================================================
/// Écran "Historique de la commande" — timeline événementielle premium.
///
/// Affiche dans cet ordre :
///   1. Hero gradient (accent rôle) avec piece + statut actuel + montant.
///   2. Mini-map Mapbox Static si lat/lng disponibles (sinon masquée).
///   3. Timeline verticale animée des événements (création, confirmation,
///      en livraison, tentative, dépôt, livrée, retour…) avec :
///        - pastille colorée par statut,
///        - ligne de liaison verticale,
///        - date + heure complètes,
///        - description / motif / acteur si présent.
///
/// Réutilisable par les 3 rôles (livreur, client, confirmatrice) — chacun
/// alimente `events` depuis sa source (LivreurOrderHistoryItem,
/// CustomerTrackingEvent, etc.) en mappant vers `OrderTimelineEvent`.
/// =============================================================================
class OrderHistoryScreen extends StatelessWidget {
  final String piece;
  final String currentStatusLabel;
  final Color accentColor;
  final Color accentDark;
  final IconData heroIcon;

  /// Montant à afficher dans le hero (généralement netAPayer).
  /// Si null, on n'affiche pas le bloc montant.
  final double? amount;

  /// Coordonnées pour la mini-map. Si null/0, on n'affiche pas la map.
  final double? lat;
  final double? lng;

  /// Liste chronologique (sera triée par date desc dans l'UI). 1 événement
  /// = 1 ligne timeline.
  final List<OrderTimelineEvent> events;

  /// Sous-titre optionnel dans le hero (ex: nom client, ville…).
  final String? subtitle;

  const OrderHistoryScreen({
    super.key,
    required this.piece,
    required this.currentStatusLabel,
    required this.accentColor,
    required this.accentDark,
    required this.heroIcon,
    required this.events,
    this.amount,
    this.lat,
    this.lng,
    this.subtitle,
  });

  bool get _hasCoords =>
      lat != null && lng != null && (lat != 0.0 || lng != 0.0);

  String get _pinHex {
    final hex = accentColor.toARGB32().toRadixString(16).padLeft(8, '0');
    return hex.substring(2).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final sorted = [...events]..sort((a, b) => b.date.compareTo(a.date));

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _Hero(
              piece: piece,
              currentStatusLabel: currentStatusLabel,
              accent: accentColor,
              accentDark: accentDark,
              icon: heroIcon,
              amount: amount,
              subtitle: subtitle,
            ),
          ),
          if (_hasCoords)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: MapboxStaticPreview(
                  lat: lat,
                  lng: lng,
                  height: 160,
                  pinColor: _pinHex,
                ),
              ),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 10),
              child: Row(
                children: [
                  Icon(Icons.timeline_rounded,
                      color: accentColor, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Suivi de la commande',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      color: accentDark,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${sorted.length} événement${sorted.length > 1 ? "s" : ""}',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (sorted.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(accent: accentColor),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              sliver: SliverList.builder(
                itemCount: sorted.length,
                itemBuilder: (_, i) {
                  return _TimelineRow(
                    event: sorted[i],
                    isFirst: i == 0,
                    isLast: i == sorted.length - 1,
                    index: i,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

/// Modèle commun "1 événement timeline". Chaque rôle convertit son modèle
/// natif vers cette structure.
class OrderTimelineEvent {
  final DateTime date;

  /// Libellé court (ex: "Commande créée", "En livraison", "Livrée").
  final String label;

  /// Couleur de la pastille — typiquement celle du statut.
  final Color color;

  /// Icône représentant le statut/événement.
  final IconData icon;

  /// Description longue optionnelle (ex: motif, note, acteur).
  final String? description;

  /// Personne qui a déclenché l'événement (ex: "Livreur X", "Confirmatrice Y").
  final String? actor;

  const OrderTimelineEvent({
    required this.date,
    required this.label,
    required this.color,
    required this.icon,
    this.description,
    this.actor,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Hero
// ════════════════════════════════════════════════════════════════════════════
class _Hero extends StatelessWidget {
  final String piece;
  final String currentStatusLabel;
  final Color accent;
  final Color accentDark;
  final IconData icon;
  final double? amount;
  final String? subtitle;

  const _Hero({
    required this.piece,
    required this.currentStatusLabel,
    required this.accent,
    required this.accentDark,
    required this.icon,
    this.amount,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [accent, accentDark],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        boxShadow: [
          BoxShadow(
            color: accent.withOpacity(0.32),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 16, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.arrow_back_rounded,
                        color: Colors.white),
                  ),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Historique commande',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          piece,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 24,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text(
                    subtitle!,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 18),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.14),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: Colors.white.withOpacity(0.22)),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Statut actuel',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              currentStatusLabel,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 17,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (amount != null) ...[
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.14),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: Colors.white.withOpacity(0.22)),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Net à payer',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.3,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${amount!.toStringAsFixed(3)} DT',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 17,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Timeline réutilisable inline (sans hero) — pour intégrer la timeline
// directement dans une page détail commande sans naviguer vers OrderHistoryScreen.
// ════════════════════════════════════════════════════════════════════════════
class OrderTimelineList extends StatelessWidget {
  final List<OrderTimelineEvent> events;
  final Color accentColor;
  final Color accentDark;
  final EdgeInsetsGeometry padding;
  final bool showHeader;

  const OrderTimelineList({
    super.key,
    required this.events,
    required this.accentColor,
    required this.accentDark,
    this.padding = const EdgeInsets.all(16),
    this.showHeader = true,
  });

  @override
  Widget build(BuildContext context) {
    final sorted = [...events]..sort((a, b) => b.date.compareTo(a.date));

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showHeader)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(Icons.timeline_rounded, color: accentColor, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Historique',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      color: accentDark,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${sorted.length} étape${sorted.length > 1 ? "s" : ""}',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          if (sorted.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.timeline_rounded,
                        color: accentColor.withOpacity(0.30), size: 36),
                    const SizedBox(height: 6),
                    Text(
                      'Aucun événement enregistré',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Column(
              children: List.generate(sorted.length, (i) {
                return _TimelineRow(
                  event: sorted[i],
                  isFirst: i == 0,
                  isLast: i == sorted.length - 1,
                  index: i,
                );
              }),
            ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Timeline row : 1 événement
// ════════════════════════════════════════════════════════════════════════════
class _TimelineRow extends StatefulWidget {
  final OrderTimelineEvent event;
  final bool isFirst;
  final bool isLast;
  final int index;

  const _TimelineRow({
    required this.event,
    required this.isFirst,
    required this.isLast,
    required this.index,
  });

  @override
  State<_TimelineRow> createState() => _TimelineRowState();
}

class _TimelineRowState extends State<_TimelineRow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _fade;
  late final Animation<double> _slide;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );
    _fade = CurvedAnimation(parent: _c, curve: Curves.easeOut);
    _slide = Tween<double>(begin: 16, end: 0).animate(
      CurvedAnimation(parent: _c, curve: Curves.easeOutCubic),
    );
    Future.delayed(Duration(milliseconds: 80 + widget.index * 65), () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  String _formatDate(DateTime dt) {
    final d = dt.toLocal();
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  String _formatTime(DateTime dt) {
    final d = dt.toLocal();
    return '${d.hour.toString().padLeft(2, '0')}h${d.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final ev = widget.event;
    final scheme = Theme.of(context).colorScheme;

    return AnimatedBuilder(
      animation: _c,
      builder: (_, child) {
        return Opacity(
          opacity: _fade.value,
          child: Transform.translate(
            offset: Offset(0, _slide.value),
            child: child,
          ),
        );
      },
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Colonne verticale : pastille + ligne de liaison
            SizedBox(
              width: 44,
              child: Column(
                children: [
                  // Ligne du haut (cachée si premier event)
                  Container(
                    width: 2,
                    height: widget.isFirst ? 0 : 18,
                    color: ev.color.withOpacity(0.30),
                  ),
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: ev.color,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: ev.color.withOpacity(0.45),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Icon(ev.icon, color: Colors.white, size: 15),
                  ),
                  // Ligne du bas (cachée si dernier event)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: widget.isLast
                          ? Colors.transparent
                          : ev.color.withOpacity(0.30),
                    ),
                  ),
                ],
              ),
            ),
            // Bloc card
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 14, top: 8),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border(
                      left: BorderSide(color: ev.color, width: 3.5),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: ev.color.withOpacity(0.10),
                        blurRadius: 14,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              ev.label,
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 14.5,
                                color: ev.color,
                                letterSpacing: 0.1,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: ev.color.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _formatTime(ev.date),
                              style: TextStyle(
                                color: ev.color,
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.calendar_today_rounded,
                              size: 11,
                              color: scheme.onSurfaceVariant
                                  .withOpacity(0.6)),
                          const SizedBox(width: 4),
                          Text(
                            _formatDate(ev.date),
                            style: TextStyle(
                              color: scheme.onSurfaceVariant
                                  .withOpacity(0.85),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (ev.actor != null) ...[
                            const SizedBox(width: 8),
                            Icon(Icons.person_outline,
                                size: 11,
                                color: scheme.onSurfaceVariant
                                    .withOpacity(0.6)),
                            const SizedBox(width: 3),
                            Flexible(
                              child: Text(
                                ev.actor!,
                                style: TextStyle(
                                  color: scheme.onSurfaceVariant
                                      .withOpacity(0.85),
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (ev.description != null &&
                          ev.description!.trim().isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: ev.color.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            ev.description!,
                            style: TextStyle(
                              color: scheme.onSurface.withOpacity(0.85),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final Color accent;
  const _EmptyState({required this.accent});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: accent.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.timeline_rounded, color: accent, size: 56),
            ),
            const SizedBox(height: 18),
            const Text(
              'Aucun événement enregistré',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
            ),
            const SizedBox(height: 6),
            Text(
              'L\'historique des étapes apparaîtra ici dès qu\'une action sera enregistrée.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}
