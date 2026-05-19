import 'dart:convert';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../../core/constants.dart';

class OsrmRouteResult {
  final List<LatLng> line;
  final double distanceMeters;
  final double durationSeconds;

  const OsrmRouteResult({
    required this.line,
    required this.distanceMeters,
    required this.durationSeconds,
  });
}

class OsrmTableResult {
  final List<List<double>> durations;
  final List<List<double>> distances;

  const OsrmTableResult({
    required this.durations,
    required this.distances,
  });

  int get size => durations.length;

  double duration(int i, int j) => durations[i][j];
  double distance(int i, int j) => distances[i][j];
}

class _CacheEntry<T> {
  final T value;
  final DateTime at;

  _CacheEntry(this.value) : at = DateTime.now();
}

class OsrmService {
  final String baseUrl;

  OsrmService({this.baseUrl = osrmBaseUrl});

  final Map<String, _CacheEntry<dynamic>> _cache = {};
  final int _maxCache = 120;

  void _putCache(String key, dynamic value) {
    _cache[key] = _CacheEntry(value);
    if (_cache.length > _maxCache) {
      final oldest = _cache.entries.reduce((a, b) {
        return a.value.at.isBefore(b.value.at) ? a : b;
      }).key;
      _cache.remove(oldest);
    }
  }

  T? _getCache<T>(String key) {
    final e = _cache[key];
    if (e == null) return null;
    return e.value as T;
  }

  String _coordsKey(List<LatLng> points) =>
      points.map((p) => "${p.latitude},${p.longitude}").join(";");

  Future<OsrmTableResult> table(List<LatLng> points, {bool useCache = true}) async {
    if (points.isEmpty) {
      return const OsrmTableResult(durations: [], distances: []);
    }

    final key = "table|${_coordsKey(points)}";
    if (useCache) {
      final cached = _getCache<OsrmTableResult>(key);
      if (cached != null) return cached;
    }

    final coords = points.map((p) => "${p.longitude},${p.latitude}").join(";");
    final url = Uri.parse(
      "$baseUrl/table/v1/driving/$coords"
          "?annotations=duration,distance",
    );

    final res = await http.get(url);
    if (res.statusCode != 200) {
      throw Exception("OSRM table HTTP ${res.statusCode}: ${res.body}");
    }

    final data = jsonDecode(res.body);
    if (data["code"] != "Ok") {
      throw Exception("OSRM table error: ${data["message"] ?? data["code"]}");
    }

    List<List<double>> parseMatrix(dynamic source) {
      final rows = (source as List<dynamic>);
      return rows.map<List<double>>((row) {
        return (row as List<dynamic>).map<double>((v) {
          if (v == null) return double.infinity;
          return (v as num).toDouble();
        }).toList();
      }).toList();
    }

    final parsed = OsrmTableResult(
      durations: parseMatrix(data["durations"]),
      distances: parseMatrix(data["distances"]),
    );

    _putCache(key, parsed);
    return parsed;
  }

  Future<OsrmTableResult?> tryTable(List<LatLng> points) async {
    try {
      return await table(points);
    } catch (_) {
      return null;
    }
  }

  Future<OsrmRouteResult> route(LatLng a, LatLng b) async {
    return routeFromOrderedStops([a, b]);
  }

  Future<OsrmRouteResult?> tryRoute(LatLng a, LatLng b) async {
    try {
      return await route(a, b);
    } catch (_) {
      return null;
    }
  }

  Future<OsrmRouteResult> routeFromOrderedStops(List<LatLng> points, {bool useCache = true}) async {
    if (points.length < 2) {
      return const OsrmRouteResult(
        line: [],
        distanceMeters: 0,
        durationSeconds: 0,
      );
    }

    final key = "route|${_coordsKey(points)}";
    if (useCache) {
      final cached = _getCache<OsrmRouteResult>(key);
      if (cached != null) return cached;
    }

    final coords = points.map((p) => "${p.longitude},${p.latitude}").join(";");
    final url = Uri.parse(
      "$baseUrl/route/v1/driving/$coords"
          "?overview=full&geometries=geojson&steps=false",
    );

    final res = await http.get(url);
    if (res.statusCode != 200) {
      throw Exception("OSRM route HTTP ${res.statusCode}: ${res.body}");
    }

    final data = jsonDecode(res.body);
    if (data["code"] != "Ok") {
      throw Exception("OSRM route error: ${data["message"] ?? data["code"]}");
    }

    final routes = (data["routes"] as List?) ?? const [];
    if (routes.isEmpty) {
      throw Exception("OSRM route empty");
    }

    final r = routes.first as Map<String, dynamic>;
    final coordsJson = (r["geometry"]["coordinates"] as List<dynamic>);

    final line = coordsJson.map<LatLng>((c) {
      final lon = (c[0] as num).toDouble();
      final lat = (c[1] as num).toDouble();
      return LatLng(lat, lon);
    }).toList();

    final parsed = OsrmRouteResult(
      line: line,
      distanceMeters: (r["distance"] as num).toDouble(),
      durationSeconds: (r["duration"] as num).toDouble(),
    );

    _putCache(key, parsed);
    return parsed;
  }

  Future<OsrmRouteResult?> tryRouteFromOrderedStops(List<LatLng> points) async {
    try {
      return await routeFromOrderedStops(points);
    } catch (_) {
      return null;
    }
  }
}