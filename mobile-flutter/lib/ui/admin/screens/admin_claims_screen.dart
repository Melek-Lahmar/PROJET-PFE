import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/admin_claims_overview.dart';
import '../../../models/admin_dashboard_overview.dart'
    show AdminKpi, AdminBreakdownItem;
import '../../../state/admin_claims_overview_provider.dart';
import '../../../state/admin_filters_provider.dart';
import '../../widgets/premium/animated_entry.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';
import '../widgets/admin_filter_bar.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/kpi_drill_down_resolver.dart' show KpiDomain;

const Color _kClaimAccent = Color(0xFFEF4444);
const Color _kRequestAccent = Color(0xFF8B5CF6);

class AdminClaimsScreen extends StatefulWidget {
  const AdminClaimsScreen({super.key});

  @override
  State<AdminClaimsScreen> createState() => _AdminClaimsScreenState();
}

class _AdminClaimsScreenState extends State<AdminClaimsScreen> {
  String? _lastGov;
  AdminPeriod? _lastPeriod;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh(force: true);
    });
  }

  void _maybeRefresh({bool force = false}) {
    final f = context.read<AdminFiltersProvider>();
    if (!force && _lastGov == f.gouvernorat && _lastPeriod == f.period) return;
    _lastGov = f.gouvernorat;
    _lastPeriod = f.period;
    context.read<AdminClaimsOverviewProvider>().refresh(
          governorate: f.gouvernorat,
          period: f.period,
        );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AdminFiltersProvider>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh();
    });
    return DefaultTabController(
      length: 2,
      child: Column(
        children: const [
          AdminFilterBar(),
          _ClaimsTabBar(),
          Expanded(child: _ClaimsTabsBody()),
        ],
      ),
    );
  }
}

class _ClaimsTabBar extends StatelessWidget {
  const _ClaimsTabBar();
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(
          bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.4)),
        ),
      ),
      child: TabBar(
        labelColor: scheme.primary,
        unselectedLabelColor: scheme.onSurfaceVariant,
        indicatorColor: scheme.primary,
        indicatorWeight: 3,
        labelStyle: const TextStyle(fontWeight: FontWeight.w900),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700),
        tabs: const [
          Tab(
            icon: Icon(Icons.report_problem_rounded, size: 18),
            text: 'Réclamations clients',
          ),
          Tab(
            icon: Icon(Icons.help_outline_rounded, size: 18),
            text: 'Demandes livreurs',
          ),
        ],
      ),
    );
  }
}

class _ClaimsTabsBody extends StatelessWidget {
  const _ClaimsTabsBody();
  @override
  Widget build(BuildContext context) {
    final prov = context.watch<AdminClaimsOverviewProvider>();
    if (prov.loading && prov.data == null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonBlock(height: 110),
          SizedBox(height: 12),
          SkeletonBlock(height: 200),
          SizedBox(height: 12),
          SkeletonBlock(height: 160),
        ],
      );
    }
    if (prov.error != null && prov.data == null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: PremiumCard(
          child: EmptyView(
            icon: Icons.cloud_off_rounded,
            title: 'Erreur',
            subtitle: prov.error!,
            ctaLabel: 'Réessayer',
            onCta: prov.reload,
          ),
        ),
      );
    }
    final d = prov.data;
    if (d == null) return const SizedBox.shrink();

    return TabBarView(
      children: [
        _CategoryView(
          data: d,
          typeCas: 'RECLAMATION',
          accent: _kClaimAccent,
          emptyText: 'Aucune réclamation client sur la période.',
          statusItems: d.claimsStatusBreakdown,
          motifItems: d.topClaimMotifs,
        ),
        _CategoryView(
          data: d,
          typeCas: 'DEMANDE',
          accent: _kRequestAccent,
          emptyText: 'Aucune demande livreur sur la période.',
          statusItems: d.requestsStatusBreakdown,
          motifItems: d.topRequestMotifs,
        ),
      ],
    );
  }
}

class _CategoryView extends StatelessWidget {
  final AdminClaimsOverview data;
  final String typeCas;
  final Color accent;
  final String emptyText;
  final List<AdminBreakdownItem> statusItems;
  final List<AdminBreakdownItem> motifItems;

  const _CategoryView({
    required this.data,
    required this.typeCas,
    required this.accent,
    required this.emptyText,
    required this.statusItems,
    required this.motifItems,
  });

  List<AdminKpi> get _filteredKpis {
    if (typeCas == 'RECLAMATION') {
      return data.kpis
          .where((k) => k.key != 'totalRequests' && k.key != 'demandes')
          .toList();
    }
    return data.kpis
        .where((k) => k.key != 'totalClaims' && k.key != 'claims')
        .toList();
  }

  List<AdminClaimRow> get _filteredCases =>
      data.unhandledCases.where((c) => c.typeCas == typeCas).toList();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<AdminClaimsOverviewProvider>();
    final cases = _filteredCases;
    final filteredByMotif = prov.motifFilter == null
        ? cases
        : cases.where((c) => c.motif == prov.motifFilter).toList();

    final motifs = cases
        .map((c) => c.motif)
        .where((m) => m.isNotEmpty)
        .toSet()
        .toList()
      ..sort();

    return RefreshIndicator(
      onRefresh: prov.reload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _CategoryBanner(typeCas: typeCas, accent: accent, total: cases.length),
          const SizedBox(height: 12),
          _Kpis(kpis: _filteredKpis),
          const SizedBox(height: 18),
          if (cases.isNotEmpty) ...[
            _SectionTitle(
              title: typeCas == 'RECLAMATION'
                  ? 'Cas non traités — clients'
                  : 'Cas non traités — livreurs',
              icon: Icons.priority_high_rounded,
              color: accent,
            ),
            if (motifs.isNotEmpty)
              _MotifChips(
                motifs: motifs,
                value: prov.motifFilter,
                onChanged: (m) => prov.setMotifFilter(m),
                accent: accent,
              ),
            const SizedBox(height: 8),
            if (filteredByMotif.isEmpty)
              _MutedText('Aucun cas pour ce motif.')
            else
              for (int i = 0; i < filteredByMotif.length; i++)
                EntryAnimation(
                  duration: const Duration(milliseconds: 320),
                  delay: Duration(milliseconds: 30 + i * 28),
                  slide: 12,
                  child: _UnhandledRow(row: filteredByMotif[i], accent: accent),
                ),
            const SizedBox(height: 18),
          ] else ...[
            PremiumCard(
              child: EmptyView(
                icon: Icons.inbox_rounded,
                title: 'Tout est traité',
                subtitle: emptyText,
              ),
            ),
            const SizedBox(height: 18),
          ],
          LayoutBuilder(
            builder: (ctx, c) {
              final wide = c.maxWidth >= 720;
              if (wide) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _BreakdownCard(
                        title: 'Statut',
                        items: statusItems,
                        accent: accent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _BreakdownCard(
                        title: 'Top motifs',
                        items: motifItems,
                        accent: accent,
                      ),
                    ),
                  ],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _BreakdownCard(
                    title: 'Statut', items: statusItems, accent: accent),
                  const SizedBox(height: 12),
                  _BreakdownCard(
                    title: 'Top motifs', items: motifItems, accent: accent),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          _BreakdownCard(
            title: 'Répartition par gouvernorat',
            items: data.governorateBreakdown,
            accent: accent,
          ),
        ],
      ),
    );
  }
}

class _CategoryBanner extends StatelessWidget {
  final String typeCas;
  final Color accent;
  final int total;
  const _CategoryBanner({
    required this.typeCas,
    required this.accent,
    required this.total,
  });
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent,
            Color.lerp(accent, Colors.black, 0.30) ?? accent,
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.30),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              typeCas == 'RECLAMATION'
                  ? Icons.report_problem_rounded
                  : Icons.help_outline_rounded,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  typeCas == 'RECLAMATION'
                      ? 'Réclamations clients'
                      : 'Demandes des livreurs',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  typeCas == 'RECLAMATION'
                      ? 'Suivi qualité service à la clientèle'
                      : 'Incidents terrain remontés depuis l’app livreur',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.20),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text('$total ouverts',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                )),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  const _SectionTitle({
    required this.title,
    required this.icon,
    required this.color,
  });
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Text(title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              )),
        ],
      ),
    );
  }
}

class _MotifChips extends StatelessWidget {
  final List<String> motifs;
  final String? value;
  final ValueChanged<String?> onChanged;
  final Color accent;
  const _MotifChips({
    required this.motifs,
    required this.value,
    required this.onChanged,
    required this.accent,
  });

  String _motifLabel(String motif) {
    switch (motif) {
      case 'CHANGEMENT_ADRESSE': return 'Changement d\'adresse';
      case 'CHANGEMENT_NUMERO': return 'Changement de numéro';
      case 'ANNULATION': return 'Annulation';
      case 'REPROGRAMMATION': return 'Reprogrammation';
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ChoiceChip(
              label: const Text('Tous'),
              selected: value == null,
              onSelected: (_) => onChanged(null),
              selectedColor: accent,
              labelStyle: TextStyle(
                color: value == null ? Colors.white : scheme.onSurface,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          for (final m in motifs)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ChoiceChip(
                label: Text(_motifLabel(m)),
                selected: value == m,
                onSelected: (_) => onChanged(value == m ? null : m),
                selectedColor: accent,
                labelStyle: TextStyle(
                  color: value == m ? Colors.white : scheme.onSurface,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Kpis extends StatelessWidget {
  final List<AdminKpi> kpis;
  const _Kpis({required this.kpis});

  @override
  Widget build(BuildContext context) {
    if (kpis.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (ctx, c) {
        final w = c.maxWidth;
        final cols = w >= 1200 ? 5 : w >= 900 ? 4 : w >= 600 ? 3 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            mainAxisExtent: 142,
          ),
          itemCount: kpis.length,
          itemBuilder: (_, i) {
            final k = kpis[i];
            final v = _visual(k.key);
            return AdminKpiCard(
              kpi: k,
              icon: v.$1,
              accent: v.$2,
              domain: KpiDomain.claims,
            );
          },
        );
      },
    );
  }

  (IconData, Color) _visual(String k) => switch (k) {
        'totalClaims' => (Icons.report_problem_rounded, const Color(0xFFEF4444)),
        'totalRequests' => (Icons.help_outline_rounded, const Color(0xFF8B5CF6)),
        'sent' => (Icons.send_rounded, const Color(0xFF3B82F6)),
        'inProgress' => (Icons.hourglass_top_rounded, const Color(0xFF0EA5E9)),
        'closed' => (Icons.check_circle_rounded, const Color(0xFF22C55E)),
        'refused' => (Icons.cancel_outlined, const Color(0xFFB91C1C)),
        'resolutionRate' => (Icons.percent_rounded, const Color(0xFF10B981)),
        'refusalRate' => (Icons.percent_rounded, const Color(0xFFF59E0B)),
        'unhandled' => (Icons.priority_high_rounded, const Color(0xFFB91C1C)),
        _ => (Icons.bar_chart_rounded, const Color(0xFF6B7280)),
      };
}

class _UnhandledRow extends StatelessWidget {
  final AdminClaimRow row;
  final Color accent;
  const _UnhandledRow({required this.row, required this.accent});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return PremiumCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 50,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [accent, accent.withValues(alpha: 0.4)],
              ),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.code,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    )),
                const SizedBox(height: 2),
                Text('Pièce ${row.doPiece} • ${row.motif}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    )),
                if (row.governorate != null)
                  Text(row.governorate!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      )),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: row.hoursOpen >= 24
                  ? const Color(0xFFEF4444).withValues(alpha: 0.12)
                  : const Color(0xFFF59E0B).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text('${row.hoursOpen}h',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: row.hoursOpen >= 24
                      ? const Color(0xFFB91C1C)
                      : const Color(0xFFB45309),
                )),
          ),
        ],
      ),
    );
  }
}

class _BreakdownCard extends StatelessWidget {
  final String title;
  final List<AdminBreakdownItem> items;
  final Color accent;
  const _BreakdownCard({
    required this.title,
    required this.items,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return PremiumCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w900,
              )),
          const SizedBox(height: 10),
          if (items.isEmpty)
            _MutedText('Aucune donnée.')
          else
            for (final it in items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(it.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          )),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 90,
                      height: 6,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: (it.percentage / 100).clamp(0.0, 1.0),
                          backgroundColor: scheme.surfaceContainerHighest,
                          valueColor: AlwaysStoppedAnimation(accent),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 76,
                      child: Text(
                        '${it.count} · ${it.percentage.toStringAsFixed(0)}%',
                        textAlign: TextAlign.right,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
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

class _MutedText extends StatelessWidget {
  final String text;
  const _MutedText(this.text);
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(text,
          style: theme.textTheme.bodySmall?.copyWith(
            color: scheme.onSurfaceVariant,
          )),
    );
  }
}
