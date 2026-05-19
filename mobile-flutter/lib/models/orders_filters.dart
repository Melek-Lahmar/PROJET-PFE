import '../core/constants.dart';

class OrdersFilters {
  final int? statut;
  final bool urgentOnly;
  final bool todayOnly;
  final String? paymentMethod;
  final double? minMontant;
  final double? maxMontant;
  final DateTime? dateFrom;
  final DateTime? dateTo;

  const OrdersFilters({
    this.statut,
    this.urgentOnly = false,
    this.todayOnly = false,
    this.paymentMethod,
    this.minMontant,
    this.maxMontant,
    this.dateFrom,
    this.dateTo,
  });

  factory OrdersFilters.empty() => const OrdersFilters();

  OrdersFilters copyWith({
    int? statut,
    bool clearStatut = false,
    bool? urgentOnly,
    bool? todayOnly,
    String? paymentMethod,
    bool clearPaymentMethod = false,
    double? minMontant,
    bool clearMinMontant = false,
    double? maxMontant,
    bool clearMaxMontant = false,
    DateTime? dateFrom,
    bool clearDateFrom = false,
    DateTime? dateTo,
    bool clearDateTo = false,
  }) {
    return OrdersFilters(
      statut: clearStatut ? null : (statut ?? this.statut),
      urgentOnly: urgentOnly ?? this.urgentOnly,
      todayOnly: todayOnly ?? this.todayOnly,
      paymentMethod: clearPaymentMethod
          ? null
          : (paymentMethod ?? this.paymentMethod),
      minMontant: clearMinMontant ? null : (minMontant ?? this.minMontant),
      maxMontant: clearMaxMontant ? null : (maxMontant ?? this.maxMontant),
      dateFrom: clearDateFrom ? null : (dateFrom ?? this.dateFrom),
      dateTo: clearDateTo ? null : (dateTo ?? this.dateTo),
    );
  }

  OrdersFilters clear() => const OrdersFilters();

  bool get hasAny {
    return statut != null ||
        urgentOnly ||
        todayOnly ||
        normalizedPaymentMethod != null ||
        minMontant != null ||
        maxMontant != null ||
        dateFrom != null ||
        dateTo != null;
  }

  String? get normalizedPaymentMethod => _normalized(paymentMethod);

  static String statusLabel(int statut) {
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

  static String? _normalized(String? value) {
    final raw = (value ?? '').trim();
    return raw.isEmpty ? null : raw;
  }
}