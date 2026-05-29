import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/services/confirmatrice_claims_service.dart';
import '../../../core/api_client.dart';
import '../../../models/client_claim.dart';

/// Panel premium affiché dans le détail d'une réclamation/demande dont
/// le motif est `COLIS_ENDOMMAGE_DEPOT` (livreur).
///
/// La confirmatrice :
///   1. Vérifie la disponibilité stock via l'endpoint dédié.
///   2. Choisit ÉCHANGE (re-livraison) ou RETOUR + APPEL CLIENT (pas de stock).
class DepotDamagedDecisionPanel extends StatefulWidget {
  final ClientClaim claim;
  final ValueChanged<ClientClaim> onDecided;
  final VoidCallback onCallClient;

  const DepotDamagedDecisionPanel({
    super.key,
    required this.claim,
    required this.onDecided,
    required this.onCallClient,
  });

  @override
  State<DepotDamagedDecisionPanel> createState() =>
      _DepotDamagedDecisionPanelState();
}

class _DepotDamagedDecisionPanelState extends State<DepotDamagedDecisionPanel> {
  bool _loadingStock = true;
  bool _saving = false;
  bool? _allAvailable;
  List<_Shortage> _shortages = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkStock());
  }

  Future<void> _checkStock() async {
    setState(() {
      _loadingStock = true;
      _error = null;
    });
    try {
      final svc = ConfirmatriceClaimsService(context.read<ApiClient>());
      final data = await svc.checkStockForDepotDamaged(widget.claim.id);
      if (!mounted) return;
      setState(() {
        _allAvailable = data['allAvailable'] == true;
        final raw = data['shortages'];
        _shortages = raw is List
            ? raw
                .whereType<Map<String, dynamic>>()
                .map(_Shortage.fromMap)
                .toList()
            : const <_Shortage>[];
        _loadingStock = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loadingStock = false;
      });
    }
  }

  Future<void> _decide(String decision, {bool autoCallClient = false}) async {
    if (_saving) return;
    final messenger = ScaffoldMessenger.of(context);
    final svc = ConfirmatriceClaimsService(context.read<ApiClient>());

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(decision == 'ECHANGE'
            ? 'Valider l\'échange ?'
            : 'Marquer en retour + appel ?'),
        content: Text(decision == 'ECHANGE'
            ? 'La commande sera relancée pour ré-livraison.'
            : 'La commande sera marquée en retour et le client doit être rappelé.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Annuler')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Confirmer')),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    setState(() => _saving = true);
    try {
      final updated = await svc.decideDepotDamaged(
        widget.claim.id,
        decision: decision,
      );
      if (!mounted) return;
      widget.onDecided(updated);
      messenger.showSnackBar(SnackBar(
        backgroundColor: Colors.green,
        content: Text(decision == 'ECHANGE'
            ? 'Échange validé — colis réémis.'
            : 'Retour validé — pense à appeler le client.'),
      ));
      if (autoCallClient) {
        Future.delayed(const Duration(milliseconds: 400), widget.onCallClient);
      }
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(
        backgroundColor: Colors.red,
        content: Text(e.toString()),
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF1F2), Color(0xFFFFE4E6)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFCA5A5), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14EF4444),
            blurRadius: 14,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.30),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.warning_amber_rounded,
                    color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Décision colis endommagé',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15.5,
                        color: Color(0xFF991B1B),
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Le livreur a signalé un colis endommagé au dépôt.',
                      style: TextStyle(
                        color: Color(0xFF7F1D1D),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (!_loadingStock)
                IconButton(
                  tooltip: 'Re-vérifier le stock',
                  onPressed: _checkStock,
                  icon: const Icon(Icons.refresh_rounded),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _buildStockSection(),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _decisionButton(
                  label: 'Échanger',
                  icon: Icons.swap_horiz_rounded,
                  color: const Color(0xFF22C55E),
                  enabled: _allAvailable == true && !_saving,
                  subtitle: _allAvailable == true
                      ? 'Stock disponible'
                      : _loadingStock
                          ? 'Vérification…'
                          : 'Stock insuffisant',
                  onTap: () => _decide('ECHANGE'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _decisionButton(
                  label: 'Retour + Appel',
                  icon: Icons.phone_in_talk_rounded,
                  color: const Color(0xFFEF4444),
                  enabled: !_saving,
                  subtitle: 'Stock manquant',
                  onTap: () => _decide('RETOUR_APPEL', autoCallClient: true),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStockSection() {
    if (_loadingStock) {
      return Row(
        children: const [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 10),
          Text(
            'Vérification du stock…',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: Color(0xFF7F1D1D),
            ),
          ),
        ],
      );
    }
    if (_error != null) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Erreur stock : $_error',
                style: const TextStyle(
                  color: Color(0xFFEF4444),
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),
            TextButton(onPressed: _checkStock, child: const Text('Réessayer')),
          ],
        ),
      );
    }
    if (_allAvailable == true) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFDCFCE7),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF22C55E)),
        ),
        child: Row(
          children: const [
            Icon(Icons.check_circle_rounded, color: Color(0xFF15803D)),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Stock OK pour tous les articles — l\'échange est possible.',
                style: TextStyle(
                  color: Color(0xFF14532D),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      );
    }
    // Shortages
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.inventory_2_outlined, color: Color(0xFF991B1B)),
              SizedBox(width: 8),
              Text(
                'Stock insuffisant',
                style: TextStyle(
                  color: Color(0xFF991B1B),
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ..._shortages.map(
            (s) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text(
                '${s.designation?.isNotEmpty == true ? s.designation : s.arRef} — '
                'requis ${_fmtNum(s.requiredQty)}, dispo ${_fmtNum(s.availableQty)}',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF7F1D1D),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _decisionButton({
    required String label,
    required IconData icon,
    required Color color,
    required bool enabled,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final c = enabled ? color : Colors.grey.shade500;
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: enabled ? Colors.white : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.withValues(alpha: 0.5), width: 1.2),
          boxShadow: enabled
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 0.15),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : const [],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: c, size: 22),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: c,
                fontWeight: FontWeight.w900,
                fontSize: 13.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                color: c.withValues(alpha: 0.85),
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  String _fmtNum(double v) {
    if (v == v.truncateToDouble()) return v.toStringAsFixed(0);
    return v.toStringAsFixed(2);
  }
}

class _Shortage {
  final String arRef;
  final String? designation;
  final double requiredQty;
  final double availableQty;
  const _Shortage({
    required this.arRef,
    required this.designation,
    required this.requiredQty,
    required this.availableQty,
  });
  factory _Shortage.fromMap(Map<String, dynamic> m) => _Shortage(
        arRef: (m['arRef'] ?? '').toString(),
        designation: m['designation']?.toString(),
        requiredQty: _d(m['requiredQty']),
        availableQty: _d(m['availableQty']),
      );
  static double _d(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse('${v ?? 0}'.replaceAll(',', '.')) ?? 0;
  }
}
