import 'package:flutter/material.dart';

import 'mapbox_static_preview.dart';

/// =============================================================================
/// PremiumHistoryCard — card riche pour les écrans d'historique.
///
/// Anatomie :
///   ┌─────────────────────────────────────────┐
///   │  [mini-map Mapbox 360×120]              │
///   │  ┌─ pill statut colorée (overlay BL)    │
///   ├─────────────────────────────────────────┤
///   │  Titre (BC00012)        12.500 TND  ›   │
///   │  Sous-titre (client · ville · date)     │
///   │  ┌ chip motif/note si présent ┐         │
///   └─────────────────────────────────────────┘
///
/// La bordure gauche prend la couleur statut, le shadow aussi → lecture
/// rapide en scroll. Mini-map = thumbnail Mapbox Static (1 req cache HTTP).
/// =============================================================================
class PremiumHistoryCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String value;
  final String statusLabel;
  final Color statusColor;

  /// Coordonnées de la destination (pour la mini-map Mapbox).
  final double? lat;
  final double? lng;

  /// Optionnel : origine pour tracer la route on the static preview.
  final double? fromLat;
  final double? fromLng;

  final IconData icon;
  final VoidCallback? onTap;

  /// Optionnel : badge supplémentaire affiché à côté du label statut
  /// (ex: "Motif: Client absent", "Tentative 2/3"…).
  final String? secondaryBadge;

  /// Optionnel : ligne "footer" avec un date/temps complet.
  final String? footer;

  /// Si false, on n'affiche pas la mini-map (économise du quota Mapbox sur
  /// les listes très longues). Default true.
  final bool showMap;

  const PremiumHistoryCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.statusLabel,
    required this.statusColor,
    required this.icon,
    this.lat,
    this.lng,
    this.fromLat,
    this.fromLng,
    this.onTap,
    this.secondaryBadge,
    this.footer,
    this.showMap = true,
  });

  String get _pinHex {
    final hex = statusColor.toARGB32().toRadixString(16).padLeft(8, '0');
    return hex.substring(2).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: Color.lerp(Colors.white, statusColor, 0.035) ?? Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border(
          left: BorderSide(color: statusColor, width: 4),
        ),
        boxShadow: [
          BoxShadow(
            color: statusColor.withOpacity(0.11),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (showMap && lat != null && lng != null)
                Stack(
                  children: [
                    MapboxStaticPreview(
                      lat: lat,
                      lng: lng,
                      fromLat: fromLat,
                      fromLng: fromLng,
                      height: 120,
                      pinColor: _pinHex,
                      borderRadius: const BorderRadius.only(
                        topRight: Radius.circular(14),
                      ),
                    ),
                    Positioned(
                      top: 10,
                      left: 10,
                      child: _StatusPill(
                        label: statusLabel,
                        color: statusColor,
                        elevated: true,
                      ),
                    ),
                    if (secondaryBadge != null)
                      Positioned(
                        top: 10,
                        right: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.55),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            secondaryBadge!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.13),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, color: statusColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              letterSpacing: 0.1,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (!(showMap && lat != null && lng != null)) ...[
                            const SizedBox(height: 6),
                            _StatusPill(
                              label: statusLabel,
                              color: statusColor,
                              elevated: false,
                            ),
                          ],
                          if (footer != null) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(Icons.schedule_rounded,
                                    size: 12,
                                    color: scheme.onSurfaceVariant
                                        .withOpacity(0.7)),
                                const SizedBox(width: 4),
                                Text(
                                  footer!,
                                  style: TextStyle(
                                    color:
                                        scheme.onSurfaceVariant.withOpacity(0.8),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          value,
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            letterSpacing: -0.2,
                          ),
                        ),
                        if (onTap != null) ...[
                          const SizedBox(height: 6),
                          Icon(Icons.chevron_right_rounded,
                              color: scheme.onSurfaceVariant
                                  .withOpacity(0.6)),
                        ],
                      ],
                    ),
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

class _StatusPill extends StatelessWidget {
  final String label;
  final Color color;
  final bool elevated;

  const _StatusPill({
    required this.label,
    required this.color,
    required this.elevated,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: elevated ? color : color.withOpacity(0.13),
        borderRadius: BorderRadius.circular(20),
        border:
            elevated ? null : Border.all(color: color.withOpacity(0.35)),
        boxShadow: elevated
            ? [
                BoxShadow(
                  color: color.withOpacity(0.35),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ]
            : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: elevated ? Colors.white : color,
          fontSize: 10.5,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
