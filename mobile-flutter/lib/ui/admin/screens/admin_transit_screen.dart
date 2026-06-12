import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/refonte/supervisor_service.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';

/// Onglet admin « Transit / Supervision ».
///
/// L'admin n'avait aucune visibilité sur l'activité du superviseur ni sur les
/// livreurs-transit (qui travaillent sur F_TRANSFERTS, pas sur F_LIVRAISONS, et
/// apparaissaient donc à 0 dans l'onglet « Livreurs »).
///
/// Réutilise les endpoints `/api/supervisor/*` : la policy backend
/// `RequireSupervisor` autorise déjà le rôle ADMIN, donc aucun changement
/// serveur n'est nécessaire.
class AdminTransitScreen extends StatefulWidget {
  const AdminTransitScreen({super.key});

  @override
  State<AdminTransitScreen> createState() => _AdminTransitScreenState();
}

class _AdminTransitScreenState extends State<AdminTransitScreen> {
  late final SupervisorService _service;
  late Future<_TransitOverview> _future;

  @override
  void initState() {
    super.initState();
    _service = SupervisorService(context.read<ApiClient>());
    _future = _load();
  }

  Future<_TransitOverview> _load() async {
    // Les 3 appels en parallèle pour minimiser la latence perçue.
    final results = await Future.wait([
      _service.stats(),
      _service.livreurs(),
      _service.transitMissions(),
    ]);
    return _TransitOverview(
      stats: results[0] as Map<String, dynamic>,
      livreurs: (results[1] as List).cast<dynamic>(),
      missions: (results[2] as List).cast<dynamic>(),
    );
  }

  Future<void> _refresh() async {
    final f = _load();
    setState(() => _future = f);
    await f;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<_TransitOverview>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return _buildSkeleton();
          }
          if (snap.hasError) {
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                PremiumCard(
                  child: EmptyView(
                    icon: Icons.cloud_off_rounded,
                    title: 'Impossible de charger le transit',
                    subtitle: snap.error
                        .toString()
                        .replaceFirst('Exception: ', ''),
                    ctaLabel: 'Réessayer',
                    onCta: _refresh,
                  ),
                ),
              ],
            );
          }
          return _Content(data: snap.data!);
        },
      ),
    );
  }

  Widget _buildSkeleton() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.6,
          children: List.generate(
            4,
            (_) => const SkeletonBlock(height: 110, borderRadius: 16),
          ),
        ),
        const SizedBox(height: 16),
        for (int i = 0; i < 4; i++) ...[
          const SkeletonBlock(height: 80, borderRadius: 16),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

/// Agrégat des 3 sources superviseur consommées par l'écran.
class _TransitOverview {
  final Map<String, dynamic> stats;
  final List<dynamic> livreurs;
  final List<dynamic> missions;

  const _TransitOverview({
    required this.stats,
    required this.livreurs,
    required this.missions,
  });

  /// Livreurs-transit uniquement (isTransit == true).
  List<Map<String, dynamic>> get transitDrivers => livreurs
      .whereType<Map>()
      .map((e) => e.cast<String, dynamic>())
      .where((e) => e['isTransit'] == true)
      .toList();
}

// ============================================================================
// Helpers statut transit
// ============================================================================
const _waitingStatuses = {
  'EN_ATTENTE_TRANSIT',
  'EN_ATTENTE_AFFECTATION_TRANSIT',
  'TRANSIT_REQUIS',
};
const _inTransitStatuses = {'EN_TRANSIT', 'EN_COURS_TRANSIT'};
const _receivedStatuses = {
  'RECU_AU_DEPOT',
  'RECU_DEPOT_DESTINE',
  'TRANSIT_TERMINE',
  'TRANSIT_PARTIELLEMENT_RECU',
};

Color _statusColor(String s) {
  if (_waitingStatuses.contains(s)) return const Color(0xFFF59E0B);
  if (_inTransitStatuses.contains(s)) return const Color(0xFF0EA5E9);
  if (_receivedStatuses.contains(s)) return const Color(0xFF22C55E);
  if (s == 'ANNULE') return const Color(0xFFEF4444);
  return const Color(0xFF6B7280);
}

String _statusLabel(String s) {
  switch (s) {
    case 'EN_ATTENTE_TRANSIT':
      return 'En attente';
    case 'EN_ATTENTE_AFFECTATION_TRANSIT':
      return 'À affecter';
    case 'TRANSIT_REQUIS':
      return 'Transit requis';
    case 'EN_TRANSIT':
    case 'EN_COURS_TRANSIT':
      return 'En transit';
    case 'RECU_AU_DEPOT':
    case 'RECU_DEPOT_DESTINE':
      return 'Reçu';
    case 'TRANSIT_TERMINE':
      return 'Terminé';
    case 'TRANSIT_PARTIELLEMENT_RECU':
      return 'Partiel';
    case 'ANNULE':
      return 'Annulé';
    default:
      return s;
  }
}

// ============================================================================
// Contenu
// ============================================================================
class _Content extends StatelessWidget {
  final _TransitOverview data;
  const _Content({required this.data});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final drivers = data.transitDrivers;

    // Compte les missions par livreur-transit pour les stats par livreur.
    final missionsByDriver = <String, List<Map<String, dynamic>>>{};
    for (final m in data.missions.whereType<Map>()) {
      final map = m.cast<String, dynamic>();
      final uid = (map['transitLivreurUserId'] ?? '').toString();
      if (uid.isEmpty) continue;
      missionsByDriver.putIfAbsent(uid, () => []).add(map);
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _StatsGrid(stats: data.stats),
        const SizedBox(height: 20),
        Text(
          'Livreurs transit (${drivers.length})',
          style: theme.textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 10),
        if (drivers.isEmpty)
          const PremiumCard(
            child: EmptyView(
              icon: Icons.local_shipping_rounded,
              title: 'Aucun livreur transit',
              subtitle: 'Aucun compte livreur-transit n\'est configuré.',
            ),
          )
        else
          for (final d in drivers)
            _TransitDriverRow(
              driver: d,
              missions: missionsByDriver[(d['id'] ?? '').toString()] ?? const [],
            ),
        const SizedBox(height: 20),
        Text(
          'Missions transit récentes',
          style: theme.textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 10),
        if (data.missions.isEmpty)
          const PremiumCard(
            child: EmptyView(
              icon: Icons.inbox_rounded,
              title: 'Aucune mission',
              subtitle: 'Aucun transfert en cours sur la période.',
            ),
          )
        else
          for (final m in data.missions.whereType<Map>().take(40))
            _MissionRow(mission: m.cast<String, dynamic>()),
      ],
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final Map<String, dynamic> stats;
  const _StatsGrid({required this.stats});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (ctx, c) {
        final cols = c.maxWidth >= 900 ? 4 : 2;
        final cards = [
          _MetricCard(
            label: 'En attente',
            value: stats['pending'],
            icon: Icons.schedule_rounded,
            color: const Color(0xFFF59E0B),
          ),
          _MetricCard(
            label: 'En transit',
            value: stats['inProgress'],
            icon: Icons.local_shipping_rounded,
            color: const Color(0xFF0EA5E9),
          ),
          _MetricCard(
            label: 'Reçus aujourd\'hui',
            value: stats['receivedToday'],
            icon: Icons.done_all_rounded,
            color: const Color(0xFF22C55E),
          ),
          _MetricCard(
            label: 'Bloqués >24h',
            value: stats['blocked24h'],
            icon: Icons.warning_amber_rounded,
            color: const Color(0xFFEF4444),
          ),
        ];
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            mainAxisExtent: 110,
          ),
          itemCount: cards.length,
          itemBuilder: (_, i) => cards[i],
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final dynamic value;
  final IconData icon;
  final Color color;
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return PremiumCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, color: color, size: 19),
          ),
          const SizedBox(height: 8),
          Text(
            '${value ?? 0}',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _TransitDriverRow extends StatelessWidget {
  final Map<String, dynamic> driver;
  final List<Map<String, dynamic>> missions;
  const _TransitDriverRow({required this.driver, required this.missions});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final total = missions.length;
    final inTransit = missions
        .where((m) => _inTransitStatuses.contains(m['status']))
        .length;
    final received =
        missions.where((m) => _receivedStatuses.contains(m['status'])).length;
    final waiting =
        missions.where((m) => _waitingStatuses.contains(m['status'])).length;

    final name = (driver['fullName'] ?? driver['email'] ?? '—').toString();
    final initials = name
        .split(RegExp(r'\s+'))
        .where((s) => s.isNotEmpty)
        .take(2)
        .map((s) => s[0].toUpperCase())
        .join();
    final depot = driver['depotRattacheName']?.toString();

    return PremiumCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: const Color(0xFF0EA5E9).withValues(alpha: 0.15),
            child: Text(
              initials.isEmpty ? '?' : initials,
              style: const TextStyle(
                color: Color(0xFF0369A1),
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w900)),
                if (driver['telephone'] != null)
                  Text(driver['telephone'].toString(),
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant)),
                if (depot != null && depot.isNotEmpty)
                  Text(depot,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 5,
            child: Wrap(
              spacing: 6,
              runSpacing: 4,
              alignment: WrapAlignment.end,
              children: [
                _Chip(label: 'Total', value: '$total', color: scheme.primary),
                _Chip(
                    label: 'Attente',
                    value: '$waiting',
                    color: const Color(0xFFF59E0B)),
                _Chip(
                    label: 'En transit',
                    value: '$inTransit',
                    color: const Color(0xFF0EA5E9)),
                _Chip(
                    label: 'Reçus',
                    value: '$received',
                    color: const Color(0xFF22C55E)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MissionRow extends StatelessWidget {
  final Map<String, dynamic> mission;
  const _MissionRow({required this.mission});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final status = (mission['status'] ?? '').toString();
    final piece = (mission['doPiece'] ?? '—').toString();
    final qte = mission['quantite'];
    final src = mission['sourceDepotNo'];
    final dst = mission['destinationDepotNo'];

    return PremiumCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(piece,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text(
                  [
                    if (qte != null) 'Qté $qte',
                    'Dépôt $src → $dst',
                  ].join(' • '),
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _statusColor(status).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _statusLabel(status),
              style: TextStyle(
                color: _statusColor(status),
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _Chip({required this.label, required this.value, required this.color});

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
              style:
                  TextStyle(fontSize: 10, color: color.withValues(alpha: 0.85))),
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
