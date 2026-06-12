// lib/ui/screens/transit/transit_mission_details_screen.dart
//
// Écran de détail d'une mission transit pour le livreur-transit.
// AJOUT : bouton "Annuler le scan" visible seulement si statut = EN_TRANSIT
//         avec fenêtre de 10 minutes depuis pickedUpAt.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../core/api_exception.dart';
import '../../../data/services/refonte/transit_service.dart';

// ─── Helpers statut ──────────────────────────────────────────────────────────

bool _canScan(String status) {
  final n = status.toUpperCase();
  return n == 'EN_ATTENTE_TRANSIT' ||
      n == 'EN_ATTENTE_AFFECTATION_TRANSIT' ||
      n == 'EN_TRANSIT' ||
      n == 'EN_COURS_TRANSIT';
}

/// Retourne true si le statut est EN_TRANSIT et permet un revert
bool _canRevert(String status) {
  final n = status.toUpperCase();
  return n == 'EN_TRANSIT' || n == 'EN_COURS_TRANSIT';
}

String _scanHint(String status) {
  final n = status.toUpperCase();
  if (n == 'EN_ATTENTE_TRANSIT' || n == 'EN_ATTENTE_AFFECTATION_TRANSIT') {
    return 'Premier scan : le backend passera l\'article en cours de transit.';
  }
  if (n == 'EN_TRANSIT' || n == 'EN_COURS_TRANSIT') {
    return 'Deuxième scan : le backend validera la réception au dépôt destination.';
  }
  return 'Cette mission ne permet plus de scan opérationnel.';
}

String _statusLabel(String status) {
  switch (status.toUpperCase()) {
    case 'EN_ATTENTE_AFFECTATION_TRANSIT':
      return 'Attente affectation';
    case 'EN_ATTENTE_TRANSIT':
      return 'En attente';
    case 'EN_TRANSIT':
    case 'EN_COURS_TRANSIT':
      return 'En cours de transit';
    case 'RECU_AU_DEPOT':
    case 'RECU_DEPOT_DESTINE':
    case 'TRANSIT_TERMINE':
      return 'Reçu au dépôt';
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

String _stringValue(Map<String, dynamic> item, List<String> keys,
    {String? fallback = '-'}) {
  for (final key in keys) {
    final value = item[key];
    final text = value?.toString().trim();
    if (text != null && text.isNotEmpty) return text;
  }
  return fallback ?? '';
}

// ─── Calcul fenêtre de revert ────────────────────────────────────────────────

const int _revertWindowMinutes = 10;

/// Retourne les secondes restantes dans la fenêtre d'annulation.
/// Retourne null si pickedUpAt est null ou si la fenêtre est dépassée.
int? _revertSecondsLeft(String? pickedUpAtStr) {
  if (pickedUpAtStr == null || pickedUpAtStr.isEmpty) return null;
  final picked = DateTime.tryParse(pickedUpAtStr)?.toLocal();
  if (picked == null) return null;
  final deadline = picked.add(const Duration(minutes: _revertWindowMinutes));
  final remaining = deadline.difference(DateTime.now()).inSeconds;
  return remaining > 0 ? remaining : null;
}

// ─── Widget compteur régressif ────────────────────────────────────────────────

class _RevertCountdown extends StatefulWidget {
  final String pickedUpAt;
  final VoidCallback onExpired;

  const _RevertCountdown({
    required this.pickedUpAt,
    required this.onExpired,
  });

  @override
  State<_RevertCountdown> createState() => _RevertCountdownState();
}

class _RevertCountdownState extends State<_RevertCountdown> {
  late Timer _timer;
  int _secondsLeft = 0;

  @override
  void initState() {
    super.initState();
    _secondsLeft = _revertSecondsLeft(widget.pickedUpAt) ?? 0;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _secondsLeft--);
      if (_secondsLeft <= 0) {
        _timer.cancel();
        widget.onExpired();
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_secondsLeft <= 0) return const SizedBox.shrink();
    final mins = _secondsLeft ~/ 60;
    final secs = _secondsLeft % 60;
    final label = mins > 0
        ? '$mins min ${secs.toString().padLeft(2, '0')} s'
        : '${secs.toString().padLeft(2, '0')} s';

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.timer_outlined, size: 14, color: Colors.orange),
        const SizedBox(width: 4),
        Text(
          'Annulation possible encore $label',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.orange,
          ),
        ),
      ],
    );
  }
}

// ─── Dialog justification ────────────────────────────────────────────────────

Future<String?> _askRevertJustification(BuildContext context) async {
  final controller = TextEditingController();
  try {
    return await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: const Row(
            children: [
              Icon(Icons.undo_rounded, color: Colors.orange),
              SizedBox(width: 10),
              Text('Annuler le scan'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Vous êtes sur le point d\'annuler le scan de pickup et de remettre '
                'cette mission en "En attente".',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 16),
              const Text(
                'Justification *',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: controller,
                autofocus: true,
                minLines: 2,
                maxLines: 4,
                maxLength: 200,
                decoration: InputDecoration(
                  hintText: 'Ex: Mauvais article scanné, code-barres mal lu...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Annuler'),
            ),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.orange,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () {
                final text = controller.text.trim();
                if (text.isEmpty) return; // validation locale
                Navigator.of(ctx).pop(text);
              },
              icon: const Icon(Icons.undo_rounded, size: 16),
              label: const Text('Confirmer l\'annulation'),
            ),
          ],
        );
      },
    );
  } finally {
    controller.dispose();
  }
}

// ─── Écran principal ──────────────────────────────────────────────────────────

class TransitMissionDetailsScreen extends StatefulWidget {
  final String missionId;

  const TransitMissionDetailsScreen({super.key, required this.missionId, required TransitService service, required Map<String, dynamic> initialMission});

  @override
  State<TransitMissionDetailsScreen> createState() =>
      _TransitMissionDetailsScreenState();
}

class _TransitMissionDetailsScreenState
    extends State<TransitMissionDetailsScreen> {
  Map<String, dynamic>? _mission;
  bool _loading = true;
  String? _error;
  bool _revertExpired = false; // devient true quand le compteur expire

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final svc = TransitService(context.read<ApiClient>());
      final data = await svc.mission(widget.missionId);
      if (mounted) {
        setState(() {
          _mission = data;
          _loading = false;
          _revertExpired = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  // ── Scan ──────────────────────────────────────────────────────────────────

  Future<void> _scan() async {
    // TODO: intégrer le scanner de code-barres (mobile_scanner, etc.)
    // Pour l'instant, simulé par un dialog texte
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Scanner le code-barres'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Code-barres…'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Annuler')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(controller.text),
              child: const Text('Valider')),
        ],
      ),
    );
    controller.dispose();
    if (code == null || code.trim().isEmpty) return;
    if (!mounted) return;

    try {
      final svc = TransitService(context.read<ApiClient>());
      await svc.scan(
        scannedBarcode: code.trim(),
        missionId: widget.missionId,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Scan enregistré ✓')),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur scan : ${friendlyError(e)}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ── REVERT : annuler un scan accidentel ───────────────────────────────────

  Future<void> _revertPickup() async {
    final justification = await _askRevertJustification(context);
    if (justification == null || justification.isEmpty) return;
    if (!mounted) return;

    try {
      final svc = TransitService(context.read<ApiClient>());
      await svc.revertPickup(
        missionId: widget.missionId,
        justification: justification,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Scan annulé. Mission remise en attente.'),
            backgroundColor: Colors.orange,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        // Fenêtre expirée côté backend
        final msg = e.toString();
        if (msg.contains('REVERT_WINDOW_EXPIRED')) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Fenêtre d\'annulation dépassée. Contactez votre superviseur.',
              ),
              backgroundColor: Colors.red,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Impossible d\'annuler : ${friendlyError(e)}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Détail mission transit'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualiser',
            onPressed: _load,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 42),
              const SizedBox(height: 10),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      );
    }
    if (_mission == null) return const SizedBox.shrink();

    final m = _mission!;
    final status = _stringValue(m, ['status', 'Status'], fallback: '');
    final arRef = _stringValue(m, ['arRef', 'ArRef', 'ar_ref']);
    final quantite = m['quantite'] ?? m['Quantite'] ?? 0;
    final doPiece = _stringValue(m, ['doPiece', 'DoPiece']);
    final sourceDepot =
        _stringValue(m, ['sourceDepotNo', 'SourceDepotNo'], fallback: '?');
    final destDepot =
        _stringValue(m, ['destinationDepotNo', 'DestinationDepotNo'],
            fallback: '?');
    final pickedUpAt = m['pickedUpAt']?.toString() ?? m['PickedUpAt']?.toString();
    final color = _statusColor(status);

    // Peut-on afficher le bouton revert ?
    final showRevert =
        _canRevert(status) && !_revertExpired &&
        (_revertSecondsLeft(pickedUpAt) != null);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Carte statut ────────────────────────────────────────────────
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: BorderSide(color: color.withValues(alpha: 0.4)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: color.withValues(alpha: 0.15),
                        child: Icon(_statusIcon(status), color: color, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _statusLabel(status),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: color,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Mission : $doPiece',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),
                  _InfoRow(label: 'Article', value: arRef),
                  _InfoRow(
                    label: 'Quantité',
                    value: '$quantite',
                  ),
                  _InfoRow(
                    label: 'Trajet',
                    value: 'Dépôt $sourceDepot → Dépôt $destDepot',
                  ),

                  // Compteur régressif si EN_TRANSIT et pickedUpAt renseigné
                  if (_canRevert(status) && pickedUpAt != null) ...[
                    const SizedBox(height: 12),
                    _RevertCountdown(
                      pickedUpAt: pickedUpAt,
                      onExpired: () {
                        if (mounted) setState(() => _revertExpired = true);
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // ── Bouton REVERT (annuler scan accidentel) ──────────────────────
          if (showRevert)
            Card(
              elevation: 0,
              color: Colors.orange.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: Colors.orange.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.warning_amber_rounded,
                            color: Colors.orange.shade700, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Scan accidentel ?',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.orange.shade800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Si vous avez scanné cet article par erreur, vous pouvez annuler '
                      'le scan dans la fenêtre de 10 minutes.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.orange.shade700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.orange.shade800,
                          side: BorderSide(color: Colors.orange.shade400),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: _revertPickup,
                        icon: const Icon(Icons.undo_rounded, size: 18),
                        label: const Text(
                          'Annuler le scan — Remettre en attente',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Message si fenêtre expirée et statut encore EN_TRANSIT
          if (_canRevert(status) && _revertExpired) ...[
            Card(
              elevation: 0,
              color: Colors.red.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: Colors.red.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.lock_clock_outlined,
                        color: Colors.red.shade700, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Fenêtre d\'annulation expirée. Contactez votre superviseur pour corriger cette mission.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.red.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 16),

          // ── Bouton scan ──────────────────────────────────────────────────
          if (_canScan(status))
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _scanHint(status),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: _scan,
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text(
                      'Scanner le code-barres',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

// ─── Widget ligne info ────────────────────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Text(
            '$label : ',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
