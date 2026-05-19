import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/reclamation_motifs.dart';
import '../../models/client_claim.dart';
import '../../state/client_claims_provider.dart';
import '../../state/customer_orders_provider.dart';
import '../widgets/claims/client_claim_status_badge.dart';
import '../widgets/premium/empty_view.dart';
import '../widgets/premium/premium_card.dart';
import '../widgets/premium/skeleton.dart';
import 'client_claim_details_screen.dart';
import 'client_create_claim_screen.dart';

/// Liste des réclamations du client. Migrée sur les composants premium :
/// searchbar, chips statut, PremiumCard, EmptyView, skeleton.
class ClientClaimsScreen extends StatefulWidget {
  const ClientClaimsScreen({super.key});

  @override
  State<ClientClaimsScreen> createState() => _ClientClaimsScreenState();
}

enum _StatutFilter { all, envoyee, enCours, cloturee, refusee }

class _ClientClaimsScreenState extends State<ClientClaimsScreen> {
  bool _initialized = false;
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  Timer? _debounce;
  _StatutFilter _filter = _StatutFilter.all;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ClientClaimsProvider>().refresh();
    });
  }

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

  Future<void> _openCreate() async {
    final created = await Navigator.of(context).push<ClientClaim>(
      MaterialPageRoute(
        builder: (_) => MultiProvider(
          providers: [
            ChangeNotifierProvider.value(
                value: context.read<ClientClaimsProvider>()),
            ChangeNotifierProvider.value(
                value: context.read<CustomerOrdersProvider>()),
          ],
          child: const ClientCreateClaimScreen(),
        ),
      ),
    );
    if (!mounted) return;
    if (created != null) {
      await context.read<ClientClaimsProvider>().refresh();
      await _openDetails(created);
    }
  }

  Future<void> _openDetails(ClientClaim claim) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: context.read<ClientClaimsProvider>(),
          child: ClientClaimDetailsScreen(claimId: claim.id),
        ),
      ),
    );
    if (!mounted) return;
    await context.read<ClientClaimsProvider>().refresh();
  }

  bool _matchesFilter(ClientClaim c) {
    final s = c.statut.toUpperCase();
    switch (_filter) {
      case _StatutFilter.all:
        return true;
      case _StatutFilter.envoyee:
        return s == 'ENVOYEE';
      case _StatutFilter.enCours:
        return s == 'EN_COURS_DE_TRAITEMENT';
      case _StatutFilter.cloturee:
        return s == 'CLOTUREE';
      case _StatutFilter.refusee:
        return s == 'REFUSEE';
    }
  }

  bool _matchesQuery(ClientClaim c) {
    if (_query.isEmpty) return true;
    final q = _query;
    if (c.codeReclamation.toLowerCase().contains(q)) return true;
    if (c.doPiece.toLowerCase().contains(q)) return true;
    if (labelForClientMotif(c.motif).toLowerCase().contains(q)) return true;
    if (c.description.toLowerCase().contains(q)) return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ClientClaimsProvider>();
    final scheme = Theme.of(context).colorScheme;
    final raw = provider.items;
    final items = raw.where(_matchesFilter).where(_matchesQuery).toList();
    final isInitialLoad = provider.loading && raw.isEmpty;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: provider.refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: _onSearchChanged,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Rechercher par code, commande, motif…',
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
                    isDense: true,
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: _filters
                      .map((f) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(f.label),
                              selected: _filter == f.filter,
                              showCheckmark: false,
                              onSelected: (_) =>
                                  setState(() => _filter = f.filter),
                            ),
                          ))
                      .toList(),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 6)),
            if (isInitialLoad)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                sliver: SliverList.separated(
                  itemCount: 3,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, __) => const SkeletonOrderCard(),
                ),
              )
            else if (raw.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyView(
                  icon: Icons.support_agent_rounded,
                  title: 'Aucune réclamation',
                  subtitle:
                      'Crée-en une depuis le tracking d\'une commande ou avec le bouton ci-dessous.',
                  ctaLabel: 'Nouvelle réclamation',
                  onCta: _openCreate,
                  accent: scheme.primary,
                ),
              )
            else if (items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyView(
                  icon: Icons.filter_alt_off_rounded,
                  title: 'Aucun résultat',
                  subtitle:
                      'Aucune réclamation ne correspond à ton filtre ou ta recherche.',
                  ctaLabel: 'Réinitialiser',
                  onCta: () {
                    _searchCtrl.clear();
                    setState(() {
                      _query = '';
                      _filter = _StatutFilter.all;
                    });
                  },
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                sliver: SliverList.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final claim = items[index];
                    return _ClaimCard(
                      claim: claim,
                      onTap: () => _openDetails(claim),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nouvelle réclamation'),
      ),
    );
  }
}

class _FilterItem {
  final _StatutFilter filter;
  final String label;
  const _FilterItem(this.filter, this.label);
}

const _filters = <_FilterItem>[
  _FilterItem(_StatutFilter.all, 'Toutes'),
  _FilterItem(_StatutFilter.envoyee, 'Envoyées'),
  _FilterItem(_StatutFilter.enCours, 'En cours'),
  _FilterItem(_StatutFilter.cloturee, 'Clôturées'),
  _FilterItem(_StatutFilter.refusee, 'Refusées'),
];

class _ClaimCard extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback onTap;
  const _ClaimCard({required this.claim, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return PremiumCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  claim.codeReclamation,
                  style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              ClientClaimStatusBadge(status: claim.statut),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _MetaChip(
                icon: Icons.inventory_2_outlined, label: claim.doPiece),
            _MetaChip(
              icon: Icons.category_outlined,
              label: labelForClientMotif(claim.motif),
            ),
            if (claim.isFromLivreur)
              _MetaChip(
                icon: Icons.local_shipping_outlined,
                label: 'Signalement livreur',
              ),
          ]),
          if (claim.description.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              claim.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.schedule_rounded, size: 15, color: scheme.primary),
              const SizedBox(width: 6),
              Text(
                _fmt(claim.createdAt),
                style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const Spacer(),
              Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _MetaChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withOpacity(0.45),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: scheme.primary),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

String _fmt(DateTime d) {
  final l = d.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(l.day)}/${two(l.month)}/${l.year}';
}
