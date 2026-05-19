import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models/delivery.dart';

/// =============================================================================
/// Premium routing — modèle synthétique gratuit.
///
/// Produit un score multi-facteurs (durée OSRM × facteur trafic, distance ≈
/// essence, priorité commande, pénalité changement de direction) qui permet
/// d'optimiser l'ordre de visite au-delà du simple "plus court chemin".
///
/// Le facteur trafic est dérivé de l'heure locale Tunisie (calibré pour
/// Tunis / grandes villes) — pas d'API externe payante. Si plus tard tu
/// branches Google Directions ou Mapbox, il suffit de remplacer
/// `TrafficModel.factorFor` par un appel réseau.
/// =============================================================================

enum TrafficLevel { fluid, moderate, dense, jam }

extension TrafficLevelLabel on TrafficLevel {
  String get label {
    switch (this) {
      case TrafficLevel.fluid:
        return 'Trafic fluide';
      case TrafficLevel.moderate:
        return 'Trafic modéré';
      case TrafficLevel.dense:
        return 'Trafic dense';
      case TrafficLevel.jam:
        return 'Embouteillages';
    }
  }

  Color get color {
    switch (this) {
      case TrafficLevel.fluid:
        return const Color(0xFF16A34A);
      case TrafficLevel.moderate:
        return const Color(0xFFEAB308);
      case TrafficLevel.dense:
        return const Color(0xFFEA580C);
      case TrafficLevel.jam:
        return const Color(0xFFDC2626);
    }
  }

  IconData get icon {
    switch (this) {
      case TrafficLevel.fluid:
        return Icons.air_rounded;
      case TrafficLevel.moderate:
        return Icons.directions_car_rounded;
      case TrafficLevel.dense:
        return Icons.traffic_rounded;
      case TrafficLevel.jam:
        return Icons.warning_amber_rounded;
    }
  }
}

/// Modèle de trafic horaire calibré pour la Tunisie (Tunis et grandes villes).
/// Renvoie un multiplicateur appliqué à la durée OSRM "à vide".
class TrafficModel {
  const TrafficModel();

  /// Coefficient du jour de la semaine. Vendredi soir + samedi matin = +.
  static double weekdayFactor(DateTime when) {
    switch (when.weekday) {
      case DateTime.friday:
        return 1.10;
      case DateTime.saturday:
        return 0.95;
      case DateTime.sunday:
        return 0.80;
      default:
        return 1.0;
    }
  }

  /// Multiplicateur trafic appliqué à une durée brute OSRM.
  /// Combine heure de la journée et jour de la semaine.
  static double factorFor(DateTime when) {
    final h = when.hour + when.minute / 60.0;

    double hourFactor;
    if (h >= 7.0 && h < 9.5) {
      hourFactor = 1.45;
    } else if (h >= 9.5 && h < 12.0) {
      hourFactor = 1.10;
    } else if (h >= 12.0 && h < 14.0) {
      hourFactor = 1.18;
    } else if (h >= 14.0 && h < 17.0) {
      hourFactor = 1.05;
    } else if (h >= 17.0 && h < 20.0) {
      hourFactor = 1.55;
    } else if (h >= 20.0 && h < 22.0) {
      hourFactor = 1.10;
    } else {
      hourFactor = 0.85;
    }

    return hourFactor * weekdayFactor(when);
  }

  static TrafficLevel levelFor(DateTime when) {
    final f = factorFor(when);
    if (f >= 1.40) return TrafficLevel.jam;
    if (f >= 1.20) return TrafficLevel.dense;
    if (f >= 1.05) return TrafficLevel.moderate;
    return TrafficLevel.fluid;
  }

  /// Niveau pour un segment précis (donnée actuelle, pourrait être enrichi
  /// par un facteur "axe routier" plus tard si on branche TomTom/HERE).
  static TrafficLevel levelForSegment(DateTime when) => levelFor(when);
}

/// Paramètres économiques (essence) — modifiables depuis l'UI panel.
class FuelParams {
  /// Prix du litre en TND (essence sans plomb par défaut, 2026).
  final double pricePerLiter;

  /// Consommation moyenne du véhicule, en L/100 km.
  final double consumptionPer100Km;

  const FuelParams({
    this.pricePerLiter = 2.525,
    this.consumptionPer100Km = 7.5,
  });

  FuelParams copyWith({double? pricePerLiter, double? consumptionPer100Km}) =>
      FuelParams(
        pricePerLiter: pricePerLiter ?? this.pricePerLiter,
        consumptionPer100Km: consumptionPer100Km ?? this.consumptionPer100Km,
      );

  /// Coût total essence pour `meters` mètres parcourus.
  double costFor(double meters) {
    final km = meters / 1000.0;
    final liters = km * consumptionPer100Km / 100.0;
    return liters * pricePerLiter;
  }
}

/// Pondération du score multi-facteurs (somme = 1.0). Permet de switcher
/// entre profil rapide / éco / équilibré.
class RouteWeights {
  final double timeWeight;
  final double distanceWeight;
  final double priorityWeight;
  final double turnPenaltyWeight;

  const RouteWeights({
    required this.timeWeight,
    required this.distanceWeight,
    required this.priorityWeight,
    required this.turnPenaltyWeight,
  });

  static const RouteWeights fast = RouteWeights(
    timeWeight: 0.65,
    distanceWeight: 0.10,
    priorityWeight: 0.20,
    turnPenaltyWeight: 0.05,
  );

  static const RouteWeights eco = RouteWeights(
    timeWeight: 0.20,
    distanceWeight: 0.55,
    priorityWeight: 0.20,
    turnPenaltyWeight: 0.05,
  );

  static const RouteWeights balanced = RouteWeights(
    timeWeight: 0.40,
    distanceWeight: 0.30,
    priorityWeight: 0.20,
    turnPenaltyWeight: 0.10,
  );
}

/// Une étape planifiée avec ses métriques contextualisées (distance, ETA
/// factorisée trafic, niveau trafic, coût essence cumulé).
class PremiumRouteStop {
  final Delivery delivery;
  final int sequence;
  final double distanceFromPrevMeters;
  final double durationFromPrevSecondsRaw;
  final double durationFromPrevSecondsFactored;
  final TrafficLevel trafficLevel;
  final double fuelCostFromPrevTnd;
  final bool isPriority;

  const PremiumRouteStop({
    required this.delivery,
    required this.sequence,
    required this.distanceFromPrevMeters,
    required this.durationFromPrevSecondsRaw,
    required this.durationFromPrevSecondsFactored,
    required this.trafficLevel,
    required this.fuelCostFromPrevTnd,
    required this.isPriority,
  });
}

/// Plan complet calculé par `PremiumRouter` : suite ordonnée d'étapes +
/// agrégats utilisateur (totaux ETA, km, coût essence, niveau trafic moyen).
class PremiumRoutePlan {
  final List<PremiumRouteStop> stops;
  final double totalDistanceMeters;
  final double totalDurationSecondsRaw;
  final double totalDurationSecondsFactored;
  final double totalFuelCostTnd;
  final TrafficLevel overallTraffic;
  final DateTime computedAt;

  const PremiumRoutePlan({
    required this.stops,
    required this.totalDistanceMeters,
    required this.totalDurationSecondsRaw,
    required this.totalDurationSecondsFactored,
    required this.totalFuelCostTnd,
    required this.overallTraffic,
    required this.computedAt,
  });

  static final PremiumRoutePlan empty = PremiumRoutePlan(
    stops: const [],
    totalDistanceMeters: 0,
    totalDurationSecondsRaw: 0,
    totalDurationSecondsFactored: 0,
    totalFuelCostTnd: 0,
    overallTraffic: TrafficLevel.fluid,
    computedAt: DateTime.fromMillisecondsSinceEpoch(0),
  );

  bool get isEmpty => stops.isEmpty;
  bool get isNotEmpty => stops.isNotEmpty;
}

/// Calcule plans premium et propose des optimisations TSP (nearest-neighbor +
/// améliorations 2-opt) en utilisant les distances haversine entre stops
/// (rapide, hors-ligne). Quand on a une vraie OSRM table, on l'utilise.
class PremiumRouter {
  final FuelParams fuel;

  const PremiumRouter({this.fuel = const FuelParams()});

  /// Construit un plan en respectant l'ordre fourni des `stops`.
  PremiumRoutePlan buildPlanInOrder({
    required LatLng? driverPosition,
    required List<Delivery> stops,
    required Set<String> priorityPieces,
    required DateTime now,
  }) {
    if (stops.isEmpty) {
      return PremiumRoutePlan(
        stops: const [],
        totalDistanceMeters: 0,
        totalDurationSecondsRaw: 0,
        totalDurationSecondsFactored: 0,
        totalFuelCostTnd: 0,
        overallTraffic: TrafficModel.levelFor(now),
        computedAt: now,
      );
    }

    final trafficFactor = TrafficModel.factorFor(now);
    final overallLevel = TrafficModel.levelFor(now);

    final routeStops = <PremiumRouteStop>[];
    var totalDistance = 0.0;
    var totalRaw = 0.0;
    var totalFactored = 0.0;
    var totalFuel = 0.0;

    var prevLat = driverPosition?.latitude ?? stops.first.lat;
    var prevLng = driverPosition?.longitude ?? stops.first.lng;

    for (var i = 0; i < stops.length; i++) {
      final s = stops[i];
      final dist = _haversineMeters(prevLat, prevLng, s.lat, s.lng);
      final rawDuration = _estimateRawDurationSeconds(dist);
      final factoredDuration = rawDuration * trafficFactor;
      final fuel = this.fuel.costFor(dist);

      routeStops.add(
        PremiumRouteStop(
          delivery: s,
          sequence: i + 1,
          distanceFromPrevMeters: dist,
          durationFromPrevSecondsRaw: rawDuration,
          durationFromPrevSecondsFactored: factoredDuration,
          trafficLevel: TrafficModel.levelForSegment(now),
          fuelCostFromPrevTnd: fuel,
          isPriority: priorityPieces.contains(s.doPiece),
        ),
      );

      totalDistance += dist;
      totalRaw += rawDuration;
      totalFactored += factoredDuration;
      totalFuel += fuel;

      prevLat = s.lat;
      prevLng = s.lng;
    }

    return PremiumRoutePlan(
      stops: routeStops,
      totalDistanceMeters: totalDistance,
      totalDurationSecondsRaw: totalRaw,
      totalDurationSecondsFactored: totalFactored,
      totalFuelCostTnd: totalFuel,
      overallTraffic: overallLevel,
      computedAt: now,
    );
  }

  /// Optimise l'ordre via nearest-neighbor + 2-opt, en plaçant d'abord
  /// les commandes prioritaires (urgentes), puis le reste optimisé.
  PremiumRoutePlan buildOptimalPlan({
    required LatLng? driverPosition,
    required List<Delivery> stops,
    required Set<String> priorityPieces,
    required RouteWeights weights,
    required DateTime now,
  }) {
    if (stops.isEmpty) {
      return buildPlanInOrder(
        driverPosition: driverPosition,
        stops: const [],
        priorityPieces: priorityPieces,
        now: now,
      );
    }

    final priority = stops
        .where((d) => priorityPieces.contains(d.doPiece))
        .toList();
    final regular = stops
        .where((d) => !priorityPieces.contains(d.doPiece))
        .toList();

    var startLat = driverPosition?.latitude;
    var startLng = driverPosition?.longitude;
    if (startLat == null || startLng == null) {
      startLat = (priority.isNotEmpty ? priority.first : regular.first).lat;
      startLng = (priority.isNotEmpty ? priority.first : regular.first).lng;
    }

    final orderedPriority = _nearestNeighbor(priority, startLat, startLng);

    var lastLat = orderedPriority.isNotEmpty
        ? orderedPriority.last.lat
        : startLat;
    var lastLng = orderedPriority.isNotEmpty
        ? orderedPriority.last.lng
        : startLng;

    var orderedRegular = _nearestNeighbor(regular, lastLat, lastLng);

    // 2-opt sur la partie régulière uniquement (les urgents restent en tête).
    orderedRegular = _twoOpt(
      stops: orderedRegular,
      startLat: lastLat,
      startLng: lastLng,
      weights: weights,
      now: now,
    );

    final fullOrder = <Delivery>[...orderedPriority, ...orderedRegular];

    return buildPlanInOrder(
      driverPosition: driverPosition,
      stops: fullOrder,
      priorityPieces: priorityPieces,
      now: now,
    );
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  List<Delivery> _nearestNeighbor(
    List<Delivery> items,
    double startLat,
    double startLng,
  ) {
    if (items.isEmpty) return const [];

    final remaining = List<Delivery>.from(items);
    final ordered = <Delivery>[];
    var curLat = startLat;
    var curLng = startLng;

    while (remaining.isNotEmpty) {
      remaining.sort((a, b) {
        final da = _haversineMeters(curLat, curLng, a.lat, a.lng);
        final db = _haversineMeters(curLat, curLng, b.lat, b.lng);
        return da.compareTo(db);
      });
      final next = remaining.removeAt(0);
      ordered.add(next);
      curLat = next.lat;
      curLng = next.lng;
    }

    return ordered;
  }

  List<Delivery> _twoOpt({
    required List<Delivery> stops,
    required double startLat,
    required double startLng,
    required RouteWeights weights,
    required DateTime now,
  }) {
    if (stops.length < 4) return List<Delivery>.from(stops);

    var best = List<Delivery>.from(stops);
    var bestScore = _scoreOrder(
      stops: best,
      startLat: startLat,
      startLng: startLng,
      weights: weights,
      now: now,
    );

    var improved = true;
    var iter = 0;
    while (improved && iter < 24) {
      improved = false;
      iter++;
      for (var i = 0; i < best.length - 1; i++) {
        for (var k = i + 1; k < best.length; k++) {
          final candidate = _twoOptSwap(best, i, k);
          final score = _scoreOrder(
            stops: candidate,
            startLat: startLat,
            startLng: startLng,
            weights: weights,
            now: now,
          );
          if (score + 1e-3 < bestScore) {
            best = candidate;
            bestScore = score;
            improved = true;
          }
        }
      }
    }

    return best;
  }

  List<Delivery> _twoOptSwap(List<Delivery> route, int i, int k) {
    final next = <Delivery>[
      ...route.sublist(0, i),
      ...route.sublist(i, k + 1).reversed,
      ...route.sublist(k + 1),
    ];
    return next;
  }

  double _scoreOrder({
    required List<Delivery> stops,
    required double startLat,
    required double startLng,
    required RouteWeights weights,
    required DateTime now,
  }) {
    if (stops.isEmpty) return 0.0;

    final trafficFactor = TrafficModel.factorFor(now);

    var totalDistance = 0.0;
    var totalDuration = 0.0;
    var prevLat = startLat;
    var prevLng = startLng;
    var prevHeading = 0.0;
    var hasHeading = false;
    var turnPenalty = 0.0;

    for (final s in stops) {
      final dist = _haversineMeters(prevLat, prevLng, s.lat, s.lng);
      final rawDur = _estimateRawDurationSeconds(dist);
      final factored = rawDur * trafficFactor;

      totalDistance += dist;
      totalDuration += factored;

      final heading = _bearing(prevLat, prevLng, s.lat, s.lng);
      if (hasHeading) {
        final delta = _angularDifference(prevHeading, heading);
        turnPenalty += delta;
      }
      prevHeading = heading;
      hasHeading = true;

      prevLat = s.lat;
      prevLng = s.lng;
    }

    // Normalisation des composantes pour les rendre comparables.
    final timeMinutes = totalDuration / 60.0;
    final distanceKm = totalDistance / 1000.0;
    final priorityBoost = 0.0; // ordre déjà imposé en amont
    final turnNorm = turnPenalty / math.pi;

    return weights.timeWeight * timeMinutes +
        weights.distanceWeight * distanceKm +
        weights.priorityWeight * priorityBoost +
        weights.turnPenaltyWeight * turnNorm;
  }

  /// Estime une durée brute "à vide" depuis la distance haversine.
  /// 32 km/h moyenne urbaine TN avant facteur trafic.
  double _estimateRawDurationSeconds(double meters) {
    const avgKmH = 32.0;
    final speedMps = avgKmH * 1000.0 / 3600.0;
    if (speedMps <= 0) return 0;
    return meters / speedMps;
  }

  double _haversineMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const earth = 6371000.0;
    final dLat = _deg(lat2 - lat1);
    final dLon = _deg(lon2 - lon1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_deg(lat1)) *
            math.cos(_deg(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earth * c;
  }

  double _bearing(double lat1, double lon1, double lat2, double lon2) {
    final phi1 = _deg(lat1);
    final phi2 = _deg(lat2);
    final dLon = _deg(lon2 - lon1);
    final y = math.sin(dLon) * math.cos(phi2);
    final x = math.cos(phi1) * math.sin(phi2) -
        math.sin(phi1) * math.cos(phi2) * math.cos(dLon);
    return math.atan2(y, x);
  }

  double _angularDifference(double a, double b) {
    var d = (a - b).abs();
    if (d > math.pi) d = 2 * math.pi - d;
    return d;
  }

  double _deg(double x) => x * math.pi / 180.0;
}
