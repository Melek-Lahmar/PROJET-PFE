import 'dart:math' as math;

import '../data/services/osrm_service.dart';
import '../models/delivery.dart';
import 'constants.dart';

enum RouteMode { fast, eco, balanced }

class RouteOrderResult {
  final List<int> orderedPointIndices;
  final double score;

  const RouteOrderResult({
    required this.orderedPointIndices,
    required this.score,
  });
}

class RouteOptimizer {
  static RouteOrderResult computeBestOrder({
    required OsrmTableResult table,
    required RouteMode mode,
    required DateTime now,
    int? lockedFirstStopIndex,
    List<int>? lockedPrefixPointIndices,
  }) {
    final pointCount = table.size;
    if (pointCount <= 0) {
      return const RouteOrderResult(
        orderedPointIndices: [],
        score: 0,
      );
    }
    if (pointCount == 1) {
      return const RouteOrderResult(
        orderedPointIndices: [0],
        score: 0,
      );
    }

    final allStops = <int>[for (int i = 1; i < pointCount; i++) i];

    final locked = <int>[];
    if (lockedPrefixPointIndices != null && lockedPrefixPointIndices.isNotEmpty) {
      for (final i in lockedPrefixPointIndices) {
        if (i > 0 && i < pointCount && !locked.contains(i)) {
          locked.add(i);
        }
      }
    } else if (lockedFirstStopIndex != null &&
        lockedFirstStopIndex > 0 &&
        lockedFirstStopIndex < pointCount) {
      locked.add(lockedFirstStopIndex);
    }

    final route = <int>[0, ...locked];
    final remaining = allStops.where((i) => !locked.contains(i)).toList();

    while (remaining.isNotEmpty) {
      final current = route.last;

      remaining.sort((a, b) {
        final ca = _edgeCost(table, current, a, mode);
        final cb = _edgeCost(table, current, b, mode);
        return ca.compareTo(cb);
      });

      route.add(remaining.removeAt(0));
    }

    return RouteOrderResult(
      orderedPointIndices: route,
      score: _routeScore(route, table, mode),
    );
  }

  static List<int> insertCheapest({
    required List<int> existingOrder,
    required int newPointIndex,
    required OsrmTableResult table,
    required RouteMode mode,
    required DateTime now,
  }) {
    final order = List<int>.from(existingOrder);

    if (order.isEmpty) {
      return [0, newPointIndex];
    }

    if (order.first != 0) {
      order.insert(0, 0);
    }

    if (order.contains(newPointIndex)) {
      return order;
    }

    var bestOrder = List<int>.from(order)..add(newPointIndex);
    var bestScore = double.infinity;

    for (int pos = 1; pos <= order.length; pos++) {
      final candidate = List<int>.from(order)..insert(pos, newPointIndex);
      final score = _routeScore(candidate, table, mode);
      if (score < bestScore) {
        bestScore = score;
        bestOrder = candidate;
      }
    }

    return bestOrder;
  }

  static List<Delivery> planStops({
    required List<Delivery> deliveries,
    required double driverLat,
    required double driverLng,
  }) {
    final active = deliveries
        .where(
          (d) => d.statut == Statut.enLivraison || d.statut == Statut.confirme,
    )
        .toList();

    if (active.isEmpty) return const [];

    final remaining = List<Delivery>.from(active);
    final ordered = <Delivery>[];

    var curLat = driverLat;
    var curLng = driverLng;

    while (remaining.isNotEmpty) {
      remaining.sort((a, b) {
        final aDist = _distanceMeters(curLat, curLng, a.lat, a.lng);
        final bDist = _distanceMeters(curLat, curLng, b.lat, b.lng);
        return aDist.compareTo(bDist);
      });

      final next = remaining.removeAt(0);
      ordered.add(next);
      curLat = next.lat;
      curLng = next.lng;
    }

    return ordered;
  }

  static List<Delivery> normalizeUrgentRanks(List<Delivery> items) {
    // Les rangs urgent ne sont plus gérés dans le modèle Delivery.
    // On garde la méthode pour compatibilité avec le reste du projet.
    return List<Delivery>.from(items);
  }

  static double _routeScore(
      List<int> order,
      OsrmTableResult table,
      RouteMode mode,
      ) {
    if (order.length <= 1) return 0.0;

    var total = 0.0;
    for (int i = 0; i < order.length - 1; i++) {
      total += _edgeCost(table, order[i], order[i + 1], mode);
    }
    return total;
  }

  static double _edgeCost(
      OsrmTableResult table,
      int from,
      int to,
      RouteMode mode,
      ) {
    final duration = table.duration(from, to);
    final distance = table.distance(from, to);

    if (!duration.isFinite || !distance.isFinite) {
      return double.infinity;
    }

    switch (mode) {
      case RouteMode.fast:
        return duration;
      case RouteMode.eco:
        return distance;
      case RouteMode.balanced:
        return duration + (distance * 0.20);
    }
  }

  static double _distanceMeters(
      double lat1,
      double lon1,
      double lat2,
      double lon2,
      ) {
    const earthRadius = 6371000.0;

    final dLat = _degToRad(lat2 - lat1);
    final dLon = _degToRad(lon2 - lon1);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_degToRad(lat1)) *
            math.cos(_degToRad(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));

    return earthRadius * c;
  }

  static double _degToRad(double deg) => deg * math.pi / 180.0;
}