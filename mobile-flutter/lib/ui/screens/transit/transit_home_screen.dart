import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/api_client.dart';
import '../../../core/api_exception.dart';
import '../../../data/services/refonte/transit_service.dart';
import 'transit_barcode_scanner_screen.dart';
import 'transit_mission_details_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _service = TransitService(widget.api);
    unawaited(_load());
  }

  Future<void> _load({bool showSpinner = true}) async {
    if (showSpinner) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final raw = await _service.myMissions();
      final missions = raw
          .map(_asMap)
          .where((item) => item.isNotEmpty)
          .toList();
      if (!mounted) return;
      setState(() {
        _missions = missions;
        _loading = false;
        _error = null;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.displayMessage;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Chargement impossible : $e';
      });
    }
  }

  Future<void> _openDetails(Map<String, dynamic> mission) async {
    final id = _stringValue(mission, const ['id'], fallback: '');
    if (id.isEmpty) return;

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TransitMissionDetailsScreen(
          service: _service,
          missionId: id,
          initialMission: mission,
        ),
      ),
    );

    if (!mounted) return;
    await _load(showSpinner: false);
  }

  Future<void> _openScanner(Map<String, dynamic> mission) async {
    final id = _stringValue(mission, const ['id'], fallback: '');
    if (id.isEmpty) return;

    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TransitBarcodeScannerScreen(
          service: _service,
          missionId: id,
          articleRef: _stringValue(mission, const [
            'arRef',
            'articleRef',
          ], fallback: null),
        ),
      ),
    );

    if (!mounted) return;
    if (result == true) {
      await _load(showSpinner: false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _missions
        .where((item) => _bucketOf(item) == _currentBucket)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Livreur transit'),
        actions: [
          IconButton(
            tooltip: 'Rafraîchir',
            onPressed: () => unawaited(_load()),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _ErrorState(message: _error!, onRetry: () => unawaited(_load()))
          : RefreshIndicator(
              onRefresh: () => _load(showSpinner: false),
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: visible.isEmpty ? 2 : visible.length + 1,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return _SummaryStrip(
                      waiting: _countBucket(_TransitBucket.waiting),
                      inProgress: _countBucket(_TransitBucket.inProgress),
                      received: _countBucket(_TransitBucket.done),
                    );
                  }
                  if (visible.isEmpty) {
                    return _EmptyBucket(bucket: _currentBucket);
                  }
                  final mission = visible[index - 1];
                  return _MissionCard(
                    mission: mission,
                    onDetails: () => unawaited(_openDetails(mission)),
                    onScan: _canScan(_stringValue(mission, const ['status']))
                        ? () => unawaited(_openScanner(mission))
                        : null,
                  );
                },
              ),
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.inventory_2_outlined),
            label: 'À prendre (${_countBucket(_TransitBucket.waiting)})',
          ),
          NavigationDestination(
            icon: const Icon(Icons.local_shipping_outlined),
            label: 'En cours (${_countBucket(_TransitBucket.inProgress)})',
          ),
          NavigationDestination(
            icon: const Icon(Icons.history_rounded),
            label: 'Historique (${_countBucket(_TransitBucket.done)})',
          ),
        ],
      ),
    );
  }

  _TransitBucket get _currentBucket {
    switch (_index) {
      case 0:
        return _TransitBucket.waiting;
      case 1:
        return _TransitBucket.inProgress;
      default:
        return _TransitBucket.done;
    }
  }

  int _countBucket(_TransitBucket bucket) =>
      _missions.where((item) => _bucketOf(item) == bucket).length;
}

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
        Expanded(
          child: _SummaryTile(
            label: 'À prendre',
            value: waiting,
            icon: Icons.inventory_2_outlined,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryTile(
            label: 'En cours',
            value: inProgress,
            icon: Icons.local_shipping_outlined,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryTile(
            label: 'Reçus',
            value: received,
            icon: Icons.done_all_rounded,
          ),
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;

  const _SummaryTile({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, size: 22, color: theme.colorScheme.primary),
            const SizedBox(height: 6),
            Text(
              '$value',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              label,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}

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
    final status = _stringValue(mission, const ['status']);
    final doPiece = _stringValue(mission, const ['doPiece', 'commandeId']);
    final article = _stringValue(mission, const ['arRef', 'articleRef']);
    final source = _stringValue(mission, const [
      'sourceDepotNo',
      'sourceDepotName',
    ]);
    final destination = _stringValue(mission, const [
      'destinationDepotNo',
      'destinationDepotName',
    ]);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onDetails,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$article · $doPiece',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Dépôt $source -> Dépôt $destination',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusChip(status: status),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: onDetails,
                    icon: const Icon(Icons.visibility_outlined),
                    label: const Text('Détails'),
                  ),
                  FilledButton.icon(
                    onPressed: onScan,
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Scanner'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyBucket extends StatelessWidget {
  final _TransitBucket bucket;

  const _EmptyBucket({required this.bucket});

  @override
  Widget build(BuildContext context) {
    final (icon, message) = switch (bucket) {
      _TransitBucket.waiting => (
        Icons.inventory_2_outlined,
        'Aucune mission à prendre.',
      ),
      _TransitBucket.inProgress => (
        Icons.local_shipping_outlined,
        'Aucune mission en cours.',
      ),
      _TransitBucket.done => (
        Icons.history_rounded,
        'Aucun historique transit.',
      ),
    };

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Icon(icon, size: 42),
          const SizedBox(height: 10),
          Text(message, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _statusColor(status);
    return Chip(
      label: Text(_statusLabel(status)),
      visualDensity: VisualDensity.compact,
      side: BorderSide(color: color.withValues(alpha: 0.45)),
      backgroundColor: color.withValues(alpha: 0.09),
      labelStyle: theme.textTheme.labelSmall?.copyWith(
        color: color,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 42),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

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
  final normalized = status.toUpperCase();
  return normalized == 'EN_ATTENTE_TRANSIT' ||
      normalized == 'EN_ATTENTE_AFFECTATION_TRANSIT' ||
      normalized == 'EN_TRANSIT' ||
      normalized == 'EN_COURS_TRANSIT';
}

String _statusLabel(String status) {
  switch (status.toUpperCase()) {
    case 'EN_ATTENTE_AFFECTATION_TRANSIT':
      return 'À affecter';
    case 'EN_ATTENTE_TRANSIT':
      return 'À prendre';
    case 'EN_TRANSIT':
    case 'EN_COURS_TRANSIT':
      return 'En cours';
    case 'RECU_AU_DEPOT':
    case 'RECU_DEPOT_DESTINE':
    case 'TRANSIT_TERMINE':
      return 'Reçu';
    case 'ANNULE':
      return 'Annulé';
    default:
      return status.isEmpty ? 'Inconnu' : status;
  }
}

Color _statusColor(String status) {
  switch (status.toUpperCase()) {
    case 'EN_ATTENTE_AFFECTATION_TRANSIT':
    case 'EN_ATTENTE_TRANSIT':
      return Colors.orange;
    case 'EN_TRANSIT':
    case 'EN_COURS_TRANSIT':
      return Colors.blue;
    case 'RECU_AU_DEPOT':
    case 'RECU_DEPOT_DESTINE':
    case 'TRANSIT_TERMINE':
      return Colors.green;
    case 'ANNULE':
      return Colors.red;
    default:
      return Colors.grey;
  }
}
