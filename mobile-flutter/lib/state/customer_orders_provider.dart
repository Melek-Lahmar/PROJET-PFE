import 'package:flutter/foundation.dart';

import '../data/services/customer_orders_service.dart';
import '../models/client_order_tracking.dart';
import '../models/customer_order.dart';

class CustomerOrdersProvider extends ChangeNotifier {
  final CustomerOrdersService _service;

  CustomerOrdersProvider(this._service);

  /// Exposé pour les écrans qui ont besoin d'appels ponctuels (tracking 6 blocs).
  CustomerOrdersService get service => _service;

  /// Phase 8 — raccourci typé sur le tracking client.
  Future<ClientOrderTracking> fetchTracking(String piece) =>
      _service.fetchTracking(piece);

  bool _loading = false;
  String? _error;
  List<CustomerOrder> _orders = const [];
  final Map<String, CustomerOrder> _detailsCache = {};

  bool get loading => _loading;
  String? get error => _error;
  List<CustomerOrder> get orders => List.unmodifiable(_orders);

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _service.fetchMine();
      _orders = data;
      for (final order in data) {
        _detailsCache[order.piece] = order;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  CustomerOrder? findByPiece(String piece) {
    try {
      return _orders.firstWhere((x) => x.piece == piece);
    } catch (_) {
      return _detailsCache[piece];
    }
  }

  Future<CustomerOrder> fetchDetails(String piece, {bool force = false}) async {
    if (!force && _detailsCache.containsKey(piece)) {
      return _detailsCache[piece]!;
    }

    final order = await _service.fetchByPiece(piece);
    _detailsCache[piece] = order;

    final index = _orders.indexWhere((x) => x.piece == piece);
    if (index >= 0) {
      _orders[index] = order;
    } else {
      _orders = [order, ..._orders];
    }

    notifyListeners();
    return order;
  }
}
