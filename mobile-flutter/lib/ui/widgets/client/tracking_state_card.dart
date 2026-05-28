import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api_client.dart';
import '../../../data/services/client_tracking_state_service.dart';
import 'live_delivery_map_sheet.dart';

/// Section 2.11 — Carte adaptative qui consomme /tracking-state.
/// Affiche AT_DEPOT / IN_DELIVERY_QUEUE / HEADING_TO_YOU / TERMINAL avec
/// éléments visuels adaptés (carte uniquement en HEADING_TO_YOU).
class TrackingStateCard extends StatefulWidget {
  final String piece;

  /// Coordonnées de livraison du client (pour la map live "Voir mon livreur").
  /// Si null/0, le bouton "Voir sur la carte" reste masqué.
  final double? destinationLat;
  final double? destinationLng;

  const TrackingStateCard({
    super.key,
    required this.piece,
    this.destinationLat,
    this.destinationLng,
  });

  @override
  State<TrackingStateCard> createState() => _TrackingStateCardState();
}

class _TrackingStateCardState extends State<TrackingStateCard> {
  late final _service = ClientTrackingStateService(context.read<ApiClient>());
  TrackingState? _state;
  Timer? _refresh;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    // Auto-refresh quand le client est en HEADING_TO_YOU (carte live)
    _refresh = Timer.periodic(const Duration(seconds: 15), (_) {
      if (!mounted) return;
      if (_state?.state == 'HEADING_TO_YOU') _load();
    });
  }

  @override
  void dispose() {
    _refresh?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _state = await _service.fetch(widget.piece);
    } catch (_) {/* mute */}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _call(String? phone) async {
    if (phone == null || phone.trim().isEmpty) return;
    final digits = phone.replaceAll(RegExp(r'[\s\-().]'), '');
    final uri = Uri(scheme: 'tel', path: digits);
    if (!await launchUrl(uri)) {/* mute */}
  }

  Future<void> _sms(String? phone) async {
    if (phone == null || phone.trim().isEmpty) return;
    final digits = phone.replaceAll(RegExp(r'[\s\-().]'), '');
    final body = Uri.encodeComponent(
        "Bonjour, je suis le destinataire de la commande ${widget.piece}.");
    final uri = Uri.parse('sms:$digits?body=$body');
    if (!await launchUrl(uri)) {/* mute */}
  }

  bool _canOpenMap(TrackingState s) {
    return s.lat != null &&
        s.lng != null &&
        widget.destinationLat != null &&
        widget.destinationLng != null &&
        (widget.destinationLat != 0.0 || widget.destinationLng != 0.0);
  }

  Future<void> _openLiveMap(TrackingState s) async {
    await LiveDeliveryMapSheet.show(
      context,
      piece: widget.piece,
      destinationLat: widget.destinationLat!,
      destinationLng: widget.destinationLng!,
      initialState: s,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    final s = _state;
    if (s == null) return const SizedBox.shrink();

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: switch (s.state) {
          'AT_DEPOT' => _AtDepot(state: s),
          'IN_DELIVERY_QUEUE' => _InDeliveryQueue(state: s, livreurPhone: s.livreurTel, onCall: _call),
          'HEADING_TO_YOU' => _HeadingToYou(
              state: s,
              onCall: _call,
              onSms: _sms,
              onOpenMap: _canOpenMap(s)
                  ? () => _openLiveMap(s)
                  : null,
            ),
          'TERMINAL' => _Terminal(state: s),
          _ => _Default(state: s),
        },
      ),
    );
  }
}

class _AtDepot extends StatelessWidget {
  final TrackingState state;
  const _AtDepot({required this.state});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(children: [
          Icon(Icons.archive_outlined, color: Colors.blue, size: 28),
          SizedBox(width: 8),
          Text('Au dépôt', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        ]),
        const SizedBox(height: 8),
        Text(state.message, style: const TextStyle(fontSize: 16)),
        if (state.sub != null) Text(state.sub!, style: const TextStyle(color: Colors.grey)),
        if (state.depotPassageNumber != null && state.depotPassageNumber! > 0) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange),
            ),
            child: Text("Passage Dépôt ${state.depotPassageNumber}",
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ],
    );
  }
}

class _InDeliveryQueue extends StatelessWidget {
  final TrackingState state;
  final String? livreurPhone;
  final Future<void> Function(String?) onCall;
  const _InDeliveryQueue({required this.state, this.livreurPhone, required this.onCall});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(children: [
          Icon(Icons.local_shipping, color: Colors.indigo, size: 28),
          SizedBox(width: 8),
          Text('En cours de livraison', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        ]),
        const SizedBox(height: 8),
        Text(state.message, style: const TextStyle(fontSize: 16)),
        if (state.sub != null) Text(state.sub!, style: const TextStyle(color: Colors.grey)),
        if (livreurPhone != null && livreurPhone!.isNotEmpty) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => onCall(livreurPhone),
            icon: const Icon(Icons.phone),
            label: const Text('Appeler le livreur'),
          ),
        ],
      ],
    );
  }
}

class _HeadingToYou extends StatelessWidget {
  final TrackingState state;
  final Future<void> Function(String?) onCall;
  final Future<void> Function(String?) onSms;
  final VoidCallback? onOpenMap;
  const _HeadingToYou({
    required this.state,
    required this.onCall,
    required this.onSms,
    this.onOpenMap,
  });

  @override
  Widget build(BuildContext context) {
    final fresh = state.freshness ?? 0;
    final freshColor = fresh < 30
        ? Colors.green
        : fresh < 120
            ? Colors.orange
            : Colors.red;
    final freshLabel = fresh < 30
        ? '📍 Position en direct'
        : fresh < 120
            ? "📍 Position à jour il y a ${(fresh / 60).round()} min"
            : "⚠️ Connexion livreur instable, position à jour il y a ${(fresh / 60).round()} min";

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1976D2), Color(0xFF42A5F5)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('📍 Votre livreur arrive !',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 4),
              if (state.etaMinutes > 0)
                Text(
                    "Arrive dans ${state.etaMinutes} min · ${state.etaDistanceKm.toStringAsFixed(1)} km",
                    style: const TextStyle(color: Colors.white)),
              if (state.livreurNom != null && state.livreurNom!.isNotEmpty)
                Text("Livreur : ${state.livreurNom}",
                    style: const TextStyle(color: Colors.white70)),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: freshColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(freshLabel, style: TextStyle(color: freshColor))),
        ]),
        if (onOpenMap != null) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: onOpenMap,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF1976D2), Color(0xFF42A5F5)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF1976D2).withOpacity(0.32),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.map_rounded, color: Colors.white, size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Voir mon livreur sur la carte',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                              ),
                            ),
                            SizedBox(height: 1),
                            Text(
                              'Suivi en direct · trafic temps réel',
                              style: TextStyle(
                                color: Colors.white70,
                                fontWeight: FontWeight.w600,
                                fontSize: 11.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, color: Colors.white),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
        Row(children: [
          if (state.livreurTel != null && state.livreurTel!.isNotEmpty)
            FilledButton.icon(
              onPressed: () => onCall(state.livreurTel),
              icon: const Icon(Icons.phone),
              label: const Text('Appeler'),
            ),
          const SizedBox(width: 8),
          if (state.livreurTel != null && state.livreurTel!.isNotEmpty)
            OutlinedButton.icon(
              onPressed: () => onSms(state.livreurTel),
              icon: const Icon(Icons.sms),
              label: const Text('SMS'),
            ),
        ]),
      ],
    );
  }
}

class _Terminal extends StatelessWidget {
  final TrackingState state;
  const _Terminal({required this.state});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      const Icon(Icons.check_circle, color: Colors.green, size: 28),
      const SizedBox(width: 8),
      Expanded(child: Text(state.message, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
    ]);
  }
}

class _Default extends StatelessWidget {
  final TrackingState state;
  const _Default({required this.state});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      const Icon(Icons.info_outline, size: 24),
      const SizedBox(width: 8),
      Expanded(child: Text(state.message)),
    ]);
  }
}
