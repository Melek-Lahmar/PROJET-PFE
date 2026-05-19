import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/reclamation_motifs.dart';
import '../../models/client_claim.dart';
import '../../state/client_demandes_provider.dart';
import '../widgets/claims/demande_color_indicator.dart';
import '../widgets/premium/animated_entry.dart';
import '../widgets/premium/empty_view.dart';
import '../widgets/premium/premium_card.dart';
import '../widgets/premium/skeleton.dart';
import 'client_demande_reply_screen.dart';

/// Liste des demandes côté client (livreur → client) avec indicateur
/// rouge/vert/gris premium et carte teintée selon l'urgence.
class ClientDemandesScreen extends StatefulWidget {
  const ClientDemandesScreen({super.key});
  @override
  State<ClientDemandesScreen> createState() => _ClientDemandesScreenState();
}

class _ClientDemandesScreenState extends State<ClientDemandesScreen> {
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ClientDemandesProvider>().refresh();
    });
  }

  Future<void> _openDemande(ClientClaim demande) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: context.read<ClientDemandesProvider>(),
          child: ClientDemandeReplyScreen(demandeId: demande.id),
        ),
      ),
    );
    if (!mounted) return;
    await context.read<ClientDemandesProvider>().refresh();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ClientDemandesProvider>();
    final scheme = Theme.of(context).colorScheme;
    final items = provider.items;
    final pendingCount =
        items.where((d) => d.statut.toUpperCase() == 'ENVOYEE').length;
    final isInitialLoad = provider.loading && items.isEmpty;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: provider.refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: _Header(
                count: items.length,
                pending: pendingCount,
              ),
            ),
            if (isInitialLoad)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                sliver: SliverList.separated(
                  itemCount: 3,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, __) => const SkeletonOrderCard(),
                ),
              )
            else if (items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyView(
                  icon: Icons.mark_email_read_outlined,
                  title: 'Aucune demande en attente',
                  subtitle:
                      'Quand le livreur a besoin d\'une correction (adresse, numéro), la demande apparaîtra ici.',
                  accent: scheme.primary,
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                sliver: SliverList.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, idx) {
                    final c = items[idx];
                    return EntryAnimation(
                      duration: const Duration(milliseconds: 320),
                      delay: Duration(milliseconds: 40 + idx * 35),
                      slide: 12,
                      child: _DemandeCard(
                        demande: c,
                        onTap: () => _openDemande(c),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final int count;
  final int pending;
  const _Header({required this.count, required this.pending});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Demandes du livreur',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  count == 0
                      ? 'Aucune demande'
                      : '$count au total, $pending à corriger',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          if (pending > 0)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.red.shade100,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.red.shade300),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.priority_high_rounded,
                      size: 14, color: Colors.red.shade700),
                  const SizedBox(width: 4),
                  Text(
                    '$pending',
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _DemandeCard extends StatelessWidget {
  final ClientClaim demande;
  final VoidCallback onTap;
  const _DemandeCard({required this.demande, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final statutUpper = demande.statut.toUpperCase();
    final isPending = statutUpper == 'ENVOYEE';
    final isInProgress = statutUpper == 'EN_COURS_DE_TRAITEMENT';

    Color? accentBg;
    Color accentBorder = scheme.outlineVariant.withOpacity(0.4);
    if (isPending) {
      accentBg = Colors.red.shade50;
      accentBorder = Colors.red.shade200;
    } else if (isInProgress) {
      accentBg = Colors.green.shade50;
      accentBorder = Colors.green.shade200;
    }

    return PremiumCard(
      onTap: onTap,
      color: accentBg,
      borderColor: accentBorder,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: DemandeColorIndicator(statut: demande.statut),
              ),
              if (isPending)
                const Icon(Icons.arrow_forward_rounded,
                    color: Colors.redAccent),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            labelForLivreurMotif(demande.motif),
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.inventory_2_outlined,
                  size: 14, color: scheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(
                'Commande ${demande.doPiece}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (isPending)
                FilledButton.icon(
                  onPressed: onTap,
                  icon: const Icon(Icons.edit_rounded),
                  label: const Text('Corriger maintenant'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.red.shade700,
                    foregroundColor: Colors.white,
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: onTap,
                  icon: const Icon(Icons.visibility_outlined),
                  label: const Text('Voir détail'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
