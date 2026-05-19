import 'package:flutter/material.dart';

/// Section 2.3 — Sélection statut/motif livreur en 2 étapes.
///  - Étape 1 : Livré / Reporter / Retourner
///  - Étape 2 : motif (selon statut choisi).
///
/// Pour COLIS_ENDOMMAGE_DEPOT, la photo est obligatoire (l'écran appelant
/// doit faire un image_picker avant de submit).
class LivreurStatusMotifSheet {
  static Future<({String status, String? motif, String? note})?> show(BuildContext context) async {
    return showModalBottomSheet<({String status, String? motif, String? note})?>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _Step1(),
    );
  }
}

class _Step1 extends StatelessWidget {
  const _Step1();
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text('Choisir le statut',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ),
          ListTile(
            leading: const Icon(Icons.check_circle, color: Colors.green),
            title: const Text('Livré'),
            subtitle: const Text('Commande remise et payée'),
            onTap: () => Navigator.pop(context, (status: 'LIVRE', motif: null, note: null)),
          ),
          ListTile(
            leading: const Icon(Icons.access_time, color: Colors.orange),
            title: const Text('Reporter'),
            subtitle: const Text("Le client n'a pas reçu, on retentera"),
            onTap: () async {
              final res = await Navigator.push<({String motif, String? note})?>(
                context,
                MaterialPageRoute(
                    fullscreenDialog: true,
                    builder: (_) => const _Step2Reporter()),
              );
              if (res != null && context.mounted) {
                Navigator.pop(context, (status: 'REPORTE', motif: res.motif, note: res.note));
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.undo, color: Colors.red),
            title: const Text('Retourner'),
            subtitle: const Text('Terminal — la commande revient au dépôt'),
            onTap: () async {
              final res = await Navigator.push<({String motif, String? note})?>(
                context,
                MaterialPageRoute(
                    fullscreenDialog: true,
                    builder: (_) => const _Step2Retourner()),
              );
              if (res != null && context.mounted) {
                Navigator.pop(context, (status: 'RETOUR', motif: res.motif, note: res.note));
              }
            },
          ),
          const Divider(),
          ListTile(
            title: const Center(child: Text('Annuler')),
            onTap: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }
}

class _Step2Reporter extends StatefulWidget {
  const _Step2Reporter();
  @override
  State<_Step2Reporter> createState() => _Step2ReporterState();
}

class _Step2ReporterState extends State<_Step2Reporter> {
  String? _motif;
  final _note = TextEditingController();

  static const motifs = <(String, String)>[
    ('CLIENT_NON_JOIGNABLE', 'Client non joignable (téléphone éteint, ne répond pas)'),
    ('CLIENT_ABSENT', 'Client absent au rendez-vous'),
    ('ADRESSE_INTROUVABLE', 'Adresse introuvable'),
    ('ADRESSE_INCOMPLETE', 'Adresse incomplète / imprécise'),
    ('NUMERO_INVALIDE', 'Numéro de téléphone invalide'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Motif du report')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final m in motifs)
            RadioListTile<String>(
              value: m.$1,
              groupValue: _motif,
              onChanged: (v) => setState(() => _motif = v),
              title: Text(m.$2),
            ),
          const SizedBox(height: 12),
          TextField(
            controller: _note,
            decoration: const InputDecoration(
                labelText: 'Note (optionnelle)', border: OutlineInputBorder()),
            maxLines: 3,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _motif == null
                ? null
                : () => Navigator.pop(
                    context, (motif: _motif!, note: _note.text.trim().isEmpty ? null : _note.text.trim())),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
  }
}

class _Step2Retourner extends StatefulWidget {
  const _Step2Retourner();
  @override
  State<_Step2Retourner> createState() => _Step2RetournerState();
}

class _Step2RetournerState extends State<_Step2Retourner> {
  String? _motif;
  final _note = TextEditingController();

  static const motifs = <(String, String, bool)>[
    ('CLIENT_REFUSE_COMMANDE', 'Client refuse la commande', false),
    ('COLIS_ENDOMMAGE_DEPOT', 'Colis endommagé', true),
    ('AUTRE_INCIDENT', 'Autre incident', false),
  ];

  @override
  Widget build(BuildContext context) {
    final photoMandatory = _motif == 'COLIS_ENDOMMAGE_DEPOT';
    return Scaffold(
      appBar: AppBar(title: const Text('Motif du retour')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final m in motifs)
            RadioListTile<String>(
              value: m.$1,
              groupValue: _motif,
              onChanged: (v) => setState(() => _motif = v),
              title: Text(m.$2),
              subtitle: m.$3 ? const Text('Photo obligatoire') : null,
            ),
          const SizedBox(height: 12),
          TextField(
            controller: _note,
            decoration: InputDecoration(
                labelText: photoMandatory ? 'Description (obligatoire)' : 'Note (optionnelle)',
                border: const OutlineInputBorder()),
            maxLines: 3,
          ),
          if (photoMandatory)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text("⚠️ Joignez une photo du colis endommagé après confirmation.",
                  style: TextStyle(color: Colors.orange)),
            ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _motif == null
                ? null
                : () => Navigator.pop(
                    context, (motif: _motif!, note: _note.text.trim().isEmpty ? null : _note.text.trim())),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
  }
}
