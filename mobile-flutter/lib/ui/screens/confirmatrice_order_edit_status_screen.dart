import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/confirmatrice_orders_provider.dart';

class ConfirmatriceOrderEditStatusScreen extends StatefulWidget {
  final String piece;
  final int currentStatus;

  const ConfirmatriceOrderEditStatusScreen({
    super.key,
    required this.piece,
    required this.currentStatus,
  });

  @override
  State<ConfirmatriceOrderEditStatusScreen> createState() =>
      _ConfirmatriceOrderEditStatusScreenState();
}

class _ConfirmatriceOrderEditStatusScreenState
    extends State<ConfirmatriceOrderEditStatusScreen> {
  static const List<int> _allowedStatuses = [1, 2, 3];

  late int _selectedStatus;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedStatus = _allowedStatuses.contains(widget.currentStatus)
        ? widget.currentStatus
        : 1;
  }

  Future<void> _save() async {
    if (_saving) return;

    setState(() => _saving = true);

    try {
      final ok = await context.read<ConfirmatriceOrdersProvider>().updateStatus(
        widget.piece,
        _selectedStatus,
      );

      if (!mounted) return;

      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Statut commande mis à jour.'),
          ),
        );
        Navigator.of(context).pop(true);
      } else {
        final error = context.read<ConfirmatriceOrdersProvider>().error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Impossible de modifier le statut.'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.currentStatus;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        title: const Text('Modifier le statut commande'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE6EAF2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Commande',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.piece,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Statut actuel',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F6FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    _label(current),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Nouveau statut',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                ..._allowedStatuses.map(
                      (status) => RadioListTile<int>(
                    value: status,
                    groupValue: _selectedStatus,
                    onChanged: _saving
                        ? null
                        : (value) {
                      if (value == null) return;
                      setState(() => _selectedStatus = value);
                    },
                    title: Text(
                      _label(status),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(_description(status)),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
                  : const Icon(Icons.save_rounded),
              label: Text(_saving ? 'Enregistrement...' : 'Enregistrer'),
            ),
          ),
        ],
      ),
    );
  }

  String _label(int status) {
    switch (status) {
      case 0:
        return 'En attente';
      case 1:
        return 'Confirmée';
      case 2:
        return 'Tentative';
      case 3:
        return 'Refusée';
      default:
        return 'Inconnu';
    }
  }

  String _description(int status) {
    switch (status) {
      case 1:
        return 'La commande est confirmée.';
      case 2:
        return 'La commande passe en tentative.';
      case 3:
        return 'La commande est refusée.';
      default:
        return '';
    }
  }
}