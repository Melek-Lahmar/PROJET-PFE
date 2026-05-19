import '../core/constants.dart';

class Delivery {
  final String doPiece;
  final String adresse;
  final String ville;
  final double lat;
  final double lng;
  final int statut;

  final DateTime? dateAffectation;
  final DateTime? dateLivree;
  final DateTime? dateReplanification;
  final String? noteLivreur;
  final String? apiStatus;

  final String? clientCode;
  final String? clientDisplay;
  final String? clientPhone;

  final String? paymentMethod;
  final String? deliveryType;
  final String? postalCode;
  final double netAPayer;

  /// Section 1.1 / 2.4 — numéro de passage dépôt (incrémenté par le job
  /// 00:00). 0 = jamais reporté, 1+ = nombre de retours dépôt.
  final int? depotPassageNumber;

  /// Section 1.4 / 2.2 — true si cette commande est la commande active
  /// (start-heading) du livreur. Une seule à la fois.
  final bool isActiveDelivery;

  const Delivery({
    required this.doPiece,
    required this.adresse,
    required this.ville,
    required this.lat,
    required this.lng,
    required this.statut,
    this.dateAffectation,
    this.dateLivree,
    this.dateReplanification,
    this.noteLivreur,
    this.apiStatus,
    this.clientCode,
    this.clientDisplay,
    this.clientPhone,
    this.paymentMethod,
    this.deliveryType,
    this.postalCode,
    this.netAPayer = 0.0,
    this.depotPassageNumber,
    this.isActiveDelivery = false,
  });

  Delivery copyWith({
    String? doPiece,
    String? adresse,
    String? ville,
    double? lat,
    double? lng,
    int? statut,
    DateTime? dateAffectation,
    DateTime? dateLivree,
    DateTime? dateReplanification,
    bool clearDateReplanification = false,
    String? noteLivreur,
    String? apiStatus,
    String? clientCode,
    String? clientDisplay,
    String? clientPhone,
    String? paymentMethod,
    String? deliveryType,
    String? postalCode,
    double? netAPayer,
    int? depotPassageNumber,
    bool? isActiveDelivery,
  }) {
    return Delivery(
      doPiece: doPiece ?? this.doPiece,
      adresse: adresse ?? this.adresse,
      ville: ville ?? this.ville,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      statut: statut ?? this.statut,
      dateAffectation: dateAffectation ?? this.dateAffectation,
      dateLivree: dateLivree ?? this.dateLivree,
      dateReplanification: clearDateReplanification
          ? null
          : (dateReplanification ?? this.dateReplanification),
      noteLivreur: noteLivreur ?? this.noteLivreur,
      apiStatus: apiStatus ?? this.apiStatus,
      clientCode: clientCode ?? this.clientCode,
      clientDisplay: clientDisplay ?? this.clientDisplay,
      clientPhone: clientPhone ?? this.clientPhone,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      deliveryType: deliveryType ?? this.deliveryType,
      postalCode: postalCode ?? this.postalCode,
      netAPayer: netAPayer ?? this.netAPayer,
      depotPassageNumber: depotPassageNumber ?? this.depotPassageNumber,
      isActiveDelivery: isActiveDelivery ?? this.isActiveDelivery,
    );
  }

  String get statusLabel {
    switch (statut) {
      case Statut.confirme:
        return 'Confirmé';
      case Statut.enLivraison:
        return 'En livraison';
      case Statut.livre:
        return 'Livré';
      case Statut.reporte:
        return 'Reporté';
      case Statut.retourne:
        return 'Retourné';
      case Statut.depot:
        return 'Dépôt';
      default:
        return 'Inconnu';
    }
  }

  bool get isApiConfirme {
    final normalized = (apiStatus ?? '').trim().toUpperCase();
    return normalized == 'CONFIRME';
  }

  bool get shouldAppearInNewOrders {
    return isApiConfirme;
  }

  bool get isFinished {
    return statut == Statut.livre ||
        statut == Statut.retourne ||
        statut == Statut.depot;
  }

  bool get isReported {
    return statut == Statut.reporte;
  }

  bool get isInDelivery {
    return statut == Statut.enLivraison;
  }
}