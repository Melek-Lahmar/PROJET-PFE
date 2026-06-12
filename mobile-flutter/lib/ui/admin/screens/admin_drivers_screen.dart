import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/admin_users_service.dart';
import '../../../models/admin_dashboard_overview.dart' show AdminKpi;
import '../../../models/admin_driver.dart';
import '../../../state/admin_drivers_provider.dart';
import '../../../state/admin_filters_provider.dart';
import '../../widgets/premium/animated_entry.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';
import '../widgets/admin_filter_bar.dart';
import '../widgets/admin_kpi_card.dart';
import '../widgets/admin_user_form_sheet.dart';
import '../widgets/kpi_drill_down_resolver.dart' show KpiDomain;

const Color _kDriverAccent = Color(0xFF3B82F6);

class AdminDriversScreen extends StatefulWidget {
  const AdminDriversScreen({super.key});

  @override
  State<AdminDriversScreen> createState() => _AdminDriversScreenState();
}

class _AdminDriversScreenState extends State<AdminDriversScreen> {
  String? _lastGov;
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
    if (!force && _lastGov == f.gouvernorat && _lastPeriod == f.period) return;
    _lastGov = f.gouvernorat;
    _lastPeriod = f.period;
    context.read<AdminDriversProvider>().refresh(
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

    final prov = context.watch<AdminDriversProvider>();
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Stack(
      children: [
        Column(
          children: [
            const AdminFilterBar(),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              color: scheme.surface,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: prov.setSearch,
                      decoration: InputDecoration(
                        hintText: 'Rechercher (nom, email, téléphone)…',
                        prefixIcon:
                            const Icon(Icons.search_rounded, size: 20),
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
                ],
              ),
            ),
            Expanded(child: _Body(prov: prov)),
          ],
        ),
        Positioned(
          right: 16,
          bottom: 16,
          child: _CreateDriverFab(theme: theme),
        ),
      ],
    );
  }
}

class _CreateDriverFab extends StatelessWidget {
  final ThemeData theme;
  const _CreateDriverFab({required this.theme});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
        ),
        boxShadow: [
          BoxShadow(
            color: _kDriverAccent.withValues(alpha: 0.45),
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
            final created = await AdminUserFormSheet.show(
              context,
              role: 'LIVREUR',
              accent: _kDriverAccent,
            );
            if (created == true && context.mounted) {
              context.read<AdminDriversProvider>().reload();
            }
          },
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.person_add_alt_1_rounded, color: Colors.white),
                SizedBox(width: 8),
                Text('Nouveau livreur',
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

Future<void> _editDriver(BuildContext context, AdminDriverListItem d) async {
  final ok = await AdminUserFormSheet.show(
    context,
    role: 'LIVREUR',
    accent: _kDriverAccent,
    userId: d.userId,
    initialEmail: d.email,
    initialNomComplet: d.fullName,
    initialTelephone: d.phone,
    initialGouvernorat: d.governorate,
  );
  if (ok == true && context.mounted) {
    context.read<AdminDriversProvider>().reload();
  }
}

Future<void> _deleteDriver(
    BuildContext context, AdminDriverListItem d) async {
  final name = d.fullName ?? d.email ?? '—';
  final confirmed = await showDeleteUserDialog(
    context,
    name: name,
    role: 'LIVREUR',
  );
  if (!confirmed || !context.mounted) return;
  try {
    final api = context.read<ApiClient>();
    await AdminUsersService(api).deleteUser(d.userId);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Compte « $name » supprimé.'),
        backgroundColor: const Color(0xFF22C55E),
      ),
    );
    context.read<AdminDriversProvider>().reload();
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
  final AdminDriversProvider prov;
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
            title: 'Erreur de chargement',
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
          _DriverKpiGrid(kpis: data.kpis),
          const SizedBox(height: 18),
          if (data.items.isEmpty)
            const PremiumCard(
              child: EmptyView(
                icon: Icons.delivery_dining_rounded,
                title: 'Aucun livreur',
                subtitle: 'Aucun livreur ne correspond aux filtres.',
              ),
            )
          else
            for (int i = 0; i < data.items.length; i++)
              EntryAnimation(
                duration: const Duration(milliseconds: 320),
                delay: Duration(milliseconds: 30 + i * 28),
                slide: 12,
                child: _DriverRow(
                  driver: data.items[i],
                  onTap: () => _DriverDetailDrawer.show(
                      context,
                      data.items[i].userId,
                      data.items[i].fullName ?? data.items[i].email ?? '—'),
                  onEdit: () => _editDriver(context, data.items[i]),
                  onDelete: () => _deleteDriver(context, data.items[i]),
                ),
              ),
        ],
      ),
    );
  }
}

class _DriverKpiGrid extends StatelessWidget {
  final List<AdminKpi> kpis;
  const _DriverKpiGrid({required this.kpis});

  @override
  Widget build(BuildContext context) {
    if (kpis.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (ctx, c) {
        final w = c.maxWidth;
        final cols = w >= 1200
            ? 6
            : w >= 900
                ? 4
                : w >= 600
                    ? 3
                    : 2;
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
              domain: KpiDomain.drivers,
            );
          },
        );
      },
    );
  }

  (IconData, Color) _visual(String key) {
    switch (key) {
      case 'drivers':
        return (Icons.people_rounded, const Color(0xFF3B82F6));
      case 'online':
        return (Icons.wifi_rounded, const Color(0xFF22C55E));
      case 'paused':
        return (Icons.pause_circle_rounded, const Color(0xFFF59E0B));
      case 'delivered':
        return (Icons.verified_rounded, const Color(0xFF22C55E));
      case 'returned':
        return (Icons.undo_rounded, const Color(0xFFEF4444));
      case 'deliveryRate':
        return (Icons.percent_rounded, const Color(0xFF10B981));
      default:
        return (Icons.bar_chart_rounded, const Color(0xFF6B7280));
    }
  }
}

class _DriverRow extends StatelessWidget {
  final AdminDriverListItem driver;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _DriverRow({
    required this.driver,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final initials = (driver.fullName ?? driver.email ?? '?')
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
                backgroundColor: scheme.primary.withValues(alpha: 0.15),
                child: Text(initials,
                    style: TextStyle(
                      color: scheme.primary,
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
                    color: driver.online
                        ? const Color(0xFF22C55E)
                        : (driver.inPause
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
                Row(
                  children: [
                    Flexible(
                      child: Text(driver.fullName ?? driver.email ?? '—',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          )),
                    ),
                    if (driver.isTransit) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0EA5E9).withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Transit',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0369A1),
                            )),
                      ),
                    ],
                  ],
                ),
                if (driver.phone != null)
                  Text(driver.phone!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      )),
                if (driver.governorate != null)
                  Text(driver.governorate!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      )),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 5,
            child: driver.isTransit
                ? Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.local_shipping_rounded,
                              size: 14, color: Color(0xFF0369A1)),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text('Stats dans l’onglet Transit',
                                maxLines: 2,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF0369A1)
                                      .withValues(alpha: 0.9),
                                )),
                          ),
                        ],
                      ),
                    ),
                  )
                : Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _Stat(label: 'Total', value: driver.ordersTotal.toString(), color: scheme.primary),
                      _Stat(label: 'En cours', value: driver.ordersInProgress.toString(), color: const Color(0xFF0EA5E9)),
                      _Stat(label: 'Livrés', value: driver.ordersDelivered.toString(), color: const Color(0xFF22C55E)),
                      _Stat(label: 'Retours', value: driver.ordersReturned.toString(), color: const Color(0xFFEF4444)),
                      _Stat(label: 'Taux liv.', value: '${driver.deliveryRate.toStringAsFixed(0)}%', color: const Color(0xFF10B981)),
                      if (driver.claims > 0)
                        _Stat(label: 'Réclam.', value: driver.claims.toString(), color: const Color(0xFFB91C1C)),
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
  final String label;
  final String value;
  final Color color;
  const _Stat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$label ',
              style: TextStyle(fontSize: 10, color: color.withValues(alpha: 0.85))),
          Text(value,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: color,
              )),
        ],
      ),
    );
  }
}

class _DriverDetailDrawer extends StatelessWidget {
  final String title;
  const _DriverDetailDrawer({required this.title});

  static Future<void> show(BuildContext context, String userId, String title) async {
    final prov = context.read<AdminDriversProvider>();
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
            child: _DriverDetailDrawer(title: title),
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
    final prov = context.watch<AdminDriversProvider>();
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
                    bottom: BorderSide(
                      color: scheme.outlineVariant.withValues(alpha: 0.5),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.delivery_dining_rounded,
                          color: scheme.primary),
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
                                subtitle: 'Le livreur est introuvable.',
                              )
                            : _DetailContent(
                                detail: prov.detail!,
                                dateFmt: dateFmt,
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailContent extends StatelessWidget {
  final AdminDriverDetail detail;
  final DateFormat dateFmt;
  const _DetailContent({required this.detail, required this.dateFmt});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          children: [
            _StatusPill(
              text: detail.online ? 'En ligne' : 'Hors ligne',
              color: detail.online
                  ? const Color(0xFF22C55E)
                  : const Color(0xFF6B7280),
            ),
            if (detail.inPause) ...[
              const SizedBox(width: 8),
              const _StatusPill(text: 'En pause', color: Color(0xFFF59E0B)),
            ],
            if (detail.isTransit) ...[
              const SizedBox(width: 8),
              const _StatusPill(text: 'Transit', color: Color(0xFF0EA5E9)),
            ],
          ],
        ),
        const SizedBox(height: 16),
        Text('Coordonnées',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        _Info('Email', detail.email ?? '—'),
        _Info('Téléphone', detail.phone ?? '—'),
        _Info('CIN', detail.cin ?? '—'),
        _Info('Gouvernorat', detail.governorate ?? '—'),
        _Info('Délégation', detail.delegation ?? '—'),
        _Info('Adresse', detail.adresse ?? '—'),
        _Info('Dernière activité',
            detail.lastActivityAt == null ? '—' : dateFmt.format(detail.lastActivityAt!)),
        const SizedBox(height: 18),
        Text('KPIs (période sélectionnée)',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final k in detail.kpis)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.08),
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
                    const SizedBox(height: 2),
                    Text(k.formattedValue,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: scheme.primary,
                        )),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Text('Dernières livraisons',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        if (detail.recentDeliveries.isEmpty)
          Text('Aucune livraison sur la période.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ))
        else
          for (final d in detail.recentDeliveries)
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
                        child: Text(d.piece,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            )),
                      ),
                      _StatusPill(text: d.status, color: _statusColor(d.status)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      d.clientName,
                      d.ville,
                      dateFmt.format(d.createdAt),
                    ].whereType<String>().join(' • '),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
        const SizedBox(height: 16),
      ],
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'LIVRE':
        return const Color(0xFF22C55E);
      case 'RETOUR':
        return const Color(0xFFEF4444);
      case 'EN_LIVRAISON':
        return const Color(0xFF0EA5E9);
      case 'REPORTE':
        return const Color(0xFFF59E0B);
      case 'DEPOT':
        return const Color(0xFF6B7280);
      default:
        return const Color(0xFF3B82F6);
    }
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

class _StatusPill extends StatelessWidget {
  final String text;
  final Color color;
  const _StatusPill({required this.text, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          )),
    );
  }
}
