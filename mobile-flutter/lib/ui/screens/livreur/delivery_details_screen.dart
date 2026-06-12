import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api_client.dart';
import '../../../core/api_exception.dart';
import '../../../core/constants.dart';
import '../../../core/theme/app_status_palette.dart';
import '../../../data/services/avis_service.dart';
import '../../../data/services/livreur_active_delivery_service.dart';
import '../../../data/services/livreur_escalation_service.dart';
import '../../../data/services/livreur_location_service.dart';
import '../../../data/services/livreur_orders_service.dart';
import '../../../models/delivery.dart';
import '../../../models/livreur_order_details.dart';
import '../../../models/order_escalation_status.dart';
import '../../../state/deliveries_provider.dart';
import '../../widgets/premium/action_tile.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/status_pill.dart';
import '../../widgets/livreur/heure_souhaitee_badge.dart';
import '../../widgets/livreur/heure_souhaitee_sheet.dart';
import '../order_history_screen.dart';
import 'livreur_claims_history_screen.dart';

/// Page détail d'une commande côté livreur.
///
/// Structurée en 5 blocs (conformément au brief produit) :
///   1. Résumé commande (hero + infos essentielles)
///   2. Actions rapides (appeler / maps / sms)
///   3. Gestion de statut (bouton qui ouvre une feuille de choix)
///   4. Motifs / incidents (accessible quand on passe en tentative/report)
///   5. Timeline / historique
class DeliveryDetailsScreen extends StatefulWidget {
  final String doPiece;
  const DeliveryDetailsScreen({super.key, required this.doPiece});

  @override
  State<DeliveryDetailsScreen> createState() => _DeliveryDetailsScreenState();
}

class _DeliveryDetailsScreenState extends State<DeliveryDetailsScreen>
    with WidgetsBindingObserver {
  OrderEscalationStatus _escalation = OrderEscalationStatus.empty;
  LivreurOrderDetails? _full;
  bool _fullLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadEscalation();
      _loadFullDetails();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Recharge les détails quand l'app revient au premier plan (ex: correction appliquée)
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadEscalation();
      _loadFullDetails();
    }
  }

  Future<void> _loadEscalation() async {
    try {
      final api = context.read<ApiClient>();
      final svc = LivreurEscalationService(api);
      final s = await svc.fetchEscalationStatus(widget.doPiece);
      if (!mounted) return;
      setState(() {
        _escalation = s;
      });
    } catch (_) {
      // Silencieux : l'escalation reste à `empty`.
    }
  }

  Future<void> _loadFullDetails() async {
    try {
      final api = context.read<ApiClient>();
      final svc = LivreurOrdersService(api);
      final f = await svc.fetchFullDetails(widget.doPiece);
      if (!mounted) return;
      setState(() {
        _full = f;
        _fullLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _fullLoading = false);
    }
  }

  Delivery? _find(DeliveriesProvider p) {
    for (final d in p.myOrders) {
      if (d.doPiece == widget.doPiece) return d;
    }
    for (final d in p.newOrders) {
      if (d.doPiece == widget.doPiece) return d;
    }
    return null;
  }

  // ======================= Actions ==================================

  Future<void> _call(String? phone) async {
    final raw = (phone ?? '').trim();
    if (raw.isEmpty) {
      _snack('Aucun numéro disponible.');
      return;
    }
    final digits = raw.replaceAll(RegExp(r'[\s\-().]'), '');
    final uri = Uri(scheme: 'tel', path: digits);
    if (!await launchUrl(uri)) _snack('Impossible de lancer l\'appel.');
  }

  Future<void> _sms(String? phone, {Delivery? d, String? template}) async {
    final raw = (phone ?? '').trim();
    if (raw.isEmpty) {
      _snack('Aucun numéro disponible.');
      return;
    }
    final digits = raw.replaceAll(RegExp(r'[\s\-().]'), '');

    // Section 1.4 — body pré-rempli pour gagner du temps. Le livreur valide et
    // appuie sur Envoyer dans son app native (pas d'envoi automatique).
    final piece = d?.doPiece ?? '';
    final body = template ??
        "Bonjour, je suis votre livreur pour la commande $piece. "
            "J'arrive dans environ 10 minutes.";
    final uri = Uri.parse('sms:$digits?body=${Uri.encodeComponent(body)}');
    if (!await launchUrl(uri)) {
      // Certaines plateformes (iOS) n'acceptent pas le query body via Uri.parse,
      // on retombe sur l'intent simple.
      final fallback = Uri(scheme: 'sms', path: digits);
      if (!await launchUrl(fallback)) _snack("Impossible d'ouvrir SMS.");
    }
  }

  /// Section 1.4 — bottomsheet 3 templates rapides au-dessus du clavier SMS.
  Future<void> _openSmsTemplateSheet(Delivery d) async {
    final phone = d.clientPhone;
    final templates = <String, String>{
      "J'arrive dans 10 min":
          "Bonjour, je suis votre livreur pour la commande ${d.doPiece}. J'arrive dans environ 10 minutes.",
      "Je suis en bas, descendez":
          "Bonjour, votre livreur est en bas pour la commande ${d.doPiece}. Pourriez-vous descendre s'il vous plaît ?",
      "Confirmer disponibilité":
          "Bonjour, je suis votre livreur pour la commande ${d.doPiece}. Êtes-vous disponible maintenant pour la livraison ?",
    };
    if (!mounted) return;
    final picked = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Text('Choisir un message',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            for (final entry in templates.entries)
              ListTile(
                leading: const Icon(Icons.sms_outlined),
                title: Text(entry.key),
                subtitle: Text(entry.value, maxLines: 2, overflow: TextOverflow.ellipsis),
                onTap: () => Navigator.of(ctx).pop(entry.value),
              ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Message libre (par défaut)'),
              onTap: () => Navigator.of(ctx).pop(null),
            ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    await _sms(phone, d: d, template: picked);
  }

  Future<void> _openMaps(Delivery d) async {
    Uri uri;
    if (d.lat != 0 && d.lng != 0) {
      uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}',
      );
    } else {
      final q = [d.adresse, d.ville].where((e) => e.trim().isNotEmpty).join(', ');
      if (q.isEmpty) {
        _snack('Aucune adresse disponible.');
        return;
      }
      uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(q)}',
      );
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      _snack('Impossible d\'ouvrir Maps.');
    }
  }

  Future<void> _openNavigation(Delivery d) async {
    if (d.lat == 0 && d.lng == 0) {
      _openMaps(d);
      return;
    }
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}&travelmode=driving',
    );
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      _snack('Impossible de lancer la navigation.');
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ===================== Active Delivery (Section 2.2) =====================

  Future<void> _toggleActiveDelivery(Delivery d, bool start) async {
    try {
      final api = context.read<ApiClient>();
      final locationService = context.read<LivreurLocationService?>();
      final svc = LivreurActiveDeliveryService(api);
      if (start) {
        await svc.startHeading(d.doPiece);
        await locationService?.start();
        if (mounted) {
          _snack('Livraison active. Le client voit votre position.');
        }
      } else {
        await svc.stopHeading(d.doPiece);
        await locationService?.stop();
        if (mounted) _snack('Livraison désactivée.');
      }
    } catch (e) {
      if (mounted) _snack(friendlyError(e));
    }
  }

  // ======================= Status change =============================

  Future<void> _openStatusSheet(Delivery d) async {
    if (_escalation.isEscalated) {
      _snack(
        'Bloqué : cette commande est escaladée (3 tentatives). '
        'Le support prend la main.',
      );
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _StatusSheet(delivery: d, parent: this),
    );
  }

  Future<void> _applyStatus({
    required Delivery d,
    required int newStatut,
    String? motif,
    String? note,
    DateTime? replannedAt,
    bool recordAttempt = false,
    File? photo,
  }) async {
    // Providers captés avant tout await (évite l'usage de context post-async).
    final deliveriesProvider = context.read<DeliveriesProvider>();
    final api = context.read<ApiClient>();
    try {
      await deliveriesProvider.setStatus(
            doPiece: d.doPiece,
            statut: newStatut,
            motif: motif,
            noteLivreur: note,
            dateReplanification: replannedAt,
          );
      // Si motif tentative / injoignable / absent / tel éteint, enregistrer
      // la tentative côté backend pour déclencher la logique d'escalade.
      // La photo (si fournie) est obligatoire pour COLIS_ENDOMMAGE_DEPOT.
      if (recordAttempt && motif != null && motif.isNotEmpty) {
        try {
          final signalSvc = LivreurSignalService(api);
          await signalSvc.recordAttempt(
            doPiece: d.doPiece,
            motif: motif,
            description: note,
            photo: photo,
          );
        } catch (_) {
          // La màj statut a déjà abouti ; l'absence de tentative
          // enregistrée est un bémol logguable mais pas bloquant.
        }
      }
      if (!mounted) return;
      Navigator.of(context).maybePop(); // ferme la sheet
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: Colors.green.shade700,
          content: Row(
            children: const [
              Icon(Icons.check_circle_rounded, color: Colors.white),
              SizedBox(width: 8),
              Text(
                'Statut mis à jour.',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      );
      _loadEscalation();
    } catch (e) {
      _snack('Erreur : $e');
    }
  }

  // ======================= Build =====================================

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DeliveriesProvider>();
    final d = _find(provider);

    if (d == null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.doPiece)),
        body: const Center(child: Text('Commande introuvable.')),
      );
    }

    final scheme = Theme.of(context).colorScheme;
    final escalated = _escalation.isEscalated;

    return Scaffold(
      appBar: AppBar(
        title: Text(d.doPiece),
        actions: [
          IconButton(
            tooltip: 'Mes signalements',
            icon: const Icon(Icons.assignment_late_outlined),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => const LivreurClaimsHistoryScreen(),
            )),
          ),
          IconButton(
            tooltip: 'Rafraîchir',
            onPressed: () {
              provider.refresh();
              _loadEscalation();
            },
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      floatingActionButton: escalated
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openNavigation(d),
              icon: const Icon(Icons.navigation_rounded),
              label: const Text('Démarrer la navigation'),
              backgroundColor: scheme.primary,
              foregroundColor: Colors.white,
            ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        children: [
          // --- Bloc 1 : Résumé hero
          _HeroCard(delivery: d, full: _full),
          const SizedBox(height: 12),

          // 2.A — Bouton vert plein largeur pour appeler le client (priorité
          // visuelle haute pour un livreur en route).
          if ((d.clientPhone ?? '').isNotEmpty)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _call(d.clientPhone),
                icon: const Icon(Icons.phone_rounded),
                label: Text(
                  d.clientPhone!,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.0,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green.shade600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 16),

          // 2.A — Bloc CART : panier complet (lignes + total + frais).
          if (_fullLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_full != null && _full!.lignes.isNotEmpty) ...[
            _SectionHeader(
              icon: Icons.shopping_bag_rounded,
              title: 'Panier',
            ),
            const SizedBox(height: 8),
            _CartCard(full: _full!),
            const SizedBox(height: 20),
          ],

          // --- Bandeau escalade si nécessaire
          if (escalated) ...[
            _EscalationBanner(escalation: _escalation),
            const SizedBox(height: 16),
          ],

          // --- Bloc 2 : Actions rapides
          _SectionHeader(icon: Icons.flash_on_rounded, title: 'Actions rapides'),
          const SizedBox(height: 8),
          PremiumCard(
            padding: const EdgeInsets.all(6),
            child: Column(
              children: [
                ActionTile(
                  icon: Icons.phone_rounded,
                  iconColor: Colors.green.shade700,
                  iconBg: Colors.green.shade50,
                  label: 'Appeler le client',
                  subLabel: d.clientPhone ?? 'Aucun numéro',
                  onTap: () => _call(d.clientPhone),
                ),
                const Divider(height: 1),
                ActionTile(
                  icon: Icons.sms_outlined,
                  iconColor: Colors.blue.shade700,
                  iconBg: Colors.blue.shade50,
                  label: 'Envoyer un SMS',
                  subLabel: 'Prévenir de ton arrivée',
                  onTap: () => _openSmsTemplateSheet(d),
                ),
                const Divider(height: 1),
                ActionTile(
                  icon: Icons.map_outlined,
                  iconColor: Colors.orange.shade700,
                  iconBg: Colors.orange.shade50,
                  label: 'Ouvrir dans Maps',
                  subLabel: 'Voir la position',
                  onTap: () => _openMaps(d),
                ),
                const Divider(height: 1),
                // Section 2.2 — Active Delivery (1 seule par livreur, transactionnel)
                if (d.statut == 2)
                  ActionTile(
                    icon: Icons.flag_circle_outlined,
                    iconColor: Colors.deepPurple.shade700,
                    iconBg: Colors.deepPurple.shade50,
                    label: 'Démarrer la livraison vers ce client',
                    subLabel: 'Active la position GPS pour le client',
                    onTap: () => _toggleActiveDelivery(d, true),
                  ),
                if (d.statut == 2)
                  const Divider(height: 1),
                ActionTile(
                  icon: Icons.navigation_rounded,
                  iconColor: scheme.primary,
                  label: 'Lancer la navigation',
                  subLabel: 'Itinéraire + guidage GPS',
                  onTap: () => _openNavigation(d),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // --- Bloc 3 : Gestion du statut
          _SectionHeader(icon: Icons.flag_rounded, title: 'Statut de la commande'),
          const SizedBox(height: 8),
          PremiumCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Statut actuel',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                    const Spacer(),
                    StatusPill(
                        statut: d.statut, apiStatus: d.apiStatus),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: escalated ? null : () => _openStatusSheet(d),
                    icon: const Icon(Icons.tune_rounded),
                    label: Text(escalated
                        ? 'Actions bloquées (escalade)'
                        : 'Changer le statut'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                // Report partiel — visible uniquement EN_LIVRAISON. Permet de
                // dire « le client veut 14h » sans changer le statut ni sortir
                // la commande de la tournée.
                if (!escalated && d.statut == Statut.enLivraison) ...[
                  const SizedBox(height: 10),
                  _HeureSouhaiteePanel(delivery: d),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // --- Bloc 5 : Timeline inline (historique complet directement
          // visible — l'ancien bouton "Voir historique complet" et le mini
          // récap ont été remplacés par cette unique timeline premium).
          _SectionHeader(icon: Icons.history_rounded, title: 'Historique'),
          const SizedBox(height: 8),
          Builder(
            builder: (_) {
              final scheme = Theme.of(context).colorScheme;
              final accent = scheme.primary;
              final accentDark =
                  Color.lerp(accent, Colors.black, 0.25) ?? accent;
              return OrderTimelineList(
                events: _OpenFullHistoryButton.buildEventsFor(
                  delivery: d,
                  full: _full,
                ),
                accentColor: accent,
                accentDark: accentDark,
                showHeader: false,
              );
            },
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

// ============================================================================
// Hero card (Bloc 1)
// ============================================================================

class _HeroCard extends StatelessWidget {
  final Delivery delivery;
  final LivreurOrderDetails? full;
  const _HeroCard({required this.delivery, this.full});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final d = delivery;
    final visual = AppStatusPalette.forStatut(d.statut, apiStatus: d.apiStatus);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PremiumTokens.rXl),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.primary,
            Color.lerp(scheme.primary, Colors.black, 0.25) ?? scheme.primary,
          ],
        ),
        boxShadow: PremiumTokens.cardShadow(false),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  d.doPiece,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(visual.icon, size: 14, color: Colors.white),
                    const SizedBox(width: 6),
                    Text(
                      visual.label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _kv(context, Icons.person_outline_rounded, d.clientDisplay ?? '—'),
          if ((d.clientPhone ?? '').isNotEmpty)
            _kv(context, Icons.phone_outlined, d.clientPhone!),
          _kv(
            context,
            Icons.location_on_outlined,
            _locationLine(d),
          ),
          const SizedBox(height: 12),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.payments_rounded, color: Colors.white),
                const SizedBox(width: 8),
                const Text(
                  'Montant à encaisser',
                  style: TextStyle(color: Colors.white70),
                ),
                const Spacer(),
                Text(
                  '${d.netAPayer.toStringAsFixed(3)} TND',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(BuildContext context, IconData icon, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: Colors.white70),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
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
}

// ============================================================================
// Section header commun
// ============================================================================

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 2),
      child: Row(
        children: [
          Icon(icon, size: 18, color: scheme.primary),
          const SizedBox(width: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Bandeau escalade
// ============================================================================

class _EscalationBanner extends StatelessWidget {
  final OrderEscalationStatus escalation;
  const _EscalationBanner({required this.escalation});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.error.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(PremiumTokens.rMd),
        border: Border.all(color: scheme.error.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: scheme.error),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Commande escaladée',
                  style: TextStyle(
                    color: scheme.error,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Après ${escalation.tentativesCount} tentatives, le support a repris '
                  'cette commande. Tes actions sont bloquées — attends une consigne.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Status sheet (Bloc 3 + 4 — motifs contextuels)
// ============================================================================

class _StatusSheet extends StatefulWidget {
  final Delivery delivery;
  final _DeliveryDetailsScreenState parent;
  const _StatusSheet({required this.delivery, required this.parent});

  @override
  State<_StatusSheet> createState() => _StatusSheetState();
}

class _StatusSheetState extends State<_StatusSheet> {
  // Option sélectionnée
  _StatusOption? _option;
  final TextEditingController _noteCtrl = TextEditingController();
  DateTime? _replannedAt;
  XFile? _photo;

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final d = widget.delivery;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, scroll) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: scheme.outlineVariant,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Text(
                _option == null
                    ? 'Quel est le résultat ?'
                    : 'Confirmer : ${_option!.label}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 12),
              if (_option == null) ..._buildOptionList()
              else ..._buildOptionForm(d),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _buildOptionList() {
    return [
      for (final o in _options)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _OptionCard(
            option: o,
            onTap: () => setState(() => _option = o),
          ),
        ),
    ];
  }

  List<Widget> _buildOptionForm(Delivery d) {
    final o = _option!;
    final needsDate = o.requiresReplannedAt;
    final needsNote = o.needsNote;
    final descTooShort = o.needsDescription && _noteCtrl.text.trim().length < 10;
    final photoMissing = o.needsPhoto && _photo == null;
    final blocked = (needsDate && _replannedAt == null) || descTooShort || photoMissing;

    return [
      PremiumCard(
        color: o.bg,
        borderColor: o.color.withValues(alpha: 0.4),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: o.color.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(o.icon, color: o.color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(o.label,
                      style:
                          const TextStyle(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 2),
                  Text(o.description,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      if (needsDate) ...[
        _replannedField(),
        const SizedBox(height: 12),
      ],
      if (needsNote) ...[
        TextField(
          controller: _noteCtrl,
          maxLines: 3,
          maxLength: 400,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: o.needsDescription
                ? 'Description (obligatoire, min. 10 caractères)'
                : 'Note / précisions (optionnel)',
            hintText: 'Ex : sonnette cassée, voisin informé…',
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
      ],
      if (o.needsPhoto) ...[
        _photoField(o),
        const SizedBox(height: 12),
      ],
      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => setState(() => _option = null),
              child: const Text('Retour'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton(
              onPressed: blocked
                  ? null
                  : () {
                      widget.parent._applyStatus(
                        d: d,
                        newStatut: o.newStatut,
                        motif: o.motif,
                        note: _noteCtrl.text.trim().isEmpty
                            ? null
                            : _noteCtrl.text.trim(),
                        replannedAt: _replannedAt,
                        recordAttempt: o.recordAttempt,
                        photo: _photo == null ? null : File(_photo!.path),
                      );
                    },
              style: FilledButton.styleFrom(
                backgroundColor: o.color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(o.confirmLabel),
            ),
          ),
        ],
      ),
    ];
  }

  Widget _replannedField() {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: _pickReplanned,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: scheme.outlineVariant),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(Icons.event_rounded, color: scheme.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                _replannedAt == null
                    ? 'Choisir la nouvelle date'
                    : _formatDateTime(_replannedAt!),
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: _replannedAt == null ? scheme.onSurfaceVariant : null,
                ),
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }

  Future<void> _pickReplanned() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _replannedAt ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
      helpText: 'Nouvelle date de livraison',
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(
        _replannedAt ?? DateTime(now.year, now.month, now.day, 10, 0),
      ),
      helpText: 'Créneau approximatif',
    );
    if (time == null) return;
    setState(() {
      _replannedAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
  }

  Widget _photoField(_StatusOption o) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.photo_camera_rounded, size: 18, color: o.color),
            const SizedBox(width: 6),
            Text(
              'Photo du colis (obligatoire)',
              style: TextStyle(fontWeight: FontWeight.w800, color: scheme.onSurface),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_photo != null) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.file(
              File(_photo!.path),
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 8),
        ],
        OutlinedButton.icon(
          onPressed: _pickPhoto,
          icon: Icon(
            _photo == null ? Icons.photo_camera_outlined : Icons.refresh_rounded,
          ),
          label: Text(_photo == null ? 'Prendre une photo' : 'Reprendre la photo'),
        ),
      ],
    );
  }

  Future<void> _pickPhoto() async {
    try {
      final picker = ImagePicker();
      final img = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 70,
        maxWidth: 1600,
      );
      if (img == null || !mounted) return;
      setState(() => _photo = img);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir l\'appareil photo.')),
      );
    }
  }

  String _formatDateTime(DateTime v) {
    final d = v.toLocal();
    String two(int x) => x.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year} à ${two(d.hour)}h${two(d.minute)}';
  }
}

class _OptionCard extends StatelessWidget {
  final _StatusOption option;
  final VoidCallback onTap;
  const _OptionCard({required this.option, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return PremiumCard(
      onTap: onTap,
      padding: const EdgeInsets.all(12),
      color: option.bg,
      borderColor: option.color.withValues(alpha: 0.35),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: option.color.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(option.icon, color: option.color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  option.label,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 14.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  option.description,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
        ],
      ),
    );
  }
}

/// Option catalogue qui définit comment le livreur peut faire évoluer une
/// commande. Chaque option est associée à un statut cible, un motif libre
/// côté backend, et des contraintes UI (date de report, note).
class _StatusOption {
  final String label;
  final String description;
  final String confirmLabel;
  final IconData icon;
  final Color color;
  final Color bg;
  final int newStatut;
  final String? motif;
  final bool needsNote;
  final bool requiresReplannedAt;
  final bool recordAttempt;
  final bool needsPhoto;       // photo obligatoire (ex. COLIS_ENDOMMAGE_DEPOT)
  final bool needsDescription; // description ≥ 10 caractères (ex. AUTRE)

  const _StatusOption({
    required this.label,
    required this.description,
    required this.confirmLabel,
    required this.icon,
    required this.color,
    required this.bg,
    required this.newStatut,
    this.motif,
    this.needsNote = false,
    this.requiresReplannedAt = false,
    this.recordAttempt = false,
    this.needsPhoto = false,
    this.needsDescription = false,
  });
}

// ============================================================================
// 2.A — Cart card (bloc panier détaillé)
// ============================================================================

class _CartCard extends StatelessWidget {
  final LivreurOrderDetails full;
  const _CartCard({required this.full});

  String _fmt(double v) => '${v.toStringAsFixed(3)} TND';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PremiumCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < full.lignes.length; i++) ...[
            _CartLine(line: full.lignes[i]),
            if (i < full.lignes.length - 1)
              Divider(
                color: scheme.outlineVariant.withValues(alpha: 0.4),
                height: 16,
              ),
          ],
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHighest.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _totalLine(context, 'Sous-total',
                    _fmt(full.totalHT > 0 ? full.totalHT : full.totalTTC)),
                if (full.fraisLivraison > 0)
                  _totalLine(context, 'Frais de livraison',
                      _fmt(full.fraisLivraison)),
                if (full.timbreFiscal > 0)
                  _totalLine(context, 'Timbre fiscal', _fmt(full.timbreFiscal)),
                Divider(color: scheme.outlineVariant.withValues(alpha: 0.6)),
                Row(
                  children: [
                    const Text(
                      'Total à encaisser',
                      style: TextStyle(
                          fontWeight: FontWeight.w900, fontSize: 14),
                    ),
                    const Spacer(),
                    Text(
                      _fmt(full.netAPayer > 0 ? full.netAPayer : full.totalTTC),
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                        color: scheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if ((full.modePaiement ?? '').isNotEmpty ||
              (full.noteClient ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if ((full.modePaiement ?? '').isNotEmpty)
                  _chip(context, Icons.payments_rounded, full.modePaiement!),
                if ((full.modeLivraison ?? '').isNotEmpty)
                  _chip(context, Icons.local_shipping_rounded,
                      full.modeLivraison!),
              ],
            ),
            if ((full.noteClient ?? '').isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: scheme.tertiaryContainer.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.sticky_note_2_outlined,
                        size: 16, color: scheme.tertiary),
                    const SizedBox(width: 8),
                    Expanded(child: Text(full.noteClient!)),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _totalLine(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 13,
              )),
          const Spacer(),
          Text(value,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
              )),
        ],
      ),
    );
  }

  Widget _chip(BuildContext context, IconData icon, String label) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: scheme.onPrimaryContainer),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                color: scheme.onPrimaryContainer,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              )),
        ],
      ),
    );
  }
}

class _CartLine extends StatelessWidget {
  final LivreurOrderLine line;
  const _CartLine({required this.line});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final imageUrl = line.imageUrl;
    final qte = line.quantite.toStringAsFixed(line.quantite.truncateToDouble() == line.quantite ? 0 : 2);
    final pu = line.prixUnitaire.toStringAsFixed(3);
    final sub = line.montantTTC > 0
        ? line.montantTTC
        : line.prixUnitaire * line.quantite;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Container(
            width: 60,
            height: 60,
            color: scheme.surfaceContainerHighest,
            child: imageUrl != null && imageUrl.isNotEmpty
                ? Image.network(
                    imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Icon(
                      Icons.image_not_supported_outlined,
                      color: scheme.onSurfaceVariant,
                    ),
                  )
                : Icon(Icons.inventory_2_outlined,
                    color: scheme.onSurfaceVariant),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                line.designation ?? (line.arRef ?? '—'),
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: scheme.secondaryContainer.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'x$qte',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: scheme.onSecondaryContainer,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '$pu TND',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${sub.toStringAsFixed(3)} TND',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: scheme.primary,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}

final List<_StatusOption> _options = [
  _StatusOption(
    label: 'Partir en livraison',
    description: 'Je démarre ma tournée vers le client.',
    confirmLabel: 'Démarrer',
    icon: Icons.local_shipping_rounded,
    color: Colors.blue.shade700,
    bg: Colors.blue.shade50,
    newStatut: Statut.enLivraison,
  ),
  _StatusOption(
    label: 'Livrée',
    description: 'Le colis est remis au client, le paiement reçu.',
    confirmLabel: 'Confirmer la livraison',
    icon: Icons.check_circle_rounded,
    color: Colors.green.shade700,
    bg: Colors.green.shade50,
    newStatut: Statut.livre,
  ),
  _StatusOption(
    label: 'Client absent',
    description: 'Personne ne répond à l\'adresse.',
    confirmLabel: 'Enregistrer la tentative',
    icon: Icons.person_off_outlined,
    color: Colors.orange.shade700,
    bg: Colors.orange.shade50,
    newStatut: Statut.reporte,
    motif: 'CLIENT_ABSENT',
    needsNote: true,
    recordAttempt: true,
  ),
  _StatusOption(
    label: 'Téléphone fermé',
    description: 'Le numéro sonne mais ne répond pas.',
    confirmLabel: 'Enregistrer la tentative',
    icon: Icons.phone_disabled_outlined,
    color: Colors.orange.shade700,
    bg: Colors.orange.shade50,
    newStatut: Statut.reporte,
    motif: 'TELEPHONE_ETEINT',
    needsNote: true,
    recordAttempt: true,
  ),
  _StatusOption(
    label: 'Client injoignable',
    description: 'Plusieurs tentatives sans réponse.',
    confirmLabel: 'Enregistrer la tentative',
    icon: Icons.sentiment_dissatisfied_outlined,
    color: Colors.orange.shade700,
    bg: Colors.orange.shade50,
    newStatut: Statut.reporte,
    motif: 'CLIENT_INJOIGNABLE',
    needsNote: true,
    recordAttempt: true,
  ),
  _StatusOption(
    label: 'Adresse incorrecte',
    description: 'Le client doit corriger son adresse.',
    confirmLabel: 'Envoyer au support',
    icon: Icons.wrong_location_outlined,
    color: Colors.deepOrange.shade700,
    bg: Colors.deepOrange.shade50,
    newStatut: Statut.reporte,
    motif: 'ADRESSE_INCORRECTE',
    needsNote: true,
    recordAttempt: true,
  ),
  _StatusOption(
    label: 'Numéro incorrect',
    description: 'Le client doit corriger son numéro.',
    confirmLabel: 'Envoyer au support',
    icon: Icons.phone_missed_outlined,
    color: Colors.deepOrange.shade700,
    bg: Colors.deepOrange.shade50,
    newStatut: Statut.reporte,
    motif: 'NUMERO_INCORRECT',
    needsNote: true,
    recordAttempt: true,
  ),
  _StatusOption(
    label: 'Reporter la livraison',
    description: 'Le client demande une autre date.',
    confirmLabel: 'Reporter',
    icon: Icons.event_repeat_rounded,
    color: Colors.amber.shade800,
    bg: Colors.amber.shade50,
    newStatut: Statut.reporte,
    motif: 'CLIENT_DEMANDE_REPORT',
    needsNote: true,
    requiresReplannedAt: true,
  ),
  _StatusOption(
    label: 'Refus client',
    description: 'Le client refuse de réceptionner le colis.',
    confirmLabel: 'Signaler le refus',
    icon: Icons.do_not_disturb_on_outlined,
    color: Colors.red.shade700,
    bg: Colors.red.shade50,
    newStatut: Statut.retourne,
    motif: 'CLIENT_REFUSE',
    needsNote: true,
    recordAttempt: true,
  ),
  _StatusOption(
    label: 'Colis endommagé (retour dépôt)',
    description: 'Le colis est abîmé : retour au dépôt. Photo obligatoire.',
    confirmLabel: 'Signaler avec photo',
    icon: Icons.broken_image_outlined,
    color: Colors.red.shade700,
    bg: Colors.red.shade50,
    newStatut: Statut.retourne,
    motif: 'COLIS_ENDOMMAGE_DEPOT',
    needsNote: true,
    needsPhoto: true,
    recordAttempt: true,
  ),
  _StatusOption(
    label: 'Autre incident',
    description: 'Autre motif à préciser (description obligatoire).',
    confirmLabel: 'Envoyer',
    icon: Icons.report_problem_outlined,
    color: Colors.grey.shade700,
    bg: Colors.grey.shade50,
    newStatut: Statut.reporte,
    motif: 'AUTRE',
    needsNote: true,
    needsDescription: true,
    recordAttempt: true,
  ),
];

// ============================================================================
// Helper "namespace" — construction de la liste OrderTimelineEvent pour la
// timeline livreur. L'ancien bouton "Voir l'historique complet" a été retiré
// et la timeline est désormais rendue inline. Cette classe ne contient plus
// que des statiques.
// ============================================================================

class _OpenFullHistoryButton {
  const _OpenFullHistoryButton._();

  /// Map LI_Statut/StatusCode → couleur + icône + label "fonctionnel".
  static _StatusVisual _visualFor(int code) {
    switch (code) {
      case Statut.confirme:
        return const _StatusVisual(
            color: Color(0xFF6366F1),
            icon: Icons.check_circle_outline_rounded,
            label: 'Confirmée');
      case Statut.enLivraison:
        return const _StatusVisual(
            color: Color(0xFF0EA5E9),
            icon: Icons.local_shipping_rounded,
            label: 'En livraison');
      case Statut.livre:
        return const _StatusVisual(
            color: Color(0xFF22C55E),
            icon: Icons.check_circle_rounded,
            label: 'Livrée');
      case Statut.reporte:
        return const _StatusVisual(
            color: Color(0xFFF97316),
            icon: Icons.event_repeat_rounded,
            label: 'Reportée');
      case Statut.retourne:
        return const _StatusVisual(
            color: Color(0xFFEF4444),
            icon: Icons.undo_rounded,
            label: 'Retournée');
      case Statut.depot:
        return const _StatusVisual(
            color: Color(0xFFA855F7),
            icon: Icons.warehouse_rounded,
            label: 'Au dépôt');
      default:
        return const _StatusVisual(
            color: Color(0xFF6B7280),
            icon: Icons.help_outline_rounded,
            label: 'Inconnu');
    }
  }

  /// Construit la liste d'événements timeline pour une livraison.
  /// Priorité : si `full.history` est non vide, on s'en sert ; sinon
  /// fallback sur les champs locaux de `Delivery`.
  static List<OrderTimelineEvent> buildEventsFor({
    required Delivery delivery,
    required LivreurOrderDetails? full,
  }) {
    final events = <OrderTimelineEvent>[];

    final history = full?.history ?? const [];
    if (history.isNotEmpty) {
      for (final h in history) {
        final v = _visualFor(h.statusCode);
        final desc = [
          if ((h.motif ?? '').trim().isNotEmpty) 'Motif: ${h.motif!.trim()}',
          if ((h.note ?? '').trim().isNotEmpty) h.note!.trim(),
        ].join(' · ');
        events.add(OrderTimelineEvent(
          date: h.at,
          label: h.statusLabel ?? v.label,
          color: v.color,
          icon: v.icon,
          description: desc.isEmpty ? null : desc,
          actor: h.updatedBy,
        ));
      }
      return events;
    }

    if (delivery.dateAffectation != null) {
      events.add(OrderTimelineEvent(
        date: delivery.dateAffectation!,
        label: 'Commande acceptée',
        color: const Color(0xFF6366F1),
        icon: Icons.check_circle_outline_rounded,
      ));
    }
    if (delivery.dateReplanification != null && delivery.isReported) {
      events.add(OrderTimelineEvent(
        date: delivery.dateReplanification!,
        label: 'Reportée',
        color: const Color(0xFFF97316),
        icon: Icons.event_repeat_rounded,
        description: 'Nouvelle date planifiée',
      ));
    }
    if (delivery.dateLivree != null) {
      final v = _visualFor(delivery.statut);
      events.add(OrderTimelineEvent(
        date: delivery.dateLivree!,
        label: v.label,
        color: v.color,
        icon: v.icon,
        description: delivery.noteLivreur,
      ));
    }

    return events;
  }
}

class _StatusVisual {
  final Color color;
  final IconData icon;
  final String label;
  const _StatusVisual(
      {required this.color, required this.icon, required this.label});
}

/// Panneau report partiel (même journée) — affiché dans le bloc « Statut »
/// quand la commande est EN_LIVRAISON.
///
///  - Pas d'heure : un bouton outline « Reporter dans la journée » qui ouvre
///    le sheet de choix rapide (+30 min / +1 h / +2 h / heure précise).
///  - Heure définie : un encadré pastel avec le badge live + 2 actions
///    (modifier l'heure / débloquer maintenant).
class _HeureSouhaiteePanel extends StatefulWidget {
  final Delivery delivery;

  const _HeureSouhaiteePanel({required this.delivery});

  @override
  State<_HeureSouhaiteePanel> createState() => _HeureSouhaiteePanelState();
}

class _HeureSouhaiteePanelState extends State<_HeureSouhaiteePanel> {
  bool _saving = false;

  Future<void> _openSheet() async {
    final d = widget.delivery;
    final result = await showHeureSouhaiteeSheet(
      context,
      doPiece: d.doPiece,
      current: d.heureSouhaitee,
    );
    if (result == null || !mounted) return;

    setState(() => _saving = true);
    try {
      await context.read<DeliveriesProvider>().setHeureSouhaitee(
            doPiece: d.doPiece,
            heureSouhaitee: result.clearNow ? null : result.heureSouhaitee,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: result.clearNow
              ? const Color(0xFF16A34A)
              : const Color(0xFFEA580C),
          content: Text(
            result.clearNow
                ? 'Commande débloquée — livraison immédiate.'
                : 'Reportée à ${_fmt(result.heureSouhaitee!)} dans la journée.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec : $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _clearNow() async {
    setState(() => _saving = true);
    try {
      await context.read<DeliveriesProvider>().setHeureSouhaitee(
            doPiece: widget.delivery.doPiece,
            heureSouhaitee: null,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF16A34A),
          content: Text('Commande débloquée.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec : $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _fmt(DateTime t) {
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.delivery;
    final has = d.heureSouhaitee != null;

    if (!has) {
      return SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: _saving ? null : _openSheet,
          icon: const Icon(Icons.schedule_rounded, size: 18),
          label: const Text(
            'Reporter dans la journée',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFEA580C),
            side: const BorderSide(color: Color(0xFFEA580C), width: 1),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEA580C).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: const Color(0xFFEA580C).withValues(alpha: 0.35),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.lock_clock_rounded,
                  size: 18, color: Color(0xFFEA580C)),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Reportée dans la journée',
                  style: TextStyle(
                    color: Color(0xFFEA580C),
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
              HeureSouhaiteeBadge(heureSouhaitee: d.heureSouhaitee!),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Statut inchangé (« En livraison »). Débloquage auto à l\'heure dite, ou immédiat ci-dessous.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 11.5,
                ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _saving ? null : _openSheet,
                  icon: const Icon(Icons.edit_calendar_rounded, size: 16),
                  label: const Text(
                    'Modifier l\'heure',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEA580C),
                    side: const BorderSide(color: Color(0xFFEA580C)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _saving ? null : _clearNow,
                  icon: const Icon(Icons.flash_on_rounded, size: 16),
                  label: const Text(
                    'Débloquer',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
