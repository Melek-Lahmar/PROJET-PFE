import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/api_exception.dart';
import '../../../data/services/refonte/transit_service.dart';
import 'transit_barcode_scanner_screen.dart';

class TransitMissionDetailsScreen extends StatefulWidget {
  final TransitService service;
  final String missionId;
  final Map<String, dynamic>? initialMission;

  const TransitMissionDetailsScreen({
    super.key,
    required this.service,
    required this.missionId,
    this.initialMission,
  });

  @override
  State<TransitMissionDetailsScreen> createState() =>
      _TransitMissionDetailsScreenState();
}

class _TransitMissionDetailsScreenState
    extends State<TransitMissionDetailsScreen> {
  Map<String, dynamic>? _mission;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _mission = widget.initialMission;
    unawaited(_load(showSpinner: widget.initialMission == null));
  }

  Future<void> _load({bool showSpinner = true}) async {
    if (showSpinner) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final data = await widget.service.mission(widget.missionId);
      if (!mounted) return;
      setState(() {
        _mission = data;
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

  Future<void> _scan() async {
    final mission = _mission;
    if (mission == null) return;

    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TransitBarcodeScannerScreen(
          service: widget.service,
          missionId: widget.missionId,
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
    final mission = _mission;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mission transit'),
        actions: [
          IconButton(
            tooltip: 'Rafraîchir',
            onPressed: () => unawaited(_load()),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading && mission == null
          ? const Center(child: CircularProgressIndicator())
          : _error != null && mission == null
          ? _ErrorState(message: _error!, onRetry: () => unawaited(_load()))
          : RefreshIndicator(
              onRefresh: () => _load(showSpinner: false),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _MissionHeader(mission: mission!),
                  const SizedBox(height: 12),
                  _MissionInfo(mission: mission),
                  const SizedBox(height: 12),
                  _ScanPanel(
                    mission: mission,
                    onScan: _canScan(_stringValue(mission, const ['status']))
                        ? _scan
                        : null,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    _InlineWarning(message: _error!),
                  ],
                ],
              ),
            ),
    );
  }
}

class _MissionHeader extends StatelessWidget {
  final Map<String, dynamic> mission;

  const _MissionHeader({required this.mission});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _stringValue(mission, const ['status']);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _StatusChip(status: status),
                Text(
                  'Commande ${_stringValue(mission, const ['doPiece', 'commandeId'])}',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              _stringValue(mission, const [
                'algoReasoning',
              ], fallback: 'Transit inter-dépôts affecté par le backend.'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MissionInfo extends StatelessWidget {
  final Map<String, dynamic> mission;

  const _MissionInfo({required this.mission});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _InfoRow(
              label: 'Article',
              value: _stringValue(mission, const ['arRef', 'articleRef']),
            ),
            _InfoRow(
              label: 'Quantité',
              value: _stringValue(mission, const ['quantite', 'quantity']),
            ),
            _InfoRow(
              label: 'Dépôt source',
              value: _stringValue(mission, const [
                'sourceDepotNo',
                'sourceDepotName',
              ]),
            ),
            _InfoRow(
              label: 'Dépôt destination',
              value: _stringValue(mission, const [
                'destinationDepotNo',
                'destinationDepotName',
              ]),
            ),
            _InfoRow(
              label: 'Livreur affecté',
              value: _stringValue(mission, const ['transitLivreurUserId']),
            ),
            _InfoRow(
              label: 'Version',
              value: _stringValue(mission, const ['version']),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScanPanel extends StatelessWidget {
  final Map<String, dynamic> mission;
  final VoidCallback? onScan;

  const _ScanPanel({required this.mission, required this.onScan});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _stringValue(mission, const ['status']);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Scan code-barres',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _scanHint(status),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: onScan,
              icon: const Icon(Icons.qr_code_scanner_rounded),
              label: const Text('Scanner via API'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 132,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
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
      avatar: Icon(_statusIcon(status), size: 18, color: color),
      side: BorderSide(color: color.withValues(alpha: 0.45)),
      backgroundColor: color.withValues(alpha: 0.09),
      labelStyle: theme.textTheme.labelMedium?.copyWith(
        color: color,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}

class _InlineWarning extends StatelessWidget {
  final String message;

  const _InlineWarning({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: theme.colorScheme.errorContainer,
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          message,
          style: TextStyle(color: theme.colorScheme.onErrorContainer),
        ),
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

String _scanHint(String status) {
  final normalized = status.toUpperCase();
  if (normalized == 'EN_ATTENTE_TRANSIT' ||
      normalized == 'EN_ATTENTE_AFFECTATION_TRANSIT') {
    return 'Premier scan : le backend passera l’article en cours de transit si le code-barres correspond.';
  }
  if (normalized == 'EN_TRANSIT' || normalized == 'EN_COURS_TRANSIT') {
    return 'Deuxième scan : le backend validera la réception au dépôt destination.';
  }
  return 'Cette mission ne permet plus de scan opérationnel.';
}

String _statusLabel(String status) {
  switch (status.toUpperCase()) {
    case 'EN_ATTENTE_AFFECTATION_TRANSIT':
      return 'Attente affectation';
    case 'EN_ATTENTE_TRANSIT':
      return 'Attente transit';
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
      return status.isEmpty ? 'Statut inconnu' : status;
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

IconData _statusIcon(String status) {
  switch (status.toUpperCase()) {
    case 'EN_TRANSIT':
    case 'EN_COURS_TRANSIT':
      return Icons.local_shipping_outlined;
    case 'RECU_AU_DEPOT':
    case 'RECU_DEPOT_DESTINE':
    case 'TRANSIT_TERMINE':
      return Icons.inventory_2_outlined;
    case 'ANNULE':
      return Icons.block_rounded;
    default:
      return Icons.schedule_rounded;
  }
}
