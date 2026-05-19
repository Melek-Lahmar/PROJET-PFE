import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/confirmatrice_claims_provider.dart';

class EchangeLineInput {
  final TextEditingController arRefCtrl;
  final TextEditingController designationCtrl;
  final TextEditingController quantiteCtrl;
  final TextEditingController prixCtrl;
  bool include;

  EchangeLineInput({
    String? arRef,
    String? designation,
    double? quantite,
    double? prix,
    this.include = true,
  })  : arRefCtrl = TextEditingController(text: arRef ?? ''),
        designationCtrl = TextEditingController(text: designation ?? ''),
        quantiteCtrl = TextEditingController(text: (quantite ?? 1).toString()),
        prixCtrl = TextEditingController(text: (prix ?? 0).toString());

  Map<String, dynamic> toMap(String type) => {
        'type': type,
        'arRef': arRefCtrl.text.trim(),
        'designation': designationCtrl.text.trim(),
        'quantite': double.tryParse(quantiteCtrl.text.replaceAll(',', '.')) ?? 1,
        'prixUnitaire': double.tryParse(prixCtrl.text.replaceAll(',', '.')) ?? 0,
      };

  void dispose() {
    arRefCtrl.dispose();
    designationCtrl.dispose();
    quantiteCtrl.dispose();
    prixCtrl.dispose();
  }
}

/// Dialog professionnel pour créer un échange avec lignes structurées.
class EchangeDialog extends StatefulWidget {
  final int reclamationId;

  const EchangeDialog({super.key, required this.reclamationId});

  static Future<Map<String, dynamic>?> show(
    BuildContext context, {
    required int reclamationId,
  }) async {
    return showDialog<Map<String, dynamic>?>(
      context: context,
      builder: (ctx) => ChangeNotifierProvider.value(
        value: context.read<ConfirmatriceClaimsProvider>(),
        child: EchangeDialog(reclamationId: reclamationId),
      ),
    );
  }

  @override
  State<EchangeDialog> createState() => _EchangeDialogState();
}

class _EchangeDialogState extends State<EchangeDialog> {
  bool _loading = true;
  bool _submitting = false;
  final List<EchangeLineInput> _retourLines = [];
  final List<EchangeLineInput> _livraisonLines = [];
  final _noteCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOriginal());
  }

  @override
  void dispose() {
    for (final l in _retourLines) {
      l.dispose();
    }
    for (final l in _livraisonLines) {
      l.dispose();
    }
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOriginal() async {
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final lines = await provider.fetchOriginalLinesForEchange(widget.reclamationId);
    if (!mounted) return;
    setState(() {
      _retourLines.clear();
      _livraisonLines.clear();
      for (final l in lines) {
        final ar = (l['arRef'] ?? '').toString();
        final desig = l['designation']?.toString();
        final qty = double.tryParse('${l['quantite'] ?? 1}'.replaceAll(',', '.')) ?? 1;
        final prix = double.tryParse('${l['prixUnitaire'] ?? 0}'.replaceAll(',', '.')) ?? 0;

        _retourLines.add(EchangeLineInput(
          arRef: ar,
          designation: desig,
          quantite: qty,
          prix: prix,
        ));
        // Pré-remplir les lignes livraison avec la même chose (confirmatrice peut modifier)
        _livraisonLines.add(EchangeLineInput(
          arRef: ar,
          designation: desig,
          quantite: qty,
          prix: prix,
        ));
      }
      if (_retourLines.isEmpty) {
        _retourLines.add(EchangeLineInput());
        _livraisonLines.add(EchangeLineInput());
      }
      _loading = false;
    });
  }

  void _addRetourLine() {
    setState(() => _retourLines.add(EchangeLineInput()));
  }

  void _addLivraisonLine() {
    setState(() => _livraisonLines.add(EchangeLineInput()));
  }

  void _removeRetourLine(int idx) {
    setState(() {
      _retourLines[idx].dispose();
      _retourLines.removeAt(idx);
    });
  }

  void _removeLivraisonLine(int idx) {
    setState(() {
      _livraisonLines[idx].dispose();
      _livraisonLines.removeAt(idx);
    });
  }

  Future<void> _submit() async {
    final retours = _retourLines
        .where((l) => l.include && l.arRefCtrl.text.trim().isNotEmpty)
        .map((l) => l.toMap('RETOUR'))
        .toList();
    final livraisons = _livraisonLines
        .where((l) => l.include && l.arRefCtrl.text.trim().isNotEmpty)
        .map((l) => l.toMap('LIVRAISON'))
        .toList();

    if (retours.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ajoute au moins un article à récupérer.')),
      );
      return;
    }
    if (livraisons.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ajoute au moins un article à livrer.')),
      );
      return;
    }

    setState(() => _submitting = true);
    final provider = context.read<ConfirmatriceClaimsProvider>();
    final result = await provider.createEchange(
      widget.reclamationId,
      lignes: [...retours, ...livraisons],
      note: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _submitting = false);
    if (result != null) {
      Navigator.of(context).pop(result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Commande d\'échange ${result['echangeDoPiece']} créée (${result['lignesCount']} lignes).',
          ),
        ),
      );
    } else {
      final err = provider.error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err ?? 'Impossible de créer l\'échange.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
        child: _loading
            ? const SizedBox(
                height: 200,
                child: Center(child: CircularProgressIndicator()),
              )
            : _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
          child: Row(
            children: [
              const Icon(Icons.swap_horiz_rounded, size: 28),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Créer une commande d\'échange',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              IconButton(
                onPressed: _submitting ? null : () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Retour
              _SectionTitle(
                icon: Icons.undo_rounded,
                label: 'Articles à récupérer',
                color: scheme.error,
              ),
              const SizedBox(height: 8),
              ..._retourLines.asMap().entries.map((e) => _LineCard(
                    line: e.value,
                    onRemove: () => _removeRetourLine(e.key),
                    onChanged: () => setState(() {}),
                  )),
              TextButton.icon(
                onPressed: _addRetourLine,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Ajouter une ligne à récupérer'),
              ),
              const SizedBox(height: 20),

              // Livraison
              _SectionTitle(
                icon: Icons.local_shipping_rounded,
                label: 'Articles à livrer',
                color: scheme.primary,
              ),
              const SizedBox(height: 8),
              ..._livraisonLines.asMap().entries.map((e) => _LineCard(
                    line: e.value,
                    onRemove: () => _removeLivraisonLine(e.key),
                    onChanged: () => setState(() {}),
                  )),
              TextButton.icon(
                onPressed: _addLivraisonLine,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Ajouter une ligne à livrer'),
              ),
              const SizedBox(height: 20),

              TextField(
                controller: _noteCtrl,
                maxLength: 500,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Note interne (optionnelle)',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: _submitting ? null : () => Navigator.of(context).pop(),
                child: const Text('Annuler'),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.check_rounded),
                label: Text(_submitting ? 'Création...' : 'Créer l\'échange'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _SectionTitle({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: color),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 16,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _LineCard extends StatelessWidget {
  final EchangeLineInput line;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  const _LineCard({
    required this.line,
    required this.onRemove,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Row(
              children: [
                Checkbox(
                  value: line.include,
                  onChanged: (v) {
                    line.include = v ?? true;
                    onChanged();
                  },
                ),
                Expanded(
                  child: TextField(
                    controller: line.arRefCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Référence article',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onRemove,
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'Retirer cette ligne',
                ),
              ],
            ),
            const SizedBox(height: 6),
            TextField(
              controller: line.designationCtrl,
              decoration: const InputDecoration(
                labelText: 'Désignation',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: line.quantiteCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Qté',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: line.prixCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'PU (TND)',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
