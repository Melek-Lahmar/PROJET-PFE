import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/mapbox_routing_service.dart';
import '../../core/premium_routing.dart';
import '../../models/delivery.dart';
import '../../state/deliveries_provider.dart';
import '../../state/navigation_provider.dart';
import '../widgets/map/navigation_controls.dart';
import '../widgets/map/route_premium_panel.dart';
import '../widgets/map/route_reorder_sheet.dart';
import '../widgets/states/app_empty_state.dart';
import '../widgets/states/app_loading_state.dart';
import 'livreur/delivery_details_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  static const LatLng initial = LatLng(36.8065, 10.1815);

  final Completer<GoogleMapController> _controller = Completer();

  String _lastStopsSignature = '';
  String? _lastFocusedDoPiece;
  MapType _mapType = MapType.normal;

  // Premium routing layer.
  PremiumRouter _router = const PremiumRouter();
  FuelParams _fuel = const FuelParams();
  PremiumRoutePlan _plan = PremiumRoutePlan.empty;
  List<Delivery> _manualOrder = const [];
  bool _useManualOrder = false;
  bool _optimizing = false;
  Timer? _trafficTicker;

  // Mapbox routing — trajet routier réel + couleurs trafic temps réel.
  // Null tant qu'on n'a pas (ou plus) de réponse Mapbox → fallback ligne directe.
  final MapboxRoutingService _mapboxService = MapboxRoutingService();
  MapboxRoute? _mapboxRoute;
  bool _loadingTraffic = false;
  int _mapboxRequestSeq = 0;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final nav = context.read<NavigationProvider>();
      final del = context.read<DeliveriesProvider>();

      await nav.startTracking();
      if (mounted && nav.isGpsBlocked) {
        _showGpsBlockedDialog(nav);
      }
      nav.setOrders(del.activeForMap);
      await nav.recompute(del.activeForMap);
      _refreshPremiumPlan(del, nav);
    });

    // Le facteur trafic est horaire — on rafraîchit toutes les 5 min pour
    // que l'ETA et le badge "trafic" restent à jour sans interaction.
    _trafficTicker = Timer.periodic(const Duration(minutes: 5), (_) {
      if (!mounted) return;
      final nav = context.read<NavigationProvider>();
      final del = context.read<DeliveriesProvider>();
      _refreshPremiumPlan(del, nav);
    });
  }

  @override
  void dispose() {
    final nav = context.read<NavigationProvider>();
    nav.stopTracking();
    _trafficTicker?.cancel();
    _mapboxService.dispose();
    super.dispose();
  }

  Future<void> _showGpsBlockedDialog(NavigationProvider nav) async {
    final status = nav.gpsStatus;

    String title;
    String message;
    String? openAction;
    Future<void> Function()? openHandler;

    switch (status) {
      case GpsPermissionStatus.serviceDisabled:
        title = 'Localisation désactivée';
        message =
            'Activez la localisation de votre appareil pour utiliser le suivi en direct.';
        openAction = 'Ouvrir les paramètres';
        openHandler = nav.openLocationSettings;
        break;
      case GpsPermissionStatus.deniedForever:
        title = 'Permission GPS refusée';
        message =
            'L\'application n\'a pas l\'autorisation d\'accéder à votre position. '
            'Activez-la dans les paramètres pour utiliser le tracking en direct.';
        openAction = 'Ouvrir les paramètres';
        openHandler = nav.openAppSettings;
        break;
      case GpsPermissionStatus.denied:
        title = 'Permission GPS requise';
        message =
            'Activez la localisation pour utiliser le tracking en direct.';
        openAction = 'Réessayer';
        openHandler = () async {
          await nav.retryGpsPermission();
        };
        break;
      case GpsPermissionStatus.granted:
      case GpsPermissionStatus.unknown:
        return;
    }

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Fermer'),
          ),
          if (openAction != null && openHandler != null)
            FilledButton(
              onPressed: () async {
                Navigator.of(ctx).pop();
                await openHandler!.call();
                if (!mounted) return;
                final after = await context
                    .read<NavigationProvider>()
                    .retryGpsPermission();
                if (!mounted) return;
                if (after == GpsPermissionStatus.granted) {
                  _topSnack('Localisation activée.');
                }
              },
              child: Text(openAction),
            ),
        ],
      ),
    );
  }

  void _topSnack(String msg) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(msg),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
  }

  String _fmtEta(double seconds) {
    if (seconds <= 0) return '--';
    final minutes = (seconds / 60).round();
    if (minutes < 60) return '${minutes}min';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h}h${m.toString().padLeft(2, '0')}';
  }

  String _fmtKm(double meters) {
    if (meters <= 0) return '--';
    if (meters < 1000) return '${meters.toStringAsFixed(0)} m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  LatLng? _driverLatLng(NavigationProvider nav) {
    if (!nav.hasDriverLocation) return null;
    final lat = nav.driverLat;
    final lng = nav.driverLng;
    if (lat == null || lng == null) return null;
    return LatLng(lat, lng);
  }

  Set<String> _priorityPieces(NavigationProvider nav) =>
      nav.urgentPieces.toSet();

  void _refreshPremiumPlan(DeliveriesProvider del, NavigationProvider nav) {
    final stops = _useManualOrder && _manualOrder.isNotEmpty
        ? _filterToActive(_manualOrder, del.activeForMap)
        : del.activeForMap;

    final plan = _useManualOrder
        ? _router.buildPlanInOrder(
            driverPosition: _driverLatLng(nav),
            stops: stops,
            priorityPieces: _priorityPieces(nav),
            now: DateTime.now(),
          )
        : _router.buildOptimalPlan(
            driverPosition: _driverLatLng(nav),
            stops: stops,
            priorityPieces: _priorityPieces(nav),
            weights: RouteWeights.balanced,
            now: DateTime.now(),
          );

    if (mounted) {
      setState(() {
        _plan = plan;
      });
    }

    // Lance la récupération du trajet Mapbox en arrière-plan. Tant que la
    // réponse n'arrive pas (ou échoue), les polylines restent en mode "ligne
    // droite vol-d'oiseau" — l'UI reste utilisable.
    unawaited(_refreshMapboxRoute(nav));
  }

  Future<void> _refreshMapboxRoute(NavigationProvider nav) async {
    final waypoints = <LatLng>[
      if (_driverLatLng(nav) != null) _driverLatLng(nav)!,
      ..._plan.stops.map((s) => LatLng(s.delivery.lat, s.delivery.lng)),
    ];

    if (waypoints.length < 2) {
      if (mounted && _mapboxRoute != null) {
        setState(() => _mapboxRoute = null);
      }
      return;
    }

    final seq = ++_mapboxRequestSeq;
    if (mounted) setState(() => _loadingTraffic = true);

    final route = await _mapboxService.fetchRoute(waypoints);

    // Une autre requête est partie entre-temps : on ignore ce résultat.
    if (!mounted || seq != _mapboxRequestSeq) return;

    setState(() {
      _mapboxRoute = route;
      _loadingTraffic = false;
    });
  }

  List<Delivery> _filterToActive(
    List<Delivery> wanted,
    List<Delivery> active,
  ) {
    final activeMap = {for (final d in active) d.doPiece: d};
    final out = <Delivery>[];
    for (final d in wanted) {
      final hit = activeMap[d.doPiece];
      if (hit != null) out.add(hit);
    }
    // Append nouveaux non encore connus à la fin.
    for (final d in active) {
      if (!wanted.any((w) => w.doPiece == d.doPiece)) {
        out.add(d);
      }
    }
    return out;
  }

  Future<void> _optimizeOrder() async {
    if (_optimizing) return;
    setState(() {
      _optimizing = true;
      _useManualOrder = false;
    });
    final del = context.read<DeliveriesProvider>();
    final nav = context.read<NavigationProvider>();

    // Petit délai pour montrer le spinner même si calcul instantané.
    await Future<void>.delayed(const Duration(milliseconds: 320));
    _refreshPremiumPlan(del, nav);
    setState(() => _optimizing = false);
    _topSnack('Tournée optimisée avec ${_plan.overallTraffic.label.toLowerCase()}.');
  }

  Future<void> _openReorder() async {
    final del = context.read<DeliveriesProvider>();
    final nav = context.read<NavigationProvider>();
    final initialOrder = _plan.stops.map((s) => s.delivery).toList();

    if (initialOrder.length < 2) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => RouteReorderSheet(
        initialOrder: initialOrder,
        priorityPieces: _priorityPieces(nav),
        recompute: (order) => _router.buildPlanInOrder(
          driverPosition: _driverLatLng(nav),
          stops: order,
          priorityPieces: _priorityPieces(nav),
          now: DateTime.now(),
        ),
        onApply: (newOrder) {
          setState(() {
            _manualOrder = newOrder;
            _useManualOrder = true;
          });
          _refreshPremiumPlan(del, nav);
          _topSnack('Ordre manuel appliqué.');
        },
      ),
    );
  }

  Future<void> _openFuelParams() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => FuelParamsSheet(
        initial: _fuel,
        onChanged: (next) {
          setState(() {
            _fuel = next;
            _router = PremiumRouter(fuel: next);
          });
          final del = context.read<DeliveriesProvider>();
          final nav = context.read<NavigationProvider>();
          _refreshPremiumPlan(del, nav);
        },
      ),
    );
  }

  Future<void> _openGoogleMapsToCurrentStop(NavigationProvider nav) async {
    final me = _driverLatLng(nav);
    final stop = _plan.stops.isEmpty ? null : _plan.stops.first.delivery;

    if (me == null || stop == null) {
      _topSnack('Position ou stop indisponible');
      return;
    }

    // 1) On essaie d'ouvrir Google Maps (web ou app) avec itinéraire turn-by-turn.
    final mapsUrl = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&origin=${me.latitude},${me.longitude}'
      '&destination=${stop.lat},${stop.lng}'
      '&travelmode=driving',
    );

    // 2) Fallback Android : intent geo: ouvre l'app cartographique par défaut
    //    (Google Maps, OsmAnd, Waze...) avec le marqueur de destination.
    final geoUrl = Uri.parse(
      'geo:${stop.lat},${stop.lng}?q=${stop.lat},${stop.lng}'
      '(${Uri.encodeComponent(stop.doPiece)})',
    );

    try {
      final ok = await launchUrl(
        mapsUrl,
        mode: LaunchMode.externalApplication,
      );
      if (ok) return;
    } catch (_) {
      // fallback ci-dessous
    }

    try {
      final ok = await launchUrl(
        geoUrl,
        mode: LaunchMode.externalApplication,
      );
      if (ok) return;
    } catch (_) {
      // fallback ci-dessous
    }

    if (mounted) {
      _topSnack('Impossible d\'ouvrir l\'application de navigation');
    }
  }

  Future<void> _zoomIn() async {
    if (!_controller.isCompleted) return;
    final c = await _controller.future;
    await c.animateCamera(CameraUpdate.zoomIn());
  }

  Future<void> _zoomOut() async {
    if (!_controller.isCompleted) return;
    final c = await _controller.future;
    await c.animateCamera(CameraUpdate.zoomOut());
  }

  Future<void> _focusOnStop(Delivery d) async {
    if (!_controller.isCompleted) return;
    final c = await _controller.future;
    await c.animateCamera(
      CameraUpdate.newLatLngZoom(LatLng(d.lat, d.lng), 16),
    );
  }

  Future<void> _fitAll(NavigationProvider nav) async {
    if (!_controller.isCompleted) return;

    final points = <LatLng>[];
    final me = _driverLatLng(nav);
    if (me != null) points.add(me);
    points.addAll(_plan.stops.map((s) => LatLng(s.delivery.lat, s.delivery.lng)));

    if (points.isEmpty) return;

    if (points.length == 1) {
      final c = await _controller.future;
      await c.animateCamera(
        CameraUpdate.newLatLngZoom(points.first, 15),
      );
      return;
    }

    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;

    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }

    final bounds = LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );

    final c = await _controller.future;
    await c.animateCamera(CameraUpdate.newLatLngBounds(bounds, 70));
  }

  /// Gère le bouton "Arrêté ici". Sélectionne la livraison la plus proche
  /// de la position GPS actuelle du livreur et ouvre DIRECTEMENT la page
  /// détail (statut + détail complet en 1 tap, pas de sheet intermédiaire).
  /// Si pas de position GPS → fallback : la prochaine livraison du plan.
  Future<void> _handleStoppedHere(
      DeliveriesProvider del, NavigationProvider nav) async {
    final stops = del.activeForMap;
    if (stops.isEmpty) {
      _topSnack('Aucune commande active à pointer.');
      return;
    }
    final me = _driverLatLng(nav);
    Delivery target;
    if (me != null) {
      target = _nearestDelivery(me, stops);
    } else if (_plan.stops.isNotEmpty) {
      target = _plan.stops.first.delivery;
    } else {
      target = stops.first;
    }

    del.select(target);
    await _focusOnStop(target);
    if (!mounted) return;

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: del,
          child: DeliveryDetailsScreen(doPiece: target.doPiece),
        ),
      ),
    );
    if (mounted) {
      await del.refresh();
      nav.setOrders(del.activeForMap);
      await nav.recompute(del.activeForMap);
      _refreshPremiumPlan(del, nav);
    }
  }

  /// Distance haversine en kilomètres (approx) entre 2 LatLng.
  double _distanceKm(LatLng a, LatLng b) {
    const earth = 6371.0;
    double toRad(double d) => d * math.pi / 180.0;
    final dLat = toRad(b.latitude - a.latitude);
    final dLng = toRad(b.longitude - a.longitude);
    final la1 = toRad(a.latitude);
    final la2 = toRad(b.latitude);
    final h = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.sin(dLng / 2) * math.sin(dLng / 2) *
            math.cos(la1) * math.cos(la2);
    return earth * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h));
  }

  Delivery _nearestDelivery(LatLng me, List<Delivery> stops) {
    Delivery best = stops.first;
    double bestD = _distanceKm(me, LatLng(best.lat, best.lng));
    for (final d in stops) {
      final dist = _distanceKm(me, LatLng(d.lat, d.lng));
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best;
  }

  Future<void> _openMarkerActions(Delivery d) async {
    final del = context.read<DeliveriesProvider>();
    final nav = context.read<NavigationProvider>();

    del.select(d);

    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        final isUrgent = nav.isUrgent(d.doPiece);

        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Icon(isUrgent ? Icons.priority_high : Icons.bolt),
                title: Text(isUrgent ? 'Annuler priorité' : 'Mettre en priorité'),
                subtitle: const Text(
                  'Le stop passera avant le reste du circuit.',
                ),
                onTap: () async {
                  Navigator.pop(ctx);
                  await nav.toggleUrgent(d);
                  nav.setOrders(del.activeForMap);
                  await nav.recompute(del.activeForMap);
                  _refreshPremiumPlan(del, nav);
                  _topSnack(isUrgent ? 'Priorité annulée' : 'Priorité activée');
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.edit_road),
                title: const Text('Changer statut'),
                subtitle: const Text('Livré / Reporté / Retourné / Dépôt'),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.of(context)
                      .push(
                        MaterialPageRoute(
                          builder: (_) => ChangeNotifierProvider.value(
                            value: context.read<DeliveriesProvider>(),
                            child: DeliveryDetailsScreen(doPiece: d.doPiece),
                          ),
                        ),
                      )
                      .then((_) async {
                    if (mounted) {
                      await del.refresh();
                      nav.setOrders(del.activeForMap);
                      await nav.recompute(del.activeForMap);
                      _refreshPremiumPlan(del, nav);
                    }
                  });
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Set<Marker> _buildMarkers(DeliveriesProvider del, NavigationProvider nav) {
    final markers = <Marker>{};
    final orderById = <String, int>{
      for (var i = 0; i < _plan.stops.length; i++)
        _plan.stops[i].delivery.doPiece: i + 1,
    };

    for (final d in del.activeForMap) {
      final isUrgent = nav.isUrgent(d.doPiece);
      final seq = orderById[d.doPiece];
      final isFirst = seq == 1;

      final hue = isUrgent
          ? BitmapDescriptor.hueOrange
          : isFirst
              ? BitmapDescriptor.hueAzure
              : BitmapDescriptor.hueRed;

      markers.add(
        Marker(
          markerId: MarkerId(d.doPiece),
          position: LatLng(d.lat, d.lng),
          icon: BitmapDescriptor.defaultMarkerWithHue(hue),
          infoWindow: InfoWindow(
            title: seq != null ? '#$seq · ${d.doPiece}' : d.doPiece,
            snippet: d.adresse,
          ),
          onTap: () => _openMarkerActions(d),
        ),
      );
    }

    final me = _driverLatLng(nav);
    if (me != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('driver_me'),
          position: me,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          infoWindow: const InfoWindow(title: 'Ma position'),
        ),
      );
    }

    return markers;
  }

  /// Génère la polyline en plusieurs segments colorés selon le niveau de
  /// trafic. Si on a une réponse Mapbox, on trace la vraie route avec couleurs
  /// `congestion_numeric` temps réel. Sinon, fallback ligne droite avec couleur
  /// horaire (heuristique TrafficModel).
  Set<Polyline> _buildPolylines(NavigationProvider nav) {
    final polylines = <Polyline>{};
    if (_plan.stops.isEmpty) return polylines;

    final route = _mapboxRoute;
    if (route != null) {
      return _buildPolylinesFromMapbox(route);
    }

    final me = _driverLatLng(nav);
    final base = <LatLng>[
      if (me != null) me,
      ..._plan.stops.map((s) => LatLng(s.delivery.lat, s.delivery.lng)),
    ];
    if (base.length < 2) return polylines;

    final scheme = Theme.of(context).colorScheme;

    polylines.add(
      Polyline(
        polylineId: const PolylineId('halo'),
        points: base,
        width: 14,
        color: scheme.primary.withValues(alpha: 0.16),
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        jointType: JointType.round,
      ),
    );

    for (var i = 0; i < base.length - 1; i++) {
      final segStop = i < _plan.stops.length
          ? _plan.stops[i]
          : _plan.stops.last;
      final color = segStop.trafficLevel.color;

      polylines.add(
        Polyline(
          polylineId: PolylineId('seg_$i'),
          points: [base[i], base[i + 1]],
          width: 7,
          color: color,
          startCap: Cap.roundCap,
          endCap: Cap.roundCap,
          jointType: JointType.round,
        ),
      );
    }

    return polylines;
  }

  /// Construit les polylines à partir de la réponse Mapbox.
  /// Stratégie : on regroupe les segments adjacents de même niveau trafic pour
  /// minimiser le nombre de Polyline (perf rendu Google Maps).
  Set<Polyline> _buildPolylinesFromMapbox(MapboxRoute route) {
    final polylines = <Polyline>{};
    final scheme = Theme.of(context).colorScheme;
    final now = DateTime.now();

    // 1) Halo unique sur toute la route, pour le côté premium.
    polylines.add(
      Polyline(
        polylineId: const PolylineId('mapbox_halo'),
        points: route.points,
        width: 14,
        color: scheme.primary.withValues(alpha: 0.16),
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        jointType: JointType.round,
      ),
    );

    // 2) Découpage en groupes homogènes (même TrafficLevel).
    final n = route.points.length;
    if (n < 2) return polylines;

    var groupStart = 0;
    var groupLevel = MapboxRoute.levelFromCongestion(
      route.congestionPerSegment.isNotEmpty
          ? route.congestionPerSegment[0]
          : null,
      now,
    );

    var groupIndex = 0;

    void flushGroup(int endExclusive) {
      // points du groupe : [groupStart .. endExclusive]
      final pts = route.points.sublist(groupStart, endExclusive + 1);
      if (pts.length < 2) return;
      polylines.add(
        Polyline(
          polylineId: PolylineId('mapbox_seg_$groupIndex'),
          points: pts,
          width: 7,
          color: groupLevel.color,
          startCap: Cap.roundCap,
          endCap: Cap.roundCap,
          jointType: JointType.round,
        ),
      );
      groupIndex++;
    }

    for (var i = 1; i < n - 1; i++) {
      final segLevel = MapboxRoute.levelFromCongestion(
        i < route.congestionPerSegment.length
            ? route.congestionPerSegment[i]
            : null,
        now,
      );
      if (segLevel != groupLevel) {
        // Le segment [i-1, i] termine le groupe en cours.
        flushGroup(i);
        groupStart = i;
        groupLevel = segLevel;
      }
    }
    // Flush du dernier groupe : il va jusqu'au dernier point n-1.
    flushGroup(n - 1);

    return polylines;
  }

  Widget _buildGlassChip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    final scheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: scheme.surface.withValues(alpha: 0.96),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.22)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: scheme.onSurface),
              const SizedBox(width: 6),
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Badge "Trafic en direct" / "Calcul du trajet" affiché en haut quand
  /// Mapbox est sollicité ou a répondu.
  Widget _buildTrafficBadge() {
    final scheme = Theme.of(context).colorScheme;

    if (_loadingTraffic) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: scheme.surface.withValues(alpha: 0.96),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: scheme.outline.withValues(alpha: 0.22)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: scheme.primary,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Calcul du trajet…',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF16A34A).withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.bolt_rounded, size: 14, color: Colors.white),
          SizedBox(width: 6),
          Text(
            'Trafic en direct',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapTypeChip() {
    final isSatellite = _mapType == MapType.satellite;
    return _buildGlassChip(
      icon: isSatellite ? Icons.satellite_alt_rounded : Icons.map_rounded,
      label: isSatellite ? 'Satellite' : 'Standard',
      onTap: () {
        setState(() {
          _mapType = isSatellite ? MapType.normal : MapType.satellite;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final del = context.watch<DeliveriesProvider>();
    final nav = context.watch<NavigationProvider>();

    final sig = [
      del.activeForMap.map((d) => d.doPiece).join('|'),
      nav.urgentPieces.join('|'),
      nav.routeMode.name,
      _useManualOrder ? 'manual' : 'auto',
      _fuel.pricePerLiter.toString(),
      _fuel.consumptionPer100Km.toString(),
    ].join('||');

    if (sig != _lastStopsSignature) {
      _lastStopsSignature = sig;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        nav.setOrders(del.activeForMap);
        await nav.recompute(del.activeForMap);
        _refreshPremiumPlan(del, nav);
      });
    }

    final selected = del.selected;
    if (selected != null && selected.doPiece != _lastFocusedDoPiece) {
      _lastFocusedDoPiece = selected.doPiece;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        await _focusOnStop(selected);
      });
    }

    final markers = _buildMarkers(del, nav);
    final polylines = _buildPolylines(nav);

    final hasStops = del.activeForMap.isNotEmpty;
    final hasGps = nav.hasDriverLocation;
    final currentStop = _plan.stops.isEmpty ? null : _plan.stops.first;

    return Stack(
      children: [
        GoogleMap(
          initialCameraPosition: const CameraPosition(
            target: initial,
            zoom: 13,
          ),
          myLocationEnabled: true,
          myLocationButtonEnabled: false,
          mapType: _mapType,
          compassEnabled: true,
          markers: markers,
          polylines: polylines,
          onMapCreated: (c) {
            if (!_controller.isCompleted) {
              _controller.complete(c);
            }
          },
        ),
        Positioned(
          top: 10,
          left: 10,
          right: 10,
          child: SafeArea(
            child: Column(
              children: [
                if (hasStops)
                  RoutePremiumPanel(
                    plan: _plan,
                    fuel: _fuel,
                    optimizing: _optimizing,
                    onOptimize: _optimizeOrder,
                    onReorder: _openReorder,
                    onTuneFuel: _openFuelParams,
                  ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildMapTypeChip(),
                      const SizedBox(width: 8),
                      _buildGlassChip(
                        icon: Icons.center_focus_strong_rounded,
                        label: 'Tout voir',
                        onTap: () => _fitAll(nav),
                      ),
                      const SizedBox(width: 8),
                      if (_useManualOrder)
                        _buildGlassChip(
                          icon: Icons.auto_fix_high_rounded,
                          label: 'Repasser en auto',
                          onTap: () {
                            setState(() => _useManualOrder = false);
                            _refreshPremiumPlan(del, nav);
                            _topSnack('Optimisation automatique réactivée.');
                          },
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          right: 12,
          bottom: hasStops ? 168 : 132,
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                FloatingActionButton.small(
                  heroTag: 'zoom_in',
                  onPressed: _zoomIn,
                  child: const Icon(Icons.add),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'zoom_out',
                  onPressed: _zoomOut,
                  child: const Icon(Icons.remove),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'focus_all',
                  onPressed: () => _fitAll(nav),
                  child: const Icon(Icons.my_location_rounded),
                ),
              ],
            ),
          ),
        ),
        // Bouton "Arrêté ici" — toujours visible, manuel.
        // Tap → trouve la livraison la plus proche du livreur et ouvre
        // directement le popup statut + détail (skip le tap-pin).
        Positioned(
          left: 12,
          bottom: hasStops ? 168 : 132,
          child: SafeArea(
            top: false,
            child: _StoppedHereFab(
              enabled: hasStops,
              onTap: () => _handleStoppedHere(del, nav),
            ),
          ),
        ),
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!hasGps)
                  if (nav.isGpsBlocked)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: AppEmptyState(
                        title: 'Localisation bloquée',
                        message:
                            'Activez la localisation pour voir votre position '
                            'sur la carte.',
                        compact: true,
                        actionLabel: 'Activer',
                        onAction: () => _showGpsBlockedDialog(nav),
                      ),
                    )
                  else
                    const Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: AppLoadingState(
                        message: 'Recherche GPS...',
                        expanded: false,
                      ),
                    )
                else if (!hasStops)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: AppEmptyState(
                      title: 'Aucun stop actif',
                      message: 'Aucune commande à afficher sur la carte.',
                      compact: true,
                      actionLabel: 'Actualiser',
                      onAction: del.refresh,
                    ),
                  )
                else
                  NavigationControls(
                    nextStopLabel: currentStop == null
                        ? null
                        : 'Prochain : ${currentStop.delivery.doPiece}',
                    primaryLabel: currentStop == null
                        ? 'Aucun stop'
                        : '${_fmtEta(currentStop.durationFromPrevSecondsFactored)} • '
                            '${_fmtKm(currentStop.distanceFromPrevMeters)}',
                    onPrimaryPressed: currentStop == null
                        ? null
                        : () => _openGoogleMapsToCurrentStop(nav),
                    onRecomputePressed: () async {
                      nav.setOrders(del.activeForMap);
                      await nav.recompute(del.activeForMap);
                      setState(() => _useManualOrder = false);
                      _refreshPremiumPlan(del, nav);
                      _topSnack('Circuit recalculé');
                    },
                    onZoomInPressed: _zoomIn,
                    onZoomOutPressed: _zoomOut,
                  ),
              ],
            ),
          ),
        ),
        if (nav.loading || _optimizing)
          Positioned(
            left: 16,
            right: 16,
            bottom: hasStops ? 110 : 96,
            child: const SafeArea(
              top: false,
              child: LinearProgressIndicator(),
            ),
          ),
        if (_loadingTraffic || _mapboxRoute != null)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Center(
                  child: _buildTrafficBadge(),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// FAB "Arrêté ici" — toujours visible. Anim. pulse douce pour attirer l'œil.
/// Tap → trouve la commande la plus proche du livreur et ouvre directement le
/// popup statut + détail.
class _StoppedHereFab extends StatefulWidget {
  final bool enabled;
  final VoidCallback onTap;

  const _StoppedHereFab({
    required this.enabled,
    required this.onTap,
  });

  @override
  State<_StoppedHereFab> createState() => _StoppedHereFabState();
}

class _StoppedHereFabState extends State<_StoppedHereFab>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (_, __) {
        final glow = 0.20 + (_pulse.value * 0.20);
        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(28),
            onTap: widget.enabled ? widget.onTap : null,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: widget.enabled
                      ? const [Color(0xFFEF4444), Color(0xFFDC2626)]
                      : [Colors.grey.shade400, Colors.grey.shade500],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(28),
                boxShadow: widget.enabled
                    ? [
                        BoxShadow(
                          color: const Color(0xFFEF4444).withValues(alpha: glow),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.pin_drop_rounded, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Arrêté ici',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
