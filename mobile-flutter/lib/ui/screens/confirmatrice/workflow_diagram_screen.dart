import 'package:flutter/material.dart';

/// Section 2.6 — Schéma interactif des transitions cas / commande pour la
/// confirmatrice. Chaque flèche cliquable → BottomSheet avec acteur, condition,
/// SignalR. Diagramme custom (CustomPainter ; on garde simple, sans SVG).
class WorkflowDiagramScreen extends StatefulWidget {
  const WorkflowDiagramScreen({super.key});
  @override
  State<WorkflowDiagramScreen> createState() => _WorkflowDiagramScreenState();
}

class _WorkflowDiagramScreenState extends State<WorkflowDiagramScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this);

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Comment ça marche ?'),
        bottom: TabBar(controller: _tab, tabs: const [
          Tab(text: 'Cas'),
          Tab(text: 'Commande'),
        ]),
      ),
      body: TabBarView(controller: _tab, children: const [
        _CasDiagram(),
        _CommandeDiagram(),
      ]),
    );
  }
}

class _Transition {
  final String label;
  final String from;
  final String to;
  final String actor;
  final String condition;
  final String signalr;
  final String? sideEffect;
  const _Transition(this.label, this.from, this.to, this.actor, this.condition, this.signalr, [this.sideEffect]);
}

class _CasDiagram extends StatelessWidget {
  const _CasDiagram();

  static const transitions = <_Transition>[
    _Transition('Prendre en charge', 'Envoyée', 'En cours', 'Confirmatrice',
        'Clic sur "Prendre en charge"', 'CasPrisEnCharge', 'Verrou exclusif sur la confirmatrice'),
    _Transition('Clôturer', 'En cours', 'Clôturée', 'Confirmatrice',
        'Cas résolu', 'StatutCasChange'),
    _Transition('Refuser', 'En cours', 'Refusée', 'Confirmatrice',
        'Cas rejeté avec motif', 'StatutCasChange'),
    _Transition('Libération auto', 'En cours', 'Envoyée', 'Système',
        'Pause, déconnexion, timeout 30 min', 'CasLibere',
        'Cas redistribué via score'),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Cycle de vie d\'un cas',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 12),
        const _StateRow(states: ['Envoyée', 'En cours', 'Clôturée', 'Refusée']),
        const SizedBox(height: 16),
        const Text('Transitions :', style: TextStyle(fontWeight: FontWeight.w700)),
        for (final t in transitions)
          _TransitionTile(t: t),
      ],
    );
  }
}

class _CommandeDiagram extends StatelessWidget {
  const _CommandeDiagram();

  static const transitions = <_Transition>[
    _Transition('Confirmer', 'EN_ATTENTE', 'CONFIRME', 'Confirmatrice',
        'Validation manuelle', 'StatutCommandeChange', 'BL généré'),
    _Transition('Refuser', 'EN_ATTENTE', 'REFUSE', 'Confirmatrice',
        'Refus avec motif', 'StatutCommandeChange'),
    _Transition('Pool livreur', 'CONFIRME', 'EN_LIVRAISON', 'Livreur',
        'Prise en charge depuis pool gouvernorat', 'StatutCommandeChange'),
    _Transition('Démarrer livraison', 'EN_LIVRAISON', 'EN_LIVRAISON (active)', 'Livreur',
        'Le livreur se dirige vers ce client', 'DeliveryStarted',
        'IsActiveDelivery=true (1 seule à la fois)'),
    _Transition('Livré', 'EN_LIVRAISON', 'LIVRE', 'Livreur',
        'Encaissement COD confirmé', 'StatutCommandeChange'),
    _Transition('Reporter', 'EN_LIVRAISON', 'REPORTE', 'Livreur',
        'Motif différé (Client absent...)', 'StatutCommandeChange'),
    _Transition('Retour', 'EN_LIVRAISON', 'RETOUR', 'Livreur',
        'Motif terminal (Refus, dommage...)', 'StatutCommandeChange'),
    _Transition('Auto Dépôt', 'REPORTE', 'DEPOT', 'Système (Hangfire)',
        'Job 00:00 incrémente DepotPassageNumber', 'DepotIncremented',
        'Garde-fou max 10 passages'),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Cycle de vie d\'une commande',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 12),
        const _StateRow(
            states: ['EN_ATTENTE', 'CONFIRME', 'EN_LIVRAISON', 'LIVRE', 'REPORTE', 'RETOUR', 'DEPOT']),
        const SizedBox(height: 16),
        const Text('Transitions :', style: TextStyle(fontWeight: FontWeight.w700)),
        for (final t in transitions)
          _TransitionTile(t: t),
      ],
    );
  }
}

class _StateRow extends StatelessWidget {
  final List<String> states;
  const _StateRow({required this.states});
  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final s in states)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.indigo.shade50,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.indigo.shade200),
            ),
            child: Text(s, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
      ],
    );
  }
}

class _TransitionTile extends StatelessWidget {
  final _Transition t;
  const _TransitionTile({required this.t});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.arrow_forward, color: Colors.indigo),
        title: Text("${t.from} → ${t.to}",
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(t.label),
        onTap: () => showModalBottomSheet(
          context: context,
          builder: (_) => Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("${t.from} → ${t.to}",
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                Text("Acteur : ${t.actor}"),
                Text("Condition : ${t.condition}"),
                Text("SignalR : ${t.signalr}"),
                if (t.sideEffect != null) Text("Effet : ${t.sideEffect}"),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('OK'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
