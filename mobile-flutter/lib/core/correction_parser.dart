import 'dart:convert';

/// Représente le contenu d'une correction proposée par un client sur
/// une Réclamation / Demande. Le backend stocke un JSON libre dans
/// `F_RECLAMATION.CorrectionProposee`. Ce helper centralise le parsing
/// et le rendu pour éviter les incohérences entre écrans (tracking,
/// détail réclamation, détail demande, barre conf).
class ProposedCorrection {
  final String? address;
  final double? latitude;
  final double? longitude;
  final String? phone;
  final String? repere;
  final String? instructions;

  const ProposedCorrection({
    this.address,
    this.latitude,
    this.longitude,
    this.phone,
    this.repere,
    this.instructions,
  });

  bool get isEmpty =>
      (address ?? '').trim().isEmpty &&
      (phone ?? '').trim().isEmpty &&
      (repere ?? '').trim().isEmpty &&
      (instructions ?? '').trim().isEmpty &&
      latitude == null &&
      longitude == null;

  bool get hasGps => latitude != null && longitude != null;

  /// Parse le JSON stocké dans `correctionProposee`. Retourne un objet
  /// vide si le JSON est nul, invalide ou ne contient aucun champ connu.
  static ProposedCorrection parse(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return const ProposedCorrection();
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return ProposedCorrection(
          address: _str(decoded['address']),
          latitude: _double(decoded['latitude']),
          longitude: _double(decoded['longitude']),
          phone: _str(decoded['phone']),
          repere: _str(decoded['repere']),
          instructions: _str(decoded['instructions']),
        );
      }
    } catch (_) {
      // Texte libre non JSON — on le rend comme adresse par défaut.
      return ProposedCorrection(address: raw.trim());
    }
    return const ProposedCorrection();
  }

  /// Rendu en lignes clé/valeur prêtes à afficher. Ordre stable pour
  /// garantir le même affichage partout (client vs confirmatrice).
  List<MapEntry<String, String>> toDisplayRows() {
    final rows = <MapEntry<String, String>>[];
    if ((address ?? '').trim().isNotEmpty) {
      rows.add(MapEntry('Nouvelle adresse', address!.trim()));
    }
    if (hasGps) {
      rows.add(MapEntry(
        'Position GPS',
        '${latitude!.toStringAsFixed(6)}, ${longitude!.toStringAsFixed(6)}',
      ));
    }
    if ((phone ?? '').trim().isNotEmpty) {
      rows.add(MapEntry('Nouveau numéro', phone!.trim()));
    }
    if ((repere ?? '').trim().isNotEmpty) {
      rows.add(MapEntry('Repère', repere!.trim()));
    }
    if ((instructions ?? '').trim().isNotEmpty) {
      rows.add(MapEntry('Instructions livreur', instructions!.trim()));
    }
    return rows;
  }

  static String? _str(dynamic v) {
    if (v == null) return null;
    final s = v.toString().trim();
    return s.isEmpty ? null : s;
  }

  static double? _double(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }
}
