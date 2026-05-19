import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../state/admin_filters_provider.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import 'admin_filter_bar.dart';

/// Layout type pour les onglets admin pas encore implémentés.
/// Affiche la barre de filtres en haut + un état vide premium au centre,
/// avec un récapitulatif des filtres actifs pour montrer que la mécanique
/// de scope global fonctionne.
class AdminSectionPlaceholder extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String comingFromStep;

  const AdminSectionPlaceholder({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.comingFromStep,
  });

  @override
  Widget build(BuildContext context) {
    final filters = context.watch<AdminFiltersProvider>();
    final theme = Theme.of(context);

    return Column(
      children: [
        const AdminFilterBar(),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _ScopeSummary(
                  gouvernorat: filters.gouvernorat,
                  period: filters.period.label,
                ),
                const SizedBox(height: 24),
                PremiumCard(
                  padding: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: EmptyView(
                      icon: icon,
                      title: title,
                      subtitle: subtitle,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    'Section livrée à l\'$comingFromStep.',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ScopeSummary extends StatelessWidget {
  final String? gouvernorat;
  final String period;

  const _ScopeSummary({
    required this.gouvernorat,
    required this.period,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return PremiumCard(
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: scheme.primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.tune_rounded, color: scheme.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Filtres actifs',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${gouvernorat ?? 'Tous gouvernorats'} • $period',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
