import 'package:flutter/foundation.dart';

import '../data/services/admin_claims_overview_service.dart';
import '../models/admin_claims_overview.dart';
import 'admin_filters_provider.dart';

class AdminClaimsOverviewProvider extends ChangeNotifier {
  final AdminClaimsOverviewService _service;
  AdminClaimsOverviewProvider(this._service);

  bool _loading = false;
  String? _error;
  AdminClaimsOverview? _data;
  String? _lastGov;
  AdminPeriod? _lastPeriod;

  /// Filtre local par type de cas. `all` | `RECLAMATION` | `DEMANDE`.
  String _typeCasFilter = 'all';

  /// Filtre local par motif. null = tous motifs.
  String? _motifFilter;

  bool get loading => _loading;
  String? get error => _error;
  AdminClaimsOverview? get data => _data;
  String get typeCasFilter => _typeCasFilter;
  String? get motifFilter => _motifFilter;

  /// Liste des cas non traités après application des filtres locaux.
  List<AdminClaimRow> get filteredUnhandledCases {
    final cases = _data?.unhandledCases ?? const <AdminClaimRow>[];
    return cases.where((c) {
      if (_typeCasFilter != 'all' && c.typeCas != _typeCasFilter) return false;
      if (_motifFilter != null && c.motif != _motifFilter) return false;
      return true;
    }).toList();
  }

  /// Motifs distincts dans les cas non traités (pour peupler le filtre).
  List<String> get availableMotifs {
    final cases = _data?.unhandledCases ?? const <AdminClaimRow>[];
    return cases
        .map((c) => c.motif)
        .where((m) => m.isNotEmpty)
        .toSet()
        .toList()
      ..sort();
  }

  void setTypeCasFilter(String value) {
    if (_typeCasFilter == value) return;
    _typeCasFilter = value;
    notifyListeners();
  }

  void setMotifFilter(String? value) {
    if (_motifFilter == value) return;
    _motifFilter = value;
    notifyListeners();
  }

  void clearLocalFilters() {
    _typeCasFilter = 'all';
    _motifFilter = null;
    notifyListeners();
  }

  String _periodCode(AdminPeriod p) => switch (p) {
        AdminPeriod.today => 'today',
        AdminPeriod.last7Days => '7d',
        AdminPeriod.last30Days => '30d',
        AdminPeriod.last3Months => '3m',
        AdminPeriod.last12Months => '12m',
      };

  Future<void> refresh({
    required String? governorate,
    required AdminPeriod period,
  }) async {
    _lastGov = governorate;
    _lastPeriod = period;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _data = await _service.getOverview(
        governorate: governorate,
        period: _periodCode(period),
      );
    } catch (e) {
      _error = e.toString();
      _data = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> reload() async {
    if (_lastPeriod == null) return;
    await refresh(governorate: _lastGov, period: _lastPeriod!);
  }
}
