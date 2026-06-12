import '../core/api_exception.dart';
import 'dart:async';
import 'package:flutter/foundation.dart';

import '../data/services/admin_confirmatrices_service.dart';
import '../models/admin_confirmatrice.dart';
import 'admin_filters_provider.dart';

class AdminConfirmatricesProvider extends ChangeNotifier {
  final AdminConfirmatricesService _service;
  AdminConfirmatricesProvider(this._service);

  String _search = '';
  bool _loading = false;
  bool _refreshing = false;
  String? _error;
  AdminConfirmatricesPage? _data;
  AdminPeriod? _lastPeriod;
  Timer? _searchDebounce;

  bool _detailLoading = false;
  String? _detailError;
  AdminConfirmatriceDetail? _detail;

  String get search => _search;
  bool get loading => _loading;
  bool get refreshing => _refreshing;
  String? get error => _error;
  AdminConfirmatricesPage? get data => _data;
  bool get detailLoading => _detailLoading;
  String? get detailError => _detailError;
  AdminConfirmatriceDetail? get detail => _detail;

  String _periodCode(AdminPeriod p) => switch (p) {
        AdminPeriod.today => 'today',
        AdminPeriod.last7Days => '7d',
        AdminPeriod.last30Days => '30d',
        AdminPeriod.last3Months => '3m',
        AdminPeriod.last12Months => '12m',
      };

  Future<void> refresh({required AdminPeriod period}) async {
    _lastPeriod = period;
    final isFirst = _data == null;
    if (isFirst) {
      _loading = true;
    } else {
      _refreshing = true;
    }
    _error = null;
    notifyListeners();
    try {
      _data = await _service.getPage(period: _periodCode(period), search: _search);
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
    await refresh(period: _lastPeriod!);
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
    notifyListeners();
    try {
      _detail = await _service.getDetail(userId,
          period: _lastPeriod == null ? '30d' : _periodCode(_lastPeriod!));
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
    notifyListeners();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }
}
