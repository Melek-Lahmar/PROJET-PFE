import 'package:flutter/material.dart';

/// Pagination admin commandes : précédent / page courante sur total / suivant
/// + total entrées affichées. Compacte, modernes, accessible.
class AdminOrdersPagination extends StatelessWidget {
  final int page;
  final int totalPages;
  final int total;
  final int pageSize;
  final ValueChanged<int> onGoTo;

  const AdminOrdersPagination({
    super.key,
    required this.page,
    required this.totalPages,
    required this.total,
    required this.pageSize,
    required this.onGoTo,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final hasPrev = page > 1;
    final hasNext = page < totalPages;
    final start = total == 0 ? 0 : ((page - 1) * pageSize + 1);
    final end = (page * pageSize) > total ? total : page * pageSize;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(
          top: BorderSide(color: scheme.outlineVariant.withOpacity(0.4)),
        ),
      ),
      child: Row(
        children: [
          Text(
            total == 0
                ? 'Aucune commande'
                : '$start-$end sur $total',
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          IconButton.outlined(
            onPressed: hasPrev ? () => onGoTo(page - 1) : null,
            icon: const Icon(Icons.chevron_left_rounded),
            tooltip: 'Précédent',
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: scheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Page $page / ${totalPages == 0 ? 1 : totalPages}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.outlined(
            onPressed: hasNext ? () => onGoTo(page + 1) : null,
            icon: const Icon(Icons.chevron_right_rounded),
            tooltip: 'Suivant',
          ),
        ],
      ),
    );
  }
}
