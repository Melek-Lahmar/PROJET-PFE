import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/services/livreur_pool_service.dart';
import '../../../models/pool_commande.dart';
import '../../../state/livreur_pool_provider.dart';

/// Carte compacte d'une livraison du pool. Utilisée aussi bien dans
/// l'écran « À prendre » que dans « Mes livraisons ». L'appelant
/// fournit le libellé et l'action principale.
class PoolDeliveryCard extends StatelessWidget {
  final PoolCommande commande;
  final bool saving;
  final String actionLabel;
  final IconData actionIcon;
  final bool actionDestructive;
  final VoidCallback onAction;
  final VoidCallback? onDetail;

  const PoolDeliveryCard({
    super.key,
    required this.commande,
    required this.saving,
    required this.actionLabel,
    required this.actionIcon,
    required this.onAction,
    this.actionDestructive = false,
    this.onDetail,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isEch = commande.isEchange;

    return Card(
      elevation: 0,
      color: isEch ? scheme.errorContainer.withOpacity(0.25) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isEch ? scheme.error : scheme.outline.withOpacity(0.15),
          width: isEch ? 1.5 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isEch)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: scheme.error,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'ÉCHANGE',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 11,
                  ),
                ),
              ),
            if (isEch) const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: Text(
                  commande.doPiece,
                  style:
                      const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                ),
              ),
              Text(
                '${commande.netAPayer.toStringAsFixed(3)} TND',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ]),
            if (isEch) ...[
              const SizedBox(height: 10),
              _EchangeBlock(commande: commande),
            ],
            const SizedBox(height: 8),
            if (commande.clientDisplay != null)
              Text(
                'Client : ${commande.clientDisplay}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            if (commande.adresseLivraison != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.location_on_outlined,
                        size: 16, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        commande.adresseLivraison!,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 10),
            Row(
              children: [
                if (onDetail != null)
                  TextButton.icon(
                    onPressed: onDetail,
                    icon: const Icon(Icons.list_alt_rounded, size: 18),
                    label: const Text('Détails'),
                  ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: saving ? null : onAction,
                  icon: Icon(actionIcon),
                  label: Text(actionLabel),
                  style: actionDestructive
                      ? FilledButton.styleFrom(
                          backgroundColor: Colors.orange.withOpacity(0.15),
                          foregroundColor: Colors.orange.shade900,
                        )
                      : null,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EchangeBlock extends StatelessWidget {
  final PoolCommande commande;
  const _EchangeBlock({required this.commande});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (commande.commandeOriginalePiece != null)
            Text('Réf. originale : ${commande.commandeOriginalePiece}',
                style: Theme.of(context).textTheme.bodySmall),
          if (commande.echangeArticleRetour != null) ...[
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.undo_rounded, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'À récupérer : ${commande.echangeArticleRetour}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ],
          if (commande.echangeArticleLivraison != null) ...[
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.local_shipping_rounded, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'À livrer : ${commande.echangeArticleLivraison}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Feuille de détail d'une commande du pool. Extraite pour réutilisation
/// depuis les deux écrans (À prendre / Mes livraisons).
class PoolDeliveryDetailSheet extends StatefulWidget {
  final String doPiece;
  const PoolDeliveryDetailSheet({super.key, required this.doPiece});

  static Future<void> show(BuildContext context, String doPiece) {
    final provider = context.read<LivreurPoolProvider>();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => ChangeNotifierProvider.value(
        value: provider,
        child: PoolDeliveryDetailSheet(doPiece: doPiece),
      ),
    );
  }

  @override
  State<PoolDeliveryDetailSheet> createState() =>
      _PoolDeliveryDetailSheetState();
}

class _PoolDeliveryDetailSheetState extends State<PoolDeliveryDetailSheet> {
  CommandeDetail? _detail;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final provider = context.read<LivreurPoolProvider>();
      final detail = await provider.fetchDetail(widget.doPiece);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loading = false;
        if (detail == null) {
          _error = provider.error ?? 'Chargement impossible.';
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      builder: (ctx, scroll) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text('Erreur : $_error'))
                  : _buildContent(scroll),
        );
      },
    );
  }

  Widget _buildContent(ScrollController scroll) {
    final d = _detail!;
    return ListView(
      controller: scroll,
      padding: const EdgeInsets.all(16),
      children: [
        Row(children: [
          Expanded(
            child: Text(
              d.doPiece,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
            ),
          ),
          if (d.isEchange)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.error,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'ÉCHANGE',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 11,
                ),
              ),
            ),
        ]),
        if (d.commandeOriginalePiece != null) ...[
          const SizedBox(height: 6),
          Text('Commande originale : ${d.commandeOriginalePiece}',
              style: Theme.of(context).textTheme.bodySmall),
        ],
        const SizedBox(height: 16),
        if (d.clientDisplay != null)
          _DetailRow(label: 'Client', value: d.clientDisplay),
        if (d.clientPhone != null)
          _DetailRow(label: 'Téléphone', value: d.clientPhone),
        if (d.adresseLivraison != null)
          _DetailRow(label: 'Adresse', value: d.adresseLivraison),
        if (d.villeLivraison != null)
          _DetailRow(label: 'Ville', value: d.villeLivraison),
        _DetailRow(
            label: 'Net à payer', value: '${d.netAPayer.toStringAsFixed(3)} TND'),
        if (d.lignesStandard.isNotEmpty) ...[
          const SizedBox(height: 16),
          const Text('Articles commandés',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          const SizedBox(height: 8),
          ...d.lignesStandard.map((l) => _LigneTile(ligne: l)),
        ],
        if (d.lignesRetour.isNotEmpty) ...[
          const SizedBox(height: 16),
          Row(children: [
            Icon(Icons.undo_rounded, color: Theme.of(context).colorScheme.error),
            const SizedBox(width: 6),
            const Text('À RÉCUPÉRER',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          ]),
          const SizedBox(height: 8),
          ...d.lignesRetour.map((l) => _LigneTile(
                ligne: l,
                color: Theme.of(context).colorScheme.errorContainer.withOpacity(0.4),
              )),
        ],
        if (d.lignesLivraison.isNotEmpty) ...[
          const SizedBox(height: 16),
          Row(children: [
            Icon(Icons.local_shipping_rounded,
                color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 6),
            const Text('À LIVRER',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          ]),
          const SizedBox(height: 8),
          ...d.lignesLivraison.map((l) => _LigneTile(
                ligne: l,
                color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.4),
              )),
        ],
        const SizedBox(height: 20),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String? value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label,
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ),
          Expanded(
            child: Text(value ?? '-',
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _LigneTile extends StatelessWidget {
  final CommandeLigne ligne;
  final Color? color;
  const _LigneTile({required this.ligne, this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color ?? Colors.black.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ligne.designation ?? ligne.arRef,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                if ((ligne.designation ?? '').isNotEmpty)
                  Text(
                    'Réf : ${ligne.arRef}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('x${ligne.quantite.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w900)),
              if (ligne.prixUnitaire > 0)
                Text(
                  '${ligne.prixUnitaire.toStringAsFixed(3)} TND',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
            ],
          ),
        ],
      ),
    );
  }
}
