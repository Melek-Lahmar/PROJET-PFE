import 'package:flutter/material.dart';
import '../../models/delivery.dart';
import 'status_badge.dart';

class DeliveryCard extends StatelessWidget {
  final Delivery d;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool highlight;
  final bool isUrgent;
  final int? urgentRank;
  final String? footerText;
  final Widget? footer;

  const DeliveryCard({
    super.key,
    required this.d,
    this.trailing,
    this.onTap,
    this.highlight = false,
    this.isUrgent = false,
    this.urgentRank,
    this.footerText,
    this.footer,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final borderColor = highlight
        ? Colors.redAccent.withValues(alpha: .42)
        : scheme.outline.withValues(alpha: .24);

    final bg = highlight
        ? Colors.redAccent.withValues(alpha: .05)
        : scheme.surface;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Ink(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor),
          boxShadow: [
            BoxShadow(
              blurRadius: 18,
              offset: const Offset(0, 10),
              color: Colors.black.withValues(alpha: .05),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: scheme.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.local_shipping_outlined,
                      color: scheme.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          d.doPiece,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        StatusBadge(
                          statut: d.statut,
                          apiStatus: d.apiStatus,
                        ),
                        if (isUrgent)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Text(
                              urgentRank != null
                                  ? 'Urgent #$urgentRank'
                                  : 'Urgent',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Colors.red.shade900,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (trailing != null) ...[
                    const SizedBox(width: 8),
                    trailing!,
                  ],
                ],
              ),
              const SizedBox(height: 14),
              Text(
                d.adresse.isEmpty ? 'Adresse non renseignée' : d.adresse,
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              if (d.ville.isNotEmpty)
                Row(
                  children: [
                    Icon(
                      Icons.location_on_outlined,
                      size: 16,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        d.ville,
                        style: TextStyle(
                          fontSize: 13.5,
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              if (d.noteLivreur != null && d.noteLivreur!.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.surfaceVariant.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: scheme.outline.withValues(alpha: 0.22),
                    ),
                  ),
                  child: Text(
                    'Note: ${d.noteLivreur!}',
                    style: TextStyle(
                      fontSize: 13,
                      color: scheme.onSurfaceVariant,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
              if (footerText != null || footer != null) ...[
                const SizedBox(height: 14),
                Divider(
                  height: 1,
                  color: scheme.outline.withValues(alpha: 0.18),
                ),
                const SizedBox(height: 12),
                if (footer != null)
                  footer!
                else
                  Text(
                    footerText!,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}