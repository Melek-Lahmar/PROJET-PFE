import '../../core/api_client.dart';

/// Section 2.12 — Mode invité / suivi public (sans auth).
class PublicTrackingService {
  final ApiClient api;
  PublicTrackingService(this.api);

  Future<Map<String, dynamic>> track({
    required String piece,
    required String phoneLast4,
  }) async {
    return api.postJson(
      '/api/public/track',
      {'piece': piece, 'phoneLast4': phoneLast4},
      auth: false,
    );
  }
}
