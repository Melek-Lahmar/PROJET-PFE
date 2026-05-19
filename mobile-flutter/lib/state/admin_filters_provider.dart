import 'package:flutter/foundation.dart';

/// Périodes prédéfinies pour les filtres admin.
enum AdminPeriod {
  today,
  last7Days,
  last30Days,
  last3Months,
  last12Months,
}

extension AdminPeriodLabel on AdminPeriod {
  String get label {
    switch (this) {
      case AdminPeriod.today:
        return "Aujourd'hui";
      case AdminPeriod.last7Days:
        return '7 jours';
      case AdminPeriod.last30Days:
        return '30 jours';
      case AdminPeriod.last3Months:
        return '3 mois';
      case AdminPeriod.last12Months:
        return '12 mois';
    }
  }

  /// Renvoie la borne basse de la période (UTC). La borne haute est `now()`.
  DateTime startFrom(DateTime now) {
    switch (this) {
      case AdminPeriod.today:
        return DateTime(now.year, now.month, now.day);
      case AdminPeriod.last7Days:
        return now.subtract(const Duration(days: 7));
      case AdminPeriod.last30Days:
        return now.subtract(const Duration(days: 30));
      case AdminPeriod.last3Months:
        return DateTime(now.year, now.month - 3, now.day);
      case AdminPeriod.last12Months:
        return DateTime(now.year - 1, now.month, now.day);
    }
  }
}

/// Filtres globaux du shell admin (gouvernorat + période).
/// Tous les onglets s'abonnent à ce provider et rafraîchissent leur contenu
/// quand l'utilisateur change un filtre dans la barre du shell.
class AdminFiltersProvider extends ChangeNotifier {
  String? _gouvernorat;
  AdminPeriod _period = AdminPeriod.last30Days;

  String? get gouvernorat => _gouvernorat;
  AdminPeriod get period => _period;

  void setGouvernorat(String? value) {
    if (_gouvernorat == value) return;
    _gouvernorat = (value == null || value.isEmpty) ? null : value;
    notifyListeners();
  }

  void setPeriod(AdminPeriod value) {
    if (_period == value) return;
    _period = value;
    notifyListeners();
  }

  void reset() {
    if (_gouvernorat == null && _period == AdminPeriod.last30Days) return;
    _gouvernorat = null;
    _period = AdminPeriod.last30Days;
    notifyListeners();
  }
}
