import 'package:flutter/material.dart';

import '../../models/customer_order.dart';
import 'customer_order_status_badge.dart';

/// Carte commande client premium :
/// - bande latérale colorée selon statut
/// - gradient subtil de fond
/// - hover/press animés (scale + ombre tintée)
/// - footer CTA "Ouvrir le suivi" avec icône directionnelle
class ClientOrderCard extends StatefulWidget {
  final CustomerOrder order;
  final VoidCallback onTap;

  const ClientOrderCard({
    super.key,
    required this.order,
    required this.onTap,
  });

  @override
  State<ClientOrderCard> createState() => _ClientOrderCardState();
}

class _ClientOrderCardState extends State<ClientOrderCard> {
  bool _hover = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final accent = _accentForStatus(widget.order.normalizedStatus, scheme);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedScale(
        scale: _pressed ? 0.985 : 1.0,
        duration: const Duration(milliseconds: 120),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          decoration: BoxDecoration(
            color: theme.cardColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: _hover
                  ? accent.withValues(alpha: 0.45)
                  : scheme.outlineVariant.withValues(alpha: 0.5),
            ),
            boxShadow: [
              BoxShadow(
                color: _hover
                    ? accent.withValues(alpha: 0.18)
                    : Colors.black.withValues(alpha: 0.04),
                blurRadius: _hover ? 18 : 8,
                offset: Offset(0, _hover ? 8 : 3),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: widget.onTap,
              onTapDown: (_) => setState(() => _pressed = true),
              onTapCancel: () => setState(() => _pressed = false),
              onTapUp: (_) => setState(() => _pressed = false),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Stack(
                  children: [
                    Positioned(
                      left: 0, top: 0, bottom: 0,
                      child: Container(width: 5, color: accent),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(18, 16, 16, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Commande ${widget.order.piece}',
                                      style: theme.textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: -0.2,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(Icons.calendar_today_rounded,
                                            size: 12,
                                            color: scheme.onSurfaceVariant),
                                        const SizedBox(width: 5),
                                        Text(
                                          _formatDate(widget.order.date),
                                          style: theme.textTheme.bodySmall?.copyWith(
                                            color: scheme.onSurfaceVariant,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              CustomerOrderStatusBadge(
                                  status: widget.order.normalizedStatus),
                            ],
                          ),
                          const SizedBox(height: 14),
                          _InfoLine(
                            icon: Icons.location_on_rounded,
                            label: widget.order.addressLabel,
                            color: accent,
                          ),
                          const SizedBox(height: 6),
                          _InfoLine(
                            icon: Icons.local_shipping_outlined,
                            label: widget.order.deliveryTypeLabel,
                            color: scheme.onSurfaceVariant,
                          ),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  accent.withValues(alpha: 0.10),
                                  accent.withValues(alpha: 0.02),
                                ],
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                              ),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: accent.withValues(alpha: 0.18)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 32, height: 32,
                                  decoration: BoxDecoration(
                                    color: accent.withValues(alpha: 0.16),
                                    borderRadius: BorderRadius.circular(9),
                                  ),
                                  child: Icon(Icons.payments_rounded,
                                      color: accent, size: 18),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${widget.order.netAPayer.toStringAsFixed(3)} TND',
                                        style: theme.textTheme.titleSmall?.copyWith(
                                          fontWeight: FontWeight.w900,
                                          color: accent,
                                          letterSpacing: -0.3,
                                        ),
                                      ),
                                      Text(
                                        'Voir le suivi détaillé',
                                        style: theme.textTheme.bodySmall?.copyWith(
                                          color: scheme.onSurfaceVariant,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                AnimatedRotation(
                                  duration: const Duration(milliseconds: 220),
                                  turns: _hover ? 0.02 : 0,
                                  child: Container(
                                    width: 30, height: 30,
                                    decoration: BoxDecoration(
                                      color: accent,
                                      borderRadius: BorderRadius.circular(8),
                                      boxShadow: [
                                        BoxShadow(
                                          color: accent.withValues(alpha: 0.34),
                                          blurRadius: 8,
                                          offset: const Offset(0, 3),
                                        ),
                                      ],
                                    ),
                                    child: const Icon(
                                      Icons.arrow_forward_rounded,
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Color _accentForStatus(String status, ColorScheme scheme) {
    switch (status.trim().toUpperCase()) {
      case 'CONFIRME':
        return const Color(0xFF22C55E);
      case 'EN_LIVRAISON':
        return const Color(0xFF3B82F6);
      case 'LIVRE':
        return const Color(0xFF14B8A6);
      case 'REPORTE':
        return const Color(0xFFF59E0B);
      case 'RETOUR':
        return const Color(0xFF8B5CF6);
      case 'DEPOT':
        return const Color(0xFF92400E);
      case 'TENTATIVE':
        return const Color(0xFFFB923C);
      case 'REFUSE':
        return const Color(0xFFEF4444);
      case 'EN_ATTENTE':
      default:
        return scheme.primary;
    }
  }
}

class _InfoLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _InfoLine({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
          ),
        ),
      ],
    );
  }
}

String _formatDate(DateTime? date) {
  if (date == null) return '--';
  final d = date.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
}
