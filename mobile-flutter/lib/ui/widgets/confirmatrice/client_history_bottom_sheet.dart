import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';

/// B.4 — Historique des commandes d'un client (via l'icône ☰ dans la
/// carte Client Details des écrans confirmatrice). Charge depuis
/// `GET /api/confirmatrice/clients/{clientId}/orders-history`.
class ClientHistoryBottomSheet extends StatefulWidget {
  final String clientId;
  const ClientHistoryBottomSheet({super.key, required this.clientId});

  @override
  State<ClientHistoryBottomSheet> createState() =>
      _ClientHistoryBottomSheetState();
}

class _ClientHistoryBottomSheetState extends State<ClientHistoryBottomSheet> {
  static const _accent = Color(0xFF6E3CE9);

  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final body = await api.getMap(
        '/api/confirmatrice/clients/${widget.clientId}/orders-history',
        q: const {'limit': '50'},
      );
      if (!mounted) return;
      setState(() {
        _data = body;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, scroll) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              Container(
                width: 50,
                height: 5,
                margin: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFE6E8F2),
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              _header(),
              Expanded(child: _body(scroll)),
            ],
          ),
        );
      },
    );
  }

  Widget _header() {
    final client = (_data?['client'] is Map<String, dynamic>)
        ? _data!['client'] as Map<String, dynamic>
        : <String, dynamic>{};
    final nom = client['nom']?.toString() ?? '—';
    final total = client['totalCommandes'];
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 6, 20, 14),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: _accent.withOpacity(0.12),
            child: const Icon(Icons.person_rounded, color: _accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Historique client : $nom',
                    style: const TextStyle(
                        fontWeight: FontWeight.w900, fontSize: 16)),
                if (total != null)
                  Text('Total : $total commande${total == 1 ? '' : 's'}',
                      style: const TextStyle(
                          color: Color(0xFF8A8FA8), fontSize: 13)),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close_rounded),
          ),
        ],
      ),
    );
  }

  Widget _body(ScrollController scroll) {
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
              const Icon(Icons.error_outline_rounded,
                  color: Colors.red, size: 56),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: _load, child: const Text('Réessayer')),
            ],
          ),
        ),
      );
    }
    final stats = (_data?['stats'] is Map<String, dynamic>)
        ? _data!['stats'] as Map<String, dynamic>
        : <String, dynamic>{};
    final orders = (_data?['orders'] as List?) ?? const [];

    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        _statsRow(stats),
        const SizedBox(height: 12),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Text('Commandes (récent → ancien)',
              style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  color: Color(0xFF1A1D2E))),
        ),
        if (orders.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text('Aucune commande passée.',
                  style: TextStyle(color: Color(0xFF8A8FA8))),
            ),
          )
        else
          for (final raw in orders.whereType<Map<String, dynamic>>())
            _orderRow(raw),
      ],
    );
  }

  Widget _statsRow(Map<String, dynamic> stats) {
    int n(dynamic v) => (v is num) ? v.toInt() : int.tryParse('${v ?? 0}') ?? 0;
    final livrees = n(stats['livrees']);
    final retours = n(stats['retours']);
    final refus = n(stats['refus']);
    final taux = stats['tauxLivraison'];
    final montant = stats['montantTotalLivre'];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _statChip(Icons.task_alt_rounded, 'Livrées',
            livrees.toString(), Colors.green),
        _statChip(Icons.undo_rounded, 'Retours',
            retours.toString(), Colors.red),
        _statChip(Icons.cancel_outlined, 'Refus',
            refus.toString(), Colors.grey),
        if (taux != null)
          _statChip(Icons.trending_up_rounded, 'Taux livraison',
              '$taux %', Colors.indigo),
        if (montant != null)
          _statChip(Icons.payments_rounded, 'Montant livré',
              '$montant DT', _accent),
      ],
    );
  }

  Widget _statChip(IconData icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w800, fontSize: 12)),
          const SizedBox(width: 8),
          Text(value,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w900, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _orderRow(Map<String, dynamic> m) {
    final piece = m['piece']?.toString() ?? '—';
    final date = DateTime.tryParse(m['date']?.toString() ?? '');
    final statut = (m['statut']?.toString() ?? '').toUpperCase();
    final montant = m['montant'];
    final produits = m['produits']?.toString();

    final statutColor = _statutColor(statut);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEDEEF5)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 36,
            decoration: BoxDecoration(
              color: statutColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Text('#$piece',
                      style: const TextStyle(
                          fontWeight: FontWeight.w900, fontSize: 14)),
                  const SizedBox(width: 8),
                  if (date != null)
                    Text(_fmt(date),
                        style: const TextStyle(
                            color: Color(0xFF8A8FA8), fontSize: 12)),
                ]),
                const SizedBox(height: 4),
                Text(
                  '${_statutLabel(statut)}${produits != null ? '  ·  $produits' : ''}',
                  style: TextStyle(color: statutColor, fontSize: 12),
                ),
              ],
            ),
          ),
          if (montant != null)
            Text('$montant DT',
                style: const TextStyle(
                    fontWeight: FontWeight.w900, color: _accent)),
        ],
      ),
    );
  }

  Color _statutColor(String s) {
    switch (s) {
      case 'LIVRE':
      case 'LIVREE':
        return const Color(0xFF22C55E);
      case 'EN_LIVRAISON':
        return const Color(0xFF0EA5E9);
      case 'REPORTE':
        return const Color(0xFFF97316);
      case 'RETOUR':
      case 'RETOURNE':
        return const Color(0xFFEF4444);
      case 'REFUSE':
        return const Color(0xFF6B7280);
      case 'DEPOT':
        return const Color(0xFFA855F7);
      default:
        return const Color(0xFF9CA3AF);
    }
  }

  String _statutLabel(String s) {
    switch (s) {
      case 'LIVRE':
      case 'LIVREE':
        return '✅ Livrée';
      case 'EN_LIVRAISON':
        return '🚚 En livraison';
      case 'REPORTE':
        return '⏰ Reportée';
      case 'RETOUR':
      case 'RETOURNE':
        return '🔴 Retour';
      case 'REFUSE':
        return '❌ Refusée';
      case 'DEPOT':
        return '📦 Dépôt';
      default:
        return s;
    }
  }

  String _fmt(DateTime v) {
    final d = v.toLocal();
    String two(int x) => x.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year}';
  }
}
