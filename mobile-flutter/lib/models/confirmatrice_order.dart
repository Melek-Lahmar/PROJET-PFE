class ConfirmatriceOrder {
  final String piece;
  final String? tiers;
  final DateTime? date;
  final double totalHt;
  final double totalTtc;
  final double netAPayer;
  final int status;
  final String? statusLabel;

  final String? clientType;
  final String? clientDisplay;
  final ConfirmatriceClient? client;

  final List<ConfirmatriceOrderLine> lines;

  const ConfirmatriceOrder({
    required this.piece,
    this.tiers,
    this.date,
    required this.totalHt,
    required this.totalTtc,
    required this.netAPayer,
    required this.status,
    this.statusLabel,
    this.clientType,
    this.clientDisplay,
    this.client,
    required this.lines,
  });

  bool get isPending => status == 0;
  bool get isConfirmed => status == 1;
  bool get isAttempt => status == 2;
  bool get isRejected => status == 3;

  String get normalizedStatus {
    switch (status) {
      case 0:
        return 'EN_ATTENTE';
      case 1:
        return 'CONFIRME';
      case 2:
        return 'TENTATIVE';
      case 3:
        return 'REFUSE';
      default:
        return 'INCONNU';
    }
  }

  String get displayStatus {
    final raw = (statusLabel ?? '').trim();
    if (raw.isNotEmpty) return raw;

    switch (status) {
      case 0:
        return 'En attente';
      case 1:
        return 'Confirmé';
      case 2:
        return 'Tentative';
      case 3:
        return 'Refusé';
      default:
        return 'Inconnu';
    }
  }

  factory ConfirmatriceOrder.fromMap(Map<String, dynamic> map) {
    final clientMap = map['client'];
    final linesRaw = map['lignes'];

    return ConfirmatriceOrder(
      piece: _string(map['do_Piece']) ?? _string(map['dO_Piece']) ?? '',
      tiers: _string(map['do_Tiers']) ?? _string(map['dO_Tiers']),
      date: _date(map['do_Date']) ?? _date(map['dO_Date']),
      totalHt: _double(map['do_TotalHT']) ?? _double(map['dO_TotalHT']) ?? 0,
      totalTtc: _double(map['do_TotalTTC']) ?? _double(map['dO_TotalTTC']) ?? 0,
      netAPayer: _double(map['do_NetAPayer']) ?? _double(map['dO_NetAPayer']) ?? 0,
      status: _int(map['do_Valide']) ?? _int(map['dO_Valide']) ?? 0,
      statusLabel: _string(map['statusLabel']),
      clientType: _string(map['clientType']),
      clientDisplay: _string(map['clientDisplay']),
      client: clientMap is Map<String, dynamic>
          ? ConfirmatriceClient.fromMap(clientMap)
          : null,
      lines: linesRaw is List
          ? linesRaw
          .whereType<Map<String, dynamic>>()
          .map((e) => ConfirmatriceOrderLine.fromMap(e))
          .toList()
          : const [],
    );
  }
}

class ConfirmatriceOrderLine {
  final String articleRef;
  final String? designation;
  final double qty;
  final double unitPrice;
  final double totalTtc;
  final String? imageUrl;

  const ConfirmatriceOrderLine({
    required this.articleRef,
    this.designation,
    required this.qty,
    required this.unitPrice,
    required this.totalTtc,
    this.imageUrl,
  });

  factory ConfirmatriceOrderLine.fromMap(Map<String, dynamic> map) {
    return ConfirmatriceOrderLine(
      articleRef: _string(map['ar_Ref']) ?? _string(map['aR_Ref']) ?? '',
      designation: _string(map['dl_Design']) ?? _string(map['dL_Design']),
      qty: _double(map['dl_Qte']) ?? _double(map['dL_Qte']) ?? 0,
      unitPrice: _double(map['dl_PrixUnitaire']) ?? _double(map['dL_PrixUnitaire']) ?? 0,
      totalTtc: _double(map['dl_MontantTTC']) ?? _double(map['dL_MontantTTC']) ?? 0,
      imageUrl: _string(map['imageUrl']),
    );
  }
}

class ConfirmatriceClient {
  final String? typeClient;
  final String? utilisateurId;
  final String? telephone;

  final String? nomComplet;
  final String? cin;

  final String? nomSociete;
  final String? matriculeFiscal;
  final String? numeroTva;
  final double? remise;
  final double? plafondCredit;

  final String? gouvernorat;
  final String? delegation;
  final String? codePostal;
  final String? adresse;
  final String? adresseComplementaire;

  const ConfirmatriceClient({
    this.typeClient,
    this.utilisateurId,
    this.telephone,
    this.nomComplet,
    this.cin,
    this.nomSociete,
    this.matriculeFiscal,
    this.numeroTva,
    this.remise,
    this.plafondCredit,
    this.gouvernorat,
    this.delegation,
    this.codePostal,
    this.adresse,
    this.adresseComplementaire,
  });

  String? get displayName {
    if ((nomSociete ?? '').trim().isNotEmpty) return nomSociete!.trim();
    if ((nomComplet ?? '').trim().isNotEmpty) return nomComplet!.trim();
    return null;
  }

  factory ConfirmatriceClient.fromMap(Map<String, dynamic> map) {
    return ConfirmatriceClient(
      typeClient: _string(map['typeClient']),
      utilisateurId: _string(map['utilisateurId']),
      telephone: _string(map['telephone']),
      nomComplet: _string(map['nomComplet']),
      cin: _string(map['cin']),
      nomSociete: _string(map['nomSociete']),
      matriculeFiscal: _string(map['matriculeFiscal']),
      numeroTva: _string(map['numeroTVA']) ?? _string(map['numeroTva']),
      remise: _double(map['remise']),
      plafondCredit: _double(map['plafondCredit']),
      gouvernorat: _string(map['gouvernorat']),
      delegation: _string(map['delegation']),
      codePostal: _string(map['codePostal']),
      adresse: _string(map['adresse']),
      adresseComplementaire: _string(map['adresseComplementaire']),
    );
  }
}

String? _string(dynamic value) {
  if (value == null) return null;
  final v = value.toString().trim();
  return v.isEmpty ? null : v;
}

int? _int(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  return int.tryParse(value.toString());
}

double? _double(dynamic value) {
  if (value == null) return null;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  return double.tryParse(value.toString().replaceAll(',', '.'));
}

DateTime? _date(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}