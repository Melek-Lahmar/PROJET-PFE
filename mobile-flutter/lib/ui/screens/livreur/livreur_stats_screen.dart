import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../state/livreur_stats_provider.dart';

/// Section 2.1 — onglet Stats livreur refondu (sélecteur date, hero, cashbox,
/// compteurs, top zones, performance, sparkline 7j).
class LivreurStatsScreen extends StatefulWidget {
  const LivreurStatsScreen({super.key});

  @override
  State<LivreurStatsScreen> createState() => _LivreurStatsScreenState();
}

class _LivreurStatsScreenState extends State<LivreurStatsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LivreurStatsProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<LivreurStatsProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Statistiques')),
      body: RefreshIndicator(
        onRefresh: () => prov.load(),
        child: prov.loading && prov.data == null
            ? const _Loader()
            : prov.error != null
                ? _Err(error: prov.error!, onRetry: prov.load)
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _ScopeBar(prov: prov),
                      const SizedBox(height: 16),
                      _HeroBlock(data: prov.data ?? {}),
                      const SizedBox(height: 12),
                      _CashboxBlock(data: prov.data ?? {}, prov: prov),
                      const SizedBox(height: 12),
                      _CountersGrid(data: prov.data ?? {}),
                      const SizedBox(height: 12),
                      _TopZonesBlock(data: prov.data ?? {}),
                      const SizedBox(height: 12),
                      _PerformanceBlock(data: prov.data ?? {}),
                      const SizedBox(height: 12),
                      _SparklineBlock(data: prov.data ?? {}),
                    ],
                  ),
      ),
    );
  }
}

class _ScopeBar extends StatelessWidget {
  final LivreurStatsProvider prov;
  const _ScopeBar({required this.prov});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final s in StatsScope.values)
          ChoiceChip(
            label: Text(_label(s)),
            selected: prov.scope == s,
            onSelected: (_) async {
              if (s == StatsScope.custom) {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime(2024),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  await prov.setScope(StatsScope.custom, date: picked);
                }
              } else {
                await prov.setScope(s);
              }
            },
          ),
      ],
    );
  }

  String _label(StatsScope s) => switch (s) {
        StatsScope.today => "Aujourd'hui",
        StatsScope.yesterday => 'Hier',
        StatsScope.week => 'Cette semaine',
        StatsScope.month => 'Ce mois',
        StatsScope.custom => 'Choisir une date',
      };
}

class _HeroBlock extends StatelessWidget {
  final Map<String, dynamic> data;
  const _HeroBlock({required this.data});

  @override
  Widget build(BuildContext context) {
    final scope = (data['scopeLabel'] ?? '').toString();
    final total = (data['totalCommandes'] ?? 0);
    final livrees = (data['livrees'] ?? 0);
    final enLivraison = (data['enLivraison'] ?? 0);
    final reportees = (data['reportees'] ?? 0);
    final retournees = (data['retournees'] ?? 0);

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFF60A5FA)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E40AF).withValues(alpha: 0.32),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.bar_chart_rounded,
                  color: Colors.white70, size: 18),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  scope,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$total',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 52,
                  fontWeight: FontWeight.w900,
                  height: 1,
                ),
              ),
              const SizedBox(width: 8),
              const Padding(
                padding: EdgeInsets.only(bottom: 10),
                child: Text(
                  'commandes',
                  style: TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _HeroPill(
                label: 'Livrées',
                value: livrees.toString(),
                color: const Color(0xFF22C55E),
              ),
              const SizedBox(width: 8),
              _HeroPill(
                label: 'En cours',
                value: enLivraison.toString(),
                color: const Color(0xFFFBBF24),
              ),
              const SizedBox(width: 8),
              _HeroPill(
                label: 'Reportées',
                value: reportees.toString(),
                color: const Color(0xFFF97316),
              ),
              const SizedBox(width: 8),
              _HeroPill(
                label: 'Retours',
                value: retournees.toString(),
                color: const Color(0xFFEF4444),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _HeroPill({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
        ),
        child: Column(
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.6),
                    blurRadius: 4,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white70,
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
}

class _CashboxBlock extends StatelessWidget {
  final Map<String, dynamic> data;
  final LivreurStatsProvider prov;
  const _CashboxBlock({required this.data, required this.prov});

  @override
  Widget build(BuildContext context) {
    final cash = (data['cashCod'] as Map<String, dynamic>?) ?? {};
    final total = (cash['totalTnd'] as num?)?.toDouble() ?? 0;
    final count = (cash['nombrePaiements'] as num?)?.toInt() ?? 0;
    final remis = cash['remisAuDepot'] == true;
    final remisAt = cash['remisAt']?.toString();

    final parts = total.toStringAsFixed(2).split('.');
    final whole = parts[0];
    final cents = parts.length > 1 ? parts[1] : '00';

    final hasMoney = total > 0;
    final gradientColors = remis
        ? const [Color(0xFF166534), Color(0xFF16A34A)]
        : hasMoney
            ? const [Color(0xFF065F46), Color(0xFF059669), Color(0xFF10B981)]
            : const [Color(0xFF334155), Color(0xFF475569)];

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: gradientColors.first.withValues(alpha: 0.30),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.account_balance_wallet_rounded,
                    color: Colors.white, size: 18),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Caisse COD',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.20),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$count paiement${count > 1 ? 's' : ''}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 11.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: whole,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 44,
                    height: 1,
                  ),
                ),
                const TextSpan(
                  text: '.',
                  style: TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.w900,
                    fontSize: 38,
                  ),
                ),
                TextSpan(
                  text: cents,
                  style: const TextStyle(
                    color: Color(0xFFFFE066),
                    fontWeight: FontWeight.w900,
                    fontSize: 38,
                    height: 1,
                  ),
                ),
                const TextSpan(
                  text: '  DT',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (remis && remisAt != null)
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
              ),
              child: Row(children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Caisse remise à ${DateFormat('HH:mm').format(DateTime.tryParse(remisAt) ?? DateTime.now())}",
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ]),
            )
          else if (hasMoney)
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: gradientColors.first,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                  ),
                ),
                icon: const Icon(Icons.local_atm_rounded),
                label: const Text('Remettre la caisse au dépôt'),
                onPressed: () async {
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Remettre la caisse'),
                      content: Text(
                          'Vous remettez ${total.toStringAsFixed(2)} DT correspondant à $count commandes. Confirmer ?'),
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
                  if (ok == true) await prov.remettreCaisse();
                },
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Aucun encaissement pour cette période.',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontWeight: FontWeight.w600,
                  fontSize: 12.5,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CountersGrid extends StatelessWidget {
  final Map<String, dynamic> data;
  const _CountersGrid({required this.data});

  @override
  Widget build(BuildContext context) {
    final live = (data['livrees'] as num?)?.toInt() ?? 0;
    final enl = (data['enLivraison'] as num?)?.toInt() ?? 0;
    final rep = (data['reportees'] as num?)?.toInt() ?? 0;
    final ret = (data['retournees'] as num?)?.toInt() ?? 0;

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: [
        _CounterCard(label: 'Livrées', value: live, color: Colors.green),
        _CounterCard(label: 'En livraison', value: enl, color: Colors.blue),
        _CounterCard(label: 'Reportées', value: rep, color: Colors.orange),
        _CounterCard(label: 'Retournées', value: ret, color: Colors.red),
      ],
    );
  }
}

class _CounterCard extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _CounterCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700)),
            Text('$value',
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class _TopZonesBlock extends StatelessWidget {
  final Map<String, dynamic> data;
  const _TopZonesBlock({required this.data});

  @override
  Widget build(BuildContext context) {
    final list = (data['topZones'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        [];
    if (list.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('Top zones du jour : aucune livraison.'),
        ),
      );
    }
    final maxCount = list.map((z) => (z['count'] ?? 0) as num).reduce((a, b) => a > b ? a : b).toDouble();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Top zones',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            for (final z in list)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Expanded(flex: 3, child: Text((z['ville'] ?? '').toString())),
                    Expanded(
                      flex: 5,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: maxCount == 0 ? 0 : ((z['count'] ?? 0) as num) / maxCount,
                          minHeight: 10,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 40,
                      child: Text(' ${z['count']}',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _PerformanceBlock extends StatelessWidget {
  final Map<String, dynamic> data;
  const _PerformanceBlock({required this.data});

  @override
  Widget build(BuildContext context) {
    final perf = (data['performance'] as Map<String, dynamic>?) ?? {};
    final livr = (perf['tauxLivraison'] as num?)?.toDouble() ?? 0;
    final retour = (perf['tauxRetour'] as num?)?.toDouble() ?? 0;
    final delta = (perf['deltaLivraisonVsJourPrecedent'] as num?)?.toDouble() ?? 0;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Performance',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            Text('Taux de livraison : ${livr.toStringAsFixed(1)} %'),
            Text('Taux de retour : ${retour.toStringAsFixed(1)} %'),
            Row(children: [
              Icon(delta >= 0 ? Icons.arrow_upward : Icons.arrow_downward,
                  size: 16, color: delta >= 0 ? Colors.green : Colors.red),
              Text('${delta.toStringAsFixed(1)} % vs jour précédent'),
            ]),
          ],
        ),
      ),
    );
  }
}

class _SparklineBlock extends StatelessWidget {
  final Map<String, dynamic> data;
  const _SparklineBlock({required this.data});

  @override
  Widget build(BuildContext context) {
    final spark = (data['sparkline7Jours'] as List?)?.cast<num>() ?? <num>[];
    final maxVal = spark.isEmpty ? 1.0 : spark.map((e) => e.toDouble()).reduce((a, b) => a > b ? a : b);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('7 derniers jours',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 12),
            SizedBox(
              height: 60,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final v in spark)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Container(
                          height: maxVal == 0 ? 0 : v.toDouble() / maxVal * 60,
                          decoration: BoxDecoration(
                            color: Colors.blue.shade400,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Loader extends StatelessWidget {
  const _Loader();
  @override
  Widget build(BuildContext context) =>
      const Center(child: CircularProgressIndicator());
}

class _Err extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _Err({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Réessayer')),
          ],
        ),
      ),
    );
  }
}
