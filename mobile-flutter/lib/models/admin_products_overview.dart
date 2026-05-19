import 'admin_dashboard_overview.dart' show AdminKpi, AdminBreakdownItem;

class AdminProductsOverview {
  final DateTime generatedAt;
  final List<AdminKpi> kpis;
  final List<AdminProductRow> topByQuantity;
  final List<AdminProductRow> topByRevenue;
  final List<AdminProductRow> topByReturns;
  final List<AdminBreakdownItem> revenueByGovernorate;
  final List<AdminBreakdownItem> returnsByGovernorate;

  AdminProductsOverview({
    required this.generatedAt,
    required this.kpis,
    required this.topByQuantity,
    required this.topByRevenue,
    required this.topByReturns,
    required this.revenueByGovernorate,
    required this.returnsByGovernorate,
  });

  static List<T> _list<T>(dynamic raw, T Function(Map<String, dynamic>) f) {
    if (raw is! List) return <T>[];
    return raw
        .whereType<Map>()
        .map((e) => f(Map<String, dynamic>.from(e)))
        .toList();
  }

  factory AdminProductsOverview.fromMap(Map<String, dynamic> m) {
    return AdminProductsOverview(
      generatedAt: DateTime.tryParse(m['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
      kpis: _list(m['kpis'], AdminKpi.fromMap),
      topByQuantity: _list(m['topByQuantity'], AdminProductRow.fromMap),
      topByRevenue: _list(m['topByRevenue'], AdminProductRow.fromMap),
      topByReturns: _list(m['topByReturns'], AdminProductRow.fromMap),
      revenueByGovernorate:
          _list(m['revenueByGovernorate'], AdminBreakdownItem.fromMap),
      returnsByGovernorate:
          _list(m['returnsByGovernorate'], AdminBreakdownItem.fromMap),
    );
  }
}

class AdminProductRow {
  final String articleRef;
  final String? designation;
  final double quantity;
  final double revenue;
  final int ordersCount;
  final int returnsCount;

  AdminProductRow({
    required this.articleRef,
    required this.designation,
    required this.quantity,
    required this.revenue,
    required this.ordersCount,
    required this.returnsCount,
  });

  factory AdminProductRow.fromMap(Map<String, dynamic> m) => AdminProductRow(
        articleRef: m['articleRef']?.toString() ?? '',
        designation: m['designation']?.toString(),
        quantity: (m['quantity'] as num?)?.toDouble() ?? 0,
        revenue: (m['revenue'] as num?)?.toDouble() ?? 0,
        ordersCount: (m['ordersCount'] as num?)?.toInt() ?? 0,
        returnsCount: (m['returnsCount'] as num?)?.toInt() ?? 0,
      );
}
