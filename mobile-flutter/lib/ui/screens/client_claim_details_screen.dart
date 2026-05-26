import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/correction_parser.dart';
import '../../data/reclamation_motifs.dart';
import '../../models/client_claim.dart';
import '../../state/client_claims_provider.dart';
import '../widgets/claims/client_claim_status_badge.dart';

class ClientClaimDetailsScreen extends StatefulWidget {
  final int claimId;

  const ClientClaimDetailsScreen({super.key, required this.claimId});

  @override
  State<ClientClaimDetailsScreen> createState() => _ClientClaimDetailsScreenState();
}

class _ClientClaimDetailsScreenState extends State<ClientClaimDetailsScreen> {
  ClientClaim? _claim;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await context.read<ClientClaimsProvider>().fetchDetails(widget.claimId);
    if (!mounted) return;
    setState(() {
      _claim = data;
      _loading = false;
    });
  }

  Future<void> _requestEchange() async {
    final c = _claim;
    if (c == null) return;
    final ctrl = TextEditingController();
    final text = await showDialog<String?>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Demander un échange'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Explique rapidement ce que tu veux échanger.'),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              maxLength: 500,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Ex: Les 2 paires sont cassées, je veux les mêmes modèle noir taille 42.',
                border: OutlineInputBorder(),
              ),
            ),
            const Text(
              'La confirmatrice reçoit la demande et crée une commande d\'échange gratuite.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(null),
              child: const Text('Annuler')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(ctrl.text.trim()),
              child: const Text('Envoyer')),
        ],
      ),
    );
    if (text == null || text.isEmpty) return;
    if (text.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Texte trop court (minimum 10 caractères).')),
      );
      return;
    }
    final result = await context.read<ClientClaimsProvider>().requestEchange(c.id, text);
    if (!mounted) return;
    if (result != null) {
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demande d\'échange envoyée au support.')),
      );
    } else {
      final err = context.read<ClientClaimsProvider>().error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err ?? 'Erreur envoi.')),
      );
    }
  }

  Future<void> _repeatOrder() async {
    final c = _claim;
    if (c == null) return;
    try {
      final lines = await context.read<ClientClaimsProvider>().fetchRepeatOrderLines(c.id);
      if (!mounted) return;
      if (lines.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Aucun article à commander.')),
        );
        return;
      }
      // Pour v1 : on affiche juste les articles dans un dialog. L'intégration
      // réelle au panier dépend de l'app e-commerce. L'endpoint renvoie les lignes.
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Commander à nouveau'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Articles de la commande originale :',
                    style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...lines.map((l) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text(
                        '• ${l['designation'] ?? l['arRef']} × ${l['qty']} — ${l['unitPrice']} TND',
                      ),
                    )),
                const SizedBox(height: 10),
                const Text(
                  'Utilise le catalogue pour les ajouter à ton nouveau panier.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          actions: [
            FilledButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Compris')),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur : $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final claim = _claim;
    return Scaffold(
      appBar: AppBar(
        title: Text(claim?.codeReclamation ?? 'Ma demande'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : claim == null
              ? const Center(child: Text('Demande introuvable.'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _HeaderCard(claim: claim),
                    const SizedBox(height: 16),
                    if (claim.motif.toUpperCase() == 'COLIS_ENDOMMAGE' &&
                        !claim.isClosed) ...[
                      _EndommageActions(
                        claim: claim,
                        onRepeat: _repeatOrder,
                        onEchange: _requestEchange,
                      ),
                      const SizedBox(height: 16),
                    ],
                    _StatusTimeline(claim: claim),
                    const SizedBox(height: 16),
                    _InfoCard(claim: claim),
                    // Bloc correction : affiche le détail (adresse, numéro,
                    // repère, instructions) si le client a soumis quelque
                    // chose — cohérent avec la vue confirmatrice.
                    if ((claim.correctionProposee ?? '').isNotEmpty) ...[
                      const SizedBox(height: 16),
                      _CorrectionContentCard(
                        claim: claim,
                        correction:
                            ProposedCorrection.parse(claim.correctionProposee),
                      ),
                    ],
                    if (claim.photos.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      _PhotosCard(claim: claim),
                    ],
                    if (claim.tentatives.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      _TentativesCard(claim: claim),
                    ],
                    if ((claim.motifRefus ?? '').isNotEmpty) ...[
                      const SizedBox(height: 16),
                      _RefusCard(claim: claim),
                    ],
                  ],
                ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final ClientClaim claim;
  const _HeaderCard({required this.claim});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(claim.codeReclamation,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          )),
                ),
                ClientClaimStatusBadge(status: claim.statut),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              _Chip(icon: Icons.inventory_2_outlined, label: claim.doPiece),
              _Chip(
                icon: Icons.category_outlined,
                label: labelForClientMotif(claim.motif),
              ),
              if (claim.isFromLivreur)
                _Chip(
                  icon: Icons.local_shipping_outlined,
                  label: 'Signalement livreur',
                  color: scheme.tertiaryContainer,
                ),
            ]),
            const SizedBox(height: 10),
            Text(claim.description,
                style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class _StatusTimeline extends StatelessWidget {
  final ClientClaim claim;
  const _StatusTimeline({required this.claim});

  static const _steps = [
    (code: 'ENVOYEE', label: 'Envoyée', icon: Icons.mark_email_read_outlined),
    (code: 'EN_COURS_DE_TRAITEMENT', label: 'En cours', icon: Icons.hourglass_top_rounded),
    (code: 'CLOTUREE', label: 'Clôturée', icon: Icons.check_circle_outline_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isRefused = claim.statut.toUpperCase() == 'REFUSEE';
    final currentIdx = isRefused
        ? -1
        : _steps.indexWhere((s) => s.code == claim.statut.toUpperCase());

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Progression',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 14),
            // Timeline 3 étapes, chaque étape prend 1/3 de la largeur. Les
            // labels sont courts (max 1 ligne) pour éviter tout overflow.
            LayoutBuilder(builder: (ctx, box) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: List.generate(_steps.length, (i) {
                  final s = _steps[i];
                  final active = !isRefused && i <= currentIdx;
                  final isCurrent = !isRefused && i == currentIdx;
                  final baseColor = isRefused
                      ? scheme.error.withOpacity(0.35)
                      : (active
                          ? scheme.primary
                          : scheme.outline.withOpacity(0.3));
                  final nodeBg = isCurrent
                      ? scheme.primary.withOpacity(0.15)
                      : Colors.transparent;

                  return Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 30,
                              height: 30,
                              decoration: BoxDecoration(
                                color: nodeBg,
                                shape: BoxShape.circle,
                                border: Border.all(color: baseColor, width: 2),
                              ),
                              alignment: Alignment.center,
                              child: Icon(s.icon, size: 16, color: baseColor),
                            ),
                            if (i < _steps.length - 1)
                              Expanded(
                                child: Container(
                                  height: 2,
                                  color: baseColor,
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 4),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          s.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontWeight: active
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                color: active
                                    ? scheme.onSurface
                                    : scheme.onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  );
                }),
              );
            }),
            if (isRefused) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: scheme.errorContainer.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(Icons.cancel_outlined, color: scheme.error),
                    const SizedBox(width: 8),
                    const Expanded(child: Text('Demande refusée')),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final ClientClaim claim;
  const _InfoCard({required this.claim});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Informations',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            _InfoRow('Créée le', _fmt(claim.createdAt)),
            _InfoRow('Mise à jour', _fmt(claim.updatedAt)),
            if (claim.assignedToDisplay != null)
              _InfoRow('Support', claim.assignedToDisplay!),
            if ((claim.correctionProposee ?? '').isNotEmpty)
              _InfoRow(
                  'Correction',
                  claim.correctionAppliquee
                      ? 'Appliquée ✓'
                      : 'En attente'),
          ],
        ),
      ),
    );
  }
}

class _CorrectionContentCard extends StatelessWidget {
  final ClientClaim claim;
  final ProposedCorrection correction;

  const _CorrectionContentCard({
    required this.claim,
    required this.correction,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rows = correction.toDisplayRows();
    final applied = claim.correctionAppliquee;

    return Card(
      color: applied
          ? Colors.green.shade50
          : scheme.secondaryContainer.withOpacity(0.35),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  applied
                      ? Icons.check_circle_rounded
                      : Icons.edit_location_alt_rounded,
                  color: applied ? Colors.green.shade700 : scheme.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    applied
                        ? 'Correction appliquée ✓'
                        : 'Correction proposée',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (rows.isEmpty)
              Text(
                claim.correctionProposee ?? '',
                style: Theme.of(context).textTheme.bodyMedium,
              )
            else
              ...rows.map(
                (kv) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 130,
                        child: Text(
                          kv.key,
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          kv.value,
                          style:
                              const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (!applied) ...[
              const SizedBox(height: 6),
              Text(
                'La confirmatrice validera ta correction avant mise à jour de la commande.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PhotosCard extends StatelessWidget {
  final ClientClaim claim;
  const _PhotosCard({required this.claim});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Photos (${claim.photos.length})',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: claim.photos.map((p) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(
                    context.read<ApiClient>().resolveMediaUrl(p.url),
                    width: 90,
                    height: 90,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 90,
                      height: 90,
                      color: Colors.grey.shade300,
                      child: const Icon(Icons.broken_image_outlined),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _TentativesCard extends StatelessWidget {
  final ClientClaim claim;
  const _TentativesCard({required this.claim});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tentatives (${claim.tentatives.length})',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            ...claim.tentatives.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.event_repeat_rounded, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_fmtDate(t.dateJour),
                                style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text(labelForLivreurMotif(t.motif)),
                            if (t.livreurDisplay != null)
                              Text('Livreur : ${t.livreurDisplay}',
                                  style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

class _RefusCard extends StatelessWidget {
  final ClientClaim claim;
  const _RefusCard({required this.claim});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: scheme.errorContainer.withOpacity(0.4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Motif du refus',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(claim.motifRefus ?? '—'),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                )),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  const _Chip({required this.icon, required this.label, this.color});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color ?? scheme.surfaceContainerHighest.withOpacity(0.5),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class _EndommageActions extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback onRepeat;
  final VoidCallback onEchange;

  const _EndommageActions({
    required this.claim,
    required this.onRepeat,
    required this.onEchange,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final echangeAlreadyRequested = (claim.echangeDemandeText ?? '').isNotEmpty;

    if (echangeAlreadyRequested) {
      return Card(
        color: scheme.primaryContainer.withOpacity(0.4),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(Icons.check_circle_rounded, color: scheme.primary),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Demande d\'échange envoyée au support.',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Que veux-tu faire ?',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: onRepeat,
                    icon: const Icon(Icons.shopping_cart_rounded),
                    label: const Text('Commander à nouveau'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: onEchange,
                    icon: const Icon(Icons.swap_horiz_rounded),
                    label: const Text('Demander un échange'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '• Commander à nouveau : tu paies, livraison rapide.\n'
              '• Échange : gratuit, le support gère le retour et l\'envoi.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

String _fmt(DateTime d) {
  final l = d.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(l.day)}/${two(l.month)}/${l.year} ${two(l.hour)}:${two(l.minute)}';
}

String _fmtDate(DateTime d) {
  final l = d.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(l.day)}/${two(l.month)}/${l.year}';
}

