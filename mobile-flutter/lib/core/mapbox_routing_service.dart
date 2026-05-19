import 'dart:async';
import 'dart:convert';

import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import 'constants.dart';
import 'premium_routing.dart';

/// =============================================================================
/// Mapbox Directions Traffic — routing temps réel multicolore.
///
/// Appelle l'API Mapbox Directions avec le profil `driving-traffic` + annotation
/// `congestion_numeric` (0-100). Permet de tracer un trajet routier réel avec
/// couleur trafic par tronçon (au lieu d'une heuristique horaire).
///
/// Cascade fallback (3 niveaux) gérée par l'appelant :
///   Mapbox driving-traffic   ← ici (couleurs trafic temps réel + vraies routes)
///   OSRM driving             ← fallback (vraies routes, couleur horaire)
///   Polyline directe         ← fallback ultime (ligne droite vol-d'oiseau)
///
/// Quota free tier : 100 000 req/mois — largement suffisant pour le PFE.
/// Cache LRU 5 min indexé par signature géo arrondie (limite la conso quota
/// quand le livreur reload la map plusieurs fois en quelques minutes).
/// =============================================================================

class MapboxRoutingService {
  MapboxRoutingService({
    this.accessToken = mapboxAccessToken,
    Duration timeout = const Duration(seconds: 5),
    Duration cacheTtl = const Duration(minutes: 5),
    int cacheCapacity = 16,
    http.Client? httpClient,
  })  : _timeout = timeout,
        _cacheTtl = cacheTtl,
        _cacheCapacity = cacheCapacity,
        _http = httpClient ?? http.Client();

  static const String _endpoint =
      'https://api.mapbox.com/directions/v5/mapbox/driving-traffic';

  final String accessToken;
  final Duration _timeout;
  final Duration _cacheTtl;
  final int _cacheCapacity;
  final http.Client _http;

  final Map<String, _CachedRoute> _cache = {};

  bool get hasValidToken =>
      accessToken.isNotEmpty && accessToken.startsWith('pk.');

  /// Récupère le trajet routier passant par tous les `waypoints` (dans l'ordre
  /// fourni). Renvoie `null` en cas d'erreur réseau, timeout, quota dépassé,
  /// token invalide ou < 2 waypoints — l'appelant doit prévoir le fallback.
  Future<MapboxRoute?> fetchRoute(List<LatLng> waypoints) async {
    if (!hasValidToken) return null;
    if (waypoints.length < 2) return null;
    // Mapbox limite à 25 waypoints par requête en driving-traffic.
    if (waypoints.length > 25) {
      waypoints = waypoints.sublist(0, 25);
    }

    final cacheKey = _signature(waypoints);
    final cached = _cache[cacheKey];
    if (cached != null && !cached.isExpired(_cacheTtl)) {
      return cached.route;
    }

    final coords = waypoints
        .map((p) => '${p.longitude.toStringAsFixed(6)},${p.latitude.toStringAsFixed(6)}')
        .join(';');

    final uri = Uri.parse(
      '$_endpoint/$coords'
      '?access_token=$accessToken'
      '&overview=full'
      '&geometries=geojson'
      '&annotations=congestion_numeric,duration,distance,speed'
      '&steps=false',
    );

    try {
      final response = await _http.get(uri).timeout(_timeout);
      if (response.statusCode != 200) return null;

      final body = jsonDecode(response.body);
      if (body is! Map<String, dynamic>) return null;

      final routes = body['routes'];
      if (routes is! List || routes.isEmpty) return null;

      final route = _parseRoute(routes.first as Map<String, dynamic>);
      if (route == null) return null;

      _storeInCache(cacheKey, route);
      return route;
    } on TimeoutException {
      return null;
    } catch (_) {
      return null;
    }
  }

  MapboxRoute? _parseRoute(Map<String, dynamic> json) {
    final geometry = json['geometry'];
    if (geometry is! Map<String, dynamic>) return null;

    final rawCoords = geometry['coordinates'];
    if (rawCoords is! List || rawCoords.length < 2) return null;

    final points = <LatLng>[];
    for (final c in rawCoords) {
      if (c is! List || c.length < 2) continue;
      final lng = (c[0] as num).toDouble();
      final lat = (c[1] as num).toDouble();
      points.add(LatLng(lat, lng));
    }
    if (points.length < 2) return null;

    final congestion = <int?>[];
    final legs = json['legs'];
    if (legs is List) {
      for (final leg in legs) {
        if (leg is! Map<String, dynamic>) continue;
        final annotation = leg['annotation'];
        if (annotation is! Map<String, dynamic>) continue;
        final cn = annotation['congestion_numeric'];
        if (cn is! List) continue;
        for (final value in cn) {
          if (value == null) {
            congestion.add(null);
          } else if (value is num) {
            congestion.add(value.toInt());
          } else {
            congestion.add(null);
          }
        }
      }
    }

    // Le nombre de segments doit valoir points.length - 1.
    // Si Mapbox ne renvoie pas assez de valeurs, on remplit avec null.
    while (congestion.length < points.length - 1) {
      congestion.add(null);
    }
    if (congestion.length > points.length - 1) {
      congestion.removeRange(points.length - 1, congestion.length);
    }

    final distance = (json['distance'] as num?)?.toDouble() ?? 0.0;
    final duration = (json['duration'] as num?)?.toDouble() ?? 0.0;

    return MapboxRoute(
      points: points,
      congestionPerSegment: congestion,
      distanceMeters: distance,
      durationSeconds: duration,
    );
  }

  String _signature(List<LatLng> waypoints) {
    // Arrondi à ~100m près (4 décimales) pour augmenter le taux de hit cache
    // quand le livreur bouge légèrement.
    return waypoints
        .map((p) =>
            '${p.latitude.toStringAsFixed(4)},${p.longitude.toStringAsFixed(4)}')
        .join('|');
  }

  void _storeInCache(String key, MapboxRoute route) {
    if (_cache.length >= _cacheCapacity) {
      // Eviction LRU naive : on retire la plus ancienne.
      final oldest = _cache.entries
          .reduce((a, b) => a.value.computedAt.isBefore(b.value.computedAt) ? a : b);
      _cache.remove(oldest.key);
    }
    _cache[key] = _CachedRoute(route: route, computedAt: DateTime.now());
  }

  void clearCache() => _cache.clear();

  void dispose() {
    _http.close();
  }

  // ════════════════════════════════════════════════════════════════════
  // STATIC IMAGES API — preview cartographique d'une commande
  // ════════════════════════════════════════════════════════════════════

  /// Génère une URL Mapbox Static Images centrée sur un point avec un
  /// marqueur épinglé. Idéal pour preview thumbnail dans les cards
  /// d'historique commande. Quota : 50 000 req/mois free tier.
  ///
  /// Style par défaut : `streets-v12` (Mapbox classic). Alternatives :
  /// `light-v11`, `dark-v11`, `satellite-streets-v12`, `outdoors-v12`.
  ///
  /// `pinColor` est un code hex sans `#` (ex: `EF4444` rouge, `22C55E` vert).
  /// `zoom` 1-22. Pour la TN on conseille 12-15. `widthPx`/`heightPx` ≤ 1280.
  String staticPreviewUrl({
    required double lat,
    required double lng,
    String pinColor = 'EF4444',
    int zoom = 14,
    int widthPx = 360,
    int heightPx = 180,
    String style = 'streets-v12',
    bool retina = true,
  }) {
    final retinaTag = retina ? '@2x' : '';
    final lngStr = lng.toStringAsFixed(6);
    final latStr = lat.toStringAsFixed(6);
    return 'https://api.mapbox.com/styles/v1/mapbox/$style/static/'
        'pin-l+$pinColor($lngStr,$latStr)/'
        '$lngStr,$latStr,$zoom,0/'
        '${widthPx}x$heightPx$retinaTag'
        '?access_token=$accessToken';
  }

  /// Variante : preview avec **trajet** (origine livreur → destination client)
  /// dessiné en polyline. Plus parlant qu'un simple marker pour l'historique
  /// livreur (montre la route effectivement parcourue).
  String staticRoutePreviewUrl({
    required double fromLat,
    required double fromLng,
    required double toLat,
    required double toLng,
    String pathColor = '6366F1',
    String fromPinColor = '0EA5E9',
    String toPinColor = 'EF4444',
    int widthPx = 360,
    int heightPx = 180,
    String style = 'streets-v12',
    bool retina = true,
  }) {
    final retinaTag = retina ? '@2x' : '';
    // GeoJSON-encoded LineString simplifié à 2 points.
    final geojson = Uri.encodeComponent(
      '{"type":"LineString","coordinates":[[$fromLng,$fromLat],[$toLng,$toLat]]}',
    );
    return 'https://api.mapbox.com/styles/v1/mapbox/$style/static/'
        'geojson($geojson)/'
        'pin-s+$fromPinColor($fromLng,$fromLat),'
        'pin-l+$toPinColor($toLng,$toLat)/'
        'auto/'
        '${widthPx}x$heightPx$retinaTag'
        '?access_token=$accessToken'
        '&padding=30';
  }

  // ════════════════════════════════════════════════════════════════════
  // GEOCODING API — recherche d'adresse → LatLng
  // ════════════════════════════════════════════════════════════════════

  /// Recherche d'adresse libre. Bias TN par défaut (`country=tn`) + langue
  /// FR + limite 5 résultats. Renvoie liste vide en cas d'erreur.
  /// Quota : 100 000 req/mois free tier.
  Future<List<MapboxGeocodeResult>> geocode(String query) async {
    if (!hasValidToken) return const [];
    final trimmed = query.trim();
    if (trimmed.length < 3) return const [];

    final encoded = Uri.encodeComponent(trimmed);
    final uri = Uri.parse(
      'https://api.mapbox.com/geocoding/v5/mapbox.places/$encoded.json'
      '?access_token=$accessToken'
      '&country=tn'
      '&language=fr'
      '&limit=5'
      '&types=address,poi,place,locality,neighborhood',
    );

    try {
      final response = await _http.get(uri).timeout(_timeout);
      if (response.statusCode != 200) return const [];

      final body = jsonDecode(response.body);
      if (body is! Map<String, dynamic>) return const [];

      final features = body['features'];
      if (features is! List) return const [];

      final out = <MapboxGeocodeResult>[];
      for (final f in features) {
        if (f is! Map<String, dynamic>) continue;
        final coords = f['center'];
        if (coords is! List || coords.length < 2) continue;
        final lng = (coords[0] as num).toDouble();
        final lat = (coords[1] as num).toDouble();
        out.add(MapboxGeocodeResult(
          placeName: (f['place_name'] ?? '').toString(),
          shortName: (f['text'] ?? '').toString(),
          position: LatLng(lat, lng),
        ));
      }
      return out;
    } on TimeoutException {
      return const [];
    } catch (_) {
      return const [];
    }
  }
}

/// Résultat de geocoding Mapbox (1 entrée = 1 lieu trouvé).
class MapboxGeocodeResult {
  final String placeName;
  final String shortName;
  final LatLng position;

  const MapboxGeocodeResult({
    required this.placeName,
    required this.shortName,
    required this.position,
  });
}

/// Résultat parsé d'un appel Mapbox Directions.
class MapboxRoute {
  final List<LatLng> points;

  /// `congestionPerSegment[i]` = niveau du segment [points[i], points[i+1]].
  /// 0 = fluide, 100 = jam. `null` = inconnu (le segment retombera sur la
  /// couleur horaire calculée par TrafficModel).
  /// Longueur garantie = `points.length - 1`.
  final List<int?> congestionPerSegment;

  final double distanceMeters;
  final double durationSeconds;

  const MapboxRoute({
    required this.points,
    required this.congestionPerSegment,
    required this.distanceMeters,
    required this.durationSeconds,
  });

  /// Mappe un score Mapbox `congestion_numeric` (0-100, ou null) vers un
  /// niveau de trafic affichable. Si null, fallback sur l'heure (paramètre
  /// `fallbackTime`) pour ne jamais avoir de segment "incolore".
  static TrafficLevel levelFromCongestion(int? score, DateTime fallbackTime) {
    if (score == null) {
      return TrafficModel.levelFor(fallbackTime);
    }
    if (score >= 75) return TrafficLevel.jam;
    if (score >= 50) return TrafficLevel.dense;
    if (score >= 25) return TrafficLevel.moderate;
    return TrafficLevel.fluid;
  }
}

class _CachedRoute {
  final MapboxRoute route;
  final DateTime computedAt;

  _CachedRoute({required this.route, required this.computedAt});

  bool isExpired(Duration ttl) =>
      DateTime.now().difference(computedAt) > ttl;
}
