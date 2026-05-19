import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../models/admin_orders_page.dart';
import '../../../widgets/premium/premium_card.dart';

/// Ligne de la liste admin Commandes : numéro pièce, client, ville,
/// badges statut commande + statut livraison, montant, indicateur réclamation.
class AdminOrderRow extends StatelessWidget {
  final AdminOrderListItem item;
  final VoidCallback onTap;

  const AdminOrderRow({
    super.key,
    required this.item,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final dateFmt = DateFormat('dd MMM yyyy', 'fr_FR');
    final moneyFmt = NumberFormat.currency(
      locale: 'fr_FR', symbol: 'TND', decimalDigits: 3,
    );

    return PremiumCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
      onTap: onTap,
      child: Row(
        children: [
          // Bloc gauche : pièce + date + client
          Expanded(
            flex: 5,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.inventory_2_rounded,
                        size: 16, color: scheme.primary),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        item.piece,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    if (item.hasClaim) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.report_problem_rounded,
                                size: 11, color: Color(0xFFB91C1C)),
                            SizedBox(width: 3),
                            Text('Réclamation',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFFB91C1C),
                                )),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.clientName ?? item.tiers ?? '—',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (item.ville != null && item.ville!.isNotEmpty)
                      item.ville,
                    if (item.governorate != null &&
                        item.governorate!.isNotEmpty)
                      item.governorate,
                    if (item.date != null) dateFmt.format(item.date!),
                  ].whereType<String>().join(' • '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Bloc milieu : badges statut
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StatusBadge.fromOrderStatus(item.orderStatus),
                if (item.deliveryStatus != null) ...[
                  const SizedBox(height: 4),
                  _StatusBadge.fromDeliveryStatus(item.deliveryStatus!),
                ],
                if (item.livreurName != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.person_pin_rounded,
                          size: 13, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          item.livreurName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Bloc droite : montant + chevron
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                item.amount == null ? '—' : moneyFmt.format(item.amount),
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Icon(Icons.chevron_right_rounded,
                  color: scheme.onSurfaceVariant.withOpacity(0.6)),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color fg;
  final Color bg;

  const _StatusBadge({
    required this.label,
    required this.icon,
    required this.fg,
    required this.bg,
  });

  factory _StatusBadge.fromOrderStatus(String status) {
    switch (status) {
      case 'EN_ATTENTE':
        return const _StatusBadge(
          label: 'En attente',
          icon: Icons.schedule_rounded,
          fg: Color(0xFFB45309),
          bg: Color(0x1FF59E0B),
        );
      case 'CONFIRME':
        return const _StatusBadge(
          label: 'Confirmée',
          icon: Icons.check_circle_outline_rounded,
          fg: Color(0xFF1D4ED8),
          bg: Color(0x1F3B82F6),
        );
      case 'TENTATIVE':
        return const _StatusBadge(
          label: 'Tentative',
          icon: Icons.history_rounded,
          fg: Color(0xFF7C3AED),
          bg: Color(0x1F8B5CF6),
        );
      case 'REFUSE':
        return const _StatusBadge(
          label: 'Refusée',
          icon: Icons.cancel_outlined,
          fg: Color(0xFFB91C1C),
          bg: Color(0x1FEF4444),
        );
      default:
        return const _StatusBadge(
          label: 'Inconnu',
          icon: Icons.help_outline_rounded,
          fg: Color(0xFF6B7280),
          bg: Color(0x1F9CA3AF),
        );
    }
  }

  factory _StatusBadge.fromDeliveryStatus(String status) {
    switch (status) {
      case 'EN_LIVRAISON':
        return const _StatusBadge(
          label: 'En livraison',
          icon: Icons.local_shipping_rounded,
          fg: Color(0xFF1D4ED8),
          bg: Color(0x1F3B82F6),
        );
      case 'LIVRE':
        return const _StatusBadge(
          label: 'Livrée',
          icon: Icons.verified_rounded,
          fg: Color(0xFF15803D),
          bg: Color(0x1F22C55E),
        );
      case 'RETOUR':
        return const _StatusBadge(
          label: 'Retournée',
          icon: Icons.undo_rounded,
          fg: Color(0xFFB91C1C),
          bg: Color(0x1FEF4444),
        );
      case 'REPORTE':
        return const _StatusBadge(
          label: 'Reportée',
          icon: Icons.event_busy_rounded,
          fg: Color(0xFFB45309),
          bg: Color(0x1FF59E0B),
        );
      case 'DEPOT':
        return const _StatusBadge(
          label: 'Dépôt',
          icon: Icons.warehouse_rounded,
          fg: Color(0xFF6B7280),
          bg: Color(0x1F9CA3AF),
        );
      default:
        return const _StatusBadge(
          label: 'Confirmée',
          icon: Icons.check_circle_outline_rounded,
          fg: Color(0xFF1D4ED8),
          bg: Color(0x1F3B82F6),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
