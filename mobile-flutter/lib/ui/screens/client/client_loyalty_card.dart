import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/client_loyalty_service.dart';

/// Section 2.9 — carte hero programme fidélité dans le profil client.
class ClientLoyaltyCard extends StatefulWidget {
  const ClientLoyaltyCard({super.key});
  @override
  State<ClientLoyaltyCard> createState() => _ClientLoyaltyCardState();
}

class _ClientLoyaltyCardState extends State<ClientLoyaltyCard> {
  late final _service = ClientLoyaltyService(context.read<ApiClient>());
  ClientLoyaltyTier? _tier;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      _tier = await _service.fetch();
    } catch (_) {
      _tier = null;
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    final t = _tier;
    if (t == null) return const SizedBox.shrink();

    final colors = _gradient(t.tier);
    final goal = t.deliveriesUntilNextTier ?? 0;
    final progress = goal > 0
        ? t.deliveriesCount / (t.deliveriesCount + goal).toDouble()
        : 1.0;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors),
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(_emoji(t.tier), style: const TextStyle(fontSize: 32)),
              const SizedBox(width: 8),
              Text(t.tier.toUpperCase(),
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 12),
          Text("${t.deliveriesCount} livraisons réussies",
              style: const TextStyle(color: Colors.white)),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.white24,
              valueColor: const AlwaysStoppedAnimation(Colors.white),
            ),
          ),
          const SizedBox(height: 6),
          if (t.nextTier != null && goal > 0)
            Text("$goal livraisons jusqu'à ${t.nextTier}",
                style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(8)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_shipping_rounded,
                        color: Colors.white, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      '${t.deliveryPriceTnd.toStringAsFixed(2)} TND / livraison',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (t.currentBenefit.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              t.currentBenefit,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }

  String _emoji(String tier) => switch (tier.toLowerCase()) {
        'argent' => '🥈',
        'or' => '🥇',
        _ => '🥉',
      };

  List<Color> _gradient(String tier) => switch (tier.toLowerCase()) {
        'argent' => [const Color(0xFF9E9E9E), const Color(0xFFBDBDBD)],
        'or' => [const Color(0xFFFFB300), const Color(0xFFFF8F00)],
        _ => [const Color(0xFF8D6E63), const Color(0xFFA1887F)],
      };
}
