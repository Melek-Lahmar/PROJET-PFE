import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';

/// Section 2.24 — onglet Paramètres admin : couleur thème + mode clair/sombre.
class AdminSettingsAppearanceScreen extends StatefulWidget {
  const AdminSettingsAppearanceScreen({super.key});
  @override
  State<AdminSettingsAppearanceScreen> createState() =>
      _AdminSettingsAppearanceScreenState();
}

class _AdminSettingsAppearanceScreenState
    extends State<AdminSettingsAppearanceScreen> {
  static const _palette = [
    ('#1976D2', Color(0xFF1976D2), 'Bleu'),
    ('#388E3C', Color(0xFF388E3C), 'Vert'),
    ('#F57C00', Color(0xFFF57C00), 'Orange'),
    ('#7B1FA2', Color(0xFF7B1FA2), 'Violet'),
    ('#C62828', Color(0xFFC62828), 'Rouge'),
    ('#FBC02D', Color(0xFFFBC02D), 'Jaune'),
    ('#212121', Color(0xFF212121), 'Noir'),
    ('#FFFFFF', Color(0xFFFFFFFF), 'Blanc'),
  ];

  String _color = '#1976D2';
  String _mode = 'auto';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      final data = await api.getMap('/api/admin/config/theme');
      _color = (data['primaryColor'] ?? '#1976D2').toString();
      _mode = (data['themeMode'] ?? 'auto').toString();
      if (mounted) setState(() {});
    } catch (_) {/* mute */}
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      await api.putJson('/api/admin/config/theme', {
        'primaryColor': _color,
        'themeMode': _mode,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Thème mis à jour.')));
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
      appBar: AppBar(title: const Text('Apparence')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Couleur principale',
              style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: _palette.map((p) {
              final selected = _color.toLowerCase() == p.$1.toLowerCase();
              return GestureDetector(
                onTap: () => setState(() => _color = p.$1),
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: p.$2,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected ? Colors.black : Colors.grey.shade300,
                      width: selected ? 3 : 1,
                    ),
                  ),
                  child: selected
                      ? const Icon(Icons.check, color: Colors.white)
                      : null,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          const Text('Mode', style: TextStyle(fontWeight: FontWeight.w800)),
          for (final m in ['light', 'dark', 'auto'])
            RadioListTile<String>(
              value: m,
              groupValue: _mode,
              onChanged: (v) => setState(() => _mode = v ?? 'auto'),
              title: Text(_modeLabel(m)),
            ),
          const SizedBox(height: 24),
          const Text('Aperçu', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Container(
            height: 80,
            decoration: BoxDecoration(
              color: _hexToColor(_color),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Text('Bouton primaire',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Enregistrement...' : 'Enregistrer')),
        ],
      ),
    );
  }

  String _modeLabel(String m) => switch (m) {
        'light' => '☀️ Clair',
        'dark' => '🌙 Sombre',
        _ => '🌓 Auto (suit le système)',
      };

  static Color _hexToColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    final value = int.tryParse(cleaned, radix: 16) ?? 0;
    return Color(0xFF000000 | value);
  }
}
