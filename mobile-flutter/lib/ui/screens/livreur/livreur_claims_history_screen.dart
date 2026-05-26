import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/livreur_claims_history_service.dart';

class LivreurClaimsHistoryScreen extends StatefulWidget {
  const LivreurClaimsHistoryScreen({super.key});

  @override
  State<LivreurClaimsHistoryScreen> createState() => _LivreurClaimsHistoryScreenState();
}

class _LivreurClaimsHistoryScreenState extends State<LivreurClaimsHistoryScreen> {
  List<LivreurClaimHistoryItem> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = context.read<ApiClient>();
      _items = await LivreurClaimsHistoryService(api).fetchMine();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes signalements'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: TextStyle(color: scheme.error)),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : _items.isEmpty
                  ? const Center(child: Text('Aucun signalement enregistré.'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        itemBuilder: (ctx, i) => _ItemCard(item: _items[i]),
                      ),
                    ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  final LivreurClaimHistoryItem item;
  const _ItemCard({required this.item});

  Color _statusColor(BuildContext ctx) {
    final scheme = Theme.of(ctx).colorScheme;
    if (item.statut == 'CLOTUREE') return Colors.green.shade600;
    if (item.statut == 'REFUSEE') return scheme.error;
    if (item.statut == 'EN_COURS_DE_TRAITEMENT') return scheme.primary;
    return Colors.orange.shade700;
  }

  String _motifLabel() {
    const labels = {
      'ADRESSE_INCORRECTE': 'Adresse incorrecte',
      'NUMERO_INCORRECT': 'Numéro incorrect',
      'CLIENT_ABSENT': 'Client absent',
      'CLIENT_INJOIGNABLE': 'Client injoignable',
      'TELEPHONE_ETEINT': 'Téléphone éteint',
      'CLIENT_REFUSE': 'Refus client',
      'COLIS_ENDOMMAGE_DEPOT': 'Colis endommagé',
      'AUTRE': 'Autre incident',
    };
    return labels[item.motif] ?? item.motif;
  }

  String _statutLabel() {
    const labels = {
      'ENVOYEE': 'Envoyée',
      'EN_COURS_DE_TRAITEMENT': 'En traitement',
      'CLOTUREE': 'Clôturée',
      'REFUSEE': 'Refusée',
    };
    return labels[item.statut] ?? item.statut;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = _statusColor(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.doPiece,
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _statutLabel(),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              _motifLabel(),
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
            if (item.tentativesCount > 0) ...[
              const SizedBox(height: 4),
              Text(
                '${item.tentativesCount} tentative(s) enregistrée(s)',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 8),
            Text(
              _fmt(item.createdAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant.withOpacity(0.7),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} '
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
