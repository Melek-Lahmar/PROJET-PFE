import 'package:flutter/material.dart';

class ClientClaimForm extends StatefulWidget {
  final String initialPiece;
  final Future<void> Function({
    required String doPiece,
    required String motif,
    required String description,
    String? typeReclamation,
    String? priorite,
  }) onSubmit;

  const ClientClaimForm({
    super.key,
    required this.initialPiece,
    required this.onSubmit,
  });

  @override
  State<ClientClaimForm> createState() => _ClientClaimFormState();
}

class _ClientClaimFormState extends State<ClientClaimForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _pieceCtrl;
  final _motifCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  String _type = 'LIVRAISON';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _pieceCtrl = TextEditingController(text: widget.initialPiece);
  }

  @override
  void dispose() {
    _pieceCtrl.dispose();
    _motifCtrl.dispose();
    _descriptionCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextFormField(
            controller: _pieceCtrl,
            decoration: const InputDecoration(
              labelText: 'Numéro de colis',
              border: OutlineInputBorder(),
            ),
            validator: (value) => (value == null || value.trim().isEmpty) ? 'Champ obligatoire' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _type,
            items: const [
              DropdownMenuItem(value: 'LIVRAISON', child: Text('Livraison')),
              DropdownMenuItem(value: 'PRODUIT', child: Text('Produit')),
              DropdownMenuItem(value: 'PAIEMENT', child: Text('Paiement')),
              DropdownMenuItem(value: 'SERVICE', child: Text('Service')),
              DropdownMenuItem(value: 'AUTRE', child: Text('Autre')),
            ],
            onChanged: (value) => setState(() => _type = value ?? 'LIVRAISON'),
            decoration: const InputDecoration(
              labelText: 'Type',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _motifCtrl,
            decoration: const InputDecoration(
              labelText: 'Motif',
              border: OutlineInputBorder(),
            ),
            validator: (value) => (value == null || value.trim().isEmpty) ? 'Champ obligatoire' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _descriptionCtrl,
            minLines: 4,
            maxLines: 8,
            decoration: const InputDecoration(
              labelText: 'Description',
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
            validator: (value) => (value == null || value.trim().length < 10)
                ? 'Décris le problème en quelques mots.'
                : null,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _submitting
                  ? null
                  : () async {
                      if (!_formKey.currentState!.validate()) return;
                      setState(() => _submitting = true);
                      try {
                        await widget.onSubmit(
                          doPiece: _pieceCtrl.text.trim(),
                          motif: _motifCtrl.text.trim(),
                          description: _descriptionCtrl.text.trim(),
                          typeReclamation: _type,
                        );
                      } finally {
                        if (mounted) setState(() => _submitting = false);
                      }
                    },
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.support_agent_rounded),
              label: const Text('Envoyer la réclamation'),
            ),
          ),
        ],
      ),
    );
  }
}
