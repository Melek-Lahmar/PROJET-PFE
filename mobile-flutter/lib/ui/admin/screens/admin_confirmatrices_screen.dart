import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/admin_users_service.dart';
import '../../../models/admin_confirmatrice.dart';
import '../../../models/admin_dashboard_overview.dart' show AdminKpi;
import '../../../state/admin_confirmatrices_provider.dart';
import '../../../state/admin_filters_provider.dart';
import '../../widgets/premium/animated_entry.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';
import '../widgets/admin_filter_bar.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/admin_user_form_sheet.dart';
import '../widgets/kpi_drill_down_resolver.dart' show KpiDomain;
import 'admin_confirmatrices_work_stats_screen.dart';

const Color _kConfAccent = Color(0xFF6366F1);

class AdminConfirmatricesScreen extends StatefulWidget {
  const AdminConfirmatricesScreen({super.key});

  @override
  State<AdminConfirmatricesScreen> createState() =>
      _AdminConfirmatricesScreenState();
}

class _AdminConfirmatricesScreenState extends State<AdminConfirmatricesScreen> {
  AdminPeriod? _lastPeriod;
  late final TextEditingController _searchCtrl;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh(force: true);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _maybeRefresh({bool force = false}) {
    final f = context.read<AdminFiltersProvider>();
    if (!force && _lastPeriod == f.period) return;
    _lastPeriod = f.period;
    context.read<AdminConfirmatricesProvider>().refresh(period: f.period);
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AdminFiltersProvider>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeRefresh();
    });
    final prov = context.watch<AdminConfirmatricesProvider>();
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Stack(
      children: [
        Column(
          children: [
            const AdminFilterBar(),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
              color: scheme.surface,
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => const AdminConfirmatricesWorkStatsScreen(),
                  )),
                  icon: const Icon(Icons.timer_outlined),
                  label: const Text('Voir temps de pause / période'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _kConfAccent,
                    side: const BorderSide(color: _kConfAccent),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
              color: scheme.surface,
              child: TextField(
                controller: _searchCtrl,
                onChanged: prov.setSearch,
                decoration: InputDecoration(
                  hintText: 'Rechercher (nom, email, téléphone)…',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  isDense: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 12,
                  ),
                ),
              ),
            ),
            Expanded(child: _Body(prov: prov)),
          ],
        ),
        Positioned(
          right: 16,
          bottom: 16,
          child: _CreateConfFab(theme: theme),
        ),
      ],
    );
  }
}

class _CreateConfFab extends StatelessWidget {
  final ThemeData theme;
  const _CreateConfFab({required this.theme});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF4338CA)],
        ),
        boxShadow: [
          BoxShadow(
            color: _kConfAccent.withValues(alpha: 0.45),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(28),
          onTap: () async {
            final ok = await AdminUserFormSheet.show(
              context,
              role: 'CONFIRMATEUR',
              accent: _kConfAccent,
            );
            if (ok == true && context.mounted) {
              context.read<AdminConfirmatricesProvider>().reload();
            }
          },
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.person_add_alt_1_rounded, color: Colors.white),
                SizedBox(width: 8),
                Text('Nouvelle confirmatrice',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> _editConf(
    BuildContext context, AdminConfirmatriceListItem c) async {
  final ok = await AdminUserFormSheet.show(
    context,
    role: 'CONFIRMATEUR',
    accent: _kConfAccent,
    userId: c.userId,
    initialEmail: c.email,
    initialNomComplet: c.fullName,
    initialTelephone: c.phone,
    initialGouvernorat: c.governorate,
  );
  if (ok == true && context.mounted) {
    context.read<AdminConfirmatricesProvider>().reload();
  }
}

Future<void> _deleteConf(
    BuildContext context, AdminConfirmatriceListItem c) async {
  final name = c.fullName ?? c.email ?? '—';
  final confirmed = await showDeleteUserDialog(
    context,
    name: name,
    role: 'CONFIRMATEUR',
  );
  if (!confirmed || !context.mounted) return;
  try {
    final api = context.read<ApiClient>();
    await AdminUsersService(api).deleteUser(c.userId);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Compte « $name » supprimé.'),
        backgroundColor: const Color(0xFF22C55E),
      ),
    );
    context.read<AdminConfirmatricesProvider>().reload();
  } catch (e) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Suppression échouée : ${e.toString().replaceFirst('Exception: ', '')}'),
        backgroundColor: const Color(0xFFEF4444),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  final AdminConfirmatricesProvider prov;
  const _Body({required this.prov});

  @override
  Widget build(BuildContext context) {
    if (prov.loading && prov.data == null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (int i = 0; i < 5; i++) ...[
            const SkeletonBlock(height: 90),
            const SizedBox(height: 10),
          ],
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
    final data = prov.data;
    if (data == null) return const SizedBox.shrink();

    return RefreshIndicator(
      onRefresh: prov.reload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (prov.refreshing)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          _Kpis(kpis: data.kpis),
          const SizedBox(height: 18),
          if (data.items.isEmpty)
            const PremiumCard(
              child: EmptyView(
                icon: Icons.support_agent_rounded,
                title: 'Aucune confirmatrice',
                subtitle: 'Aucune confirmatrice ne correspond aux filtres.',
              ),
            )
          else
            for (int i = 0; i < data.items.length; i++)
              EntryAnimation(
                duration: const Duration(milliseconds: 320),
                delay: Duration(milliseconds: 30 + i * 28),
                slide: 12,
                child: _ConfRow(
                  item: data.items[i],
                  onTap: () => _ConfDetailDrawer.show(
                      context,
                      data.items[i].userId,
                      data.items[i].fullName ?? data.items[i].email ?? '—'),
                  onEdit: () => _editConf(context, data.items[i]),
                  onDelete: () => _deleteConf(context, data.items[i]),
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
        final cols = w >= 1200 ? 6 : w >= 900 ? 4 : w >= 600 ? 3 : 2;
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
              domain: KpiDomain.confirmatrices,
            );
          },
        );
      },
    );
  }

  (IconData, Color) _visual(String key) => switch (key) {
        'confirmatrices' => (Icons.support_agent_rounded, const Color(0xFF6366F1)),
        'online' => (Icons.wifi_rounded, const Color(0xFF22C55E)),
        'paused' => (Icons.pause_circle_rounded, const Color(0xFFF59E0B)),
        'claims' => (Icons.report_problem_rounded, const Color(0xFFEF4444)),
        'requests' => (Icons.help_outline_rounded, const Color(0xFF0EA5E9)),
        'resolutionRate' => (Icons.percent_rounded, const Color(0xFF10B981)),
        _ => (Icons.bar_chart_rounded, const Color(0xFF6B7280)),
      };
}

class _ConfRow extends StatelessWidget {
  final AdminConfirmatriceListItem item;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _ConfRow({
    required this.item,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final initials = (item.fullName ?? item.email ?? '?')
        .split(RegExp(r'\s+'))
        .where((s) => s.isNotEmpty)
        .take(2)
        .map((s) => s[0].toUpperCase())
        .join();

    return PremiumCard(
      margin: const EdgeInsets.only(bottom: 10),
      onTap: onTap,
      child: Row(
        children: [
          Stack(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.15),
                child: Text(initials,
                    style: const TextStyle(
                      color: Color(0xFF4F46E5),
                      fontWeight: FontWeight.w900,
                    )),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: item.online
                        ? const Color(0xFF22C55E)
                        : (item.inPause
                            ? const Color(0xFFF59E0B)
                            : const Color(0xFF9CA3AF)),
                    shape: BoxShape.circle,
                    border: Border.all(color: scheme.surface, width: 2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.fullName ?? item.email ?? '—',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    )),
                if (item.phone != null)
                  Text(item.phone!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      )),
                if (item.governorate != null)
                  Text(item.governorate!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      )),
              ],
            ),
          ),
          Expanded(
            flex: 5,
            child: Wrap(
              spacing: 6, runSpacing: 4,
              children: [
                _Stat('Récl. ${item.claimsTotal}', const Color(0xFFEF4444)),
                _Stat('En cours ${item.claimsInProgress + item.requestsInProgress}', const Color(0xFF0EA5E9)),
                _Stat('Clôt. ${item.claimsClosed + item.requestsClosed}', const Color(0xFF22C55E)),
                _Stat('Refus ${item.claimsRefused + item.requestsRefused}', const Color(0xFFB91C1C)),
                _Stat('Dem. ${item.requestsTotal}', const Color(0xFF8B5CF6)),
              ],
            ),
          ),
          PopupMenuButton<String>(
            tooltip: 'Actions',
            icon: Icon(Icons.more_vert_rounded,
                color: scheme.onSurfaceVariant.withValues(alpha: 0.8)),
            onSelected: (v) {
              switch (v) {
                case 'edit': onEdit(); break;
                case 'delete': onDelete(); break;
                case 'open': onTap(); break;
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'open',
                child: Row(children: [
                  Icon(Icons.visibility_rounded, size: 18),
                  SizedBox(width: 10),
                  Text('Voir détails'),
                ]),
              ),
              PopupMenuItem(
                value: 'edit',
                child: Row(children: [
                  Icon(Icons.edit_rounded, size: 18),
                  SizedBox(width: 10),
                  Text('Modifier'),
                ]),
              ),
              PopupMenuDivider(),
              PopupMenuItem(
                value: 'delete',
                child: Row(children: [
                  Icon(Icons.delete_outline_rounded,
                      size: 18, color: Color(0xFFB91C1C)),
                  SizedBox(width: 10),
                  Text('Supprimer',
                      style: TextStyle(color: Color(0xFFB91C1C))),
                ]),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String text;
  final Color color;
  const _Stat(this.text, this.color);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text,
          style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w800, color: color,
          )),
    );
  }
}

class _ConfDetailDrawer extends StatelessWidget {
  final String title;
  const _ConfDetailDrawer({required this.title});

  static Future<void> show(BuildContext context, String userId, String title) async {
    final prov = context.read<AdminConfirmatricesProvider>();
    await prov.openDetail(userId);
    if (!context.mounted) return;
    await showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Fermer',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (_, __, ___) => const SizedBox.shrink(),
      transitionBuilder: (ctx, anim, _, __) => Align(
        alignment: Alignment.centerRight,
        child: SlideTransition(
          position: Tween(begin: const Offset(1, 0), end: Offset.zero)
              .animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
          child: ChangeNotifierProvider.value(
            value: prov,
            child: _ConfDetailDrawer(title: title),
          ),
        ),
      ),
    );
    prov.closeDetail();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final w = media.size.width;
    final drawerWidth = w >= 800 ? 480.0 : w * 0.92;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final prov = context.watch<AdminConfirmatricesProvider>();
    final dateFmt = DateFormat('dd MMM yyyy à HH:mm', 'fr_FR');

    return Material(
      color: scheme.surface,
      child: SafeArea(
        child: SizedBox(
          width: drawerWidth,
          height: media.size.height,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.5)),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38, height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.support_agent_rounded,
                          color: Color(0xFF4F46E5)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                          )),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: prov.detailLoading
                    ? const Center(child: CircularProgressIndicator())
                    : prov.detailError != null
                        ? EmptyView(
                            icon: Icons.cloud_off_rounded,
                            title: 'Erreur',
                            subtitle: prov.detailError!,
                          )
                        : prov.detail == null
                            ? const EmptyView(
                                icon: Icons.inbox_rounded,
                                title: 'Aucune donnée',
                                subtitle: 'La confirmatrice est introuvable.',
                              )
                            : _ConfDetailContent(
                                detail: prov.detail!, dateFmt: dateFmt,
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConfDetailContent extends StatelessWidget {
  final AdminConfirmatriceDetail detail;
  final DateFormat dateFmt;
  const _ConfDetailContent({required this.detail, required this.dateFmt});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Coordonnées',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        _Info('Email', detail.email ?? '—'),
        _Info('Téléphone', detail.phone ?? '—'),
        _Info('Gouvernorat', detail.governorate ?? '—'),
        _Info('Statut', detail.online ? 'En ligne' : (detail.inPause ? 'En pause' : 'Hors ligne')),
        _Info('Dernière activité',
            detail.lastActivityAt == null ? '—' : dateFmt.format(detail.lastActivityAt!)),
        _Info('Dernière attribution',
            detail.lastAssignmentAt == null ? '—' : dateFmt.format(detail.lastAssignmentAt!)),

        const SizedBox(height: 18),
        Text('KPIs',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8, runSpacing: 8,
          children: [
            for (final k in detail.kpis)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(k.label,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        )),
                    Text(k.formattedValue,
                        style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w900,
                          color: Color(0xFF4F46E5),
                        )),
                  ],
                ),
              ),
          ],
        ),

        const SizedBox(height: 18),
        Text('Cas récents',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        if (detail.recentCases.isEmpty)
          Text('Aucun cas sur la période.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ))
        else
          for (final r in detail.recentCases)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 4),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.5)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(r.code,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            )),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: r.typeCas == 'RECLAMATION'
                              ? const Color(0xFFEF4444).withValues(alpha: 0.12)
                              : const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(r.typeCas,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: r.typeCas == 'RECLAMATION'
                                  ? const Color(0xFFB91C1C)
                                  : const Color(0xFF6D28D9),
                            )),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text('Pièce ${r.doPiece} • ${r.motif}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      )),
                  Text('Statut : ${r.statut} • ${dateFmt.format(r.createdAt)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      )),
                ],
              ),
            ),
      ],
    );
  }
}

class _Info extends StatelessWidget {
  final String label;
  final String value;
  const _Info(this.label, this.value);
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
