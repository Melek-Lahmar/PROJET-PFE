import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../../core/api_client.dart';
import '../../../../data/services/confirmatrice_order_history_service.dart';
import '../../../../models/admin_order_detail.dart';
import '../../../../models/livreur_order_details.dart' show LivreurOrderHistoryItem;
import '../../../../state/admin_orders_provider.dart';
import '../../../screens/order_history_screen.dart';
import '../../../widgets/premium/empty_view.dart';
import '../../../widgets/premium/skeleton.dart';

/// Drawer de détail commande (slide depuis la droite).
/// Affiche entête, lignes article et infos livraison.
class AdminOrderDetailDrawer extends StatelessWidget {
  const AdminOrderDetailDrawer({super.key});

  static Future<void> show(BuildContext context, String piece) async {
    final prov = context.read<AdminOrdersProvider>();
    await prov.openDetail(piece);
    if (!context.mounted) return;

    await showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Fermer',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (_, __, ___) => const SizedBox.shrink(),
      transitionBuilder: (ctx, anim, _, __) {
        final offset = Tween<Offset>(
          begin: const Offset(1, 0),
          end: Offset.zero,
        ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic));
        return Align(
          alignment: Alignment.centerRight,
          child: SlideTransition(
            position: offset,
            child: ChangeNotifierProvider.value(
              value: prov,
              child: const AdminOrderDetailDrawer(),
            ),
          ),
        );
      },
    );
    prov.closeDetail();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final width = media.size.width;
    final drawerWidth = width >= 800 ? 480.0 : width * 0.92;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final prov = context.watch<AdminOrdersProvider>();

    return Material(
      color: scheme.surface,
      child: SafeArea(
        child: SizedBox(
          width: drawerWidth,
          height: media.size.height,
          child: Column(
            children: [
              _Header(
                piece: prov.detailPiece ?? '',
                onClose: () => Navigator.of(context).pop(),
              ),
              Expanded(child: _DrawerBody(prov: prov)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String piece;
  final VoidCallback onClose;
  const _Header({required this.piece, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: scheme.outlineVariant.withOpacity(0.5)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: scheme.primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.receipt_long_rounded, color: scheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Commande',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    )),
                Text(piece,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    )),
              ],
            ),
          ),
          IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Fermer',
          ),
        ],
      ),
    );
  }
}

class _DrawerBody extends StatelessWidget {
  final AdminOrdersProvider prov;
  const _DrawerBody({required this.prov});

  @override
  Widget build(BuildContext context) {
    if (prov.detailLoading) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: const [
          SkeletonBlock(height: 120),
          SizedBox(height: 12),
          SkeletonBlock(height: 80),
          SizedBox(height: 12),
          SkeletonBlock(height: 200),
        ],
      );
    }
    if (prov.detailError != null) {
      return EmptyView(
        icon: Icons.cloud_off_rounded,
        title: 'Erreur de chargement',
        subtitle: prov.detailError!,
      );
    }
    final detail = prov.detail;
    if (detail == null) {
      return const EmptyView(
        icon: Icons.inbox_rounded,
        title: 'Aucune donnée',
        subtitle: 'Le détail de cette commande est indisponible.',
      );
    }
    return _DetailContent(detail: detail);
  }
}

class _DetailContent extends StatelessWidget {
  final AdminOrderDetail detail;
  const _DetailContent({required this.detail});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final dateFmt = DateFormat('dd MMM yyyy à HH:mm', 'fr_FR');
    final moneyFmt = NumberFormat.currency(
      locale: 'fr_FR', symbol: 'TND', decimalDigits: 3,
    );

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // ---- Section client ----
        _SectionTitle(label: 'Client', icon: Icons.person_rounded),
        const SizedBox(height: 8),
        _InfoRow(label: 'Nom', value: detail.clientName ?? '—'),
        _InfoRow(label: 'Téléphone', value: detail.clientPhone ?? '—'),
        _InfoRow(label: 'Code tiers', value: detail.tiers ?? '—'),
        _InfoRow(label: 'Adresse', value: detail.address ?? '—'),
        _InfoRow(
          label: 'Localité',
          value: [detail.ville, detail.governorate]
              .whereType<String>()
              .where((s) => s.isNotEmpty)
              .join(' • ')
              .ifEmpty('—'),
        ),

        const SizedBox(height: 20),
        // ---- Section commande ----
        _SectionTitle(label: 'Commande', icon: Icons.receipt_rounded),
        const SizedBox(height: 8),
        _InfoRow(
          label: 'Date',
          value: detail.date == null ? '—' : dateFmt.format(detail.date!),
        ),
        _InfoRow(label: 'Statut', value: _orderStatusLabel(detail.orderStatus)),
        _InfoRow(label: 'Type', value: detail.typeCommande),
        _InfoRow(
          label: 'Montant TTC',
          value: detail.amountTtc == null
              ? '—'
              : moneyFmt.format(detail.amountTtc),
        ),
        _InfoRow(
          label: 'Frais livraison',
          value: detail.fraisLivraison == null
              ? '—'
              : moneyFmt.format(detail.fraisLivraison),
        ),
        _InfoRow(label: 'Mode paiement', value: detail.modePaiement ?? '—'),
        _InfoRow(label: 'Mode livraison', value: detail.modeLivraison ?? '—'),

        const SizedBox(height: 20),
        // ---- Section lignes article ----
        _SectionTitle(
          label: 'Articles (${detail.lines.length})',
          icon: Icons.shopping_bag_rounded,
        ),
        const SizedBox(height: 8),
        if (detail.lines.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('Aucune ligne article.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                )),
          )
        else
          for (final line in detail.lines) _LineTile(line: line),

        const SizedBox(height: 20),
        // ---- Section livraison ----
        _SectionTitle(
          label: 'Livraison',
          icon: Icons.local_shipping_rounded,
        ),
        const SizedBox(height: 8),
        if (detail.delivery == null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('Pas encore transformée en livraison.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                )),
          )
        else ...[
          _InfoRow(label: 'Statut', value: _deliveryStatusLabel(detail.delivery!.status)),
          _InfoRow(
            label: 'Créée le',
            value: dateFmt.format(detail.delivery!.createdAt),
          ),
          if (detail.delivery!.deliveredAt != null)
            _InfoRow(
              label: 'Livrée le',
              value: dateFmt.format(detail.delivery!.deliveredAt!),
            ),
          if (detail.delivery!.rescheduledAt != null)
            _InfoRow(
              label: 'Replanifiée',
              value: dateFmt.format(detail.delivery!.rescheduledAt!),
            ),
          _InfoRow(label: 'Livreur', value: detail.delivery!.livreurName ?? '—'),
          _InfoRow(
            label: 'Téléphone livreur',
            value: detail.delivery!.livreurPhone ?? '—',
          ),
          if (detail.delivery!.comment != null &&
              detail.delivery!.comment!.isNotEmpty)
            _InfoRow(label: 'Commentaire', value: detail.delivery!.comment!),
        ],

        const SizedBox(height: 20),
        _SectionTitle(
          label: 'Historique',
          icon: Icons.timeline_rounded,
        ),
        const SizedBox(height: 8),
        _OrderHistorySection(piece: detail.piece, accent: scheme.primary),

        const SizedBox(height: 20),
        _SectionTitle(
          label: 'Réclamations & Demandes (${detail.reclamations.length})',
          icon: Icons.report_problem_rounded,
        ),
        const SizedBox(height: 8),
        if (detail.reclamations.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('Aucun cas lié à cette commande.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                )),
          )
        else
          for (final r in detail.reclamations)
            _ReclamationLinkTile(link: r, dateFmt: dateFmt),

        const SizedBox(height: 24),
      ],
    );
  }

  String _orderStatusLabel(String s) {
    switch (s) {
      case 'EN_ATTENTE': return 'En attente';
      case 'CONFIRME': return 'Confirmée';
      case 'TENTATIVE': return 'Tentative';
      case 'REFUSE': return 'Refusée';
      default: return s;
    }
  }

  String _deliveryStatusLabel(String s) {
    switch (s) {
      case 'CONFIRME': return 'Confirmée';
      case 'EN_LIVRAISON': return 'En livraison';
      case 'LIVRE': return 'Livrée';
      case 'RETOUR': return 'Retournée';
      case 'DEPOT': return 'Au dépôt';
      case 'REPORTE': return 'Reportée';
      default: return s;
    }
  }
}

class _SectionTitle extends StatelessWidget {
  final String label;
  final IconData icon;
  const _SectionTitle({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Row(
      children: [
        Icon(icon, size: 18, color: scheme.primary),
        const SizedBox(width: 8),
        Text(label,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w900,
            )),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                )),
          ),
          Expanded(
            child: Text(value,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                )),
          ),
        ],
      ),
    );
  }
}

class _LineTile extends StatelessWidget {
  final AdminOrderLine line;
  const _LineTile({required this.line});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final moneyFmt = NumberFormat.currency(
      locale: 'fr_FR', symbol: 'TND', decimalDigits: 3,
    );

    Color tagBg = scheme.surfaceContainerHighest.withOpacity(0.6);
    Color tagFg = scheme.onSurfaceVariant;
    if (line.lineType == 'RETOUR') {
      tagBg = const Color(0x1FEF4444);
      tagFg = const Color(0xFFB91C1C);
    } else if (line.lineType == 'LIVRAISON') {
      tagBg = const Color(0x1F22C55E);
      tagFg = const Color(0xFF15803D);
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: scheme.outlineVariant.withOpacity(0.5)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  line.designation ?? line.articleRef ?? '—',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (line.lineType != 'STANDARD')
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6, vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: tagBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(line.lineType,
                      style: TextStyle(
                        color: tagFg,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      )),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [
              if (line.articleRef != null) line.articleRef,
              if (line.quantity != null)
                'Qté ${line.quantity!.toStringAsFixed(line.quantity == line.quantity!.roundToDouble() ? 0 : 2)}',
              if (line.unitPrice != null) 'PU ${moneyFmt.format(line.unitPrice)}',
              if (line.totalTtc != null) 'TTC ${moneyFmt.format(line.totalTtc)}',
            ].whereType<String>().join(' • '),
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReclamationLinkTile extends StatelessWidget {
  final AdminOrderReclamationLink link;
  final DateFormat dateFmt;

  const _ReclamationLinkTile({required this.link, required this.dateFmt});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final isReclamation = link.typeCas == 'RECLAMATION';
    final typeBg = isReclamation
        ? const Color(0x1FEF4444)
        : const Color(0x1F8B5CF6);
    final typeFg = isReclamation
        ? const Color(0xFFB91C1C)
        : const Color(0xFF6D28D9);
    final typeLabel = isReclamation ? 'RÉCLAMATION' : 'DEMANDE';

    final statutVisual = _statutVisual(link.statut);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: scheme.outlineVariant.withOpacity(0.5)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8, vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: typeBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(typeLabel,
                    style: TextStyle(
                      color: typeFg,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.4,
                    )),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(link.code,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    )),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8, vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: statutVisual.$2,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(statutVisual.$1,
                    style: TextStyle(
                      color: statutVisual.$3,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    )),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(_motifLabel(link.motif),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              )),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.schedule_rounded,
                  size: 13, color: scheme.onSurfaceVariant),
              const SizedBox(width: 4),
              Text(dateFmt.format(link.createdAt),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  )),
              const SizedBox(width: 12),
              Icon(
                link.source == 'CLIENT'
                    ? Icons.person_rounded
                    : Icons.local_shipping_rounded,
                size: 13,
                color: scheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Text(link.source == 'CLIENT' ? 'Client' : 'Livreur',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  )),
              if (!link.visibleClient && link.typeCas == 'DEMANDE') ...[
                const SizedBox(width: 12),
                Icon(Icons.visibility_off_rounded,
                    size: 13, color: scheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Text('Interne',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    )),
              ],
            ],
          ),
        ],
      ),
    );
  }

  /// Retourne (label, bgColor, fgColor) pour le pill de statut.
  (String, Color, Color) _statutVisual(String s) {
    switch (s) {
      case 'ENVOYEE':
        return ('Envoyée', const Color(0x1F3B82F6), const Color(0xFF1D4ED8));
      case 'EN_COURS_DE_TRAITEMENT':
        return ('En cours', const Color(0x1FF59E0B), const Color(0xFFB45309));
      case 'CLOTUREE':
        return ('Clôturée', const Color(0x1F22C55E), const Color(0xFF15803D));
      case 'REFUSEE':
        return ('Refusée', const Color(0x1FEF4444), const Color(0xFFB91C1C));
      default:
        return (s, const Color(0x1F6B7280), const Color(0xFF374151));
    }
  }

  String _motifLabel(String motif) {
    switch (motif) {
      case 'CHANGEMENT_ADRESSE': return 'Changement d\'adresse';
      case 'CHANGEMENT_NUMERO': return 'Changement de numéro';
      case 'ANNULATION': return 'Demande d\'annulation';
      case 'REPROGRAMMATION': return 'Demande de reprogrammation';
      case 'COLIS_NON_RECU': return 'Colis non reçu';
      case 'COLIS_ENDOMMAGE': return 'Colis endommagé';
      case 'COLIS_NON_CORRESPONDANT': return 'Colis non correspondant';
      case 'ADRESSE_INCORRECTE': return 'Adresse incorrecte';
      case 'NUMERO_INCORRECT': return 'Numéro incorrect';
      case 'REFUS_CLIENT': return 'Refus client';
      case 'AUTRE_INCIDENT': return 'Autre incident';
      case 'TELEPHONE_FERME': return 'Téléphone fermé';
      case 'CLIENT_NON_JOIGNABLE': return 'Client non joignable';
      case 'CLIENT_ABSENT': return 'Client absent';
      default: return motif;
    }
  }
}

extension _StringEmpty on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}

// =============================================================================
// Historique commande : fetch live via /api/confirmatrice/orders/{piece}/history
// et rendu via OrderTimelineList (même composant que confirmatrice / livreur).
// =============================================================================
class _OrderHistorySection extends StatefulWidget {
  final String piece;
  final Color accent;
  const _OrderHistorySection({required this.piece, required this.accent});

  @override
  State<_OrderHistorySection> createState() => _OrderHistorySectionState();
}

class _OrderHistorySectionState extends State<_OrderHistorySection> {
  List<LivreurOrderHistoryItem>? _items;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      final svc = ConfirmatriceOrderHistoryService(api);
      final items = await svc.fetch(widget.piece);
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  static OrderTimelineEvent _mapEvent(LivreurOrderHistoryItem h) {
    final visual = _visualForBackendCode(h.statusCode);
    final desc = [
      if ((h.motif ?? '').trim().isNotEmpty) 'Motif: ${h.motif!.trim()}',
      if ((h.note ?? '').trim().isNotEmpty) h.note!.trim(),
    ].join(' · ');
    return OrderTimelineEvent(
      date: h.at,
      label: h.statusLabel ?? visual.label,
      color: visual.color,
      icon: visual.icon,
      description: desc.isEmpty ? null : desc,
      actor: h.updatedBy,
    );
  }

  static ({Color color, IconData icon, String label}) _visualForBackendCode(int c) {
    switch (c) {
      case 0:
        return (
          color: const Color(0xFF6366F1),
          icon: Icons.check_circle_outline_rounded,
          label: 'Confirmée',
        );
      case 1:
        return (
          color: const Color(0xFF0EA5E9),
          icon: Icons.local_shipping_rounded,
          label: 'En livraison',
        );
      case 2:
        return (
          color: const Color(0xFF22C55E),
          icon: Icons.check_circle_rounded,
          label: 'Livrée',
        );
      case 3:
        return (
          color: const Color(0xFFEF4444),
          icon: Icons.undo_rounded,
          label: 'Retournée',
        );
      case 4:
        return (
          color: const Color(0xFFA855F7),
          icon: Icons.warehouse_rounded,
          label: 'Au dépôt',
        );
      case 5:
        return (
          color: const Color(0xFFF97316),
          icon: Icons.event_repeat_rounded,
          label: 'Reportée',
        );
      case 6:
        return (
          color: const Color(0xFFEA580C),
          icon: Icons.inventory_2_rounded,
          label: 'Dépôt — en préparation',
        );
      case 7:
        return (
          color: const Color(0xFF22C55E),
          icon: Icons.task_alt_rounded,
          label: 'Dépôt — prête',
        );
      default:
        return (
          color: const Color(0xFF6B7280),
          icon: Icons.timeline_rounded,
          label: 'Étape',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SkeletonBlock(height: 90);
    }
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            const Icon(Icons.error_outline,
                size: 16, color: Color(0xFFEF4444)),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'Historique indisponible : $_error',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF991B1B),
                ),
              ),
            ),
            TextButton(onPressed: _load, child: const Text('Réessayer')),
          ],
        ),
      );
    }
    final items = _items ?? const [];
    final events = items.map(_mapEvent).toList();
    return OrderTimelineList(
      events: events,
      accentColor: widget.accent,
      accentDark: Color.lerp(widget.accent, Colors.black, 0.25) ?? widget.accent,
      showHeader: false,
      padding: const EdgeInsets.all(12),
    );
  }
}
