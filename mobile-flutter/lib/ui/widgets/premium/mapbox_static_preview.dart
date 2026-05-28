import 'package:flutter/material.dart';

import '../../../core/constants.dart';
import '../../../core/mapbox_routing_service.dart';

/// =============================================================================
/// MapboxStaticPreview — thumbnail cartographique premium.
///
/// Charge une image statique Mapbox centrée sur un point (et optionnellement
/// une route from→to). Gère :
/// - skeleton shimmer pendant le chargement,
/// - fallback gracieux si pas de token / erreur réseau,
/// - cache HTTP réseau natif (Image.network),
/// - placeholder propre si lat/lng absents.
///
/// Utilisé sur les cards d'historique commande (client, livreur, confirmatrice)
/// et le DeliveryDetails pour donner un effet "Stripe / Google Maps premium".
/// =============================================================================
class MapboxStaticPreview extends StatelessWidget {
  final double? lat;
  final double? lng;

  /// Si fournis, on dessine une polyline du driver vers la destination.
  final double? fromLat;
  final double? fromLng;

  final double height;
  final BorderRadius borderRadius;
  final String pinColor;
  final int zoom;

  /// Style Mapbox. `light-v11` = clair épuré (recommandé pour cards).
  /// `streets-v12` = classique. `dark-v11` = mode sombre.
  final String style;

  const MapboxStaticPreview({
    super.key,
    required this.lat,
    required this.lng,
    this.fromLat,
    this.fromLng,
    this.height = 120,
    this.borderRadius = const BorderRadius.all(Radius.circular(14)),
    this.pinColor = 'EF4444',
    this.zoom = 14,
    this.style = 'light-v11',
  });

  bool get _hasCoords =>
      lat != null && lng != null && (lat != 0.0 || lng != 0.0);

  bool get _hasRoute =>
      fromLat != null && fromLng != null && (fromLat != 0.0 || fromLng != 0.0);

  String? _buildUrl() {
    if (!_hasCoords) return null;
    if (!mapboxAccessToken.startsWith('pk.')) return null;

    final svc = MapboxRoutingService();
    if (_hasRoute) {
      return svc.staticRoutePreviewUrl(
        fromLat: fromLat!,
        fromLng: fromLng!,
        toLat: lat!,
        toLng: lng!,
        style: style,
        toPinColor: pinColor,
      );
    }
    return svc.staticPreviewUrl(
      lat: lat!,
      lng: lng!,
      pinColor: pinColor,
      zoom: zoom,
      style: style,
    );
  }

  @override
  Widget build(BuildContext context) {
    final url = _buildUrl();
    final scheme = Theme.of(context).colorScheme;

    if (url == null) {
      return Container(
        height: height,
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
          borderRadius: borderRadius,
        ),
        child: Center(
          child: Icon(
            Icons.location_off_outlined,
            color: scheme.onSurfaceVariant.withValues(alpha: 0.6),
            size: 32,
          ),
        ),
      );
    }

    return ClipRRect(
      borderRadius: borderRadius,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Container(
            height: height,
            color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
          ),
          Image.network(
            url,
            height: height,
            width: double.infinity,
            fit: BoxFit.cover,
            loadingBuilder: (ctx, child, progress) {
              if (progress == null) return child;
              return _MapShimmer(height: height);
            },
            errorBuilder: (ctx, error, stack) => Container(
              height: height,
              color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
              child: Center(
                child: Icon(
                  Icons.map_outlined,
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.5),
                  size: 28,
                ),
              ),
            ),
          ),
          // Léger dégradé en bas pour booster la lisibilité d'un overlay texte.
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.10),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapShimmer extends StatefulWidget {
  final double height;

  const _MapShimmer({required this.height});

  @override
  State<_MapShimmer> createState() => _MapShimmerState();
}

class _MapShimmerState extends State<_MapShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        return Container(
          height: widget.height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-1 + 2 * _c.value, 0),
              end: Alignment(1 + 2 * _c.value, 0),
              colors: [
                Colors.black.withValues(alpha: 0.04),
                Colors.black.withValues(alpha: 0.10),
                Colors.black.withValues(alpha: 0.04),
              ],
            ),
          ),
        );
      },
    );
  }
}
