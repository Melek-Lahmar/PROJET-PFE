import '../../core/api_client.dart';

/// Section 2.9 — programme fidélité Bronze/Argent/Or/Platine.
class ClientLoyaltyTier {
  final String tier;
  final int deliveriesCount;
  final String? nextTier;
  final int? deliveriesUntilNextTier;
  final String currentBenefit;
  final double deliveryPriceTnd;

  ClientLoyaltyTier({
    required this.tier,
    required this.deliveriesCount,
    this.nextTier,
    this.deliveriesUntilNextTier,
    required this.currentBenefit,
    required this.deliveryPriceTnd,
  });

  factory ClientLoyaltyTier.fromMap(Map<String, dynamic> m) => ClientLoyaltyTier(
        tier: (m['tier'] ?? 'Bronze').toString(),
        deliveriesCount: (m['deliveriesCount'] as num?)?.toInt() ?? 0,
        nextTier: m['nextTier']?.toString(),
        deliveriesUntilNextTier: (m['deliveriesUntilNextTier'] as num?)?.toInt(),
        currentBenefit: (m['currentBenefit'] ?? '').toString(),
        deliveryPriceTnd: (m['deliveryPriceTnd'] as num?)?.toDouble() ?? 8.0,
      );
}

class ClientLoyaltyService {
  final ApiClient api;
  ClientLoyaltyService(this.api);

  Future<ClientLoyaltyTier> fetch() async {
    final raw = await api.getMap('/api/client/loyalty');
    return ClientLoyaltyTier.fromMap(raw);
  }
}
