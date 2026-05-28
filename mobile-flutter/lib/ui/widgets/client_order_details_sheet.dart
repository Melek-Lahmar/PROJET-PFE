import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import '../../core/utils/formatters.dart';
import '../../models/customer_order.dart';
import '../widgets/common/app_card.dart';
import 'customer_order_status_badge.dart';

class ClientOrderDetailsSheet extends StatelessWidget {
  final CustomerOrder order;

  const ClientOrderDetailsSheet({
    super.key,
    required this.order,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenPadding,
          8,
          AppSpacing.screenPadding,
          AppSpacing.xxl,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Commande ${order.piece}',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                CustomerOrderStatusBadge(
                  status: order.normalizedStatus,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Créée le ${AppFormatters.dateTime(order.date)}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionTitle(title: 'Informations générales'),
                  const SizedBox(height: AppSpacing.md),
                  _InfoRow(label: 'Type de livraison', value: order.deliveryType),
                  _InfoRow(label: 'Mode de paiement', value: order.paymentMethod),
                  _InfoRow(label: 'Ville', value: order.city),
                  _InfoRow(label: 'Adresse', value: order.address),
                  _InfoRow(label: 'Code postal', value: order.postalCode),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionTitle(title: 'Articles'),
                  const SizedBox(height: AppSpacing.md),
                  if (order.lines.isEmpty)
                    Text(
                      'Aucune ligne disponible.',
                      style: theme.textTheme.bodyMedium,
                    )
                  else
                    ...order.lines.map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: _OrderLineTile(line: line),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionTitle(title: 'Montants'),
                  const SizedBox(height: AppSpacing.md),
                  _InfoRow(
                    label: 'Total HT',
                    value: '${order.totalHT.toStringAsFixed(3)} TND',
                  ),
                  _InfoRow(
                    label: 'Total TTC',
                    value: '${order.totalTTC.toStringAsFixed(3)} TND',
                  ),
                  _InfoRow(
                    label: 'Frais de livraison',
                    value: '${order.fraisLivraison.toStringAsFixed(3)} TND',
                  ),
                  _InfoRow(
                    label: 'Timbre fiscal',
                    value: '${order.timbreFiscal.toStringAsFixed(3)} TND',
                  ),
                  const Divider(),
                  _InfoRow(
                    label: 'Net à payer',
                    value: '${order.netAPayer.toStringAsFixed(3)} TND',
                    emphasized: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderLineTile extends StatelessWidget {
  final CustomerOrderLine line;

  const _OrderLineTile({
    required this.line,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            line.designation?.trim().isNotEmpty == true
                ? line.designation!
                : line.articleRef,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Réf: ${line.articleRef}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: Text('Qté: ${line.qty.toStringAsFixed(2)}'),
              ),
              Expanded(
                child: Text('PU: ${line.unitPrice.toStringAsFixed(3)} TND'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Montant TTC: ${line.amountTTC.toStringAsFixed(3)} TND',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? value;
  final bool emphasized;

  const _InfoRow({
    required this.label,
    required this.value,
    this.emphasized = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              (value == null || value!.trim().isEmpty) ? '--' : value!,
              textAlign: TextAlign.end,
              style: (emphasized
                      ? theme.textTheme.titleMedium
                      : theme.textTheme.bodyMedium)
                  ?.copyWith(
                fontWeight: emphasized ? FontWeight.w900 : FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
