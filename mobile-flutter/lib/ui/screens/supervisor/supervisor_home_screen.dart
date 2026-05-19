import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/api_client.dart';
import '../../../core/api_exception.dart';
import '../../../data/services/refonte/supervisor_service.dart';

class SupervisorHomeScreen extends StatefulWidget {
  final ApiClient api;

  const SupervisorHomeScreen({super.key, required this.api});

  @override
  State<SupervisorHomeScreen> createState() => _SupervisorHomeScreenState();
}

class _SupervisorHomeScreenState extends State<SupervisorHomeScreen> {
  late final SupervisorService _service;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _service = SupervisorService(widget.api);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _StatsPage(service: _service),
      _TransitMissionsPage(service: _service),
      _IssuesPage(service: _service),
      _LivreursPage(service: _service),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Superviseur')),
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            label: 'Stats',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            label: 'Missions',
          ),
          NavigationDestination(
            icon: Icon(Icons.report_problem_outlined),
            label: 'Problèmes',
          ),
          NavigationDestination(
            icon: Icon(Icons.group_outlined),
            label: 'Livreurs',
          ),
        ],
      ),
    );
  }
}

class _StatsPage extends StatelessWidget {
  final SupervisorService service;

  const _StatsPage({required this.service});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: service.stats(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorState(
            message: _errorText(snapshot.error),
            onRetry: () {},
          );
        }

        final data = snapshot.data ?? const {};
        return GridView.count(
          crossAxisCount: 2,
          padding: const EdgeInsets.all(16),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          children: [
            _MetricCard(
              label: 'En attente',
              value: data['pending'],
              icon: Icons.schedule_outlined,
            ),
            _MetricCard(
              label: 'En transit',
              value: data['inProgress'],
              icon: Icons.local_shipping_outlined,
            ),
            _MetricCard(
              label: 'Reçus aujourd’hui',
              value: data['receivedToday'],
              icon: Icons.done_all_rounded,
            ),
            _MetricCard(
              label: 'Bloqués >24h',
              value: data['blocked24h'],
              icon: Icons.warning_amber_rounded,
            ),
          ],
        );
      },
    );
  }
}

class _TransitMissionsPage extends StatefulWidget {
  final SupervisorService service;

  const _TransitMissionsPage({required this.service});

  @override
  State<_TransitMissionsPage> createState() => _TransitMissionsPageState();
}

class _TransitMissionsPageState extends State<_TransitMissionsPage> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.service.transitMissions();
  }

  void _reload() {
    setState(() {
      _future = widget.service.transitMissions();
    });
  }

  Future<void> _retryAssignment(Map<String, dynamic> mission) async {
    final messenger = ScaffoldMessenger.of(context);
    final commandeId = _stringValue(mission, const [
      'doPiece',
      'commandeId',
    ], fallback: '');
    if (commandeId.isEmpty) return;

    try {
      final result = await widget.service.retryAssignment(commandeId);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Relance terminée : ${result['reassigned'] ?? 0} mission(s) réaffectée(s).',
          ),
        ),
      );
      _reload();
    } on ApiException catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text(e.displayMessage), backgroundColor: Colors.red),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text('Relance impossible : $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _changeStatus(Map<String, dynamic> mission) async {
    final messenger = ScaffoldMessenger.of(context);
    final missionId = _stringValue(mission, const ['id'], fallback: '');
    if (missionId.isEmpty) return;

    final status = await _pickStatus(context);
    if (!mounted || status == null) return;

    final justification = await _askJustification(context, status);
    if (!mounted || justification == null || justification.trim().isEmpty) {
      return;
    }

    try {
      await widget.service.changeTransitStatus(
        missionId: missionId,
        status: status,
        justification: justification.trim(),
        version: _intValue(mission, const ['version']),
      );
      if (!mounted) return;
      messenger.showSnackBar(
        const SnackBar(content: Text('Statut transit corrigé.')),
      );
      _reload();
    } on ApiException catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text(e.displayMessage), backgroundColor: Colors.red),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text('Correction impossible : $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorState(
            message: _errorText(snapshot.error),
            onRetry: _reload,
          );
        }

        final items = (snapshot.data ?? const [])
            .map(_asMap)
            .where((item) => item.isNotEmpty)
            .toList();
        if (items.isEmpty) {
          return _EmptyState(
            icon: Icons.local_shipping_outlined,
            message: 'Aucune mission transit.',
            onRefresh: _reload,
          );
        }

        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, index) {
              final mission = items[index];
              return _SupervisorMissionCard(
                mission: mission,
                onRetry: () => unawaited(_retryAssignment(mission)),
                onChangeStatus: () => unawaited(_changeStatus(mission)),
              );
            },
          ),
        );
      },
    );
  }
}

class _IssuesPage extends StatefulWidget {
  final SupervisorService service;

  const _IssuesPage({required this.service});

  @override
  State<_IssuesPage> createState() => _IssuesPageState();
}

class _IssuesPageState extends State<_IssuesPage> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.service.issues();
  }

  void _reload() {
    setState(() {
      _future = widget.service.issues();
    });
  }

  Future<void> _resolve(Map<String, dynamic> issue) async {
    final messenger = ScaffoldMessenger.of(context);
    final id = _stringValue(issue, const ['id'], fallback: '');
    if (id.isEmpty) return;

    try {
      await widget.service.resolveIssue(id);
      if (!mounted) return;
      messenger.showSnackBar(
        const SnackBar(content: Text('Problème marqué résolu.')),
      );
      _reload();
    } on ApiException catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text(e.displayMessage), backgroundColor: Colors.red),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text('Résolution impossible : $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorState(
            message: _errorText(snapshot.error),
            onRetry: _reload,
          );
        }

        final items = (snapshot.data ?? const [])
            .map(_asMap)
            .where((item) => item.isNotEmpty)
            .toList();
        if (items.isEmpty) {
          return _EmptyState(
            icon: Icons.report_problem_outlined,
            message: 'Aucun problème superviseur ouvert.',
            onRefresh: _reload,
          );
        }

        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, index) {
              final issue = items[index];
              return _IssueCard(
                issue: issue,
                onResolve:
                    _stringValue(issue, const [
                      'acknowledgedAt',
                    ], fallback: '').isEmpty
                    ? () => unawaited(_resolve(issue))
                    : null,
              );
            },
          ),
        );
      },
    );
  }
}

class _LivreursPage extends StatelessWidget {
  final SupervisorService service;

  const _LivreursPage({required this.service});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: service.livreurs(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorState(
            message: _errorText(snapshot.error),
            onRetry: () {},
          );
        }

        final items = (snapshot.data ?? const [])
            .map(_asMap)
            .where((item) => item.isNotEmpty)
            .toList();
        if (items.isEmpty) {
          return const _EmptyState(
            icon: Icons.group_outlined,
            message: 'Aucun livreur trouvé.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (_, index) => _LivreurCard(livreur: items[index]),
        );
      },
    );
  }
}

class _SupervisorMissionCard extends StatelessWidget {
  final Map<String, dynamic> mission;
  final VoidCallback onRetry;
  final VoidCallback onChangeStatus;

  const _SupervisorMissionCard({
    required this.mission,
    required this.onRetry,
    required this.onChangeStatus,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _stringValue(mission, const ['status']);
    final hasLivreur = _stringValue(mission, const [
      'transitLivreurUserId',
    ], fallback: '').isNotEmpty;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    '${_stringValue(mission, const ['arRef', 'articleRef'])} · ${_stringValue(mission, const ['doPiece'])}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                _StatusChip(status: status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Source ${_stringValue(mission, const ['sourceDepotNo'])} -> Destination ${_stringValue(mission, const ['destinationDepotNo'])}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              hasLivreur
                  ? 'Livreur transit affecté.'
                  : 'Aucun livreur transit affecté.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: hasLivreur ? Colors.green : theme.colorScheme.error,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.autorenew_rounded),
                  label: const Text('Relancer'),
                ),
                FilledButton.icon(
                  onPressed: onChangeStatus,
                  icon: const Icon(Icons.edit_note_rounded),
                  label: const Text('Corriger statut'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _IssueCard extends StatelessWidget {
  final Map<String, dynamic> issue;
  final VoidCallback? onResolve;

  const _IssueCard({required this.issue, required this.onResolve});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final severity = _stringValue(issue, const ['severity']);
    final type = _stringValue(issue, const ['alertType', 'issueType']);
    final message = _stringValue(issue, const ['message', 'description']);
    final related = _stringValue(issue, const [
      'relatedTransfertId',
      'transitMissionId',
    ], fallback: '');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _SeverityChip(severity: severity),
                Text(
                  type,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(message, style: theme.textTheme.bodyMedium),
            if (related.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('Mission liée : $related', style: theme.textTheme.bodySmall),
            ],
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: onResolve,
                icon: const Icon(Icons.check_circle_outline_rounded),
                label: Text(onResolve == null ? 'Déjà traité' : 'Résoudre'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LivreurCard extends StatelessWidget {
  final Map<String, dynamic> livreur;

  const _LivreurCard({required this.livreur});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isTransit = livreur['isTransit'] == true;

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          child: Icon(
            isTransit
                ? Icons.local_shipping_outlined
                : Icons.delivery_dining_outlined,
          ),
        ),
        title: Text(_stringValue(livreur, const ['fullName', 'email'])),
        subtitle: Text(
          isTransit
              ? 'Transit · dépôt ${_stringValue(livreur, const ['depotRattacheName', 'depotRattacheNo'])}'
              : 'Classique · ${_stringValue(livreur, const ['delegation', 'gouvernorat'])}',
        ),
        trailing: Text(
          isTransit ? 'Transit' : 'Livraison',
          style: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final dynamic value;
  final IconData icon;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: theme.colorScheme.primary),
            const SizedBox(height: 10),
            Text(
              '${value ?? '-'}',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            Text(label, textAlign: TextAlign.center),
          ],
        ),
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

class _SeverityChip extends StatelessWidget {
  final String severity;

  const _SeverityChip({required this.severity});

  @override
  Widget build(BuildContext context) {
    final color =
        severity.toUpperCase() == 'HIGH' || severity.toUpperCase() == 'CRITICAL'
        ? Colors.red
        : severity.toUpperCase() == 'MEDIUM'
        ? Colors.orange
        : Colors.blue;
    return Chip(
      label: Text(severity),
      visualDensity: VisualDensity.compact,
      side: BorderSide(color: color.withValues(alpha: 0.45)),
      backgroundColor: color.withValues(alpha: 0.09),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final VoidCallback? onRefresh;

  const _EmptyState({
    required this.icon,
    required this.message,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            if (onRefresh != null) ...[
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Rafraîchir'),
              ),
            ],
          ],
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

Future<String?> _pickStatus(BuildContext context) {
  const options = [
    ('EN_ATTENTE_TRANSIT', 'Remettre en attente'),
    ('EN_COURS_TRANSIT', 'Passer en cours'),
    ('RECU_DEPOT_DESTINE', 'Marquer reçu'),
  ];

  return showModalBottomSheet<String>(
    context: context,
    builder: (context) {
      return SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('Choisir le nouveau statut')),
            for (final option in options)
              ListTile(
                leading: const Icon(Icons.edit_note_rounded),
                title: Text(option.$2),
                subtitle: Text(option.$1),
                onTap: () => Navigator.of(context).pop(option.$1),
              ),
          ],
        ),
      );
    },
  );
}

Future<String?> _askJustification(BuildContext context, String status) async {
  final controller = TextEditingController();
  try {
    return await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Justification superviseur'),
          content: TextField(
            controller: controller,
            autofocus: true,
            minLines: 2,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: status,
              hintText: 'Expliquez pourquoi ce statut est corrigé.',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(controller.text),
              child: const Text('Valider'),
            ),
          ],
        );
      },
    );
  } finally {
    controller.dispose();
  }
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
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

int? _intValue(Map<String, dynamic> item, List<String> keys) {
  final text = _stringValue(item, keys, fallback: '');
  return int.tryParse(text);
}

String _errorText(Object? error) {
  if (error is ApiException) return error.displayMessage;
  return 'Chargement impossible : $error';
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
