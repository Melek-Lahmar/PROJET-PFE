// lib/data/services/refonte/transit_service.dart

import '../../../core/api_client.dart';

class TransitService {
  final ApiClient api;
  TransitService(this.api);

  Future<List<dynamic>> myMissions() =>
      api.getList('/api/transit/my-missions');

  Future<Map<String, dynamic>> mission(String id) =>
      api.getMap('/api/transit/my-missions/$id');

  Future<List<dynamic>> pending() => api.getList('/api/transit/pending');
  Future<List<dynamic>> inProgress() => api.getList('/api/transit/in-progress');
  Future<List<dynamic>> history() => api.getList('/api/transit/history');

  Future<Map<String, dynamic>> stats() =>
      api.getMap('/api/transit/stats/personal');

  Future<Map<String, dynamic>> scan({
    required String scannedBarcode,
    String? missionId,
    double? latitude,
    double? longitude,
  }) =>
      api.postJson('/api/transit/scan', {
        if (missionId != null) 'transitMissionId': missionId,
        if (missionId != null) 'transfertId': missionId,
        'scannedBarcode': scannedBarcode,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      });

  Future<Map<String, dynamic>> manualStatus({
    required String missionId,
    required String status,
    required String justification,
    int? version,
  }) =>
      api.postJson('/api/transit/manual-status', {
        'transitMissionId': missionId,
        'transfertId': missionId,
        'status': status,
        'justification': justification,
        if (version != null) 'version': version,
      });

  Future<Map<String, dynamic>> scanPickup({
    required String codeBarre,
    required double latitude,
    required double longitude,
  }) =>
      api.postJson('/api/transit/scan-pickup', {
        'codeBarre': codeBarre,
        'latitude': latitude,
        'longitude': longitude,
      });

  Future<Map<String, dynamic>> scanDelivery({
    required String codeBarre,
    required double latitude,
    required double longitude,
  }) =>
      api.postJson('/api/transit/scan-delivery', {
        'codeBarre': codeBarre,
        'latitude': latitude,
        'longitude': longitude,
      });

  // ── NOUVEAU : annuler un scan de pickup accidentel ──────────────────────
  // Accessible uniquement au livreur-transit, fenêtre de 10 min après le scan.
  Future<Map<String, dynamic>> revertPickup({
    required String missionId,
    required String justification,
  }) =>
      api.postJson(
        '/api/transit/my-missions/$missionId/revert-pickup',
        {'justification': justification},
      );
}
