import 'dart:math';

class GeoUtils {
  static const double _earthRadiusM = 6371000;

  static double distanceMeters(
      double lat1,
      double lon1,
      double lat2,
      double lon2,
      ) {
    final dLat = _degToRad(lat2 - lat1);
    final dLon = _degToRad(lon2 - lon1);

    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degToRad(lat1)) *
            cos(_degToRad(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return _earthRadiusM * c;
  }

  static double _degToRad(double deg) => deg * pi / 180.0;

  /// ✅ Distance min (m) entre un point (lat,lon) et une polyline (liste lat/lon).
  /// Utilise une projection equirectangulaire locale (rapide et précise pour petites distances).
  static double distancePointToPolylineMeters({
    required double pointLat,
    required double pointLon,
    required List<List<double>> polylineLatLon,
  }) {
    if (polylineLatLon.length < 2) return double.infinity;

    // Projection locale (référence = latitude du point)
    final lat0 = _degToRad(pointLat);
    double projectX(double lat, double lon) =>
        _degToRad(lon) * cos(lat0) * _earthRadiusM;
    double projectY(double lat, double lon) => _degToRad(lat) * _earthRadiusM;

    final px = projectX(pointLat, pointLon);
    final py = projectY(pointLat, pointLon);

    var best = double.infinity;

    for (var i = 0; i < polylineLatLon.length - 1; i++) {
      final a = polylineLatLon[i];
      final b = polylineLatLon[i + 1];

      final ax = projectX(a[0], a[1]);
      final ay = projectY(a[0], a[1]);
      final bx = projectX(b[0], b[1]);
      final by = projectY(b[0], b[1]);

      final d = _distPointToSegment(px, py, ax, ay, bx, by);
      if (d < best) best = d;
    }

    return best;
  }

  static double _distPointToSegment(
      double px,
      double py,
      double ax,
      double ay,
      double bx,
      double by,
      ) {
    final abx = bx - ax;
    final aby = by - ay;
    final apx = px - ax;
    final apy = py - ay;

    final ab2 = abx * abx + aby * aby;
    if (ab2 == 0) {
      final dx = px - ax;
      final dy = py - ay;
      return sqrt(dx * dx + dy * dy);
    }

    var t = (apx * abx + apy * aby) / ab2;
    t = t.clamp(0.0, 1.0);

    final cx = ax + t * abx;
    final cy = ay + t * aby;

    final dx = px - cx;
    final dy = py - cy;
    return sqrt(dx * dx + dy * dy);
  }
}