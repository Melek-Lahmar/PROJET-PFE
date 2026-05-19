import 'package:flutter/foundation.dart';

import '../data/services/admin_products_service.dart';
import '../models/admin_products_overview.dart';
import 'admin_filters_provider.dart';

class AdminProductsProvider extends ChangeNotifier {
  final AdminProductsService _service;
  AdminProductsProvider(this._service);

  bool _loading = false;
  String? _error;
  AdminProductsOverview? _data;
  String? _lastGov;
  AdminPeriod? _lastPeriod;

  bool get loading => _loading;
  String? get error => _error;
  AdminProductsOverview? get data => _data;

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
