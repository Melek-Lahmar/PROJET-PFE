import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../core/constants.dart';
import '../core/route_optimizer.dart';
import '../models/delivery.dart';

/// Statut de la permission GPS livreur — exposé à l'UI pour afficher un
/// dialog "Ouvrir les paramètres" quand l'utilisateur a refusé.
enum GpsPermissionStatus {
  unknown,
  serviceDisabled,
  denied,
  deniedForever,
  granted,
}

class NavigationProvider extends ChangeNotifier {
  final List<Delivery> _sourceOrders = [];
  List<Delivery> _plannedStops = [];

  final Map<String, int> _urgentRanks = {};
  final Map<String, DateTime> _urgentAssignedAt = {};

  RouteMode _routeMode = RouteMode.balanced;
  bool _loading = false;
  bool _followUser = true;
  bool _satelliteMode = false;

  double? _driverLat;
  double? _driverLng;

  String? _selectedPiece;
  Timer? _fakeTrackingTimer;
  StreamSubscription<Position>? _positionSub;
  GpsPermissionStatus _gpsStatus = GpsPermissionStatus.unknown;
  bool _trackingStarting = false;

  GpsPermissionStatus get gpsStatus => _gpsStatus;
  bool get hasGpsPermission => _gpsStatus == GpsPermissionStatus.granted;
  bool get isGpsBlocked =>
      _gpsStatus == GpsPermissionStatus.denied ||
      _gpsStatus == GpsPermissionStatus.deniedForever ||
      _gpsStatus == GpsPermissionStatus.serviceDisabled;

  List<Delivery> get sourceOrders => List.unmodifiable(_sourceOrders);
  List<Delivery> get plannedStops => List.unmodifiable(_plannedStops);

  RouteMode get routeMode => _routeMode;
  bool get loading => _loading;
  bool get followUser => _followUser;
  bool get satelliteMode => _satelliteMode;

  double? get driverLat => _driverLat;
  double? get driverLng => _driverLng;
  bool get hasDriverLocation => _driverLat != null && _driverLng != null;

  String? get selectedPiece => _selectedPiece;

  List<String> get urgentPieces {
    final items = _urgentRanks.keys.toList();
    items.sort((a, b) {
      final byRank = (_urgentRanks[a] ?? 999999).compareTo(_urgentRanks[b] ?? 999999);
      if (byRank != 0) return byRank;

      final aTime =
          _urgentAssignedAt[a] ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bTime =
          _urgentAssignedAt[b] ?? DateTime.fromMillisecondsSinceEpoch(0);
      return aTime.compareTo(bTime);
    });
    return items;
  }

  Delivery? get selectedDelivery {
    final piece = _selectedPiece;
    if (piece == null) return null;

    for (final d in _plannedStops) {
      if (d.doPiece == piece) return d;
    }
    for (final d in _sourceOrders) {
      if (d.doPiece == piece) return d;
    }
    return null;
  }

  Delivery? get nextStop => _plannedStops.isEmpty ? null : _plannedStops.first;

  void setOrders(List<Delivery> orders) {
    _sourceOrders
      ..clear()
      ..addAll(orders);
    _cleanupUrgentReferences();
    _rebuildPlan();
  }

  Future<void> refreshFromOrders(List<Delivery> orders) async {
    setOrders(orders);
  }

  Future<void> recompute([List<Delivery>? orders]) async {
    if (orders != null) {
      _sourceOrders
        ..clear()
        ..addAll(orders);
      _cleanupUrgentReferences();
    }

    _loading = true;
    notifyListeners();

    try {
      _plannedStops = _buildPlan(_sourceOrders);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setRouteMode(RouteMode mode) {
    if (_routeMode == mode) return;
    _routeMode = mode;
    _rebuildPlan();
  }

  void toggleFollowUser() {
    _followUser = !_followUser;
    notifyListeners();
  }

  void setFollowUser(bool value) {
    if (_followUser == value) return;
    _followUser = value;
    notifyListeners();
  }

  void toggleSatelliteMode() {
    _satelliteMode = !_satelliteMode;
    notifyListeners();
  }

  void setSatelliteMode(bool value) {
    if (_satelliteMode == value) return;
    _satelliteMode = value;
    notifyListeners();
  }

  void selectOrder(String? doPiece) {
    if (_selectedPiece == doPiece) return;
    _selectedPiece = doPiece;
    notifyListeners();
  }

  void setDriverLocation(double lat, double lng) {
    _driverLat = lat;
    _driverLng = lng;
    _rebuildPlan();
  }

  void updateDriverLocation(double lat, double lng) {
    setDriverLocation(lat, lng);
  }

  Future<void> startTracking() async {
    if (_trackingStarting || _positionSub != null) return;
    _trackingStarting = true;
    try {
      final ok = await _ensurePermission();
      if (!ok) return;

      _positionSub?.cancel();
      _positionSub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).listen(
        (pos) {
          setDriverLocation(pos.latitude, pos.longitude);
        },
        onError: (_) {
          // Erreurs intermittentes — le service GPS livreur reste actif.
        },
        cancelOnError: false,
      );

      // Capture immédiate (le stream peut tarder à émettre le premier ping).
      try {
        final first = await Geolocator.getCurrentPosition(
          // ignore: deprecated_member_use
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 6),
        );
        setDriverLocation(first.latitude, first.longitude);
      } catch (_) {
        // ignore : le stream prendra le relais
      }
    } finally {
      _trackingStarting = false;
    }
  }

  Future<bool> _ensurePermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _setGpsStatus(GpsPermissionStatus.serviceDisabled);
      return false;
    }

    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }

    switch (perm) {
      case LocationPermission.always:
      case LocationPermission.whileInUse:
        _setGpsStatus(GpsPermissionStatus.granted);
        return true;
      case LocationPermission.deniedForever:
        _setGpsStatus(GpsPermissionStatus.deniedForever);
        return false;
      case LocationPermission.denied:
      case LocationPermission.unableToDetermine:
        _setGpsStatus(GpsPermissionStatus.denied);
        return false;
    }
  }

  /// Tente de re-demander la permission après que l'utilisateur a fermé la
  /// boîte de dialog Android/iOS. Retourne le nouveau statut.
  Future<GpsPermissionStatus> retryGpsPermission() async {
    await _ensurePermission();
    if (_gpsStatus == GpsPermissionStatus.granted && _positionSub == null) {
      await startTracking();
    }
    return _gpsStatus;
  }

  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  Future<void> openAppSettings() async {
    await Geolocator.openAppSettings();
  }

  void _setGpsStatus(GpsPermissionStatus s) {
    if (_gpsStatus == s) return;
    _gpsStatus = s;
    notifyListeners();
  }

  Future<void> stopTracking() async {
    _fakeTrackingTimer?.cancel();
    _fakeTrackingTimer = null;
    await _positionSub?.cancel();
    _positionSub = null;
  }

  Future<void> toggleUrgent(Delivery delivery) async {
    final piece = delivery.doPiece;

    if (_urgentRanks.containsKey(piece)) {
      _urgentRanks.remove(piece);
      _urgentAssignedAt.remove(piece);
    } else {
      _urgentRanks[piece] = _nextUrgentRank();
      _urgentAssignedAt[piece] = DateTime.now();
    }

    _normalizeUrgentRanks();
    _rebuildPlan();
  }

  void removeUrgent(String doPiece) {
    final hadRank = _urgentRanks.remove(doPiece) != null;
    final hadTime = _urgentAssignedAt.remove(doPiece) != null;

    if (!hadRank && !hadTime) return;

    _normalizeUrgentRanks();
    _rebuildPlan();
  }

  void clearUrgent() {
    if (_urgentRanks.isEmpty && _urgentAssignedAt.isEmpty) return;

    _urgentRanks.clear();
    _urgentAssignedAt.clear();
    _rebuildPlan();
  }

  bool isUrgent(String doPiece) => _urgentRanks.containsKey(doPiece);

  int? urgentRank(String doPiece) => _urgentRanks[doPiece];

  DateTime? urgentAssignedAt(String doPiece) => _urgentAssignedAt[doPiece];

  int? indexInPlan(String doPiece) {
    final i = _plannedStops.indexWhere((d) => d.doPiece == doPiece);
    return i == -1 ? null : i;
  }

  double? distanceTo(Delivery delivery) {
    if (!hasDriverLocation) return null;
    return _distanceMeters(
      _driverLat!,
      _driverLng!,
      delivery.lat,
      delivery.lng,
    );
  }

  bool hasReached(
      Delivery delivery, {
        double thresholdMeters = 80,
      }) {
    final distance = distanceTo(delivery);
    if (distance == null) return false;
    return distance <= thresholdMeters;
  }

  double totalRemainingDistanceMeters() {
    if (_plannedStops.isEmpty) return 0;
    if (!hasDriverLocation) return 0;

    var total = 0.0;
    var curLat = _driverLat!;
    var curLng = _driverLng!;

    for (final d in _plannedStops) {
      total += _distanceMeters(curLat, curLng, d.lat, d.lng);
      curLat = d.lat;
      curLng = d.lng;
    }

    return total;
  }

  void clearSelection() {
    if (_selectedPiece == null) return;
    _selectedPiece = null;
    notifyListeners();
  }

  void clearAll() {
    _sourceOrders.clear();
    _plannedStops = [];
    _urgentRanks.clear();
    _urgentAssignedAt.clear();
    _selectedPiece = null;
    notifyListeners();
  }

  void _rebuildPlan() {
    _plannedStops = _buildPlan(_sourceOrders);
    notifyListeners();
  }

  List<Delivery> _buildPlan(List<Delivery> orders) {
    final active = orders
        .where(
          (d) => d.statut == Statut.enLivraison || d.statut == Statut.confirme,
    )
        .toList();

    if (active.isEmpty) return const [];

    final urgent = active.where((d) => isUrgent(d.doPiece)).toList()
      ..sort((a, b) {
        final byRank = (_urgentRanks[a.doPiece] ?? 999999)
            .compareTo(_urgentRanks[b.doPiece] ?? 999999);
        if (byRank != 0) return byRank;

        final aTime = _urgentAssignedAt[a.doPiece] ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final bTime = _urgentAssignedAt[b.doPiece] ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return aTime.compareTo(bTime);
      });

    final normal = active.where((d) => !isUrgent(d.doPiece)).toList();

    if (normal.isEmpty) return urgent;

    final startLat = urgent.isNotEmpty
        ? urgent.last.lat
        : (_driverLat ?? normal.first.lat);
    final startLng = urgent.isNotEmpty
        ? urgent.last.lng
        : (_driverLng ?? normal.first.lng);

    final optimizedNormal = RouteOptimizer.planStops(
      deliveries: normal,
      driverLat: startLat,
      driverLng: startLng,
    );

    return [...urgent, ...optimizedNormal];
  }

  void _cleanupUrgentReferences() {
    final existingPieces = _sourceOrders.map((e) => e.doPiece).toSet();

    final urgentKeys = _urgentRanks.keys.toList();
    for (final piece in urgentKeys) {
      if (!existingPieces.contains(piece)) {
        _urgentRanks.remove(piece);
        _urgentAssignedAt.remove(piece);
      }
    }

    _normalizeUrgentRanks();
  }

  void _normalizeUrgentRanks() {
    final orderedPieces = urgentPieces;
    for (var i = 0; i < orderedPieces.length; i++) {
      _urgentRanks[orderedPieces[i]] = i + 1;
    }
  }

  int _nextUrgentRank() {
    if (_urgentRanks.isEmpty) return 1;
    final maxRank = _urgentRanks.values.reduce((a, b) => a > b ? a : b);
    return maxRank + 1;
  }

  double _distanceMeters(
      double lat1,
      double lon1,
      double lat2,
      double lon2,
      ) {
    return RouteOptimizer.planStops(
      deliveries: [
        Delivery(
          doPiece: '__tmp__',
          adresse: '',
          ville: '',
          lat: lat2,
          lng: lon2,
          statut: Statut.enLivraison,
        ),
      ],
      driverLat: lat1,
      driverLng: lon1,
    ).isNotEmpty
        ? _haversineMeters(lat1, lon1, lat2, lon2)
        : _haversineMeters(lat1, lon1, lat2, lon2);
  }

  double _haversineMeters(
      double lat1,
      double lon1,
      double lat2,
      double lon2,
      ) {
    const earthRadius = 6371000.0;

    final dLat = _degToRad(lat2 - lat1);
    final dLon = _degToRad(lon2 - lon1);

    final a = _sinSquared(dLat / 2) +
        _cos(_degToRad(lat1)) *
            _cos(_degToRad(lat2)) *
            _sinSquared(dLon / 2);

    final c = 2 * _atan2Sqrt(a);
    return earthRadius * c;
  }

  double _degToRad(double deg) => deg * 3.141592653589793 / 180.0;

  double _sinSquared(double x) {
    final s = _sin(x);
    return s * s;
  }

  double _sin(double x) => x - (x * x * x) / 6;

  double _cos(double x) => 1 - (x * x) / 2 + (x * x * x * x) / 24;

  double _atan2Sqrt(double a) {
    final root = a <= 0 ? 0.0 : _sqrt(a);
    final root2 = a >= 1 ? 0.0 : _sqrt(1 - a);
    return _atan2(root, root2);
  }

  double _sqrt(double x) {
    if (x <= 0) return 0;
    var guess = x / 2;
    for (int i = 0; i < 12; i++) {
      guess = 0.5 * (guess + x / guess);
    }
    return guess;
  }

  double _atan2(double y, double x) {
    if (x == 0) return y >= 0 ? 1.57079632679 : -1.57079632679;
    final z = y / x;
    final atan = z / (1 + 0.28 * z * z);
    if (x > 0) return atan;
    return y >= 0 ? atan + 3.141592653589793 : atan - 3.141592653589793;
  }

  @override
  void dispose() {
    _fakeTrackingTimer?.cancel();
    super.dispose();
  }
}