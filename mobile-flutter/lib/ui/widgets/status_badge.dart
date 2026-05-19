import 'package:flutter/material.dart';
import '../../core/constants.dart';

class StatusBadge extends StatelessWidget {
  final int statut;
  final String? apiStatus;

  const StatusBadge({
    super.key,
    required this.statut,
    this.apiStatus,
  });

  @override
  Widget build(BuildContext context) {
    final data = _statusData(statut, apiStatus);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: data.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: data.border),
      ),
      child: Text(
        data.label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: data.foreground,
        ),
      ),
    );
  }

  _StatusUi _statusData(int value, String? rawApiStatus) {
    final api = rawApiStatus
        ?.trim()
        .toUpperCase()
        .replaceAll(' ', '_')
        .replaceAll('-', '_');

    if (api == 'CONFIRME') {
      return _StatusUi(
        label: 'Confirmé',
        foreground: Colors.orange.shade900,
        background: Colors.orange.shade50,
        border: Colors.orange.shade200,
      );
    }

    if (api == 'EN_ATTENTE') {
      return _StatusUi(
        label: 'En attente',
        foreground: Colors.amber.shade900,
        background: Colors.amber.shade50,
        border: Colors.amber.shade200,
      );
    }

    if (value == Statut.enLivraison) {
      return _StatusUi(
        label: 'En livraison',
        foreground: Colors.blue.shade900,
        background: Colors.blue.shade50,
        border: Colors.blue.shade200,
      );
    }

    if (value == Statut.livre) {
      return _StatusUi(
        label: 'Livré',
        foreground: Colors.green.shade900,
        background: Colors.green.shade50,
        border: Colors.green.shade200,
      );
    }

    if (value == Statut.reporte) {
      return _StatusUi(
        label: 'Reporté',
        foreground: Colors.deepPurple.shade900,
        background: Colors.deepPurple.shade50,
        border: Colors.deepPurple.shade200,
      );
    }

    if (value == Statut.retourne) {
      return _StatusUi(
        label: 'Retourné',
        foreground: Colors.red.shade900,
        background: Colors.red.shade50,
        border: Colors.red.shade200,
      );
    }

    if (value == Statut.depot) {
      return _StatusUi(
        label: 'Dépôt',
        foreground: Colors.brown.shade900,
        background: Colors.brown.shade50,
        border: Colors.brown.shade200,
      );
    }

    if (value == Statut.confirme) {
      return _StatusUi(
        label: 'Confirmé',
        foreground: Colors.orange.shade900,
        background: Colors.orange.shade50,
        border: Colors.orange.shade200,
      );
    }

    return _StatusUi(
      label: 'Inconnu',
      foreground: Colors.grey.shade900,
      background: Colors.grey.shade100,
      border: Colors.grey.shade300,
    );
  }
}

class _StatusUi {
  final String label;
  final Color foreground;
  final Color background;
  final Color border;

  _StatusUi({
    required this.label,
    required this.foreground,
    required this.background,
    required this.border,
  });
}