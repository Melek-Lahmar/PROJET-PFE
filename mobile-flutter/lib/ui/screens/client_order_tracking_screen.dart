import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/realtime_service.dart';
import '../../models/client_claim.dart';
import '../../models/client_order_tracking.dart';
import '../../models/customer_order.dart';
import '../../state/client_claims_provider.dart';
import '../../state/customer_orders_provider.dart';
import '../widgets/claims/demande_color_indicator.dart';
import '../widgets/customer_order_status_badge.dart';
import 'client_claim_details_screen.dart';
import 'client_create_claim_screen.dart';
import '../widgets/client/tracking_state_card.dart';
import 'order_history_screen.dart';

class ClientOrderTrackingScreen extends StatefulWidget {
  final CustomerOrder initialOrder;

  const ClientOrderTrackingScreen({
    super.key,
    required this.initialOrder,
  });

  @override
  State<ClientOrderTrackingScreen> createState() =>
      _ClientOrderTrackingScreenState();
}

class _ClientOrderTrackingScreenState extends State<ClientOrderTrackingScreen> {
  late CustomerOrder _order;
  ClientOrderTracking? _tracking;
  bool _loading = false;
  String? _error;
  Timer? _polling;

  final List<StreamSubscription<dynamic>> _subs = [];

  @override
  void initState() {
    super.initState();
    _order = widget.initialOrder;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load(force: true);
      _subscribeRealtime();
    });
    // Polling toujours présent comme filet de sécurité si SignalR perd la connexion.
    _polling = Timer.periodic(
      const Duration(seconds: 20),
      (_) => _load(force: true, silent: true),
    );
  }

  @override
  void dispose() {
    _polling?.cancel();
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }

  void _subscribeRealtime() {
    // Le RealtimeService est toujours provisionné sous la branche client
    // (main.dart → canUseCustomerApp). On le lit sans listen.
    RealtimeService realtime;
    try {
      realtime = context.read<RealtimeService>();
    } catch (_) {
      return; // fallback défensif si l'écran est monté hors branche client
    }
    realtime.ensureConnected();

    // Les événements qui peuvent impacter cette commande :
    //   StatutCommandeChange (BC → BL)
    //   CorrectionAppliquee (adresse/numéro mis à jour)
    //   NouveauCas / StatutCasChange (création ou changement d'un cas)
    // On n'agit que si le payload concerne cette pièce.
    _subs.add(realtime.statutCommandeChange.listen((ev) {
      if (ev.doPiece == _order.piece) _load(force: true, silent: true);
    }));
    _subs.add(realtime.correctionAppliquee.listen((ev) {
      if (ev.doPiece == _order.piece) _load(force: true, silent: true);
    }));
    _subs.add(realtime.nouveauCas.listen((_) {
      _load(force: true, silent: true);
    }));
    _subs.add(realtime.statutCasChange.listen((_) {
      _load(force: true, silent: true);
    }));
  }

  Future<void> _load({bool force = false, bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final ordersProvider = context.read<CustomerOrdersProvider>();
      // Tracking 6 blocs + fiche commande en parallèle. Si l'un échoue, on
      // garde les données précédentes et on n'affiche une erreur que si la
      // fiche commande tombe (critique pour l'en-tête).
      final trackingFuture = ordersProvider.service.fetchTracking(
        widget.initialOrder.piece,
      );
      final orderFuture = ordersProvider.fetchDetails(
        widget.initialOrder.piece,
        force: force,
      );

      final order = await orderFuture;
      ClientOrderTracking? tracking;
      try {
        tracking = await trackingFuture;
      } catch (_) {
        tracking = _tracking; // on conserve l'ancien si l'endpoint 6 blocs échoue
      }

      if (!mounted) return;
      setState(() {
        _order = order;
        _tracking = tracking;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted && !silent) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _openCreateClaim({String? initialMotifCode}) async {
    final claimsProvider = context.read<ClientClaimsProvider>();

    final created = await Navigator.of(context).push<ClientClaim>(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: claimsProvider,
          child: ClientCreateClaimScreen.forOrder(
            order: _order,
            initialMotifCode: initialMotifCode,
          ),
        ),
      ),
    );

    if (!mounted || created == null) return;
    await claimsProvider.refresh();
    if (!mounted) return;

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: claimsProvider,
          child: ClientClaimDetailsScreen(claimId: created.id),
        ),
      ),
    );
  }

  Future<void> _openLinkedCase(LinkedCase linked) async {
    final claimsProvider = context.read<ClientClaimsProvider>();
    await claimsProvider.refresh();
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: claimsProvider,
          child: ClientClaimDetailsScreen(claimId: linked.id),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tracking = _tracking;
    final milestones = _buildMilestones(_order);
    final progress = _resolveProgress(_order.normalizedStatus);

    return Scaffold(
      appBar: AppBar(
        title: Text('Suivi ${_order.piece}'),
        actions: [
          IconButton(
            tooltip: 'Actualiser',
            onPressed: () => _load(force: true),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(force: true),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Bloc 1 — En-tête
            _HeroCard(order: _order),
            const SizedBox(height: 8),

            // Section 2.11 — Carte adaptative selon /tracking-state
            // (AT_DEPOT / IN_DELIVERY_QUEUE / HEADING_TO_YOU / TERMINAL).
            // Quand HEADING_TO_YOU + destinationLat/Lng dispo → bouton "Voir
            // mon livreur sur la carte" qui ouvre la map live.
            TrackingStateCard(
              piece: _order.piece,
              destinationLat: double.tryParse(_order.latitude ?? ''),
              destinationLng: double.tryParse(_order.longitude ?? ''),
            ),
            const SizedBox(height: 8),

            // Bloc 2 — Destinataire
            _DestinataireCard(order: _order, tracking: tracking),
            const SizedBox(height: 16),

            // Bloc 3 — Contenu colis
            _ColisCard(order: _order, tracking: tracking),
            const SizedBox(height: 16),

            // Bloc 4 — Timeline
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Progression',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                        ),
                        CustomerOrderStatusBadge(
                          status: _order.normalizedStatus,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _order.statusDescription,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 10,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ...milestones.map((item) => _TimelineTile(item: item)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            _ClientOpenHistoryButton(order: _order, tracking: tracking),
            const SizedBox(height: 16),

            // Bloc 5 — Réclamation liée (si présente)
            if (tracking?.linkedReclamation != null) ...[
              _LinkedCaseCard(
                title: 'Réclamation liée',
                linked: tracking!.linkedReclamation!,
                onOpen: () => _openLinkedCase(tracking.linkedReclamation!),
              ),
              const SizedBox(height: 16),
            ],

            // Bloc 6 — Demande liée (avec indicateur rouge/vert/gris)
            if (tracking?.linkedDemande != null) ...[
              _LinkedCaseCard(
                title: 'Demande liée',
                linked: tracking!.linkedDemande!,
                onOpen: () => _openLinkedCase(tracking.linkedDemande!),
                showColorIndicator: true,
              ),
              const SizedBox(height: 16),
            ],

            // Actions contextuelles bas : Créer réclamation + Reprogrammer.
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Actions',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _openCreateClaim,
                        icon: const Icon(Icons.support_agent_rounded),
                        label: const Text('Créer une réclamation'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () => _openCreateClaim(
                          initialMotifCode: 'REPROGRAMMATION',
                        ),
                        icon: const Icon(Icons.event_repeat_rounded),
                        label: const Text('Reprogrammer'),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
            if (_loading) ...[
              const SizedBox(height: 16),
              const Center(child: CircularProgressIndicator()),
            ],
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Bloc 2 — Destinataire
// ============================================================================

class _DestinataireCard extends StatelessWidget {
  final CustomerOrder order;
  final ClientOrderTracking? tracking;

  const _DestinataireCard({required this.order, required this.tracking});

  @override
  Widget build(BuildContext context) {
    final phone = tracking?.phone;
    final repere = tracking?.repere;
    final instructions = tracking?.instructionsLivreur;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Destinataire',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 14),
            _InfoRow(label: 'Adresse', value: order.addressLabel),
            if ((phone ?? '').isNotEmpty)
              _InfoRow(label: 'Téléphone', value: phone),
            if ((repere ?? '').isNotEmpty)
              _InfoRow(label: 'Repère', value: repere),
            if ((instructions ?? '').isNotEmpty)
              _InfoRow(label: 'Instructions livreur', value: instructions),
            _InfoRow(
              label: 'Mode de livraison',
              value: order.deliveryTypeLabel,
            ),
            _InfoRow(
              label: 'Mode de paiement',
              value: order.paymentMethodLabel,
            ),
            const SizedBox(height: 14),
            _FactureBreakdown(order: order),
          ],
        ),
      ),
    );
  }
}

/// Bloc facture détaillée — sous-total HT, TVA, timbre fiscal, frais de
/// livraison, total à payer. Affiché dans le bloc adresse/paiement client.
class _FactureBreakdown extends StatelessWidget {
  final CustomerOrder order;
  const _FactureBreakdown({required this.order});

  @override
  Widget build(BuildContext context) {
    // TVA = TotalTTC - TotalHT - Timbre - FraisLivraison (si calcul cohérent).
    // Fallback : si négatif ou nul, on prend TotalTTC - TotalHT - Timbre.
    double tva = order.totalTTC -
        order.totalHT -
        order.timbreFiscal -
        order.fraisLivraison;
    if (tva < 0) {
      tva = order.totalTTC - order.totalHT - order.timbreFiscal;
      if (tva < 0) tva = 0;
    }

    String f(double v) => v.toStringAsFixed(3);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF8FAFC), Color(0xFFEFF6FF)],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE0E7FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.receipt_long_rounded,
                  size: 18, color: Color(0xFF4F46E5)),
              SizedBox(width: 6),
              Text(
                'Détail facture',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 14.5,
                  color: Color(0xFF1E1B4B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _factureRow('Sous-total HT', '${f(order.totalHT)} TND'),
          _factureRow('TVA', '${f(tva)} TND'),
          if (order.timbreFiscal > 0)
            _factureRow('Timbre fiscal', '${f(order.timbreFiscal)} TND'),
          if (order.fraisLivraison > 0)
            _factureRow('Frais de livraison',
                '${f(order.fraisLivraison)} TND'),
          const Divider(height: 18),
          Row(
            children: [
              const Text(
                'Total à payer',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  color: Color(0xFF1E1B4B),
                ),
              ),
              const Spacer(),
              Text(
                '${f(order.netAPayer)} TND',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: Color(0xFF4F46E5),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _factureRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(label,
              style: const TextStyle(
                color: Color(0xFF475569),
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              )),
          const Spacer(),
          Text(value,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 13,
                fontWeight: FontWeight.w800,
              )),
        ],
      ),
    );
  }
}

// ============================================================================
// Bloc 3 — Contenu colis
// ============================================================================

class _ColisCard extends StatelessWidget {
  final CustomerOrder order;
  final ClientOrderTracking? tracking;

  const _ColisCard({required this.order, required this.tracking});

  @override
  Widget build(BuildContext context) {
    // Priorité aux items du nouveau DTO (6 blocs), fallback sur order.lines.
    final useTracking = tracking != null && tracking!.items.isNotEmpty;
    final empty = !useTracking && order.lines.isEmpty;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Contenu du colis',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            if (empty) const Text('Aucun article détaillé disponible.'),
            if (useTracking)
              ...tracking!.items.map(
                (item) => _ColisLine(
                  title: (item.designation ?? item.arRef ?? '--'),
                  ref: item.arRef ?? '',
                  qty: item.quantite,
                  unitPrice: item.prixUnitaire,
                ),
              )
            else
              ...order.lines.map(
                (line) => _ColisLine(
                  title: (line.designation?.trim().isNotEmpty == true)
                      ? line.designation!.trim()
                      : line.articleRef,
                  ref: line.articleRef,
                  qty: line.qty,
                  unitPrice: line.unitPrice,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ColisLine extends StatelessWidget {
  final String title;
  final String ref;
  final double qty;
  final double? unitPrice;

  const _ColisLine({
    required this.title,
    required this.ref,
    required this.qty,
    this.unitPrice,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context)
              .colorScheme
              .surfaceContainerHighest
              .withOpacity(0.35),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            if (ref.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('Réf: $ref'),
            ],
            const SizedBox(height: 6),
            Text(
              unitPrice != null
                  ? 'Qté: ${qty.toStringAsFixed(2)}   •   PU: ${unitPrice!.toStringAsFixed(3)} TND'
                  : 'Qté: ${qty.toStringAsFixed(2)}',
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Blocs 5 et 6 — Cas liés
// ============================================================================

class _LinkedCaseCard extends StatelessWidget {
  final String title;
  final LinkedCase linked;
  final VoidCallback onOpen;
  final bool showColorIndicator;

  const _LinkedCaseCard({
    required this.title,
    required this.linked,
    required this.onOpen,
    this.showColorIndicator = false,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final motifLabel = _prettifyMotif(linked.motif);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w900),
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      color: scheme.onSurfaceVariant),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                linked.code,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: scheme.primary, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                motifLabel,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              if (showColorIndicator)
                DemandeColorIndicator(statut: linked.statut, compact: true)
              else
                _StatutChip(statut: linked.statut),
            ],
          ),
        ),
      ),
    );
  }

  static String _prettifyMotif(String raw) {
    if (raw.isEmpty) return '';
    return raw
        .replaceAll('_', ' ')
        .toLowerCase()
        .split(' ')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }
}

class _StatutChip extends StatelessWidget {
  final String statut;

  const _StatutChip({required this.statut});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final normalized = statut.trim().toUpperCase();

    Color bg;
    Color fg;
    String label;
    IconData icon;
    switch (normalized) {
      case 'ENVOYEE':
        bg = scheme.primaryContainer;
        fg = scheme.onPrimaryContainer;
        label = 'Envoyée';
        icon = Icons.mark_email_read_outlined;
        break;
      case 'EN_COURS_DE_TRAITEMENT':
        bg = Colors.amber.shade100;
        fg = Colors.amber.shade900;
        label = 'En cours de traitement';
        icon = Icons.hourglass_top_rounded;
        break;
      case 'CLOTUREE':
        bg = Colors.green.shade100;
        fg = Colors.green.shade800;
        label = 'Clôturée';
        icon = Icons.check_circle_outline_rounded;
        break;
      case 'REFUSEE':
        bg = scheme.errorContainer;
        fg = scheme.onErrorContainer;
        label = 'Refusée';
        icon = Icons.block_rounded;
        break;
      default:
        bg = scheme.surfaceContainerHighest;
        fg = scheme.onSurfaceVariant;
        label = statut;
        icon = Icons.info_outline_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: fg.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// _HeroCard / _Chip / _InfoRow / _TimelineTile / _TimelineItem (inchangés)
// ============================================================================

class _HeroCard extends StatelessWidget {
  final CustomerOrder order;

  const _HeroCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [
            scheme.primary.withOpacity(0.12),
            scheme.surfaceContainerHighest.withOpacity(0.75),
          ],
        ),
        border: Border.all(color: scheme.outline.withOpacity(0.16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: scheme.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  Icons.local_shipping_rounded,
                  color: scheme.primary,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Commande ${order.piece}',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      order.statusDescription,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _Chip(
                icon: Icons.calendar_today_outlined,
                label: _formatDate(order.date),
              ),
              _Chip(
                icon: Icons.location_on_outlined,
                label: order.city ?? '--',
              ),
              _Chip(
                icon: Icons.payments_outlined,
                label: '${order.netAPayer.toStringAsFixed(3)} TND',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _Chip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.surface.withOpacity(0.9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: scheme.primary),
          const SizedBox(width: 8),
          Text(label),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? value;

  const _InfoRow({required this.label, this.value});

  @override
  Widget build(BuildContext context) {
    final displayValue =
        (value == null || value!.trim().isEmpty) ? '--' : value!;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              displayValue,
              textAlign: TextAlign.end,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  final _TimelineItem item;

  const _TimelineTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = switch (item.state) {
      _TimelineState.done => scheme.primary,
      _TimelineState.current => scheme.primary,
      _TimelineState.failed => scheme.error,
      _TimelineState.upcoming => scheme.outline,
    };

    final bg = switch (item.state) {
      _TimelineState.done => scheme.primary.withOpacity(0.12),
      _TimelineState.current => scheme.primary.withOpacity(0.16),
      _TimelineState.failed => scheme.error.withOpacity(0.12),
      _TimelineState.upcoming =>
          scheme.surfaceContainerHighest.withOpacity(0.5),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: bg,
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withOpacity(0.35)),
                ),
                child: Icon(item.icon, size: 18, color: color),
              ),
              if (!item.isLast)
                Container(
                  width: 2,
                  height: 34,
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  color: color.withOpacity(
                    item.state == _TimelineState.upcoming ? 0.25 : 0.45,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.subtitle,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurfaceVariant,
                        ),
                  ),
                  if ((item.dateLabel ?? '').isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.dateLabel!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _TimelineState { done, current, upcoming, failed }

class _TimelineItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final _TimelineState state;
  final String? dateLabel;
  final bool isLast;

  const _TimelineItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.state,
    this.dateLabel,
    this.isLast = false,
  });
}

List<_TimelineItem> _buildMilestones(CustomerOrder order) {
  final status = order.normalizedStatus;
  final finalTitle = switch (status) {
    'LIVRE' => 'Commande livrée',
    'REPORTE' => 'Livraison reportée',
    'RETOUR' => 'Commande retournée',
    'DEPOT' => 'Retour au dépôt',
    'REFUSE' => 'Commande refusée',
    'TENTATIVE' => 'Tentative enregistrée',
    _ => 'Livraison finale',
  };

  final finalSubtitle = switch (status) {
    'LIVRE' => 'Le client a bien reçu le colis.',
    'REPORTE' => 'Une nouvelle date de passage est attendue.',
    'RETOUR' => 'Le colis repart vers le circuit retour.',
    'DEPOT' => 'Le colis est revenu au dépôt.',
    'REFUSE' => 'La commande a été rejetée.',
    'TENTATIVE' => 'Le passage a été tenté.',
    _ => 'En attente de l’étape finale.',
  };

  final bool hasAssignment = order.assignedAt != null ||
      const {'EN_LIVRAISON', 'LIVRE', 'REPORTE', 'RETOUR', 'DEPOT'}
          .contains(status);
  final bool inTransitOrAfter =
      const {'EN_LIVRAISON', 'LIVRE', 'REPORTE', 'RETOUR', 'DEPOT'}
          .contains(status);
  final bool finalState = const {
    'LIVRE',
    'REPORTE',
    'RETOUR',
    'DEPOT',
    'REFUSE',
    'TENTATIVE'
  }.contains(status);
  final bool failed =
      const {'REPORTE', 'RETOUR', 'DEPOT', 'REFUSE', 'TENTATIVE'}
          .contains(status);

  return [
    _TimelineItem(
      title: 'Commande créée',
      subtitle: 'La commande a été enregistrée.',
      icon: Icons.receipt_long_rounded,
      state: status == 'EN_ATTENTE'
          ? _TimelineState.current
          : _TimelineState.done,
      dateLabel: _formatDate(order.date),
    ),
    _TimelineItem(
      title: 'Commande confirmée',
      subtitle: 'Validation commerciale terminée.',
      icon: Icons.verified_rounded,
      state: switch (status) {
        'EN_ATTENTE' => _TimelineState.upcoming,
        'CONFIRME' => _TimelineState.current,
        'REFUSE' || 'TENTATIVE' => _TimelineState.current,
        _ => _TimelineState.done,
      },
    ),
    _TimelineItem(
      title: 'Prise en charge livreur',
      subtitle: hasAssignment
          ? 'Le colis a été affecté au livreur.'
          : 'En attente d’affectation.',
      icon: Icons.inventory_2_outlined,
      state: hasAssignment
          ? (inTransitOrAfter
              ? _TimelineState.done
              : _TimelineState.current)
          : _TimelineState.upcoming,
      dateLabel: _formatDate(order.assignedAt),
    ),
    _TimelineItem(
      title: 'En livraison',
      subtitle: inTransitOrAfter
          ? 'Le colis est en cours d’acheminement.'
          : 'Le départ en livraison n’est pas encore commencé.',
      icon: Icons.local_shipping_rounded,
      state: switch (status) {
        'EN_LIVRAISON' => _TimelineState.current,
        'LIVRE' || 'REPORTE' || 'RETOUR' || 'DEPOT' => _TimelineState.done,
        _ => _TimelineState.upcoming,
      },
    ),
    _TimelineItem(
      title: finalTitle,
      subtitle: finalSubtitle,
      icon: switch (status) {
        'LIVRE' => Icons.check_circle_rounded,
        'REPORTE' => Icons.event_repeat_rounded,
        'RETOUR' => Icons.undo_rounded,
        'DEPOT' => Icons.warehouse_rounded,
        'REFUSE' => Icons.cancel_rounded,
        'TENTATIVE' => Icons.error_outline_rounded,
        _ => Icons.flag_rounded,
      },
      state: finalState
          ? (failed ? _TimelineState.failed : _TimelineState.current)
          : _TimelineState.upcoming,
      dateLabel: _formatDate(order.deliveredAt ?? order.replannedAt),
      isLast: true,
    ),
  ];
}

double _resolveProgress(String status) {
  switch (status) {
    case 'EN_ATTENTE':
      return 0.12;
    case 'CONFIRME':
      return 0.32;
    case 'EN_LIVRAISON':
      return 0.68;
    case 'LIVRE':
      return 1.0;
    case 'REPORTE':
      return 0.74;
    case 'RETOUR':
    case 'DEPOT':
      return 0.86;
    case 'REFUSE':
    case 'TENTATIVE':
      return 0.42;
    default:
      return 0.12;
  }
}

String _formatDate(DateTime? date) {
  if (date == null) return '';
  final d = date.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
}

// ============================================================================
// Bouton "Voir l'historique complet" → ouvre OrderHistoryScreen
// ============================================================================

class _ClientOpenHistoryButton extends StatelessWidget {
  final CustomerOrder order;
  final ClientOrderTracking? tracking;

  const _ClientOpenHistoryButton({
    required this.order,
    required this.tracking,
  });

  static _ClientStatusVisual _visualFor(String status) {
    switch (status.toUpperCase()) {
      case 'CONFIRME':
        return const _ClientStatusVisual(
            Color(0xFF6366F1), Icons.check_circle_outline_rounded);
      case 'EN_LIVRAISON':
        return const _ClientStatusVisual(
            Color(0xFF0EA5E9), Icons.local_shipping_rounded);
      case 'LIVRE':
        return const _ClientStatusVisual(
            Color(0xFF22C55E), Icons.check_circle_rounded);
      case 'REPORTE':
        return const _ClientStatusVisual(
            Color(0xFFF97316), Icons.event_repeat_rounded);
      case 'RETOUR':
        return const _ClientStatusVisual(
            Color(0xFFEF4444), Icons.undo_rounded);
      case 'DEPOT':
        return const _ClientStatusVisual(
            Color(0xFFA855F7), Icons.warehouse_rounded);
      case 'TENTATIVE':
        return const _ClientStatusVisual(
            Color(0xFFF59E0B), Icons.access_time_rounded);
      case 'REFUSE':
        return const _ClientStatusVisual(
            Color(0xFF991B1B), Icons.cancel_rounded);
      default:
        return const _ClientStatusVisual(
            Color(0xFF6B7280), Icons.inventory_2_rounded);
    }
  }

  List<OrderTimelineEvent> _build() {
    final events = <OrderTimelineEvent>[];

    // Priorité : tracking.events (backend)
    final tEvents = tracking?.events ?? const [];
    if (tEvents.isNotEmpty) {
      for (final e in tEvents) {
        if (e.date == null) continue;
        final v = _visualFor(e.status);
        events.add(OrderTimelineEvent(
          date: e.date!,
          label: e.label,
          color: v.color,
          icon: v.icon,
          description: e.description,
        ));
      }
      return events;
    }

    // Fallback : on synthétise depuis ce que CustomerOrder expose.
    if (order.date != null) {
      events.add(OrderTimelineEvent(
        date: order.date!,
        label: 'Commande créée',
        color: const Color(0xFF6B7280),
        icon: Icons.shopping_bag_rounded,
      ));
    }
    if (order.assignedAt != null) {
      events.add(OrderTimelineEvent(
        date: order.assignedAt!,
        label: 'Prise en charge livreur',
        color: const Color(0xFF6366F1),
        icon: Icons.assignment_ind_rounded,
      ));
    }
    if (order.replannedAt != null) {
      events.add(OrderTimelineEvent(
        date: order.replannedAt!,
        label: 'Reportée',
        color: const Color(0xFFF97316),
        icon: Icons.event_repeat_rounded,
        description: order.driverNote,
      ));
    }
    if (order.deliveredAt != null) {
      final v = _visualFor(order.normalizedStatus);
      events.add(OrderTimelineEvent(
        date: order.deliveredAt!,
        label: order.statusLabel,
        color: v.color,
        icon: v.icon,
      ));
    }
    return events;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final lat = double.tryParse(order.latitude ?? '');
    final lng = double.tryParse(order.longitude ?? '');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => OrderHistoryScreen(
                piece: order.piece,
                currentStatusLabel: order.statusLabel,
                accentColor: const Color(0xFF6366F1),
                accentDark: const Color(0xFF7C3AED),
                heroIcon: Icons.timeline_rounded,
                amount: order.netAPayer > 0 ? order.netAPayer : null,
                lat: lat,
                lng: lng,
                subtitle: order.city,
                events: _build(),
              ),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outline.withOpacity(0.18)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6366F1).withOpacity(0.08),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6366F1), Color(0xFF7C3AED)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.timeline_rounded,
                    color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Voir l\'historique complet',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14.5,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Timeline détaillée · toutes les étapes',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded,
                  color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientStatusVisual {
  final Color color;
  final IconData icon;
  const _ClientStatusVisual(this.color, this.icon);
}
