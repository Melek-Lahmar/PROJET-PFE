import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/api_exception.dart';
import '../../../core/theme/app_status_palette.dart';
import '../../../data/services/refonte/transit_service.dart';
import '../../../state/auth_provider.dart';
import '../../../state/notification_preferences.dart';
import '../../../state/theme_provider.dart';
import '../../widgets/premium/action_tile.dart';
import '../../widgets/premium/premium_card.dart';
import 'transit_barcode_scanner_screen.dart';
import 'transit_mission_details_screen.dart';

// ─── Palette transit ─────────────────────────────────────────────────────────
class _TC {
  static const indigo     = Color(0xFF4F46E5);
  static const indigoDeep = Color(0xFF3730A3);
  static const indigoBg   = Color(0xFFEEF2FF);
  static const amber      = Color(0xFFF59E0B);
  static const amberBg    = Color(0xFFFFFBEB);
  static const blue       = Color(0xFF2563EB);
  static const blueBg     = Color(0xFFEFF6FF);
  static const green      = Color(0xFF16A34A);
  static const greenBg    = Color(0xFFF0FDF4);
  static const red        = Color(0xFFDC2626);
  static const redBg      = Color(0xFFFEF2F2);
  static const grey       = Color(0xFF6B7280);
}

// ─── Root screen ─────────────────────────────────────────────────────────────

class TransitHomeScreen extends StatefulWidget {
  final ApiClient api;
  const TransitHomeScreen({super.key, required this.api});

  @override
  State<TransitHomeScreen> createState() => _TransitHomeScreenState();
}

class _TransitHomeScreenState extends State<TransitHomeScreen> {
  late final TransitService _service;
  int _index = 0;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _missions = const [];

  static const _tabs = ['À prendre', 'En cours', 'Historique', 'Profil'];

  @override
  void initState() {
    super.initState();
    _service = TransitService(widget.api);
    unawaited(_load());
  }

  Future<void> _load({bool showSpinner = true}) async {
    if (_index == 3) return; // profil tab, rien à charger
    if (showSpinner) setState(() { _loading = true; _error = null; });
    try {
      final raw = await _service.myMissions();
      final missions = raw.map(_asMap).where((m) => m.isNotEmpty).toList();
      if (!mounted) return;
      setState(() { _missions = missions; _loading = false; _error = null; });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() { _loading = false; _error = e.displayMessage; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _loading = false; _error = 'Chargement impossible : $e'; });
    }
  }

  Future<void> _openDetails(Map<String, dynamic> mission) async {
    final id = _stringValue(mission, const ['id'], fallback: '');
    if (id.isEmpty) return;
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => TransitMissionDetailsScreen(
        service: _service,
        missionId: id,
        initialMission: mission,
      ),
    ));
    if (!mounted) return;
    await _load(showSpinner: false);
  }

  Future<void> _openScanner(Map<String, dynamic> mission) async {
    final id = _stringValue(mission, const ['id'], fallback: '');
    if (id.isEmpty) return;
    final result = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => TransitBarcodeScannerScreen(
        service: _service,
        missionId: id,
        articleRef: _stringValue(mission, const ['arRef', 'articleRef'], fallback: null),
      ),
    ));
    if (!mounted) return;
    if (result == true) await _load(showSpinner: false);
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Déconnexion'),
        content: const Text('Veux-tu vraiment te déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: _TC.red),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  int _countBucket(_TransitBucket b) =>
      _missions.where((m) => _bucketOf(m) == b).length;

  _TransitBucket get _currentBucket => switch (_index) {
    0 => _TransitBucket.waiting,
    1 => _TransitBucket.inProgress,
    _ => _TransitBucket.done,
  };

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthProvider>().session;
    final displayName = session?.displayName ?? '—';
    final initial = (displayName.isNotEmpty ? displayName[0] : 'T').toUpperCase();
    final scheme = Theme.of(context).colorScheme;
    final isProfileTab = _index == 3;

    return Scaffold(
      backgroundColor: scheme.surfaceContainerLowest,
      appBar: _buildAppBar(context, initial, displayName, isProfileTab, scheme),
      body: isProfileTab
          ? _TransitProfileTab(onLogout: _logout)
          : _buildMissionsBody(),
      bottomNavigationBar: _buildNav(scheme),
    );
  }

  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    String initial,
    String displayName,
    bool isProfileTab,
    ColorScheme scheme,
  ) {
    return PreferredSize(
      preferredSize: const Size.fromHeight(kToolbarHeight + 6),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_TC.indigo, _TC.indigoDeep],
          ),
          boxShadow: [
            BoxShadow(
              color: _TC.indigo.withValues(alpha: 0.35),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                // ── Logo / titre ──────────────────────────────────────────
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.swap_horiz_rounded,
                      color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _tabs[_index],
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: 0.2,
                        ),
                      ),
                      Text(
                        'Livreur Transit',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.72),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                // ── Refresh (tabs missions seulement) ─────────────────────
                if (_index < 3)
                  _AppBarIconBtn(
                    icon: Icons.refresh_rounded,
                    tooltip: 'Rafraîchir',
                    onTap: () => unawaited(_load()),
                  ),
                const SizedBox(width: 4),
                // ── Avatar / profil ───────────────────────────────────────
                GestureDetector(
                  onTap: () => setState(() => _index = 3),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.22),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.5),
                        width: 2,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      initial,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                // ── Bouton quitter ────────────────────────────────────────
                _AppBarIconBtn(
                  icon: Icons.logout_rounded,
                  tooltip: 'Se déconnecter',
                  onTap: _logout,
                  danger: true,
                ),
                const SizedBox(width: 4),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMissionsBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: _TC.indigo),
      );
    }
    if (_error != null) {
      return _ErrorState(message: _error!, onRetry: () => unawaited(_load()));
    }
    final visible = _missions
        .where((m) => _bucketOf(m) == _currentBucket)
        .toList();

    return RefreshIndicator(
      color: _TC.indigo,
      onRefresh: () => _load(showSpinner: false),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: visible.isEmpty ? 2 : visible.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _SummaryStrip(
                waiting: _countBucket(_TransitBucket.waiting),
                inProgress: _countBucket(_TransitBucket.inProgress),
                received: _countBucket(_TransitBucket.done),
              ),
            );
          }
          if (visible.isEmpty) return _EmptyBucket(bucket: _currentBucket);
          final mission = visible[index - 1];
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _MissionCard(
              mission: mission,
              onDetails: () => unawaited(_openDetails(mission)),
              onScan: _canScan(_stringValue(mission, const ['status']))
                  ? () => unawaited(_openScanner(mission))
                  : null,
            ),
          );
        },
      ),
    );
  }

  NavigationBar _buildNav(ColorScheme scheme) {
    final waiting = _countBucket(_TransitBucket.waiting);
    final inProgress = _countBucket(_TransitBucket.inProgress);
    return NavigationBar(
      selectedIndex: _index,
      onDestinationSelected: (i) {
        setState(() => _index = i);
        if (i < 3) unawaited(_load(showSpinner: false));
      },
      backgroundColor: scheme.surface,
      indicatorColor: _TC.indigoBg,
      destinations: [
        NavigationDestination(
          icon: Badge(
            isLabelVisible: waiting > 0,
            label: Text('$waiting'),
            child: const Icon(Icons.inventory_2_outlined),
          ),
          selectedIcon: Badge(
            isLabelVisible: waiting > 0,
            label: Text('$waiting'),
            child: const Icon(Icons.inventory_2, color: _TC.indigo),
          ),
          label: 'À prendre',
        ),
        NavigationDestination(
          icon: Badge(
            isLabelVisible: inProgress > 0,
            label: Text('$inProgress'),
            child: const Icon(Icons.local_shipping_outlined),
          ),
          selectedIcon: Badge(
            isLabelVisible: inProgress > 0,
            label: Text('$inProgress'),
            child: const Icon(Icons.local_shipping_rounded, color: _TC.indigo),
          ),
          label: 'En cours',
        ),
        const NavigationDestination(
          icon: Icon(Icons.history_rounded),
          selectedIcon: Icon(Icons.history_rounded, color: _TC.indigo),
          label: 'Historique',
        ),
        const NavigationDestination(
          icon: Icon(Icons.person_outline_rounded),
          selectedIcon: Icon(Icons.person_rounded, color: _TC.indigo),
          label: 'Profil',
        ),
      ],
    );
  }
}

// ─── AppBar icon button ───────────────────────────────────────────────────────

class _AppBarIconBtn extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool danger;

  const _AppBarIconBtn({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: danger
                ? Colors.red.withValues(alpha: 0.18)
                : Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: danger
                ? Colors.red.shade200
                : Colors.white,
            size: 20,
          ),
        ),
      ),
    );
  }
}

// ─── Summary strip ────────────────────────────────────────────────────────────

class _SummaryStrip extends StatelessWidget {
  final int waiting;
  final int inProgress;
  final int received;

  const _SummaryStrip({
    required this.waiting,
    required this.inProgress,
    required this.received,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _SummaryTile(
          label: 'À prendre',
          value: waiting,
          icon: Icons.inventory_2_outlined,
          color: _TC.amber,
          bg: _TC.amberBg,
        )),
        const SizedBox(width: 8),
        Expanded(child: _SummaryTile(
          label: 'En cours',
          value: inProgress,
          icon: Icons.local_shipping_outlined,
          color: _TC.blue,
          bg: _TC.blueBg,
        )),
        const SizedBox(width: 8),
        Expanded(child: _SummaryTile(
          label: 'Reçus',
          value: received,
          icon: Icons.done_all_rounded,
          color: _TC.green,
          bg: _TC.greenBg,
        )),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;
  final Color bg;

  const _SummaryTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.bg,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? color.withValues(alpha: 0.15) : bg,
        borderRadius: BorderRadius.circular(PremiumTokens.rLg),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 17, color: color),
          ),
          const SizedBox(height: 6),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: color.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Mission card ─────────────────────────────────────────────────────────────

class _MissionCard extends StatelessWidget {
  final Map<String, dynamic> mission;
  final VoidCallback onDetails;
  final VoidCallback? onScan;

  const _MissionCard({
    required this.mission,
    required this.onDetails,
    required this.onScan,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final status = _stringValue(mission, const ['status']);
    final doPiece = _stringValue(mission, const ['doPiece', 'commandeId']);
    final article = _stringValue(mission, const ['arRef', 'articleRef']);
    final srcName = _stringValue(mission, const ['sourceDepotName', 'sourceDepotNo']);
    final dstName = _stringValue(mission, const ['destinationDepotName', 'destinationDepotNo']);
    final statusColor = _statusColor(status);
    final canScan = onScan != null;

    return PremiumCard(
      onTap: onDetails,
      padding: const EdgeInsets.all(0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(PremiumTokens.rLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header coloré ──────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.07),
                border: Border(
                  bottom: BorderSide(
                    color: statusColor.withValues(alpha: 0.15),
                  ),
                  left: BorderSide(color: statusColor, width: 3),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.receipt_long_outlined,
                                size: 13,
                                color: scheme.onSurfaceVariant),
                            const SizedBox(width: 4),
                            Text(
                              doPiece,
                              style: theme.textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ],
                        ),
                        if (article.isNotEmpty && article != '-') ...[
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(Icons.inventory_2_outlined,
                                  size: 12,
                                  color: scheme.onSurfaceVariant),
                              const SizedBox(width: 4),
                              Text(
                                article,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  _StatusChip(status: status),
                ],
              ),
            ),

            // ── Route source → destination ────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Row(
                children: [
                  _DepotPin(name: srcName, color: _TC.amber),
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 2,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  _TC.amber.withValues(alpha: 0.6),
                                  _TC.indigo.withValues(alpha: 0.6),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const Icon(Icons.arrow_forward_rounded,
                            size: 14, color: _TC.indigo),
                      ],
                    ),
                  ),
                  _DepotPin(name: dstName, color: _TC.indigo, isEnd: true),
                ],
              ),
            ),

            // ── Actions ───────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onDetails,
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: scheme.outlineVariant,
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(PremiumTokens.rMd),
                        ),
                      ),
                      icon: const Icon(Icons.visibility_outlined, size: 16),
                      label: const Text('Détails'),
                    ),
                  ),
                  if (canScan) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: onScan,
                        style: FilledButton.styleFrom(
                          backgroundColor: _TC.indigo,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(PremiumTokens.rMd),
                          ),
                        ),
                        icon: const Icon(Icons.qr_code_scanner_rounded,
                            size: 16),
                        label: const Text('Scanner'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DepotPin extends StatelessWidget {
  final String name;
  final Color color;
  final bool isEnd;

  const _DepotPin({
    required this.name,
    required this.color,
    this.isEnd = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          isEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.warehouse_outlined, size: 11, color: color),
              const SizedBox(width: 3),
              Text(
                name.length > 10 ? '${name.substring(0, 10)}…' : name,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Empty bucket ─────────────────────────────────────────────────────────────

class _EmptyBucket extends StatelessWidget {
  final _TransitBucket bucket;
  const _EmptyBucket({required this.bucket});

  @override
  Widget build(BuildContext context) {
    final (icon, message, color) = switch (bucket) {
      _TransitBucket.waiting   => (Icons.inventory_2_outlined,   'Aucune mission à prendre pour l\'instant.', _TC.amber),
      _TransitBucket.inProgress => (Icons.local_shipping_outlined, 'Aucune mission en cours.',                  _TC.blue),
      _TransitBucket.done      => (Icons.done_all_rounded,        'Aucune mission terminée récemment.',         _TC.green),
    };

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 34, color: color.withValues(alpha: 0.7)),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Error state ──────────────────────────────────────────────────────────────

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: _TC.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.wifi_off_rounded,
                  size: 30, color: _TC.red),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onRetry,
              style: FilledButton.styleFrom(backgroundColor: _TC.indigo),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Status chip ──────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);
    final label = _statusLabel(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: color,
        ),
      ),
    );
  }
}

// ─── Profile tab ─────────────────────────────────────────────────────────────

class _TransitProfileTab extends StatelessWidget {
  final Future<void> Function() onLogout;
  const _TransitProfileTab({required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthProvider>().session;
    final prefs = context.watch<NotificationPreferences>();
    final themeProvider = context.watch<ThemeProvider>();

    final displayName = session?.displayName ?? '—';
    final email = session?.email ?? '—';
    final profile = session?.profile;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
      children: [
        // ── Hero identité ────────────────────────────────────────────────
        _TransitIdentityHero(displayName: displayName, email: email),
        const SizedBox(height: 20),

        // ── Stats missions ───────────────────────────────────────────────
        _SectionHeader(icon: Icons.bar_chart_rounded, title: 'Mes missions'),
        const SizedBox(height: 10),
        _TransitMiniStats(session: session),
        const SizedBox(height: 20),

        // ── Coordonnées ──────────────────────────────────────────────────
        if (profile != null) ...[
          _SectionHeader(
              icon: Icons.contact_phone_outlined,
              title: 'Mes coordonnées'),
          const SizedBox(height: 10),
          _CoordonneesCard(profile: profile, email: email),
          const SizedBox(height: 20),
        ],

        // ── Paramètres ───────────────────────────────────────────────────
        _SectionHeader(icon: Icons.settings_outlined, title: 'Paramètres'),
        const SizedBox(height: 10),
        PremiumCard(
          padding: const EdgeInsets.all(4),
          child: Column(
            children: [
              ActionTile(
                icon: prefs.soundEnabled
                    ? Icons.notifications_active_rounded
                    : Icons.notifications_off_rounded,
                label: prefs.soundEnabled
                    ? 'Notifications activées'
                    : 'Notifications muettes',
                subLabel: 'Son pour les événements système.',
                trailing: Switch(
                  value: prefs.soundEnabled,
                  activeColor: _TC.indigo,
                  onChanged: (v) =>
                      context.read<NotificationPreferences>().setSoundEnabled(v),
                ),
              ),
              const Divider(height: 1),
              ActionTile(
                icon: Icons.palette_outlined,
                label: 'Thème',
                subLabel: _themeLabel(themeProvider.themeMode),
                trailing: PopupMenuButton<ThemeMode>(
                  initialValue: themeProvider.themeMode,
                  onSelected: (m) =>
                      context.read<ThemeProvider>().setThemeMode(m),
                  itemBuilder: (_) => const [
                    PopupMenuItem(
                        value: ThemeMode.system, child: Text('Système')),
                    PopupMenuItem(
                        value: ThemeMode.light, child: Text('Clair')),
                    PopupMenuItem(
                        value: ThemeMode.dark, child: Text('Sombre')),
                  ],
                  icon: const Icon(Icons.chevron_right_rounded),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // ── Bouton déconnexion ───────────────────────────────────────────
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: onLogout,
            icon: Icon(Icons.logout_rounded,
                color: Theme.of(context).colorScheme.error),
            label: Text(
              'Se déconnecter',
              style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w700),
            ),
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                color: Theme.of(context).colorScheme.error.withValues(alpha: 0.35),
              ),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(PremiumTokens.rLg)),
            ),
          ),
        ),
      ],
    );
  }

  String _themeLabel(ThemeMode m) => switch (m) {
    ThemeMode.light  => 'Clair',
    ThemeMode.dark   => 'Sombre',
    ThemeMode.system => 'Système',
  };
}

// ─── Profile identity hero ────────────────────────────────────────────────────

class _TransitIdentityHero extends StatelessWidget {
  final String displayName;
  final String email;
  const _TransitIdentityHero({required this.displayName, required this.email});

  @override
  Widget build(BuildContext context) {
    final initial =
        (displayName.isNotEmpty ? displayName[0] : 'T').toUpperCase();
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PremiumTokens.rXl),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_TC.indigo, _TC.indigoDeep],
        ),
        boxShadow: [
          BoxShadow(
            color: _TC.indigo.withValues(alpha: 0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Stack(
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: Colors.white.withValues(alpha: 0.4), width: 2.5),
                ),
                alignment: Alignment.center,
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: Colors.greenAccent.shade400,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(Icons.mail_outline_rounded,
                        color: Colors.white70, size: 13),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: Colors.white70, fontSize: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.swap_horiz_rounded,
                          size: 13, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Livreur Transit',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
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
    );
  }
}

// ─── Mini stats transit (placeholder counts) ──────────────────────────────────

class _TransitMiniStats extends StatelessWidget {
  final dynamic session; // AuthSession?
  const _TransitMiniStats({required this.session});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.2,
      children: const [
        _MiniStatTile(
          icon: Icons.inventory_2_outlined,
          label: 'À prendre',
          color: _TC.amber,
          bg: _TC.amberBg,
        ),
        _MiniStatTile(
          icon: Icons.local_shipping_outlined,
          label: 'En transit',
          color: _TC.blue,
          bg: _TC.blueBg,
        ),
        _MiniStatTile(
          icon: Icons.done_all_rounded,
          label: 'Terminées',
          color: _TC.green,
          bg: _TC.greenBg,
        ),
        _MiniStatTile(
          icon: Icons.cancel_outlined,
          label: 'Annulées',
          color: _TC.red,
          bg: _TC.redBg,
        ),
      ],
    );
  }
}

class _MiniStatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color bg;

  const _MiniStatTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.bg,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return PremiumCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      color: isDark ? color.withValues(alpha: 0.1) : bg,
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Coordonnées card ─────────────────────────────────────────────────────────

class _CoordonneesCard extends StatelessWidget {
  final dynamic profile; // UserProfileSnapshot
  final String email;
  const _CoordonneesCard({required this.profile, required this.email});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PremiumCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _row(context, Icons.mail_outline_rounded, 'Email', email),
          if ((profile?.phone ?? '').isNotEmpty) ...[
            _divider(scheme),
            _row(context, Icons.phone_outlined, 'Téléphone', profile.phone,
                valueColor: Colors.green.shade700),
          ],
          if ((profile?.governorate ?? '').isNotEmpty) ...[
            _divider(scheme),
            _row(context, Icons.map_outlined, 'Gouvernorat',
                profile.governorate),
          ],
          if ((profile?.delegation ?? '').isNotEmpty) ...[
            _divider(scheme),
            _row(context, Icons.location_city_outlined, 'Délégation',
                profile.delegation),
          ],
          if ((profile?.address ?? '').isNotEmpty) ...[
            _divider(scheme),
            _row(context, Icons.place_outlined, 'Adresse', profile.address,
                wrap: true),
          ],
        ],
      ),
    );
  }

  Widget _divider(ColorScheme s) =>
      Divider(height: 18, color: s.outlineVariant.withValues(alpha: 0.4));

  Widget _row(
    BuildContext context,
    IconData icon,
    String label,
    String? value, {
    bool wrap = false,
    Color? valueColor,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment:
          wrap ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: _TC.indigo.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 15, color: _TC.indigo),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 90,
          child: Text(
            label,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value ?? '—',
            maxLines: wrap ? 3 : 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13,
              color: valueColor,
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: _TC.indigo.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 15, color: _TC.indigo),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
      ],
    );
  }
}

// ─── Enums and helpers ────────────────────────────────────────────────────────

enum _TransitBucket { waiting, inProgress, done }

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

_TransitBucket _bucketOf(Map<String, dynamic> mission) {
  final status = _stringValue(mission, const ['status']).toUpperCase();
  if (status == 'EN_TRANSIT' || status == 'EN_COURS_TRANSIT') {
    return _TransitBucket.inProgress;
  }
  if (status == 'RECU_AU_DEPOT' ||
      status == 'RECU_DEPOT_DESTINE' ||
      status == 'TRANSIT_TERMINE' ||
      status == 'ANNULE') {
    return _TransitBucket.done;
  }
  return _TransitBucket.waiting;
}

String _stringValue(
  Map<String, dynamic> item,
  List<String> keys, {
  String? fallback = '-',
}) {
  for (final key in keys) {
    final value = item[key];
    final text = value?.toString().trim();
    if (text != null && text.isNotEmpty) return text;
  }
  return fallback ?? '';
}

bool _canScan(String status) {
  final n = status.toUpperCase();
  return n == 'EN_ATTENTE_TRANSIT' ||
      n == 'EN_ATTENTE_AFFECTATION_TRANSIT' ||
      n == 'EN_TRANSIT' ||
      n == 'EN_COURS_TRANSIT';
}

String _statusLabel(String status) => switch (status.toUpperCase()) {
  'EN_ATTENTE_AFFECTATION_TRANSIT' => 'À affecter',
  'EN_ATTENTE_TRANSIT'             => 'À prendre',
  'EN_TRANSIT' || 'EN_COURS_TRANSIT' => 'En cours',
  'RECU_AU_DEPOT' || 'RECU_DEPOT_DESTINE' || 'TRANSIT_TERMINE' => 'Reçu',
  'ANNULE' => 'Annulé',
  _ => status.isEmpty ? 'Inconnu' : status,
};

Color _statusColor(String status) => switch (status.toUpperCase()) {
  'EN_ATTENTE_AFFECTATION_TRANSIT' || 'EN_ATTENTE_TRANSIT' => _TC.amber,
  'EN_TRANSIT' || 'EN_COURS_TRANSIT'                        => _TC.blue,
  'RECU_AU_DEPOT' || 'RECU_DEPOT_DESTINE' || 'TRANSIT_TERMINE' => _TC.green,
  'ANNULE' => _TC.red,
  _ => _TC.grey,
};
