import 'dart:math';

/// Section 2.17 — optimisation tournée Nearest Neighbor en Dart.
/// Aucun appel backend nécessaire (les commandes sont déjà en cache local
/// côté livreur après /api/livreur/orders/mine). Marche complètement hors ligne.
class TourneeStop {
  final String piece;
  final double lat;
  final double lng;
  final String? clientName;
  final String? address;
  int orderIndex;
  double distanceFromPreviousKm;
  double cumulativeDistanceKm;
  int cumulativeEtaMinutes;

  TourneeStop({
    required this.piece,
    required this.lat,
    required this.lng,
    this.clientName,
    this.address,
    this.orderIndex = 0,
    this.distanceFromPreviousKm = 0,
    this.cumulativeDistanceKm = 0,
    this.cumulativeEtaMinutes = 0,
  });
}

class TourneeOptimizerResult {
  final List<TourneeStop> stops;
  final double totalDistanceKm;
  final int totalEtaMinutes;

  TourneeOptimizerResult({
    required this.stops,
    required this.totalDistanceKm,
    required this.totalEtaMinutes,
  });
}

class TourneeOptimizerService {
  static const double _earthRadiusKm = 6371.0;
  static const double _avgSpeedKmh = 35.0;

  TourneeOptimizerResult optimize({
    required double startLat,
    required double startLng,
    required List<TourneeStop> input,
  }) {
    final remaining = List<TourneeStop>.from(input);
    final ordered = <TourneeStop>[];
    double currentLat = startLat;
    double currentLng = startLng;
    double cumulative = 0;
    int order = 1;

    while (remaining.isNotEmpty) {
      remaining.sort((a, b) {
        final da = _haversine(currentLat, currentLng, a.lat, a.lng);
        final db = _haversine(currentLat, currentLng, b.lat, b.lng);
        return da.compareTo(db);
      });
      final nearest = remaining.removeAt(0);
      final dist = _haversine(currentLat, currentLng, nearest.lat, nearest.lng);
      cumulative += dist;
      nearest.orderIndex = order++;
      nearest.distanceFromPreviousKm = double.parse(dist.toStringAsFixed(2));
      nearest.cumulativeDistanceKm = double.parse(cumulative.toStringAsFixed(2));
      nearest.cumulativeEtaMinutes = (cumulative / _avgSpeedKmh * 60).round();
      ordered.add(nearest);
      currentLat = nearest.lat;
      currentLng = nearest.lng;
    }

    return TourneeOptimizerResult(
      stops: ordered,
      totalDistanceKm: double.parse(cumulative.toStringAsFixed(2)),
      totalEtaMinutes: (cumulative / _avgSpeedKmh * 60).round(),
    );
  }

  double _haversine(double lat1, double lng1, double lat2, double lng2) {
    final dLat = _toRad(lat2 - lat1);
    final dLng = _toRad(lng2 - lng1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRad(lat1)) * cos(_toRad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return _earthRadiusKm * c;
  }

  double _toRad(double deg) => deg * pi / 180;
}
