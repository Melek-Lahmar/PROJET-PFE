import 'package:flutter/material.dart';

import 'confirmatrice_claims_screen.dart';

/// Bloc 6 — Onglet Demandes côté confirmatrice : pur wrapper sur
/// [ConfirmatriceClaimsScreen] avec le TypeCas verrouillé sur `DEMANDE`.
/// Aucune logique dédiée : priorisation et couleur rouge/vert/gris sont
/// gérées par l'écran sous-jacent / le provider.
class ConfirmatriceDemandesScreen extends StatelessWidget {
  const ConfirmatriceDemandesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ConfirmatriceClaimsScreen(lockedTypeCas: 'DEMANDE');
  }
}
