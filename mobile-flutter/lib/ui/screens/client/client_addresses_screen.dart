import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/client_addresses_service.dart';
import '../../../data/services/offline_queue_service.dart';

/// Section 2.8 — carnet d'adresses client (max 3, validé côté API).
class ClientAddressesScreen extends StatefulWidget {
  const ClientAddressesScreen({super.key});
  @override
  State<ClientAddressesScreen> createState() => _ClientAddressesScreenState();
}

class _ClientAddressesScreenState extends State<ClientAddressesScreen> {
  late final ClientAddressesService _service = ClientAddressesService(
    context.read<ApiClient>(),
    offline: context.read<OfflineQueueService>(),
  );
  List<ClientAddress> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _items = await _service.list();
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _openForm({ClientAddress? edit}) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => _AddressFormScreen(service: _service, edit: edit),
      ),
    );
    if (saved == true) await _load();
  }

  Future<void> _delete(ClientAddress a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer cette adresse ?'),
        content: Text(a.label),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (ok == true) {
      try {
        await _service.delete(a.id);
        await _load();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
        }
      }
    }
  }

  Future<void> _setDefault(ClientAddress a) async {
    try {
      await _service.setDefault(a.id);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes adresses')),
      floatingActionButton: _items.length >= 3
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openForm(),
              icon: const Icon(Icons.add),
              label: const Text('Ajouter'),
            ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!),
                      FilledButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? const _Empty()
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemBuilder: (_, i) {
                            final a = _items[i];
                            return Card(
                              child: ListTile(
                                leading: Icon(
                                    a.isDefault
                                        ? Icons.star
                                        : Icons.location_on_outlined,
                                    color: a.isDefault ? Colors.amber : null),
                                title: Text(a.label),
                                subtitle: Text(
                                    "${a.adresse}, ${a.ville} ${a.gouvernorat}"),
                                trailing: PopupMenuButton<String>(
                                  onSelected: (v) {
                                    switch (v) {
                                      case 'edit':
                                        _openForm(edit: a);
                                        break;
                                      case 'default':
                                        _setDefault(a);
                                        break;
                                      case 'delete':
                                        _delete(a);
                                        break;
                                    }
                                  },
                                  itemBuilder: (_) => [
                                    const PopupMenuItem(value: 'edit', child: Text('Modifier')),
                                    if (!a.isDefault)
                                      const PopupMenuItem(
                                          value: 'default',
                                          child: Text('Définir par défaut')),
                                    const PopupMenuItem(value: 'delete', child: Text('Supprimer')),
                                  ],
                                ),
                              ),
                            );
                          },
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemCount: _items.length,
                        ),
                ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) {
    return ListView(
      children: const [
        SizedBox(height: 80),
        Icon(Icons.location_off, size: 56, color: Colors.grey),
        SizedBox(height: 12),
        Center(child: Text('Aucune adresse enregistrée.')),
      ],
    );
  }
}

class _AddressFormScreen extends StatefulWidget {
  final ClientAddressesService service;
  final ClientAddress? edit;
  const _AddressFormScreen({required this.service, this.edit});
  @override
  State<_AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends State<_AddressFormScreen> {
  late final _label = TextEditingController(text: widget.edit?.label ?? 'Maison');
  late final _adresse = TextEditingController(text: widget.edit?.adresse ?? '');
  late final _gouv = TextEditingController(text: widget.edit?.gouvernorat ?? '');
  late final _ville = TextEditingController(text: widget.edit?.ville ?? '');
  late final _cp = TextEditingController(text: widget.edit?.codePostal ?? '');
  late bool _isDefault = widget.edit?.isDefault ?? false;
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.edit == null ? 'Nouvelle adresse' : 'Modifier adresse')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            TextField(controller: _label, decoration: const InputDecoration(labelText: 'Libellé (Maison, Travail…)')),
            TextField(controller: _adresse, decoration: const InputDecoration(labelText: 'Adresse')),
            TextField(controller: _gouv, decoration: const InputDecoration(labelText: 'Gouvernorat')),
            TextField(controller: _ville, decoration: const InputDecoration(labelText: 'Ville')),
            TextField(controller: _cp, decoration: const InputDecoration(labelText: 'Code postal')),
            CheckboxListTile(
              value: _isDefault,
              onChanged: (v) => setState(() => _isDefault = v ?? false),
              title: const Text('Par défaut'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Enregistrement...' : 'Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final body = {
      'label': _label.text.trim(),
      'adresse': _adresse.text.trim(),
      'gouvernorat': _gouv.text.trim(),
      'ville': _ville.text.trim(),
      if (_cp.text.trim().isNotEmpty) 'codePostal': _cp.text.trim(),
      'isDefault': _isDefault,
    };
    try {
      if (widget.edit == null) {
        await widget.service.create(body);
      } else {
        await widget.service.update(widget.edit!.id, body);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
        setState(() => _saving = false);
      }
    }
  }
}
