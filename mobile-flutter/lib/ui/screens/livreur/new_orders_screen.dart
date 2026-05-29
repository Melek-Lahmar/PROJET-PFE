import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_status_palette.dart';
import '../../../models/delivery.dart';
import '../../../state/deliveries_provider.dart';
import '../../widgets/premium/animated_entry.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';

/// Écran « Nouvelles commandes » — liste des commandes confirmées qui
/// n'ont pas encore été prises par un livreur. Le livreur peut les
/// accepter pour les ajouter à « Mes commandes ».
///
/// Design premium : header statique, searchbar ville/numéro, cards
/// aérées, bouton « Prendre la commande » très visible, animations
/// subtiles au tap.
class LivreurNewOrdersScreen extends StatefulWidget {
  const LivreurNewOrdersScreen({super.key});

  @override
  State<LivreurNewOrdersScreen> createState() => _LivreurNewOrdersScreenState();
}

class _LivreurNewOrdersScreenState extends State<LivreurNewOrdersScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  Timer? _debounce;
  final Set<String> _pickingIds = <String>{};

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String raw) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 220), () {
      if (!mounted) return;
      setState(() => _query = raw.trim().toLowerCase());
    });
  }

  List<Delivery> _filter(List<Delivery> all) {
    final available = all.where((d) => d.shouldAppearInNewOrders).toList();
    if (_query.isEmpty) return available;
    return available.where(_matches).toList();
  }

  bool _matches(Delivery d) {
    final q = _query;
    if (d.doPiece.toLowerCase().contains(q)) return true;
    if (d.ville.toLowerCase().contains(q)) return true;
    if (d.adresse.toLowerCase().contains(q)) return true;
    final cd = (d.clientDisplay ?? '').toLowerCase();
    if (cd.contains(q)) return true;
    final cp = (d.clientPhone ?? '').toLowerCase();
    if (cp.contains(q)) return true;
    return false;
  }

  Future<void> _pick(Delivery d) async {
    if (_pickingIds.contains(d.doPiece)) return;
    setState(() => _pickingIds.add(d.doPiece));
    try {
      await context.read<DeliveriesProvider>().pick(d.doPiece);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: Colors.green.shade700,
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Commande ${d.doPiece} ajoutée à tes livraisons.',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec : $e')),
      );
    } finally {
      if (mounted) setState(() => _pickingIds.remove(d.doPiece));
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DeliveriesProvider>();
    final scheme = Theme.of(context).colorScheme;
    final filtered = _filter(provider.newOrders);
    final isInitialLoad = provider.loading && provider.newOrders.isEmpty;

    return RefreshIndicator(
      onRefresh: () => provider.refresh(),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _Header(count: filtered.length),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: TextField(
                controller: _searchCtrl,
                onChanged: _onSearchChanged,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Rechercher par numéro, ville, client…',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _query.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () {
                            _searchCtrl.clear();
                            setState(() => _query = '');
                          },
                        ),
                  filled: true,
                  fillColor: scheme.surfaceContainerHighest.withValues(alpha: 0.45),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  isDense: true,
                ),
              ),
            ),
          ),
          if (isInitialLoad)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverList.separated(
                itemCount: 4,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, __) => const SkeletonOrderCard(),
              ),
            )
          else if (filtered.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyView(
                icon: _query.isEmpty
                    ? Icons.inbox_rounded
                    : Icons.search_off_rounded,
                title: _query.isEmpty
                    ? 'Aucune commande disponible'
                    : 'Aucun résultat',
                subtitle: _query.isEmpty
                    ? 'Les nouvelles commandes de ton gouvernorat apparaîtront ici.'
                    : 'Aucune commande ne correspond à ta recherche.',
                ctaLabel: _query.isEmpty ? 'Actualiser' : 'Effacer la recherche',
                onCta: _query.isEmpty
                    ? () => provider.refresh()
                    : () {
                        _searchCtrl.clear();
                        setState(() => _query = '');
                      },
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverList.separated(
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, idx) {
                  final d = filtered[idx];
                  return EntryAnimation(
                    duration: const Duration(milliseconds: 320),
                    delay: Duration(milliseconds: 40 + idx * 35),
                    slide: 12,
                    child: _NewOrderCard(
                      delivery: d,
                      picking: _pickingIds.contains(d.doPiece),
                      onPick: () => _pick(d),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final int count;
  const _Header({required this.count});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: EntryAnimation(
        duration: const Duration(milliseconds: 360),
        slide: 14,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6366F1).withValues(alpha: 0.32),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.20),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.30)),
                ),
                child: const Icon(Icons.inbox_rounded,
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Nouvelles commandes',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 17,
                        )),
                    Text(
                      count == 0
                          ? 'Aucune commande disponible'
                          : '$count à prendre maintenant',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.86),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$count',
                  style: const TextStyle(
                    color: Color(0xFF6366F1),
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NewOrderCard extends StatelessWidget {
  final Delivery delivery;
  final bool picking;
  final VoidCallback onPick;

  const _NewOrderCard({
    required this.delivery,
    required this.picking,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final d = delivery;

    return PremiumCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  d.doPiece,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              Text(
                '${d.netAPayer.toStringAsFixed(3)} TND',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: scheme.primary,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _infoRow(
            context,
            Icons.person_outline_rounded,
            d.clientDisplay ?? '—',
          ),
          if ((d.clientPhone ?? '').isNotEmpty)
            _infoRow(context, Icons.phone_outlined, d.clientPhone!),
          _infoRow(
            context,
            Icons.location_on_outlined,
            _locationLine(d),
          ),
          if ((d.paymentMethod ?? '').isNotEmpty)
            _infoRow(
              context,
              Icons.payments_outlined,
              _paymentLabel(d.paymentMethod!),
            ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: picking ? null : onPick,
              icon: picking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.check_circle_rounded),
              label: Text(picking ? 'Prise en cours…' : 'Prendre la commande'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                ),
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(PremiumTokens.rMd),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(BuildContext context, IconData icon, String value) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  String _locationLine(Delivery d) {
    final parts = <String>[
      if (d.adresse.trim().isNotEmpty) d.adresse.trim(),
      if (d.ville.trim().isNotEmpty) d.ville.trim(),
    ];
    return parts.isEmpty ? '—' : parts.join(' • ');
  }

  String _paymentLabel(String raw) {
    final up = raw.trim().toUpperCase();
    switch (up) {
      case 'COD':
        return 'Paiement à la livraison';
      case 'CASH':
        return 'Espèces';
      case 'CARD':
      case 'CARTE':
        return 'Carte bancaire';
      default:
        return raw;
    }
  }
}
