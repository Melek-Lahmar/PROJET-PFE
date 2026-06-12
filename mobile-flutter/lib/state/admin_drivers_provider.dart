import '../core/api_exception.dart';
import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/services/admin_drivers_service.dart';
import '../models/admin_driver.dart';
import 'admin_filters_provider.dart';

class AdminDriversProvider extends ChangeNotifier {
  final AdminDriversService _service;
  AdminDriversProvider(this._service);

  String _search = '';
  bool _loading = false;
  bool _refreshing = false;
  String? _error;
  AdminDriversPage? _data;
  String? _lastGov;
  AdminPeriod? _lastPeriod;
  Timer? _searchDebounce;

  bool _detailLoading = false;
  String? _detailError;
  AdminDriverDetail? _detail;
  String? _detailUserId;

  String get search => _search;
  bool get loading => _loading;
  bool get refreshing => _refreshing;
  String? get error => _error;
  AdminDriversPage? get data => _data;
  bool get detailLoading => _detailLoading;
  String? get detailError => _detailError;
  AdminDriverDetail? get detail => _detail;
  String? get detailUserId => _detailUserId;

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
    final isFirst = _data == null;
    if (isFirst) _loading = true; else _refreshing = true;
    _error = null;
    notifyListeners();
    try {
      _data = await _service.getPage(
        period: _periodCode(period),
        governorate: governorate,
        search: _search,
      );
    } catch (e) {
      _error = friendlyError(e);
      if (isFirst) _data = null;
    } finally {
      _loading = false;
      _refreshing = false;
      notifyListeners();
    }
  }

  Future<void> reload() async {
    if (_lastPeriod == null) return;
    await refresh(governorate: _lastGov, period: _lastPeriod!);
  }

  void setSearch(String v) {
    if (_search == v) return;
    _search = v;
    notifyListeners();
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 400), reload);
  }

  Future<void> openDetail(String userId) async {
    _detailLoading = true;
    _detailError = null;
    _detail = null;
    _detailUserId = userId;
    notifyListeners();
    try {
      _detail = await _service.getDetail(
        userId,
        period: _lastPeriod == null ? '30d' : _periodCode(_lastPeriod!),
      );
    } catch (e) {
      _detailError = friendlyError(e);
    } finally {
      _detailLoading = false;
      notifyListeners();
    }
  }

  void closeDetail() {
    _detail = null;
    _detailError = null;
    _detailLoading = false;
    _detailUserId = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }
}
