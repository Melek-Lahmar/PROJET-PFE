// Détail commande pour le drawer admin (entête + lignes + livraison + cas liés).
// Miroir de `AdminOrdersDetailDto` côté backend.

class AdminOrderDetail {
  final String piece;
  final DateTime? date;
  final String orderStatus;
  final String typeCommande;

  final String? tiers;
  final String? clientName;
  final String? clientPhone;
  final String? address;
  final String? ville;
  final String? governorate;

  final double? amountHt;
  final double? amountTtc;
  final double? fraisLivraison;
  final String? modePaiement;
  final String? modeLivraison;

  final List<AdminOrderLine> lines;
  final AdminOrderDelivery? delivery;
  final List<AdminOrderReclamationLink> reclamations;

  AdminOrderDetail({
    required this.piece,
    required this.date,
    required this.orderStatus,
    required this.typeCommande,
    required this.tiers,
    required this.clientName,
    required this.clientPhone,
    required this.address,
    required this.ville,
    required this.governorate,
    required this.amountHt,
    required this.amountTtc,
    required this.fraisLivraison,
    required this.modePaiement,
    required this.modeLivraison,
    required this.lines,
    required this.delivery,
    required this.reclamations,
  });

  factory AdminOrderDetail.fromMap(Map<String, dynamic> m) {
    final rawLines = m['lines'];
    final lines = (rawLines is List)
        ? rawLines
            .whereType<Map>()
            .map((e) => AdminOrderLine.fromMap(Map<String, dynamic>.from(e)))
            .toList()
        : <AdminOrderLine>[];

    final rawDelivery = m['delivery'];
    final delivery = rawDelivery is Map
        ? AdminOrderDelivery.fromMap(Map<String, dynamic>.from(rawDelivery))
        : null;

    final rawReclamations = m['reclamations'];
    final reclamations = (rawReclamations is List)
        ? rawReclamations
            .whereType<Map>()
            .map((e) => AdminOrderReclamationLink.fromMap(
                Map<String, dynamic>.from(e)))
            .toList()
        : <AdminOrderReclamationLink>[];

    return AdminOrderDetail(
      piece: m['piece']?.toString() ?? '',
      date: DateTime.tryParse(m['date']?.toString() ?? ''),
      orderStatus: m['orderStatus']?.toString() ?? 'INCONNU',
      typeCommande: m['typeCommande']?.toString() ?? 'NORMALE',
      tiers: m['tiers']?.toString(),
      clientName: m['clientName']?.toString(),
      clientPhone: m['clientPhone']?.toString(),
      address: m['address']?.toString(),
      ville: m['ville']?.toString(),
      governorate: m['governorate']?.toString(),
      amountHt: (m['amountHt'] as num?)?.toDouble(),
      amountTtc: (m['amountTtc'] as num?)?.toDouble(),
      fraisLivraison: (m['fraisLivraison'] as num?)?.toDouble(),
      modePaiement: m['modePaiement']?.toString(),
      modeLivraison: m['modeLivraison']?.toString(),
      lines: lines,
      delivery: delivery,
      reclamations: reclamations,
    );
  }
}

class AdminOrderReclamationLink {
  final int id;
  final String code;
  final String typeCas;
  final String source;
  final String motif;
  final String statut;
  final DateTime createdAt;
  final DateTime? closedAt;
  final bool visibleClient;

  AdminOrderReclamationLink({
    required this.id,
    required this.code,
    required this.typeCas,
    required this.source,
    required this.motif,
    required this.statut,
    required this.createdAt,
    required this.closedAt,
    required this.visibleClient,
  });

  factory AdminOrderReclamationLink.fromMap(Map<String, dynamic> m) {
    return AdminOrderReclamationLink(
      id: (m['id'] as num?)?.toInt() ?? 0,
      code: m['code']?.toString() ?? '',
      typeCas: m['typeCas']?.toString() ?? 'RECLAMATION',
      source: m['source']?.toString() ?? 'CLIENT',
      motif: m['motif']?.toString() ?? '',
      statut: m['statut']?.toString() ?? 'ENVOYEE',
      createdAt: DateTime.tryParse(m['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      closedAt: DateTime.tryParse(m['closedAt']?.toString() ?? ''),
      visibleClient: m['visibleClient'] == true,
    );
  }
}

class AdminOrderLine {
  final String? articleRef;
  final String? designation;
  final double? quantity;
  final double? unitPrice;
  final double? totalTtc;
  final String lineType;

  AdminOrderLine({
    required this.articleRef,
    required this.designation,
    required this.quantity,
    required this.unitPrice,
    required this.totalTtc,
    required this.lineType,
  });

  factory AdminOrderLine.fromMap(Map<String, dynamic> m) {
    return AdminOrderLine(
      articleRef: m['articleRef']?.toString(),
      designation: m['designation']?.toString(),
      quantity: (m['quantity'] as num?)?.toDouble(),
      unitPrice: (m['unitPrice'] as num?)?.toDouble(),
      totalTtc: (m['totalTtc'] as num?)?.toDouble(),
      lineType: m['lineType']?.toString() ?? 'STANDARD',
    );
  }
}

class AdminOrderDelivery {
  final String status;
  final DateTime createdAt;
  final DateTime? deliveredAt;
  final DateTime? rescheduledAt;
  final String? address;
  final String? comment;
  final String? livreurName;
  final String? livreurPhone;

  AdminOrderDelivery({
    required this.status,
    required this.createdAt,
    required this.deliveredAt,
    required this.rescheduledAt,
    required this.address,
    required this.comment,
    required this.livreurName,
    required this.livreurPhone,
  });

  factory AdminOrderDelivery.fromMap(Map<String, dynamic> m) {
    return AdminOrderDelivery(
      status: m['status']?.toString() ?? 'INCONNU',
      createdAt:
          DateTime.tryParse(m['createdAt']?.toString() ?? '') ?? DateTime.now(),
      deliveredAt: DateTime.tryParse(m['deliveredAt']?.toString() ?? ''),
      rescheduledAt: DateTime.tryParse(m['rescheduledAt']?.toString() ?? ''),
      address: m['address']?.toString(),
      comment: m['comment']?.toString(),
      livreurName: m['livreurName']?.toString(),
      livreurPhone: m['livreurPhone']?.toString(),
    );
  }
}
