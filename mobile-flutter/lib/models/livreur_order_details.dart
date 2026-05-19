/// 2.A — Détail enrichi d'une commande côté livreur (cart + client + history).
class LivreurOrderDetails {
  final String doPiece;
  final String? doTiers;
  final DateTime? doDate;
  final int doType;
  final int? statusCode;
  final String? statusLabel;
  final double netAPayer;
  final double totalTTC;
  final double totalHT;
  final double fraisLivraison;
  final double timbreFiscal;
  final String? modePaiement;
  final String? modeLivraison;
  final String? adresse;
  final String? ville;
  final String? codePostal;
  final String? noteClient;
  final LivreurOrderClient? client;
  final List<LivreurOrderLine> lignes;
  final List<LivreurOrderHistoryItem> history;

  LivreurOrderDetails({
    required this.doPiece,
    this.doTiers,
    this.doDate,
    this.doType = 1,
    this.statusCode,
    this.statusLabel,
    this.netAPayer = 0,
    this.totalTTC = 0,
    this.totalHT = 0,
    this.fraisLivraison = 0,
    this.timbreFiscal = 0,
    this.modePaiement,
    this.modeLivraison,
    this.adresse,
    this.ville,
    this.codePostal,
    this.noteClient,
    this.client,
    this.lignes = const [],
    this.history = const [],
  });

  factory LivreurOrderDetails.fromMap(Map<String, dynamic> m) {
    return LivreurOrderDetails(
      doPiece: (m['doPiece'] ?? '').toString(),
      doTiers: m['doTiers']?.toString(),
      doDate: m['doDate'] != null ? DateTime.tryParse(m['doDate'].toString()) : null,
      doType: _readInt(m['doType']) ?? 1,
      statusCode: _readInt(m['statusCode']),
      statusLabel: m['statusLabel']?.toString(),
      netAPayer: _readDouble(m['netAPayer']),
      totalTTC: _readDouble(m['totalTTC']),
      totalHT: _readDouble(m['totalHT']),
      fraisLivraison: _readDouble(m['fraisLivraison']),
      timbreFiscal: _readDouble(m['timbreFiscal']),
      modePaiement: m['modePaiement']?.toString(),
      modeLivraison: m['modeLivraison']?.toString(),
      adresse: m['adresse']?.toString(),
      ville: m['ville']?.toString(),
      codePostal: m['codePostal']?.toString(),
      noteClient: m['noteClient']?.toString(),
      client: m['client'] is Map<String, dynamic>
          ? LivreurOrderClient.fromMap(m['client'] as Map<String, dynamic>)
          : null,
      lignes: (m['lignes'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(LivreurOrderLine.fromMap)
              .toList() ??
          const [],
      history: (m['history'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(LivreurOrderHistoryItem.fromMap)
              .toList() ??
          const [],
    );
  }
}

class LivreurOrderClient {
  final String? displayName;
  final String? displayNameArabe;
  final String? telephone;
  final String? email;
  final String? adresse;
  final String? ville;
  final String? gouvernorat;
  final String? delegation;

  LivreurOrderClient({
    this.displayName,
    this.displayNameArabe,
    this.telephone,
    this.email,
    this.adresse,
    this.ville,
    this.gouvernorat,
    this.delegation,
  });

  factory LivreurOrderClient.fromMap(Map<String, dynamic> m) {
    return LivreurOrderClient(
      displayName: m['displayName']?.toString(),
      displayNameArabe: m['displayNameArabe']?.toString(),
      telephone: m['telephone']?.toString(),
      email: m['email']?.toString(),
      adresse: m['adresse']?.toString(),
      ville: m['ville']?.toString(),
      gouvernorat: m['gouvernorat']?.toString(),
      delegation: m['delegation']?.toString(),
    );
  }
}

class LivreurOrderLine {
  final String? arRef;
  final String? designation;
  final double quantite;
  final double prixUnitaire;
  final double montantTTC;
  final String? imageUrl;

  LivreurOrderLine({
    this.arRef,
    this.designation,
    this.quantite = 1,
    this.prixUnitaire = 0,
    this.montantTTC = 0,
    this.imageUrl,
  });

  factory LivreurOrderLine.fromMap(Map<String, dynamic> m) {
    return LivreurOrderLine(
      arRef: m['arRef']?.toString(),
      designation: m['designation']?.toString(),
      quantite: _readDouble(m['quantite'], fallback: 1),
      prixUnitaire: _readDouble(m['prixUnitaire']),
      montantTTC: _readDouble(m['montantTTC']),
      imageUrl: m['imageUrl']?.toString(),
    );
  }
}

class LivreurOrderHistoryItem {
  final DateTime at;
  final int statusCode;
  final String? statusLabel;
  final String? updatedBy;
  final String? motif;
  final String? note;

  LivreurOrderHistoryItem({
    required this.at,
    required this.statusCode,
    this.statusLabel,
    this.updatedBy,
    this.motif,
    this.note,
  });

  factory LivreurOrderHistoryItem.fromMap(Map<String, dynamic> m) {
    return LivreurOrderHistoryItem(
      at: DateTime.tryParse(m['at']?.toString() ?? '') ?? DateTime.now(),
      statusCode: _readInt(m['statusCode']) ?? 0,
      statusLabel: m['statusLabel']?.toString(),
      updatedBy: m['updatedBy']?.toString(),
      motif: m['motif']?.toString(),
      note: m['note']?.toString(),
    );
  }
}

double _readDouble(dynamic v, {double fallback = 0}) {
  if (v == null) return fallback;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? fallback;
}

int? _readInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString());
}
