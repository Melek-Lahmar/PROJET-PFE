import '../../core/api_client.dart';

/// Section 2.2 — Active Delivery (start-heading / stop-heading) + ping GPS.
class LivreurActiveDeliveryService {
  final ApiClient api;
  LivreurActiveDeliveryService(this.api);

  Future<Map<String, dynamic>> startHeading(String piece) =>
      api.postJson('/api/livreur/orders/$piece/start-heading', {});

  Future<Map<String, dynamic>> stopHeading(String piece) =>
      api.postJson('/api/livreur/orders/$piece/stop-heading', {});

  Future<Map<String, dynamic>> ping({
    required double lat,
    required double lng,
    double? accuracy,
    DateTime? capturedAt,
  }) =>
      api.postJson('/api/livreur/location/ping', {
        'lat': lat,
        'lng': lng,
        if (accuracy != null) 'accuracy': accuracy,
        if (capturedAt != null) 'capturedAt': capturedAt.toUtc().toIso8601String(),
      });

  Future<Map<String, dynamic>> pingBatch(List<Map<String, dynamic>> positions) =>
      api.postJson('/api/livreur/location/ping-batch', {'positions': positions});
}
