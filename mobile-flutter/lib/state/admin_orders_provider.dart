import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/services/admin_orders_service.dart';
import '../models/admin_order_detail.dart';
import '../models/admin_orders_page.dart';
import 'admin_filters_provider.dart';

/// État de l'onglet Commandes/Colis du cockpit admin.
/// Gère la pagination, les filtres locaux (statut, recherche, tri),
/// et délègue le rafraîchissement à `AdminOrdersService`.
class AdminOrdersProvider extends ChangeNotifier {
  final AdminOrdersService _service;

  AdminOrdersProvider(this._service);

  // ----- Filtres locaux -----
  String _status = 'all';
  String _sort = 'date_desc';
  String _search = '';
  int _page = 1;
  final int _pageSize = 25;

  // ----- État de chargement -----
  bool _loading = false;
  bool _refreshing = false;
  String? _error;
  AdminOrdersPage? _data;

  // ----- Filtres globaux derniers utilisés -----
  String? _lastGov;
  AdminPeriod? _lastPeriod;

  // ----- Détail (drawer) -----
  bool _detailLoading = false;
  String? _detailError;
  AdminOrderDetail? _detail;
  String? _detailPiece;

  // ----- Search debounce -----
  Timer? _searchDebounce;

  // ----- Getters -----
  String get status => _status;
  String get sort => _sort;
  String get search => _search;
  int get page => _page;
  int get pageSize => _pageSize;

  bool get loading => _loading;
  bool get refreshing => _refreshing;
  String? get error => _error;
  AdminOrdersPage? get data => _data;

  bool get detailLoading => _detailLoading;
  String? get detailError => _detailError;
  AdminOrderDetail? get detail => _detail;
  String? get detailPiece => _detailPiece;

  // ====================================================================
  // Refresh / pagination
  // ====================================================================

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

  /// Rafraîchit la liste depuis le serveur. Appelé au mount, au changement
  /// de filtre global (gouvernorat/période), ou au RefreshIndicator.
  Future<void> refresh({
    required String? governorate,
    required AdminPeriod period,
    bool resetPage = true,
  }) async {
    _lastGov = governorate;
    _lastPeriod = period;
    if (resetPage) _page = 1;

    final isFirst = _data == null;
    if (isFirst) {
      _loading = true;
    } else {
      _refreshing = true;
    }
    _error = null;
    notifyListeners();

    try {
      _data = await _service.getPage(
        period: _periodCode(period),
        governorate: governorate,
        status: _status,
        search: _search,
        sort: _sort,
        page: _page,
        pageSize: _pageSize,
      );
    } catch (e) {
      _error = e.toString();
      if (isFirst) _data = null;
    } finally {
      _loading = false;
      _refreshing = false;
      notifyListeners();
    }
  }

  /// Recharge avec les derniers filtres globaux mémorisés.
  Future<void> reload() async {
    if (_lastPeriod == null) return;
    await refresh(
      governorate: _lastGov,
      period: _lastPeriod!,
      resetPage: false,
    );
  }

  // ====================================================================
  // Actions filtres
  // ====================================================================

  void setStatus(String value) {
    if (_status == value) return;
    _status = value;
    _page = 1;
    notifyListeners();
    reload();
  }

  void setSort(String value) {
    if (_sort == value) return;
    _sort = value;
    _page = 1;
    notifyListeners();
    reload();
  }

  /// Recherche debouncée (400 ms).
  void setSearch(String value) {
    if (_search == value) return;
    _search = value;
    notifyListeners();

    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      _page = 1;
      reload();
    });
  }

  void clearSearch() {
    _searchDebounce?.cancel();
    if (_search.isEmpty) return;
    _search = '';
    _page = 1;
    notifyListeners();
    reload();
  }

  void goToPage(int target) {
    if (_data == null) return;
    final clamped = target.clamp(1, _data!.totalPages == 0 ? 1 : _data!.totalPages);
    if (clamped == _page) return;
    _page = clamped;
    notifyListeners();
    refresh(
      governorate: _lastGov,
      period: _lastPeriod ?? AdminPeriod.last30Days,
      resetPage: false,
    );
  }

  // ====================================================================
  // Détail (drawer)
  // ====================================================================

  Future<void> openDetail(String piece) async {
    _detailLoading = true;
    _detailError = null;
    _detail = null;
    _detailPiece = piece;
    notifyListeners();

    try {
      _detail = await _service.getDetail(piece);
    } catch (e) {
      _detailError = e.toString();
    } finally {
      _detailLoading = false;
      notifyListeners();
    }
  }

  void closeDetail() {
    _detail = null;
    _detailError = null;
    _detailLoading = false;
    _detailPiece = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }
}
