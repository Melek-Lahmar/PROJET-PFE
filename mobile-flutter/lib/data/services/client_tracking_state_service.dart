import '../../core/api_client.dart';

/// Section 2.11 — état UI tracking côté client (AT_DEPOT/IN_DELIVERY_QUEUE/HEADING_TO_YOU/TERMINAL).
class TrackingState {
  final String state;
  final String message;
  final String? sub;
  final bool showMap;
  final String? livreurNom;
  final String? livreurTel;
  final double? lat;
  final double? lng;
  final int etaMinutes;
  final double etaDistanceKm;
  final int? freshness;
  final int? depotPassageNumber;

  TrackingState({
    required this.state,
    required this.message,
    this.sub,
    this.showMap = false,
    this.livreurNom,
    this.livreurTel,
    this.lat,
    this.lng,
    this.etaMinutes = 0,
    this.etaDistanceKm = 0,
    this.freshness,
    this.depotPassageNumber,
  });

  factory TrackingState.fromMap(Map<String, dynamic> m) => TrackingState(
        state: (m['state'] ?? '').toString(),
        message: (m['message'] ?? '').toString(),
        sub: m['sub']?.toString(),
        showMap: m['showMap'] == true,
        livreurNom: m['livreurNom']?.toString(),
        livreurTel: m['livreurTel']?.toString(),
        lat: (m['lat'] as num?)?.toDouble(),
        lng: (m['lng'] as num?)?.toDouble(),
        etaMinutes: (m['etaMinutes'] as num?)?.toInt() ?? 0,
        etaDistanceKm: (m['etaDistanceKm'] as num?)?.toDouble() ?? 0,
        freshness: (m['freshness'] as num?)?.toInt(),
        depotPassageNumber: (m['depotPassageNumber'] as num?)?.toInt(),
      );
}

class ClientTrackingStateService {
  final ApiClient api;
  ClientTrackingStateService(this.api);

  Future<TrackingState> fetch(String piece) async {
    final raw = await api.getMap('/api/client/orders/$piece/tracking-state');
    return TrackingState.fromMap(raw);
  }
}
