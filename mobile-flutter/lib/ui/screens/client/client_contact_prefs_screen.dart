import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/offline_queue_service.dart';

/// Section 2.10 — préférences de contact client (Appel / SMS / Both).
class ClientContactPrefsScreen extends StatefulWidget {
  const ClientContactPrefsScreen({super.key});

  @override
  State<ClientContactPrefsScreen> createState() => _ClientContactPrefsScreenState();
}

class _ClientContactPrefsScreenState extends State<ClientContactPrefsScreen> {
  String _selected = 'Both';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadCurrent();
  }

  Future<void> _loadCurrent() async {
    try {
      final api = context.read<ApiClient>();
      final me = await api.getMap('/api/auth/me');
      final pref = me['contactPreference'] ?? me['profile']?['contactPreference'] ?? 'Both';
      setState(() => _selected = pref.toString());
    } catch (_) {/* mute */}
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      // V2-2 — passe par OfflineQueueService pour fonctionner hors ligne :
      // envoi direct si réseau OK, sinon enqueue + UI optimiste.
      final queue = context.read<OfflineQueueService>();
      final result = await queue.sendOrQueue(
        method: 'PUT',
        endpoint: '/api/client/profile/contact-preference',
        body: {'contactPreference': _selected},
      );
      if (mounted) {
        final msg = result.wasSent
            ? 'Préférence enregistrée.'
            : 'Préférence enregistrée localement, sera synchronisée au retour réseau.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Communication')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
              'Comment souhaitez-vous être contacté par le livreur ?',
              style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          for (final v in ['AppelOnly', 'SmsOnly', 'Both'])
            RadioListTile<String>(
              value: v,
              groupValue: _selected,
              onChanged: (s) => setState(() => _selected = s ?? 'Both'),
              title: Text(_label(v)),
              subtitle: Text(_help(v)),
            ),
          const SizedBox(height: 16),
          FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Enregistrement...' : 'Enregistrer')),
        ],
      ),
    );
  }

  String _label(String v) => switch (v) {
        'AppelOnly' => '📞 Appel uniquement',
        'SmsOnly' => '💬 SMS uniquement',
        _ => '📞 + 💬 Les deux (recommandé)',
      };

  String _help(String v) => switch (v) {
        'AppelOnly' => 'Le livreur vous appellera ; pas de SMS automatique.',
        'SmsOnly' => 'Le livreur vous enverra un SMS ; pas d\'appel sauf urgence.',
        _ => 'Combinaison la plus fiable.',
      };
}
