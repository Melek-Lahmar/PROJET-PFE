class ClientClaimOrderLine {
  final String arRef;
  final String? designation;
  final double qty;
  final double unitPrice;
  final double amountTTC;

  const ClientClaimOrderLine({
    required this.arRef,
    this.designation,
    required this.qty,
    required this.unitPrice,
    required this.amountTTC,
  });

  factory ClientClaimOrderLine.fromMap(Map<String, dynamic> map) => ClientClaimOrderLine(
        arRef: (map['arRef'] ?? '').toString(),
        designation: _nullable(map['designation']),
        qty: _double(map['qty']),
        unitPrice: _double(map['unitPrice']),
        amountTTC: _double(map['amountTTC']),
      );
}

class ClientClaimPhoto {
  final int id;
  final String url;
  final String? fileName;
  final String? contentType;
  final int? size;
  final DateTime createdAt;

  const ClientClaimPhoto({
    required this.id,
    required this.url,
    this.fileName,
    this.contentType,
    this.size,
    required this.createdAt,
  });

  factory ClientClaimPhoto.fromMap(Map<String, dynamic> map) => ClientClaimPhoto(
        id: _int(map['id']),
        url: (map['url'] ?? '').toString(),
        fileName: _nullable(map['fileName']),
        contentType: _nullable(map['contentType']),
        size: map['size'] is int ? map['size'] as int : int.tryParse('${map['size'] ?? ''}'),
        createdAt: _date(map['createdAt']) ?? DateTime.now(),
      );
}

class ClientClaimTentative {
  final int id;
  final String commandePiece;
  final DateTime dateJour;
  final String motif;
  final String? livreurDisplay;
  final double? latitude;
  final double? longitude;
  final String? photoUrl;
  final DateTime createdAt;

  const ClientClaimTentative({
    required this.id,
    required this.commandePiece,
    required this.dateJour,
    required this.motif,
    this.livreurDisplay,
    this.latitude,
    this.longitude,
    this.photoUrl,
    required this.createdAt,
  });

  factory ClientClaimTentative.fromMap(Map<String, dynamic> map) => ClientClaimTentative(
        id: _int(map['id']),
        commandePiece: (map['commandePiece'] ?? '').toString(),
        dateJour: _date(map['dateJour']) ?? DateTime.now(),
        motif: (map['motif'] ?? '').toString(),
        livreurDisplay: _nullable(map['livreurDisplay']),
        latitude: _doubleOrNull(map['latitude']),
        longitude: _doubleOrNull(map['longitude']),
        photoUrl: _nullable(map['photoUrl']),
        createdAt: _date(map['createdAt']) ?? DateTime.now(),
      );
}

class ClientClaim {
  final int id;
  final String codeReclamation;
  final String doPiece;
  final String? arRef;
  final String? arDesignation;
  final bool isGlobal;
  final bool visibleClient;
  final String motif;
  final String description;
  final String statut;
  final String source;
  final String typeCas;
  final String? echangeDemandeText;
  final String? typeReclamation;
  final String? priorite;
  final String? correctionProposee;
  final bool correctionAppliquee;
  final String? motifRefus;
  final String? noteInterne;
  final int tentativesCount;
  final DateTime? firstAttemptAt;
  final DateTime? lastAttemptAt;

  /// Flags premium (DEMANDE) : le client a soumis une nouvelle adresse
  /// ou un nouveau téléphone via la réponse à la demande. Branchés sur
  /// les flags `hasAddressChange` / `hasPhoneChange` du DTO list backend
  /// (parsés depuis `CorrectionProposee`).
  final bool hasAddressChange;
  final bool hasPhoneChange;

  // Client
  final String? clientDisplay;
  final String? clientPhone;
  final String? clientEmail;
  final String? clientAddress;
  final String? clientGouvernorat;
  final String? clientDelegation;
  final String? clientCodeSage;
  final int clientCommandesCount;
  final int clientReclamationsCount;
  // B.4 — Guid utilisateur pour l'historique client BottomSheet
  final String? clientUserId;

  // Livreur
  final String? livreurDisplay;
  final String? livreurPhone;
  final String? livreurUserId;

  final String? assignedToDisplay;

  // Commande
  final String? orderStatut;
  final DateTime? orderDate;
  final double? orderNetAPayer;
  final String? orderPaymentMethod;
  final String? orderDeliveryMode;

  final List<ClientClaimOrderLine> orderLines;
  final List<ClientClaimTentative> tentatives;
  final List<ClientClaimPhoto> photos;

  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? closedAt;
  final DateTime? resolvedAt;

  const ClientClaim({
    required this.id,
    required this.codeReclamation,
    required this.doPiece,
    this.arRef,
    this.arDesignation,
    required this.isGlobal,
    this.visibleClient = false,
    required this.motif,
    required this.description,
    required this.statut,
    required this.source,
    this.typeCas = 'RECLAMATION',
    this.echangeDemandeText,
    this.typeReclamation,
    this.priorite,
    this.correctionProposee,
    this.correctionAppliquee = false,
    this.motifRefus,
    this.noteInterne,
    this.tentativesCount = 0,
    this.firstAttemptAt,
    this.lastAttemptAt,
    this.hasAddressChange = false,
    this.hasPhoneChange = false,
    this.clientDisplay,
    this.clientPhone,
    this.clientEmail,
    this.clientAddress,
    this.clientGouvernorat,
    this.clientDelegation,
    this.clientCodeSage,
    this.clientCommandesCount = 0,
    this.clientReclamationsCount = 0,
    this.clientUserId,
    this.livreurDisplay,
    this.livreurPhone,
    this.livreurUserId,
    this.assignedToDisplay,
    this.orderStatut,
    this.orderDate,
    this.orderNetAPayer,
    this.orderPaymentMethod,
    this.orderDeliveryMode,
    this.orderLines = const [],
    this.tentatives = const [],
    this.photos = const [],
    required this.createdAt,
    required this.updatedAt,
    this.closedAt,
    this.resolvedAt,
  });

  factory ClientClaim.fromListItem(Map<String, dynamic> map) => ClientClaim(
        id: _int(map['id']),
        codeReclamation: (map['codeReclamation'] ?? '').toString(),
        doPiece: (map['doPiece'] ?? '').toString(),
        arRef: _nullable(map['arRef']),
        arDesignation: _nullable(map['arDesignation']),
        isGlobal: _bool(map['isGlobal'], defaultValue: true),
        visibleClient: _bool(map['visibleClient']),
        motif: (map['motif'] ?? '').toString(),
        description: (map['descriptionPreview'] ?? '').toString(),
        statut: (map['statut'] ?? '').toString(),
        source: (map['source'] ?? 'CLIENT').toString(),
        typeCas: (map['typeCas'] ?? 'RECLAMATION').toString(),
        echangeDemandeText: _nullable(map['echangeDemandeText']),
        typeReclamation: _nullable(map['typeReclamation']),
        priorite: _nullable(map['priorite']),
        clientDisplay: _nullable(map['clientDisplay']),
        clientPhone: _nullable(map['clientPhone']),
        clientGouvernorat: _nullable(map['clientGouvernorat']),
        assignedToDisplay: _nullable(map['assignedToDisplay']),
        tentativesCount: _int(map['tentativesCount']),
        hasAddressChange: _bool(map['hasAddressChange']),
        hasPhoneChange: _bool(map['hasPhoneChange']),
        createdAt: _date(map['createdAt']) ?? DateTime.now(),
        updatedAt: _date(map['updatedAt']) ?? DateTime.now(),
      );

  factory ClientClaim.fromDetails(Map<String, dynamic> map) {
    final rawLines = map['orderLines'];
    final parsedLines = rawLines is List
        ? rawLines.whereType<Map<String, dynamic>>().map(ClientClaimOrderLine.fromMap).toList()
        : const <ClientClaimOrderLine>[];

    final rawTents = map['tentatives'];
    final parsedTents = rawTents is List
        ? rawTents.whereType<Map<String, dynamic>>().map(ClientClaimTentative.fromMap).toList()
        : const <ClientClaimTentative>[];

    final rawPhotos = map['photos'];
    final parsedPhotos = rawPhotos is List
        ? rawPhotos.whereType<Map<String, dynamic>>().map(ClientClaimPhoto.fromMap).toList()
        : const <ClientClaimPhoto>[];

    return ClientClaim(
      id: _int(map['id']),
      codeReclamation: (map['codeReclamation'] ?? '').toString(),
      doPiece: (map['doPiece'] ?? '').toString(),
      arRef: _nullable(map['arRef']),
      arDesignation: _nullable(map['arDesignation']),
      isGlobal: _bool(map['isGlobal'], defaultValue: true),
      visibleClient: _bool(map['visibleClient']),
      motif: (map['motif'] ?? '').toString(),
      description: (map['description'] ?? '').toString(),
      statut: (map['statut'] ?? '').toString(),
      source: (map['source'] ?? 'CLIENT').toString(),
      typeCas: (map['typeCas'] ?? 'RECLAMATION').toString(),
      echangeDemandeText: _nullable(map['echangeDemandeText']),
      typeReclamation: _nullable(map['typeReclamation']),
      priorite: _nullable(map['priorite']),
      correctionProposee: _nullable(map['correctionProposee']),
      correctionAppliquee: _bool(map['correctionAppliquee']),
      motifRefus: _nullable(map['motifRefus']),
      noteInterne: _nullable(map['noteInterne']),
      tentativesCount: _int(map['tentativesCount']),
      firstAttemptAt: _date(map['firstAttemptAt']),
      lastAttemptAt: _date(map['lastAttemptAt']),
      clientDisplay: _nullable(map['clientDisplay']),
      clientPhone: _nullable(map['clientPhone']),
      clientEmail: _nullable(map['clientEmail']),
      clientAddress: _nullable(map['clientAddress']),
      clientGouvernorat: _nullable(map['clientGouvernorat']),
      clientDelegation: _nullable(map['clientDelegation']),
      clientCodeSage: _nullable(map['clientCodeSage']),
      clientCommandesCount: _int(map['clientCommandesCount']),
      clientReclamationsCount: _int(map['clientReclamationsCount']),
      clientUserId: _nullable(map['clientUserId']),
      livreurDisplay: _nullable(map['livreurDisplay']),
      livreurPhone: _nullable(map['livreurPhone']),
      livreurUserId: _nullable(map['livreurUserId']),
      assignedToDisplay: _nullable(map['assignedToDisplay']),
      orderStatut: _nullable(map['orderStatut']),
      orderDate: _date(map['orderDate']),
      orderNetAPayer: _doubleOrNull(map['orderNetAPayer']),
      orderPaymentMethod: _nullable(map['orderPaymentMethod']),
      orderDeliveryMode: _nullable(map['orderDeliveryMode']),
      orderLines: parsedLines,
      tentatives: parsedTents,
      photos: parsedPhotos,
      createdAt: _date(map['createdAt']) ?? DateTime.now(),
      updatedAt: _date(map['updatedAt']) ?? DateTime.now(),
      closedAt: _date(map['closedAt']),
      resolvedAt: _date(map['resolvedAt']),
    );
  }

  String get statusLabel {
    switch (statut.toUpperCase()) {
      case 'ENVOYEE':
        return 'Envoyée';
      case 'EN_COURS_DE_TRAITEMENT':
        return 'En cours de traitement';
      case 'CLOTUREE':
        return 'Clôturée';
      case 'REFUSEE':
        return 'Refusée';
      default:
        return statut;
    }
  }

  String get scopeLabel => isGlobal ? 'Toute la commande' : 'Article ciblé';

  bool get isFromLivreur => source.toUpperCase() == 'LIVREUR';
  bool get isClosed => statut.toUpperCase() == 'CLOTUREE' || statut.toUpperCase() == 'REFUSEE';
  bool get isDemande => typeCas.toUpperCase() == 'DEMANDE';
  bool get isReclamation => typeCas.toUpperCase() == 'RECLAMATION';
}

int _int(dynamic value) {
  if (value is int) return value;
  return int.tryParse('${value ?? 0}') ?? 0;
}

double _double(dynamic value) {
  if (value == null) return 0;
  final raw = value.toString().trim().replaceAll(',', '.');
  return double.tryParse(raw) ?? 0;
}

double? _doubleOrNull(dynamic value) {
  if (value == null) return null;
  final raw = value.toString().trim().replaceAll(',', '.');
  return double.tryParse(raw);
}

bool _bool(dynamic value, {bool defaultValue = false}) {
  if (value is bool) return value;
  if (value == null) return defaultValue;
  final raw = value.toString().trim().toLowerCase();
  if (raw == 'true' || raw == '1') return true;
  if (raw == 'false' || raw == '0') return false;
  return defaultValue;
}

String? _nullable(dynamic value) {
  if (value == null) return null;
  final raw = value.toString().trim();
  return raw.isEmpty ? null : raw;
}

DateTime? _date(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}
