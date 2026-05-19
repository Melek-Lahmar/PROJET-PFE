import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/correction_parser.dart';
import '../../core/validators.dart';
import '../../data/reclamation_motifs.dart';
import '../../models/client_claim.dart';
import '../../state/client_demandes_provider.dart';
import '../widgets/claims/address_correction_field.dart';
import '../widgets/claims/demande_color_indicator.dart';

class ClientDemandeReplyScreen extends StatefulWidget {
  final int demandeId;
  const ClientDemandeReplyScreen({super.key, required this.demandeId});
  @override
  State<ClientDemandeReplyScreen> createState() => _ClientDemandeReplyScreenState();
}

class _ClientDemandeReplyScreenState extends State<ClientDemandeReplyScreen> {
  ClientClaim? _demande;
  bool _loading = true;
  bool _sending = false;

  final _phoneCtrl = TextEditingController();

  // Phase 6 — valeurs remontées par AddressCorrectionField
  String? _address;
  double? _latitude;
  double? _longitude;
  String? _repere;
  String? _instructions;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await context.read<ClientDemandesProvider>().fetchDetails(widget.demandeId);
    if (!mounted) return;
    setState(() {
      _demande = data;
      _loading = false;
    });
  }

  bool _isAddressMotif(String motif) {
    final m = motif.toUpperCase();
    return m == 'ADRESSE_INCORRECTE' ||
        m == 'ADRESSE_INCOMPLETE' ||
        m == 'ADRESSE_INTROUVABLE';
  }

  bool _isPhoneMotif(String motif) => motif.toUpperCase() == 'NUMERO_INCORRECT';

  Future<void> _submit() async {
    final d = _demande;
    if (d == null) return;

    setState(() => _sending = true);

    String? newAddress;
    String? newPhone;

    if (_isAddressMotif(d.motif)) {
      newAddress = _address;
      if (newAddress == null || newAddress.length < 5) {
        _showError('Adresse trop courte.');
        setState(() => _sending = false);
        return;
      }
      if (_latitude == null || _longitude == null) {
        _showError('Position GPS requise : touche la carte ou utilise "Ma position".');
        setState(() => _sending = false);
        return;
      }
    }

    if (_isPhoneMotif(d.motif)) {
      final err = TunisianPhoneValidator.validate(_phoneCtrl.text);
      if (err != null) {
        _showError(err);
        setState(() => _sending = false);
        return;
      }
      newPhone = TunisianPhoneValidator.normalize(_phoneCtrl.text.trim());
    }

    final result = await context.read<ClientDemandesProvider>().reply(
          widget.demandeId,
          newAddress: newAddress,
          latitude: _latitude,
          longitude: _longitude,
          newPhone: newPhone,
          repere: _repere,
          instructionsLivreur: _instructions,
        );

    if (!mounted) return;
    setState(() => _sending = false);
    if (result != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Réponse envoyée au support.')),
      );
      Navigator.of(context).pop();
    } else {
      final err = context.read<ClientDemandesProvider>().error;
      _showError(err ?? 'Impossible d\'envoyer.');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final d = _demande;
    return Scaffold(
      appBar: AppBar(title: const Text('Répondre à la demande')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : d == null
              ? const Center(child: Text('Demande introuvable.'))
              : _buildForm(d),
    );
  }

  Widget _buildForm(ClientClaim d) {
    final isAddress = _isAddressMotif(d.motif);
    final isPhone = _isPhoneMotif(d.motif);
    final statut = d.statut.toUpperCase();
    // Le formulaire n'est actif qu'en `ENVOYEE`. Dans les autres états, le
    // client a déjà corrigé (EN_COURS_DE_TRAITEMENT), le dossier est clôturé
    // (CLOTUREE) ou refusé (REFUSEE) : on verrouille et on informe.
    final canEdit = statut == 'ENVOYEE';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: DemandeColorIndicator(statut: d.statut),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Motif', style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 4),
                Text(
                  labelForLivreurMotif(d.motif),
                  style:
                      const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text('Commande : ${d.doPiece}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (canEdit) ...[
          if (isAddress) _buildAddressForm(),
          if (isPhone) _buildPhoneForm(),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _sending ? null : _submit,
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.send_rounded),
              label: Text(_sending ? 'Envoi...' : 'Envoyer la réponse'),
            ),
          ),
        ] else
          _LockedStateView(demande: d),
      ],
    );
  }

  Widget _buildAddressForm() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Nouvelle adresse',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 10),
            AddressCorrectionField(
              onChanged: ({
                required String? address,
                required double? latitude,
                required double? longitude,
                required String? repere,
                required String? instructionsLivreur,
              }) {
                setState(() {
                  _address = address;
                  _latitude = latitude;
                  _longitude = longitude;
                  _repere = repere;
                  _instructions = instructionsLivreur;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhoneForm() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Nouveau numéro',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 10),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              maxLength: 20,
              decoration: const InputDecoration(
                labelText: 'Téléphone tunisien',
                hintText: '22123456 ou +216 22 123 456',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.phone_rounded),
              ),
            ),
            const Text(
              'Format : 8 chiffres (22xxxxxx, 54xxxxxx, 99xxxxxx, etc.)',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

/// Affichage "lecture seule" quand la demande n'est plus en `ENVOYEE`.
/// Explique clairement au client pourquoi il ne peut plus toucher au
/// formulaire, et lui remontre ce qu'il avait envoyé.
class _LockedStateView extends StatelessWidget {
  final ClientClaim demande;
  const _LockedStateView({required this.demande});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final statut = demande.statut.toUpperCase();
    final correction = ProposedCorrection.parse(demande.correctionProposee);
    final rows = correction.toDisplayRows();

    final (IconData icon, String title, String body, Color color) =
        switch (statut) {
      'EN_COURS_DE_TRAITEMENT' => (
        Icons.hourglass_top_rounded,
        'Ta correction a bien été envoyée',
        'La confirmatrice la vérifie. Tu ne peux plus modifier cette demande.',
        Colors.green.shade700,
      ),
      'CLOTUREE' => (
        Icons.check_circle_rounded,
        'Dossier clôturé',
        'La correction a été appliquée à ta commande.',
        Colors.green.shade800,
      ),
      'REFUSEE' => (
        Icons.cancel_rounded,
        'Demande refusée',
        (demande.motifRefus ?? '').isNotEmpty
            ? demande.motifRefus!
            : 'La confirmatrice n\'a pas pu valider cette correction.',
        scheme.error,
      ),
      _ => (
        Icons.lock_outline_rounded,
        'Formulaire verrouillé',
        'Cette demande ne permet plus de modification.',
        scheme.onSurfaceVariant,
      ),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          color: color.withOpacity(0.08),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: color, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                            fontWeight: FontWeight.w900, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Text(body),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (rows.isNotEmpty) ...[
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ta correction envoyée',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 10),
                  ...rows.map(
                    (kv) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 130,
                            child: Text(
                              kv.key,
                              style: TextStyle(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              kv.value,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
