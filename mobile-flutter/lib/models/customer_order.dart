class CustomerOrderLine {
  final String articleRef;
  final String? designation;
  final double qty;
  final double unitPrice;
  final double amountHT;
  final double amountTTC;

  const CustomerOrderLine({
    required this.articleRef,
    this.designation,
    required this.qty,
    required this.unitPrice,
    required this.amountHT,
    required this.amountTTC,
  });

  factory CustomerOrderLine.fromMap(Map<String, dynamic> map) {
    return CustomerOrderLine(
      articleRef: _string(map['articleRef']),
      designation: _nullableString(map['designation']),
      qty: _double(map['qty']),
      unitPrice: _double(map['unitPrice']),
      amountHT: _double(map['amountHT']),
      amountTTC: _double(map['amountTTC']),
    );
  }
}

class CustomerOrder {
  final String piece;
  final DateTime? date;
  final String clientCode;
  final int depotNo;
  final String? status;
  final int? statusCode;
  final String? timelineStage;
  final String? statusSource;
  final DateTime? assignedAt;
  final DateTime? deliveredAt;
  final DateTime? replannedAt;
  final String? driverNote;
  final double totalHT;
  final double totalTTC;
  final double fraisLivraison;
  final double timbreFiscal;
  final double netAPayer;
  final String? deliveryType;
  final String? paymentMethod;
  final String? address;
  final String? city;
  final String? postalCode;
  final String? latitude;
  final String? longitude;
  final List<CustomerOrderLine> lines;

  const CustomerOrder({
    required this.piece,
    this.date,
    required this.clientCode,
    required this.depotNo,
    this.status,
    this.statusCode,
    this.timelineStage,
    this.statusSource,
    this.assignedAt,
    this.deliveredAt,
    this.replannedAt,
    this.driverNote,
    required this.totalHT,
    required this.totalTTC,
    required this.fraisLivraison,
    required this.timbreFiscal,
    required this.netAPayer,
    this.deliveryType,
    this.paymentMethod,
    this.address,
    this.city,
    this.postalCode,
    this.latitude,
    this.longitude,
    this.lines = const [],
  });

  factory CustomerOrder.fromMap(Map<String, dynamic> map) {
    final rawLines = map['lines'];
    final parsedLines = rawLines is List
        ? rawLines
            .whereType<Map<String, dynamic>>()
            .map(CustomerOrderLine.fromMap)
            .toList()
        : const <CustomerOrderLine>[];

    return CustomerOrder(
      piece: _string(map['piece']),
      date: _date(map['date']),
      clientCode: _string(map['clientCode']),
      depotNo: _int(map['depotNo']),
      status: _nullableString(map['status']),
      statusCode: _nullableInt(map['statusCode']),
      timelineStage: _nullableString(map['timelineStage']),
      statusSource: _nullableString(map['statusSource']),
      assignedAt: _date(map['assignedAt']),
      deliveredAt: _date(map['deliveredAt']),
      replannedAt: _date(map['replannedAt']),
      driverNote: _nullableString(map['driverNote']),
      totalHT: _double(map['totalHT']),
      totalTTC: _double(map['totalTTC']),
      fraisLivraison: _double(map['fraisLivraison']),
      timbreFiscal: _double(map['timbreFiscal']),
      netAPayer: _double(map['netAPayer']),
      deliveryType: _nullableString(map['deliveryType']),
      paymentMethod: _nullableString(map['paymentMethod']),
      address: _nullableString(map['address']),
      city: _nullableString(map['city']),
      postalCode: _nullableString(map['postalCode']),
      latitude: _nullableString(map['latitude']),
      longitude: _nullableString(map['longitude']),
      lines: parsedLines,
    );
  }

  String get normalizedStatus {
    final raw = (status ?? timelineStage ?? '').trim().toUpperCase();
    if (raw.isEmpty) return 'EN_ATTENTE';

    final normalized = raw.replaceAll(' ', '_').replaceAll('-', '_');
    switch (normalized) {
      case 'PENDING':
      case 'CREATED':
        return 'EN_ATTENTE';
      case 'CONFIRMED':
        return 'CONFIRME';
      case 'IN_TRANSIT':
        return 'EN_LIVRAISON';
      case 'DELIVERED':
        return 'LIVRE';
      case 'RESCHEDULED':
        return 'REPORTE';
      case 'RETURNED':
        return 'RETOUR';
      case 'AT_DEPOT':
        return 'DEPOT';
      // Côté client : on masque les sous-statuts livreur "en préparation au
      // dépôt" et "prêt à livrer" — ils sont affichés simplement comme "Au dépôt".
      case 'DEPOT_EN_COURS_DE_PREPARATION':
      case 'DEPOT_PRET':
        return 'DEPOT';
      case 'ATTEMPTED':
        return 'TENTATIVE';
      case 'REFUSED':
        return 'REFUSE';
      default:
        return normalized;
    }
  }

  String get statusLabel {
    switch (normalizedStatus) {
      case 'CONFIRME':
        return 'Confirmée';
      case 'EN_LIVRAISON':
        return 'En livraison';
      case 'LIVRE':
        return 'Livrée';
      case 'REPORTE':
        return 'Reportée';
      case 'RETOUR':
        return 'Retournée';
      case 'DEPOT':
        return 'Au dépôt';
      case 'TENTATIVE':
        return 'Tentative';
      case 'REFUSE':
        return 'Refusée';
      case 'EN_ATTENTE':
      default:
        return 'En attente';
    }
  }

  String get statusDescription {
    switch (normalizedStatus) {
      case 'CONFIRME':
        return 'La commande est validée et attend sa prise en charge.';
      case 'EN_LIVRAISON':
        return 'Le colis est actuellement pris en charge par le livreur.';
      case 'LIVRE':
        return 'La commande a été livrée avec succès.';
      case 'REPORTE':
        return 'La livraison a été replanifiée.';
      case 'RETOUR':
        return 'La commande est retournée.';
      case 'DEPOT':
        return 'Le colis est revenu au dépôt.';
      case 'TENTATIVE':
        return 'Une tentative a été enregistrée.';
      case 'REFUSE':
        return 'La commande a été refusée.';
      case 'EN_ATTENTE':
      default:
        return 'La commande est créée et attend la confirmation.';
    }
  }

  String get deliveryTypeLabel {
    final raw = (deliveryType ?? '').trim().toUpperCase();
    switch (raw) {
      case 'HOME':
        return 'À domicile';
      case 'PICKUP':
        return 'Retrait dépôt';
      default:
        return (deliveryType == null || deliveryType!.trim().isEmpty)
            ? '--'
            : deliveryType!.trim();
    }
  }

  String get paymentMethodLabel {
    final raw = (paymentMethod ?? '').trim().toUpperCase();
    switch (raw) {
      case 'COD':
        return 'Paiement à la livraison';
      case 'CASH':
        return 'Espèces';
      case 'CARD':
      case 'CARTE':
        return 'Carte';
      default:
        return (paymentMethod == null || paymentMethod!.trim().isEmpty)
            ? '--'
            : paymentMethod!.trim();
    }
  }

  String get addressLabel {
    final parts = <String>[
      if ((address ?? '').trim().isNotEmpty) address!.trim(),
      if ((city ?? '').trim().isNotEmpty) city!.trim(),
      if ((postalCode ?? '').trim().isNotEmpty) postalCode!.trim(),
    ];
    return parts.isEmpty ? '--' : parts.join(' • ');
  }

  bool matchesSearch(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;

    return piece.toLowerCase().contains(q) ||
        statusLabel.toLowerCase().contains(q) ||
        (city ?? '').toLowerCase().contains(q) ||
        (address ?? '').toLowerCase().contains(q);
  }
}

String _string(dynamic value) => (value ?? '').toString();

String? _nullableString(dynamic value) {
  if (value == null) return null;
  final raw = value.toString().trim();
  return raw.isEmpty ? null : raw;
}

double _double(dynamic value) {
  if (value == null) return 0;
  final raw = value.toString().trim().replaceAll(',', '.');
  return double.tryParse(raw) ?? 0;
}

int _int(dynamic value) => int.tryParse((value ?? '0').toString()) ?? 0;

int? _nullableInt(dynamic value) {
  if (value == null) return null;
  return int.tryParse(value.toString());
}

DateTime? _date(dynamic value) {
  if (value == null) return null;
  final raw = value.toString().trim();
  if (raw.isEmpty) return null;
  return DateTime.tryParse(raw);
}
