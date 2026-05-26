import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/correction_parser.dart';
import '../../data/reclamation_motifs.dart';
import '../../data/services/confirmatrice_orders_service.dart';
import '../../models/client_claim.dart';
import '../../state/confirmatrice_claims_provider.dart';
import '../widgets/claims/client_claim_status_badge.dart';
import '../widgets/confirmatrice/client_history_bottom_sheet.dart';
import '../widgets/confirmatrice/depot_damaged_decision_panel.dart';
import '../widgets/echange_dialog.dart';

class ConfirmatriceClaimDetailsScreen extends StatefulWidget {
  final int claimId;
  const ConfirmatriceClaimDetailsScreen({super.key, required this.claimId});
  @override
  State<ConfirmatriceClaimDetailsScreen> createState() =>
      _ConfirmatriceClaimDetailsScreenState();
}

class _ConfirmatriceClaimDetailsScreenState
    extends State<ConfirmatriceClaimDetailsScreen> {
  ClientClaim? _claim;
  bool _loading = true;
  bool _usingCached = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final data = await provider.fetchDetails(widget.claimId);
    if (!mounted) return;

    if (data != null) {
      setState(() {
        _claim = data;
        _loading = false;
        _usingCached = false;
        _loadError = null;
      });
      return;
    }

    // Fallback : si le fetch réseau échoue (404, timeout, conflit), on tente
    // de retrouver le cas dans les caches provider (items/reclamations/demandes).
    // On n'affiche l'écran vide qu'en dernier recours.
    final cached = provider.findCachedById(widget.claimId);
    setState(() {
      _claim = cached;
      _loading = false;
      _usingCached = cached != null;
      _loadError = provider.error;
    });
  }

  Future<void> _call(String? phone) async {
    if (phone == null || phone.trim().isEmpty) return;
    final uri = Uri.parse('tel:${phone.trim()}');
    if (!await launchUrl(uri)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de composer le numéro.')),
      );
    }
  }

  Future<void> _takeOver() async {
    final c = _claim;
    if (c == null) return;
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final updated = await provider.takeOver(c.id);
    if (updated != null && mounted) {
      setState(() => _claim = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demande prise en charge.')),
      );
    }
  }

  Future<void> _resolve() async {
    final c = _claim;
    if (c == null) return;
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final confirm = await _confirmDialog(
      title: 'Clôturer le cas ?',
      content: 'Le cas sera clos. Le client en sera notifié.',
    );
    if (!confirm) return;
    final updated = await provider.updateStatus(c.id, 'CLOTUREE');
    if (updated != null && mounted) {
      setState(() => _claim = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cas clôturé.')),
      );
    }
  }

  Future<void> _refuse() async {
    final c = _claim;
    if (c == null) return;
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final motif = await _promptDialog(
      title: 'Motif du refus',
      hint: 'Explique pourquoi tu refuses cette demande.',
    );
    if (motif == null || motif.trim().isEmpty) return;
    final updated = await provider.updateStatus(c.id, 'REFUSEE', motifRefus: motif);
    if (updated != null && mounted) {
      setState(() => _claim = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demande refusée.')),
      );
    }
  }

  Future<void> _applyCorrection() async {
    final c = _claim;
    if (c == null) return;
    final provider = context.read<ConfirmatriceClaimsProvider>();

    String? newAddress;
    String? newPhone;

    if ((c.correctionProposee ?? '').isNotEmpty) {
      try {
        final parsed = jsonDecode(c.correctionProposee!);
        if (parsed is Map) {
          newAddress = parsed['address']?.toString();
          newPhone = parsed['phone']?.toString();
        }
      } catch (_) {/* ignore */}
    }

    final confirm = await _confirmDialog(
      title: 'Appliquer la correction ?',
      content: newAddress != null
          ? 'Nouvelle adresse : $newAddress'
          : (newPhone != null
              ? 'Nouveau numéro : $newPhone'
              : 'Appliquer la correction proposée.'),
    );
    if (!confirm) return;

    final updated = await provider.applyCorrection(
      c.id,
      newAddress: newAddress,
      newPhone: newPhone,
    );
    if (updated != null && mounted) {
      setState(() => _claim = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Correction appliquée.')),
      );
    }
  }

  Future<void> _createEchange() async {
    final c = _claim;
    if (c == null) return;
    final result = await EchangeDialog.show(context, reclamationId: c.id);
    if (result != null) {
      await _load();
    }
  }

  /// B.2 — BottomSheet "Changer statut commande" avec 4 boutons multicolores
  /// pour les statuts livraison (rouge/orange/bleu/violet). Pour REPORTE,
  /// un date picker est affiché. L'appel passe par
  /// ConfirmatriceOrdersService.updateStatusExtended (endpoint 1.E).
  Future<void> _changeCommandeStatus() async {
    final c = _claim;
    if (c == null) return;
    final piece = c.doPiece;

    final picked = await showModalBottomSheet<_CommandeStatusOption>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CommandeStatusSheet(),
    );
    if (picked == null || !mounted) return;

    String? note;
    if (picked.key == 'REPORTE') {
      final now = DateTime.now();
      final date = await showDatePicker(
        context: context,
        initialDate: now.add(const Duration(days: 1)),
        firstDate: now,
        lastDate: now.add(const Duration(days: 60)),
        helpText: 'Nouvelle date de livraison',
      );
      if (date == null || !mounted) return;
      final time = await showTimePicker(
        context: context,
        initialTime: const TimeOfDay(hour: 10, minute: 0),
        helpText: 'Créneau approximatif',
      );
      if (time == null || !mounted) return;
      final replanned = DateTime(
        date.year, date.month, date.day, time.hour, time.minute,
      );
      String two(int x) => x.toString().padLeft(2, '0');
      note = 'Replanifié au ${two(replanned.day)}/${two(replanned.month)}/${replanned.year} ${two(replanned.hour)}:${two(replanned.minute)}';
    }

    final messenger = ScaffoldMessenger.of(context);
    try {
      final svc = ConfirmatriceOrdersService(context.read<ApiClient>());
      await svc.updateStatusExtended(piece, picked.key, note: note);
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(
        backgroundColor: Colors.green,
        content: Text('Commande passée en ${picked.label}.'),
      ));
      await _load();
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(
        backgroundColor: Colors.red,
        content: Text('Erreur : $e'),
      ));
    }
  }

  Future<void> _quickCommandeStatus(int newStatus, String successLabel) async {
    final c = _claim;
    if (c == null) return;
    final confirm = await _confirmDialog(
      title: successLabel,
      content: 'Confirmer le changement de statut de la commande ?',
    );
    if (!confirm) return;
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final updated = await provider.changeCommandeStatus(c.id, newStatus, note: successLabel);
    if (updated != null && mounted) {
      setState(() => _claim = updated);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(successLabel)));
    }
  }

  Future<void> _editNote() async {
    final c = _claim;
    if (c == null) return;
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final ctrl = TextEditingController(text: c.noteInterne ?? '');
    final note = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Note interne'),
        content: TextField(
          controller: ctrl,
          maxLines: 5,
          maxLength: 1000,
          decoration: const InputDecoration(
            hintText: 'Note visible uniquement par l\'équipe.',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(null),
              child: const Text('Annuler')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(ctrl.text.trim()),
              child: const Text('Enregistrer')),
        ],
      ),
    );
    if (note == null) return;
    final updated = await provider.updateNote(c.id, note.isEmpty ? null : note);
    if (updated != null && mounted) {
      setState(() => _claim = updated);
    }
  }

  Future<bool> _confirmDialog({required String title, required String content}) async {
    final r = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Annuler')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Confirmer')),
        ],
      ),
    );
    return r ?? false;
  }

  Future<String?> _promptDialog({required String title, required String hint}) async {
    final ctrl = TextEditingController();
    final v = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          maxLength: 500,
          decoration: InputDecoration(hintText: hint, border: const OutlineInputBorder()),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(null),
              child: const Text('Annuler')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(ctrl.text.trim()),
              child: const Text('Valider')),
        ],
      ),
    );
    return v;
  }

  @override
  Widget build(BuildContext context) {
    final c = _claim;
    final provider = context.watch<ConfirmatriceClaimsProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(c?.codeReclamation ?? 'Demande'),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded))],
      ),
      bottomNavigationBar: c == null
          ? null
          : _ActionsBar(
              claim: c,
              saving: provider.saving,
              onTakeOver: _takeOver,
              onResolve: _resolve,
              onRefuse: _refuse,
              onApplyCorrection: _applyCorrection,
              onChangeCommande: _changeCommandeStatus,
              onCallClient: () => _call(c.clientPhone),
              onCallLivreur: () => _call(c.livreurPhone),
              onCreateEchange: _createEchange,
              onQuickReporter: () => _quickCommandeStatus(0, 'Commande reportée'),
              onQuickRetourner: () => _quickCommandeStatus(3, 'Commande retournée'),
              onQuickRelancer: () => _quickCommandeStatus(1, 'Livraison relancée'),
            ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : c == null
              ? _NotFoundView(
                  error: _loadError,
                  onRetry: _load,
                )
              : ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    if (_usingCached)
                      Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade100,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.amber.shade700),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.wifi_off_rounded,
                                color: Colors.amber.shade900),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Mode hors ligne : affichage partiel. '
                                'Réessaye pour récupérer la version à jour.',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: _load,
                              child: const Text('Réessayer'),
                            ),
                          ],
                        ),
                      ),
                    _HeaderCard(claim: c),
                    const SizedBox(height: 12),
                    // Raccourcis contact (appel client + livreur si applicable).
                    _TopContactBar(
                      claim: c,
                      onCallClient: () => _call(c.clientPhone),
                      onCallLivreur: () => _call(c.livreurPhone),
                    ),
                    const SizedBox(height: 12),
                    _ClientBlock(claim: c, onCall: () => _call(c.clientPhone)),
                    if (c.isFromLivreur) ...[
                      const SizedBox(height: 12),
                      _LivreurBlock(claim: c, onCall: () => _call(c.livreurPhone)),
                    ],
                    const SizedBox(height: 12),
                    _CommandeBlock(claim: c),
                    if ((c.correctionProposee ?? '').isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _CorrectionBlock(claim: c, onApply: _applyCorrection),
                    ],
                    if (c.photos.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _PhotosBlock(claim: c),
                    ],
                    if (c.motif.toUpperCase() == 'COLIS_ENDOMMAGE_DEPOT' &&
                        !c.isClosed) ...[
                      const SizedBox(height: 12),
                      DepotDamagedDecisionPanel(
                        claim: c,
                        onDecided: (updated) {
                          setState(() => _claim = updated);
                        },
                        onCallClient: () => _call(c.clientPhone),
                      ),
                    ],
                    if (c.tentatives.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _TentativesBlock(claim: c),
                    ],
                    const SizedBox(height: 12),
                    _NoteBlock(claim: c, onEdit: _editNote),
                    if ((c.motifRefus ?? '').isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _RefusBlock(claim: c),
                    ],
                    const SizedBox(height: 80),
                  ],
                ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final ClientClaim claim;
  const _HeaderCard({required this.claim});

  // 2.C / B.3 — Hero gradient selon type de cas + urgence :
  //   Motif critique  → ROUGE  (colis endommagé, non correspondant, refus client)
  //   Demande livreur → BLEU   (style cas livreur)
  //   Réclamation     → ORANGE (par défaut)
  static const _urgentMotifs = {
    'COLIS_ENDOMMAGE',
    'COLIS_NON_CORRESPONDANT',
    'CLIENT_REFUSE',
  };

  @override
  Widget build(BuildContext context) {
    final motif = claim.motif.toUpperCase();
    final urgent = _urgentMotifs.contains(motif);

    Color gradStart;
    Color gradEnd;
    if (urgent) {
      gradStart = const Color(0xFFE53935);
      gradEnd = const Color(0xFFFF6F60);
    } else if (claim.isFromLivreur) {
      gradStart = const Color(0xFF1E88E5);
      gradEnd = const Color(0xFF6E3CE9);
    } else {
      gradStart = const Color(0xFFF57C00);
      gradEnd = const Color(0xFFFFB74D);
    }

    final typeLabel = claim.isFromLivreur
        ? 'DEMANDE LIVREUR'
        : 'RÉCLAMATION CLIENT';

    final dateStr = _fmtShort(claim.createdAt);

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [gradStart, gradEnd],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: gradStart.withOpacity(0.35),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.22),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  typeLabel,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 11,
                    letterSpacing: 1.1,
                  ),
                ),
              ),
              const Spacer(),
              ClientClaimStatusBadge(status: claim.statut),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '#${claim.codeReclamation}',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 26,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            labelForAnyMotif(claim.motif).toUpperCase(),
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 16,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded,
                  size: 14, color: Colors.white70),
              const SizedBox(width: 6),
              Text(
                dateStr,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const SizedBox(width: 14),
              const Icon(Icons.inventory_2_outlined,
                  size: 14, color: Colors.white70),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  claim.doPiece,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          if (claim.description.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.25)),
              ),
              child: Text(
                claim.description,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13.5,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _fmtShort(DateTime? v) {
    if (v == null) return '—';
    final d = v.toLocal();
    String two(int x) => x.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year}';
  }
}

class _ClientBlock extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback onCall;
  const _ClientBlock({required this.claim, required this.onCall});
  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Client',
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // B.4 — icône ☰ : historique commandes client en BottomSheet.
          if ((claim.clientUserId ?? '').isNotEmpty)
            IconButton(
              tooltip: 'Historique du client',
              onPressed: () {
                showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (_) =>
                      ClientHistoryBottomSheet(clientId: claim.clientUserId!),
                );
              },
              icon: const Icon(Icons.menu_rounded, size: 20),
            ),
          if (claim.clientPhone != null)
            FilledButton.icon(
              onPressed: onCall,
              icon: const Icon(Icons.phone_rounded),
              label: const Text('Appeler'),
            ),
        ],
      ),
      children: [
        _Row('Nom', claim.clientDisplay),
        _Row('Téléphone', claim.clientPhone),
        _Row('Email', claim.clientEmail),
        _Row('Adresse', claim.clientAddress),
        _Row('Gouvernorat', claim.clientGouvernorat),
        _Row('Délégation', claim.clientDelegation),
        _Row('Code Sage', claim.clientCodeSage),
        _Row('Commandes', '${claim.clientCommandesCount}'),
        _Row('Réclamations antérieures', '${claim.clientReclamationsCount}'),
      ],
    );
  }
}

class _LivreurBlock extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback onCall;
  const _LivreurBlock({required this.claim, required this.onCall});
  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Livreur',
      trailing: claim.livreurPhone == null
          ? null
          : FilledButton.icon(
              onPressed: onCall,
              icon: const Icon(Icons.phone_rounded),
              label: const Text('Appeler'),
            ),
      children: [
        _Row('Nom', claim.livreurDisplay),
        _Row('Téléphone', claim.livreurPhone),
      ],
    );
  }
}

class _CommandeBlock extends StatelessWidget {
  final ClientClaim claim;
  const _CommandeBlock({required this.claim});
  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Commande',
      children: [
        _Row('Référence', claim.doPiece),
        _Row('Date', claim.orderDate == null ? null : _fmt(claim.orderDate!)),
        _Row('Statut', claim.orderStatut),
        _Row('Net à payer',
            claim.orderNetAPayer == null
                ? null
                : '${claim.orderNetAPayer!.toStringAsFixed(3)} TND'),
        _Row('Mode paiement', claim.orderPaymentMethod),
        _Row('Mode livraison', claim.orderDeliveryMode),
        if (claim.orderLines.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text('Articles', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          ...claim.orderLines.map((l) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                    '${l.arRef} • ${l.designation ?? ''} (x${l.qty.toStringAsFixed(0)})',
                    style: Theme.of(context).textTheme.bodySmall),
              )),
        ],
      ],
    );
  }
}

class _CorrectionBlock extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback onApply;
  const _CorrectionBlock({required this.claim, required this.onApply});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Utilise le parser partagé pour garantir la même lecture que côté
    // client — évite toute incohérence d'affichage (repère, instructions,
    // GPS) entre les 2 vues.
    final correction = ProposedCorrection.parse(claim.correctionProposee);
    final rows = correction.toDisplayRows();

    return _SectionCard(
      title: 'Correction proposée',
      color: scheme.primaryContainer.withOpacity(0.3),
      trailing: claim.correctionAppliquee
          ? const Chip(label: Text('Appliquée'))
          : FilledButton.icon(
              onPressed: onApply,
              icon: const Icon(Icons.check_rounded),
              label: const Text('Appliquer'),
            ),
      children: [
        if (rows.isEmpty)
          Text(claim.correctionProposee ?? '')
        else
          ...rows.map((kv) => _Row(kv.key, kv.value)),
      ],
    );
  }
}

class _PhotosBlock extends StatelessWidget {
  final ClientClaim claim;
  const _PhotosBlock({required this.claim});
  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Photos (${claim.photos.length})',
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: claim.photos.map((p) {
            final url = context.read<ApiClient>().resolveMediaUrl(p.url);
            return InkWell(
              onTap: () => _openFullScreen(context, url),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Stack(
                  children: [
                    Image.network(
                      url,
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 100,
                        height: 100,
                        color: Colors.grey.shade300,
                        child: const Icon(Icons.broken_image_outlined),
                      ),
                    ),
                    Positioned(
                      right: 4,
                      bottom: 4,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Icon(Icons.zoom_out_map_rounded,
                            color: Colors.white, size: 14),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  void _openFullScreen(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _PhotoFullScreen(url: url),
      ),
    );
  }
}

class _PhotoFullScreen extends StatelessWidget {
  final String url;
  const _PhotoFullScreen({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Photo'),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.8,
          maxScale: 4,
          child: Image.network(
            url,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => const Icon(
              Icons.broken_image_outlined,
              color: Colors.white54,
              size: 80,
            ),
          ),
        ),
      ),
    );
  }
}

class _NotFoundView extends StatelessWidget {
  final String? error;
  final VoidCallback onRetry;
  const _NotFoundView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.find_in_page_outlined, size: 64, color: scheme.primary),
          const SizedBox(height: 16),
          Text(
            'Impossible d\'afficher ce cas',
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            error ??
                'Le cas n\'a pas pu être chargé. Il peut avoir été redistribué '
                    'ou ton accès a changé.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 12,
            children: [
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.arrow_back_rounded),
                label: const Text('Retour'),
              ),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TopContactBar extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback onCallClient;
  final VoidCallback onCallLivreur;
  const _TopContactBar({
    required this.claim,
    required this.onCallClient,
    required this.onCallLivreur,
  });

  @override
  Widget build(BuildContext context) {
    final hasClientPhone = (claim.clientPhone ?? '').trim().isNotEmpty;
    final hasLivreurPhone = (claim.livreurPhone ?? '').trim().isNotEmpty;
    if (!hasClientPhone && !hasLivreurPhone) return const SizedBox.shrink();

    return Row(
      children: [
        if (hasClientPhone)
          Expanded(
            child: FilledButton.icon(
              onPressed: onCallClient,
              icon: const Icon(Icons.phone_rounded),
              label: const Text('Appeler client'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle:
                    const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
              ),
            ),
          ),
        if (hasClientPhone && hasLivreurPhone) const SizedBox(width: 10),
        if (hasLivreurPhone)
          Expanded(
            child: FilledButton.icon(
              onPressed: onCallLivreur,
              icon: const Icon(Icons.local_shipping_rounded),
              label: const Text('Appeler livreur'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.blue.shade700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle:
                    const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
              ),
            ),
          ),
      ],
    );
  }
}

class _TentativesBlock extends StatelessWidget {
  final ClientClaim claim;
  const _TentativesBlock({required this.claim});
  @override
  Widget build(BuildContext context) {
    final api = context.read<ApiClient>();
    return _SectionCard(
      title: 'Tentatives livreur (${claim.tentatives.length})',
      children: claim.tentatives
          .map((t) {
            final photoUrl = t.photoUrl;
            final resolvedUrl = (photoUrl != null && photoUrl.isNotEmpty)
                ? api.resolveMediaUrl(photoUrl)
                : null;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
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
                            style:
                                const TextStyle(fontWeight: FontWeight.w700)),
                        Text(labelForLivreurMotif(t.motif)),
                        if (t.livreurDisplay != null)
                          Text('Par ${t.livreurDisplay}',
                              style: Theme.of(context).textTheme.bodySmall),
                        // C.1 — Photo livreur (motif COLIS_ENDOMMAGE_DEPOT
                        // et autres motifs nécessitant une preuve photo)
                        if (resolvedUrl != null) ...[
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              resolvedUrl,
                              width: 120,
                              height: 90,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: 120,
                                height: 90,
                                color: const Color(0xFFF1F3FA),
                                child: const Icon(
                                    Icons.image_not_supported_outlined,
                                    color: Color(0xFF8A8FA8)),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          })
          .toList(),
    );
  }
}

class _NoteBlock extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback onEdit;
  const _NoteBlock({required this.claim, required this.onEdit});
  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Note interne',
      trailing: IconButton(onPressed: onEdit, icon: const Icon(Icons.edit_outlined)),
      children: [
        Text(
          (claim.noteInterne ?? '').isEmpty ? '(Aucune note)' : claim.noteInterne!,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _RefusBlock extends StatelessWidget {
  final ClientClaim claim;
  const _RefusBlock({required this.claim});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _SectionCard(
      title: 'Motif du refus',
      color: scheme.errorContainer.withOpacity(0.3),
      children: [Text(claim.motifRefus ?? '—')],
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final List<Widget> children;
  final Color? color;
  const _SectionCard({
    required this.title,
    required this.children,
    this.trailing,
    this.color,
  });
  @override
  Widget build(BuildContext context) {
    return Card(
      color: color,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                child: Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              ),
              if (trailing != null) trailing!,
            ]),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String? value;
  const _Row(this.label, this.value);
  @override
  Widget build(BuildContext context) {
    if (value == null || value!.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ),
          Expanded(
            child: Text(value!, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _ActionsBar extends StatelessWidget {
  final ClientClaim claim;
  final bool saving;
  final VoidCallback onTakeOver;
  final VoidCallback onResolve;
  final VoidCallback onRefuse;
  final VoidCallback onApplyCorrection;
  final VoidCallback onChangeCommande;
  final VoidCallback onCallClient;
  final VoidCallback onCallLivreur;
  final VoidCallback onCreateEchange;
  final VoidCallback onQuickReporter;
  final VoidCallback onQuickRetourner;
  final VoidCallback onQuickRelancer;

  const _ActionsBar({
    required this.claim,
    required this.saving,
    required this.onTakeOver,
    required this.onResolve,
    required this.onRefuse,
    required this.onApplyCorrection,
    required this.onChangeCommande,
    required this.onCallClient,
    required this.onCallLivreur,
    required this.onCreateEchange,
    required this.onQuickReporter,
    required this.onQuickRetourner,
    required this.onQuickRelancer,
  });

  @override
  Widget build(BuildContext context) {
    final closed = claim.isClosed;
    final canTakeOver = claim.statut.toUpperCase() == 'ENVOYEE';
    final hasCorrection =
        (claim.correctionProposee ?? '').isNotEmpty && !claim.correctionAppliquee;
    final motifUp = claim.motif.toUpperCase();
    final canCreateEchange = !closed &&
        (motifUp == 'COLIS_ENDOMMAGE' || motifUp == 'COLIS_NON_CORRESPONDANT');

    // CLIENT_REFUSE : 3 boutons spécifiques
    final showQuickReporter = !closed && motifUp == 'CLIENT_REFUSE';
    final showQuickRetourner = !closed &&
        (motifUp == 'CLIENT_REFUSE' ||
            (claim.isFromLivreur &&
                (motifUp == 'TENTATIVE_ECHOUEE' ||
                    motifUp == 'CLIENT_INJOIGNABLE' ||
                    motifUp == 'TELEPHONE_ETEINT' ||
                    motifUp == 'CLIENT_ABSENT')));
    final showQuickRelancer = !closed &&
        (motifUp == 'CLIENT_REFUSE' ||
            (claim.isFromLivreur && hasCorrection));

    // Pour ANNULATION : l'action "Confirmer annulation" = statut REFUSE + Clôturée
    final isAnnulation = motifUp == 'ANNULATION';
    // Pour REPROGRAMMATION : l'action = Reporter commande
    final isReprog = motifUp == 'REPROGRAMMATION';

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              if (canTakeOver && !closed)
                _ActionBtn(
                    label: 'Prendre en charge',
                    icon: Icons.play_arrow_rounded,
                    onTap: saving ? null : onTakeOver),
              if (hasCorrection && !closed)
                _ActionBtn(
                    label: 'Appliquer correction',
                    icon: Icons.check_circle_outline_rounded,
                    onTap: saving ? null : onApplyCorrection,
                    color: Colors.teal),
              if (canCreateEchange)
                _ActionBtn(
                    label: 'Créer échange',
                    icon: Icons.swap_horiz_rounded,
                    onTap: saving ? null : onCreateEchange,
                    color: Colors.deepPurple),
              if (showQuickReporter)
                _ActionBtn(
                    label: 'Reporter',
                    icon: Icons.event_repeat_rounded,
                    onTap: saving ? null : onQuickReporter),
              if (showQuickRetourner)
                _ActionBtn(
                    label: 'Retourner',
                    icon: Icons.undo_rounded,
                    onTap: saving ? null : onQuickRetourner,
                    color: Colors.orange),
              if (showQuickRelancer)
                _ActionBtn(
                    label: 'Relancer livraison',
                    icon: Icons.local_shipping_rounded,
                    onTap: saving ? null : onQuickRelancer,
                    color: Colors.blue),
              if (isAnnulation && !closed)
                _ActionBtn(
                    label: 'Confirmer annulation',
                    icon: Icons.cancel_outlined,
                    onTap: saving ? null : onQuickRetourner,
                    color: Colors.orange),
              if (isReprog && !closed)
                _ActionBtn(
                    label: 'Reporter commande',
                    icon: Icons.event_repeat_rounded,
                    onTap: saving ? null : onQuickReporter),
              // B.3 — "Changer statut commande" toujours visible quand le
              // cas est ouvert, pour pouvoir basculer vers retour / report /
              // en livraison / dépôt depuis demande comme réclamation.
              if (!closed)
                _ActionBtn(
                    label: 'Changer statut commande',
                    icon: Icons.sync_rounded,
                    onTap: saving ? null : onChangeCommande,
                    color: const Color(0xFF6E3CE9)),
              if (!closed)
                _ActionBtn(
                    label: 'Clôturer',
                    icon: Icons.done_all_rounded,
                    onTap: saving ? null : onResolve,
                    color: Colors.green),
              if (!closed)
                _ActionBtn(
                    label: 'Refuser',
                    icon: Icons.block_rounded,
                    onTap: saving ? null : onRefuse,
                    color: Colors.red),
              if (claim.clientPhone != null)
                _ActionBtn(
                    label: 'Appeler client',
                    icon: Icons.phone_rounded,
                    onTap: onCallClient),
              if (claim.livreurPhone != null)
                _ActionBtn(
                    label: 'Appeler livreur',
                    icon: Icons.phone_outlined,
                    onTap: onCallLivreur),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final Color? color;
  const _ActionBtn({required this.label, required this.icon, this.onTap, this.color});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilledButton.tonalIcon(
        onPressed: onTap,
        icon: Icon(icon, size: 18),
        label: Text(label, style: const TextStyle(fontSize: 12)),
        style: color == null
            ? null
            : FilledButton.styleFrom(
                backgroundColor: color!.withOpacity(0.15),
                foregroundColor: color,
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

/// B.2 — Option du sheet "Changer statut commande".
class _CommandeStatusOption {
  final String key;
  final String label;
  final IconData icon;
  final Color color;
  const _CommandeStatusOption({
    required this.key,
    required this.label,
    required this.icon,
    required this.color,
  });
}

/// B.2 — BottomSheet premium avec 4 boutons multicolores pour changer
/// le statut de la commande depuis le détail réclamation.
class _CommandeStatusSheet extends StatelessWidget {
  static const _options = <_CommandeStatusOption>[
    _CommandeStatusOption(
      key: 'RETOUR',
      label: 'Retourner',
      icon: Icons.undo_rounded,
      color: Color(0xFFEF4444),
    ),
    _CommandeStatusOption(
      key: 'REPORTE',
      label: 'Reporter',
      icon: Icons.event_repeat_rounded,
      color: Color(0xFFF97316),
    ),
    _CommandeStatusOption(
      key: 'EN_LIVRAISON',
      label: 'En livraison',
      icon: Icons.local_shipping_rounded,
      color: Color(0xFF0EA5E9),
    ),
    _CommandeStatusOption(
      key: 'DEPOT',
      label: 'Mettre en dépôt',
      icon: Icons.inventory_2_rounded,
      color: Color(0xFFA855F7),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        top: 12,
        left: 16,
        right: 16,
        bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 50,
            height: 5,
            decoration: BoxDecoration(
              color: const Color(0xFFE6E8F2),
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          const SizedBox(height: 18),
          const Text('Changer statut commande',
              style: TextStyle(
                  fontWeight: FontWeight.w900, fontSize: 18)),
          const SizedBox(height: 4),
          const Text(
              'Choisis la nouvelle action sur la commande liée à la réclamation.',
              style: TextStyle(color: Color(0xFF8A8FA8), fontSize: 13),
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              mainAxisExtent: 96,
            ),
            itemCount: _options.length,
            itemBuilder: (_, i) => _optionTile(context, _options[i]),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Annuler'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _optionTile(BuildContext context, _CommandeStatusOption o) {
    return InkWell(
      onTap: () => Navigator.of(context).pop(o),
      borderRadius: BorderRadius.circular(14),
      child: Ink(
        decoration: BoxDecoration(
          color: o.color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: o.color.withOpacity(0.30)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(o.icon, color: o.color, size: 26),
              const SizedBox(height: 6),
              Text(o.label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: o.color,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  )),
            ],
          ),
        ),
      ),
    );
  }
}
