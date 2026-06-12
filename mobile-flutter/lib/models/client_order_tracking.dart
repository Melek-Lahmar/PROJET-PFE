import 'customer_tracking_event.dart';

/// Phase 8 — Payload du tracking client en 6 blocs.
/// Endpoint : GET /api/client/orders/{piece}/tracking
class ClientOrderTracking {
  // Bloc 1 — En-tête.
  final String piece;
  final String status;
  final String statusLabel;
  final DateTime? orderDate;

  // Bloc 2 — Destinataire.
  final String? phone;
  final String? address;
  final String? city;
  final String? postalCode;
  final String? repere;
  final String? instructionsLivreur;

  // Bloc 3 — Contenu colis.
  final List<ClientOrderTrackingItem> items;

  // Bloc 4 — Timeline livraison.
  final List<CustomerTrackingEvent> events;

  // Transit inter-dépôts.
  final int transitTotalCount;
  final int transitReceivedCount;
  // Résumé global "client" ("En transit de X vers Y"). Le détail par article
  // (transitItems) reste réservé au staff (vide côté client).
  final String? transitSummary;
  final List<ClientOrderTrackingTransitItem> transitItems;

  // Bloc 5 et 6 — Réclamation / Demande liées.
  final LinkedCase? linkedReclamation;
  final LinkedCase? linkedDemande;

  // Infos de livraison et paiement.
  final String? deliveryType;
  final String? paymentMethod;
  final double netAPayer;
  final DateTime? assignedAt;
  final DateTime? replannedAt;
  final DateTime? deliveredAt;
  final String? driverNote;

  const ClientOrderTracking({
    required this.piece,
    required this.status,
    required this.statusLabel,
    this.orderDate,
    this.phone,
    this.address,
    this.city,
    this.postalCode,
    this.repere,
    this.instructionsLivreur,
    this.items = const [],
    this.events = const [],
    this.transitTotalCount = 0,
    this.transitReceivedCount = 0,
    this.transitSummary,
    this.transitItems = const [],
    this.linkedReclamation,
    this.linkedDemande,
    this.deliveryType,
    this.paymentMethod,
    this.netAPayer = 0,
    this.assignedAt,
    this.replannedAt,
    this.deliveredAt,
    this.driverNote,
  });

  factory ClientOrderTracking.fromMap(Map<String, dynamic> map) {
    final rawItems = map['items'];
    final items = rawItems is List
        ? rawItems
            .whereType<Map<String, dynamic>>()
            .map(ClientOrderTrackingItem.fromMap)
            .toList()
        : const <ClientOrderTrackingItem>[];

    final rawEvents = map['events'];
    final events = rawEvents is List
        ? rawEvents
            .whereType<Map<String, dynamic>>()
            .map(CustomerTrackingEvent.fromMap)
            .toList()
        : const <CustomerTrackingEvent>[];

    return ClientOrderTracking(
      piece: (map['piece'] ?? '').toString(),
      status: (map['status'] ?? '').toString(),
      statusLabel: (map['statusLabel'] ?? '').toString(),
      orderDate: _date(map['orderDate']),
      phone: _nullStr(map['phone']),
      address: _nullStr(map['address']),
      city: _nullStr(map['city']),
      postalCode: _nullStr(map['postalCode']),
      repere: _nullStr(map['repere']),
      instructionsLivreur: _nullStr(map['instructionsLivreur']),
      items: items,
      events: events,
      transitTotalCount: _int(map['transitTotalCount']),
      transitReceivedCount: _int(map['transitReceivedCount']),
      transitSummary: _nullStr(map['transitSummary']),
      transitItems: (map['transitItems'] is List)
          ? (map['transitItems'] as List)
              .whereType<Map<String, dynamic>>()
              .map(ClientOrderTrackingTransitItem.fromMap)
              .toList()
          : const [],
      linkedReclamation: map['linkedReclamation'] is Map<String, dynamic>
          ? LinkedCase.fromMap(map['linkedReclamation'] as Map<String, dynamic>)
          : null,
      linkedDemande: map['linkedDemande'] is Map<String, dynamic>
          ? LinkedCase.fromMap(map['linkedDemande'] as Map<String, dynamic>)
          : null,
      deliveryType: _nullStr(map['deliveryType']),
      paymentMethod: _nullStr(map['paymentMethod']),
      netAPayer: _double(map['netAPayer']),
      assignedAt: _date(map['assignedAt']),
      replannedAt: _date(map['replannedAt']),
      deliveredAt: _date(map['deliveredAt']),
      driverNote: _nullStr(map['driverNote']),
    );
  }
}

class ClientOrderTrackingItem {
  final String? arRef;
  final String? designation;
  final double quantite;
  final double? prixUnitaire;
  final double? montantTTC;

  const ClientOrderTrackingItem({
    this.arRef,
    this.designation,
    this.quantite = 0,
    this.prixUnitaire,
    this.montantTTC,
  });

  factory ClientOrderTrackingItem.fromMap(Map<String, dynamic> map) {
    return ClientOrderTrackingItem(
      arRef: _nullStr(map['arRef']),
      designation: _nullStr(map['designation']),
      quantite: _double(map['quantite']),
      prixUnitaire: _nullDouble(map['prixUnitaire']),
      montantTTC: _nullDouble(map['montantTTC']),
    );
  }
}

/// Article en transit inter-dépôts pour cette commande.
class ClientOrderTrackingTransitItem {
  final String articleRef;
  final String articleName;
  final double quantity;
  /// EN_ATTENTE_TRANSIT | EN_COURS_TRANSIT | RECU_DEPOT_DESTINE | TRANSIT_TERMINE
  final String status;
  final String? sourceDepotName;
  final String? destinationDepotName;
  final String currentMessage;

  const ClientOrderTrackingTransitItem({
    required this.articleRef,
    required this.articleName,
    required this.quantity,
    required this.status,
    this.sourceDepotName,
    this.destinationDepotName,
    this.currentMessage = '',
  });

  factory ClientOrderTrackingTransitItem.fromMap(Map<String, dynamic> map) {
    return ClientOrderTrackingTransitItem(
      articleRef: (map['articleRef'] ?? '').toString(),
      articleName: (map['articleName'] ?? '').toString(),
      quantity: _double(map['quantity']),
      status: (map['status'] ?? '').toString(),
      sourceDepotName: _nullStr(map['sourceDepotName']),
      destinationDepotName: _nullStr(map['destinationDepotName']),
      currentMessage: (map['currentMessage'] ?? '').toString(),
    );
  }
}

/// Réclamation ou Demande liée à la commande. [colorIndicator] vaut
/// "RED" / "GREEN" / "GREY" uniquement pour les Demandes visibles client,
/// null sinon.
class LinkedCase {
  final int id;
  final String code;
  final String motif;
  final String statut;
  final String typeCas;
  final String? colorIndicator;
  final String? colorLabel;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const LinkedCase({
    required this.id,
    required this.code,
    required this.motif,
    required this.statut,
    required this.typeCas,
    this.colorIndicator,
    this.colorLabel,
    this.createdAt,
    this.updatedAt,
  });

  factory LinkedCase.fromMap(Map<String, dynamic> map) {
    return LinkedCase(
      id: _int(map['id']),
      code: (map['code'] ?? '').toString(),
      motif: (map['motif'] ?? '').toString(),
      statut: (map['statut'] ?? '').toString(),
      typeCas: (map['typeCas'] ?? '').toString(),
      colorIndicator: _nullStr(map['colorIndicator']),
      colorLabel: _nullStr(map['colorLabel']),
      createdAt: _date(map['createdAt']),
      updatedAt: _date(map['updatedAt']),
    );
  }
}

String? _nullStr(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

double _double(dynamic v) {
  if (v == null) return 0;
  final s = v.toString().trim().replaceAll(',', '.');
  return double.tryParse(s) ?? 0;
}

double? _nullDouble(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim().replaceAll(',', '.');
  return double.tryParse(s);
}

int _int(dynamic v) => int.tryParse((v ?? '0').toString()) ?? 0;

DateTime? _date(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  if (s.isEmpty) return null;
  return DateTime.tryParse(s);
}
