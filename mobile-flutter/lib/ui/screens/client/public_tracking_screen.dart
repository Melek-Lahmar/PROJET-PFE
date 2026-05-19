import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/public_tracking_service.dart';

/// Section 2.12 — Mode invité / suivi public.
class PublicTrackingScreen extends StatefulWidget {
  const PublicTrackingScreen({super.key});
  @override
  State<PublicTrackingScreen> createState() => _PublicTrackingScreenState();
}

class _PublicTrackingScreenState extends State<PublicTrackingScreen> {
  late final _service = PublicTrackingService(context.read<ApiClient>());
  final _piece = TextEditingController();
  final _last4 = TextEditingController();
  bool _loading = false;
  String? _error;
  int _attempts = 0;
  Map<String, dynamic>? _result;

  Future<void> _track() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _result = await _service.track(
        piece: _piece.text.trim(),
        phoneLast4: _last4.text.trim(),
      );
      _attempts = 0;
    } catch (e) {
      _attempts++;
      _error = e.toString();
      if (_attempts >= 5) {
        _error = "Trop d'échecs. Patientez avant de réessayer.";
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Suivre un colis sans compte')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_result == null) ...[
            const Text(
                "Saisissez le numéro de commande et les 4 derniers chiffres du téléphone du destinataire."),
            const SizedBox(height: 16),
            TextField(
              controller: _piece,
              decoration: const InputDecoration(labelText: 'Numéro de commande (BL00123)'),
              autocorrect: false,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _last4,
              decoration: const InputDecoration(labelText: '4 derniers chiffres téléphone'),
              maxLength: 4,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _loading || _attempts >= 5 ? null : _track,
              child: Text(_loading ? 'Recherche...' : 'Suivre'),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
          ] else ...[
            _PublicResult(data: _result!, onReset: () {
              setState(() {
                _result = null;
                _piece.clear();
                _last4.clear();
              });
            }),
          ],
        ],
      ),
    );
  }
}

class _PublicResult extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onReset;
  const _PublicResult({required this.data, required this.onReset});

  @override
  Widget build(BuildContext context) {
    final piece = data['piece']?.toString() ?? '-';
    final statut = data['statut']?.toString() ?? '-';
    final eta = (data['etaMinutes'] as num?)?.toInt();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Commande $piece', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('Statut : $statut'),
            if (eta != null && eta > 0) Text('ETA : ~ $eta min'),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onReset,
              icon: const Icon(Icons.refresh),
              label: const Text('Suivre une autre commande'),
            ),
          ],
        ),
      ),
    );
  }
}
