import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api_client.dart';
import '../../../core/mapbox_routing_service.dart';
import '../../../core/premium_routing.dart';
import '../../../data/services/client_tracking_state_service.dart';

/// =============================================================================
/// LiveDeliveryMapSheet — bottom sheet plein écran qui affiche la position
/// LIVE du livreur sur une Google Map, avec polyline Mapbox driving-traffic
/// vers la destination client.
///
/// S'ouvre depuis le tracking client quand `state = HEADING_TO_YOU`.
/// Auto-refresh de la position toutes les 8 secondes.
/// =============================================================================
class LiveDeliveryMapSheet extends StatefulWidget {
  final String piece;
  final double destinationLat;
  final double destinationLng;
  final TrackingState initialState;

  const LiveDeliveryMapSheet({
    super.key,
    required this.piece,
    required this.destinationLat,
    required this.destinationLng,
    required this.initialState,
  });

  @override
  State<LiveDeliveryMapSheet> createState() => _LiveDeliveryMapSheetState();

  /// Helper d'ouverture en modal full-screen.
  static Future<void> show(
    BuildContext context, {
    required String piece,
    required double destinationLat,
    required double destinationLng,
    required TrackingState initialState,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Provider.value(
        value: context.read<ApiClient>(),
        child: LiveDeliveryMapSheet(
          piece: piece,
          destinationLat: destinationLat,
          destinationLng: destinationLng,
          initialState: initialState,
        ),
      ),
    );
  }
}

class _LiveDeliveryMapSheetState extends State<LiveDeliveryMapSheet> {
  late final ClientTrackingStateService _trackingService;
  late final MapboxRoutingService _mapboxService;

  final Completer<GoogleMapController> _mapController = Completer();
  Timer? _refreshTimer;

  TrackingState _state = TrackingState(state: 'INIT', message: '');
  MapboxRoute? _route;
  bool _routeLoading = false;
  int _mapboxSeq = 0;

  @override
  void initState() {
    super.initState();
    _trackingService = ClientTrackingStateService(context.read<ApiClient>());
    _mapboxService = MapboxRoutingService();
    _state = widget.initialState;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fitBounds();
      _fetchRoute();
    });

    // Refresh de la position livreur toutes les 8 secondes.
    _refreshTimer = Timer.periodic(const Duration(seconds: 8), (_) async {
      await _refreshPosition();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _mapboxService.dispose();
    super.dispose();
  }

  Future<void> _refreshPosition() async {
    try {
      final fresh = await _trackingService.fetch(widget.piece);
      if (!mounted) return;
      // Si on n'est plus en HEADING_TO_YOU, on ferme la sheet.
      if (fresh.state != 'HEADING_TO_YOU') {
        Navigator.of(context).maybePop();
        return;
      }
      setState(() => _state = fresh);
      // Recompute route uniquement si la position a "vraiment" changé (>30m).
      final old = _state;
      if (old.lat == null ||
          old.lng == null ||
          _haversine(old.lat!, old.lng!, fresh.lat ?? 0, fresh.lng ?? 0) > 30) {
        _fetchRoute();
      }
    } catch (_) {
      // Silencieux : la prochaine itération réessaiera.
    }
  }

  Future<void> _fetchRoute() async {
    final lat = _state.lat;
    final lng = _state.lng;
    if (lat == null || lng == null) return;

    final seq = ++_mapboxSeq;
    if (mounted) setState(() => _routeLoading = true);

    final route = await _mapboxService.fetchRoute([
      LatLng(lat, lng),
      LatLng(widget.destinationLat, widget.destinationLng),
    ]);

    if (!mounted || seq != _mapboxSeq) return;
    setState(() {
      _route = route;
      _routeLoading = false;
    });
  }

  Future<void> _fitBounds() async {
    if (!_mapController.isCompleted) return;
    final lat = _state.lat;
    final lng = _state.lng;
    if (lat == null || lng == null) return;

    final c = await _mapController.future;
    final swLat = lat < widget.destinationLat ? lat : widget.destinationLat;
    final swLng = lng < widget.destinationLng ? lng : widget.destinationLng;
    final neLat = lat > widget.destinationLat ? lat : widget.destinationLat;
    final neLng = lng > widget.destinationLng ? lng : widget.destinationLng;

    await c.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(swLat, swLng),
          northeast: LatLng(neLat, neLng),
        ),
        80,
      ),
    );
  }

  Future<void> _callDriver() async {
    final phone = _state.livreurTel;
    if (phone == null || phone.trim().isEmpty) return;
    final digits = phone.replaceAll(RegExp(r'[\s\-().]'), '');
    final uri = Uri(scheme: 'tel', path: digits);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible d\'ouvrir l\'appel')),
        );
      }
    }
  }

  Set<Marker> _buildMarkers() {
    final markers = <Marker>{};
    if (_state.lat != null && _state.lng != null) {
      markers.add(Marker(
        markerId: const MarkerId('livreur'),
        position: LatLng(_state.lat!, _state.lng!),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        infoWindow: InfoWindow(
          title: _state.livreurNom ?? 'Votre livreur',
          snippet: _state.etaMinutes > 0
              ? 'Arrive dans ${_state.etaMinutes} min'
              : null,
        ),
      ));
    }
    markers.add(Marker(
      markerId: const MarkerId('destination'),
      position: LatLng(widget.destinationLat, widget.destinationLng),
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      infoWindow: const InfoWindow(title: 'Vous'),
    ));
    return markers;
  }

  Set<Polyline> _buildPolylines() {
    final polylines = <Polyline>{};
    final lat = _state.lat;
    final lng = _state.lng;
    if (lat == null || lng == null) return polylines;

    final route = _route;
    if (route != null) {
      // Halo
      polylines.add(Polyline(
        polylineId: const PolylineId('halo'),
        points: route.points,
        width: 14,
        color: const Color(0xFF6366F1).withValues(alpha: 0.18),
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        jointType: JointType.round,
      ));
      // Découpage par congestion
      final n = route.points.length;
      if (n >= 2) {
        var groupStart = 0;
        var groupLevel = MapboxRoute.levelFromCongestion(
          route.congestionPerSegment.isNotEmpty
              ? route.congestionPerSegment[0]
              : null,
          DateTime.now(),
        );
        var idx = 0;
        void flush(int endExclusive) {
          final pts = route.points.sublist(groupStart, endExclusive + 1);
          if (pts.length < 2) return;
          polylines.add(Polyline(
            polylineId: PolylineId('seg_$idx'),
            points: pts,
            width: 6,
            color: groupLevel.color,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
            jointType: JointType.round,
          ));
          idx++;
        }
        for (var i = 1; i < n - 1; i++) {
          final lvl = MapboxRoute.levelFromCongestion(
            i < route.congestionPerSegment.length
                ? route.congestionPerSegment[i]
                : null,
            DateTime.now(),
          );
          if (lvl != groupLevel) {
            flush(i);
            groupStart = i;
            groupLevel = lvl;
          }
        }
        flush(n - 1);
      }
    } else {
      // Fallback : ligne droite
      polylines.add(Polyline(
        polylineId: const PolylineId('direct'),
        points: [
          LatLng(lat, lng),
          LatLng(widget.destinationLat, widget.destinationLng),
        ],
        width: 5,
        color: const Color(0xFF6366F1).withValues(alpha: 0.6),
        patterns: [PatternItem.dash(20), PatternItem.gap(10)],
      ));
    }

    return polylines;
  }

  static double _haversine(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371000.0;
    final dLat = (lat2 - lat1) * 3.141592653589793 / 180.0;
    final dLng = (lng2 - lng1) * 3.141592653589793 / 180.0;
    final a = (dLat / 2).abs() + (dLng / 2).abs();
    // Approximation simplifiée — suffisante pour décider "changement significatif".
    return r * a;
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final height = media.size.height * 0.88;
    final lat = _state.lat;
    final lng = _state.lng;

    final fresh = _state.freshness ?? 0;
    final freshColor = fresh < 30
        ? const Color(0xFF22C55E)
        : fresh < 120
            ? const Color(0xFFF59E0B)
            : const Color(0xFFEF4444);
    final freshLabel = fresh < 30
        ? 'Position en direct'
        : fresh < 120
            ? 'Mise à jour il y a ${(fresh / 60).round()} min'
            : 'Signal instable · ${(fresh / 60).round()} min';

    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 10),
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          // Header info livreur
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1976D2), Color(0xFF42A5F5)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.local_shipping_rounded,
                      color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _state.livreurNom ?? 'Votre livreur',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: freshColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              freshLabel,
                              style: TextStyle(
                                color: freshColor,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          // ETA + distance + trafic chip
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                _ChipInfo(
                  icon: Icons.timer_outlined,
                  label: _state.etaMinutes > 0
                      ? '${_state.etaMinutes} min'
                      : '—',
                  color: const Color(0xFF1976D2),
                ),
                const SizedBox(width: 8),
                _ChipInfo(
                  icon: Icons.straighten_rounded,
                  label: _state.etaDistanceKm > 0
                      ? '${_state.etaDistanceKm.toStringAsFixed(1)} km'
                      : '—',
                  color: const Color(0xFF7C3AED),
                ),
                const SizedBox(width: 8),
                if (_route != null)
                  _ChipInfo(
                    icon: Icons.bolt_rounded,
                    label: 'Trafic live',
                    color: const Color(0xFF22C55E),
                  )
                else if (_routeLoading)
                  _ChipInfo(
                    icon: Icons.refresh_rounded,
                    label: 'Calcul…',
                    color: Colors.grey.shade600,
                  ),
              ],
            ),
          ),
          // Map
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(16)),
              child: lat == null || lng == null
                  ? Container(
                      color: const Color(0xFFF6F7FB),
                      child: const Center(
                          child: Text('Position du livreur indisponible')),
                    )
                  : Stack(
                      children: [
                        GoogleMap(
                          initialCameraPosition: CameraPosition(
                            target: LatLng(lat, lng),
                            zoom: 14,
                          ),
                          myLocationEnabled: false,
                          zoomControlsEnabled: false,
                          mapToolbarEnabled: false,
                          compassEnabled: true,
                          markers: _buildMarkers(),
                          polylines: _buildPolylines(),
                          onMapCreated: (c) {
                            if (!_mapController.isCompleted) {
                              _mapController.complete(c);
                              WidgetsBinding.instance
                                  .addPostFrameCallback((_) => _fitBounds());
                            }
                          },
                        ),
                        Positioned(
                          right: 12,
                          bottom: 12,
                          child: Column(
                            children: [
                              FloatingActionButton.small(
                                heroTag: 'recenter',
                                backgroundColor: Colors.white,
                                onPressed: _fitBounds,
                                child: const Icon(
                                  Icons.center_focus_strong_rounded,
                                  color: Color(0xFF1976D2),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
            ),
          ),
          // Bouton appeler
          if ((_state.livreurTel ?? '').isNotEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _callDriver,
                        style: FilledButton.styleFrom(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: const Color(0xFF22C55E),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(Icons.phone_rounded),
                        label: const Text(
                          'Appeler le livreur',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ChipInfo extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _ChipInfo({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.30)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

