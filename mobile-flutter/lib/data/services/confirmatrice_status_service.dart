import '../../core/api_client.dart';
import '../../models/confirmatrice_status.dart';

/// Phase 3A + 9 — Wrapper HTTP pour les 4 endpoints de la section Profil :
///   GET  /api/confirmateur/status/me
///   POST /api/confirmateur/status/pause
///   POST /api/confirmateur/status/resume
///   GET  /api/confirmateur/status/me/stats
class ConfirmatriceStatusService {
  final ApiClient api;

  ConfirmatriceStatusService(this.api);

  Future<ConfirmatriceStatus> fetchMyStatus() async {
    final data = await api.getMap('/api/confirmateur/status/me');
    return ConfirmatriceStatus.fromMap(data);
  }

  Future<ConfirmatriceStatus> pause() async {
    final data =
        await api.postJson('/api/confirmateur/status/pause', const <String, dynamic>{});
    return ConfirmatriceStatus.fromMap(data);
  }

  Future<ConfirmatriceStatus> resume() async {
    final data =
        await api.postJson('/api/confirmateur/status/resume', const <String, dynamic>{});
    return ConfirmatriceStatus.fromMap(data);
  }

  Future<ConfirmatriceStats> fetchMyStats() async {
    final data = await api.getMap('/api/confirmateur/status/me/stats');
    return ConfirmatriceStats.fromMap(data);
  }
}
