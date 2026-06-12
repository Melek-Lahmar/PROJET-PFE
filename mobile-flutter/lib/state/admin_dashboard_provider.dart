import '../core/api_exception.dart';
import 'package:flutter/foundation.dart';

import '../data/services/admin_dashboard_service.dart';
import '../models/admin_dashboard_overview.dart';
import 'admin_filters_provider.dart';

class AdminDashboardProvider extends ChangeNotifier {
  final AdminDashboardService _service;

  AdminDashboardProvider(this._service);

  bool _loading = false;
  String? _error;
  AdminDashboardOverview? _data;

  bool get loading => _loading;
  String? get error => _error;
  AdminDashboardOverview? get data => _data;

  String _periodCode(AdminPeriod p) {
    switch (p) {
      case AdminPeriod.today:
        return 'today';
      case AdminPeriod.last7Days:
        return '7d';
      case AdminPeriod.last30Days:
        return '30d';
      case AdminPeriod.last3Months:
        return '3m';
      case AdminPeriod.last12Months:
        return '12m';
    }
  }

  Future<void> refresh({
    required String? governorate,
    required AdminPeriod period,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _data = await _service.getOverview(
        governorate: governorate,
        period: _periodCode(period),
      );
    } catch (e) {
      _error = friendlyError(e);
      _data = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
