import 'admin_dashboard_overview.dart' show AdminKpi;

/// Modèles miroir des DTOs `AdminOrdersPageDto` côté backend.
/// Réutilise `AdminKpi` du dashboard pour cohérence visuelle.

class AdminOrdersPage {
  final DateTime generatedAt;
  final AdminOrdersAppliedFilters appliedFilters;
  final int page;
  final int pageSize;
  final int total;
  final int totalPages;
  final List<AdminKpi> kpis;
  final List<AdminOrderListItem> items;

  AdminOrdersPage({
    required this.generatedAt,
    required this.appliedFilters,
    required this.page,
    required this.pageSize,
    required this.total,
    required this.totalPages,
    required this.kpis,
    required this.items,
  });

  factory AdminOrdersPage.fromMap(Map<String, dynamic> m) {
    List<T> listOf<T>(dynamic raw, T Function(Map<String, dynamic>) f) {
      if (raw is! List) return <T>[];
      return raw
          .whereType<Map>()
          .map((e) => f(Map<String, dynamic>.from(e)))
          .toList();
    }

    return AdminOrdersPage(
      generatedAt: DateTime.tryParse(m['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
      appliedFilters: AdminOrdersAppliedFilters.fromMap(
        Map<String, dynamic>.from(m['appliedFilters'] ?? {}),
      ),
      page: (m['page'] as num?)?.toInt() ?? 1,
      pageSize: (m['pageSize'] as num?)?.toInt() ?? 25,
      total: (m['total'] as num?)?.toInt() ?? 0,
      totalPages: (m['totalPages'] as num?)?.toInt() ?? 0,
      kpis: listOf(m['kpis'], AdminKpi.fromMap),
      items: listOf(m['items'], AdminOrderListItem.fromMap),
    );
  }
}

class AdminOrdersAppliedFilters {
  final String period;
  final DateTime from;
  final DateTime to;
  final String? governorate;
  final String status;
  final String? search;
  final String sort;
  final int page;
  final int pageSize;

  AdminOrdersAppliedFilters({
    required this.period,
    required this.from,
    required this.to,
    required this.governorate,
    required this.status,
    required this.search,
    required this.sort,
    required this.page,
    required this.pageSize,
  });

  factory AdminOrdersAppliedFilters.fromMap(Map<String, dynamic> m) {
    return AdminOrdersAppliedFilters(
      period: m['period']?.toString() ?? '30d',
      from: DateTime.tryParse(m['from']?.toString() ?? '') ?? DateTime.now(),
      to: DateTime.tryParse(m['to']?.toString() ?? '') ?? DateTime.now(),
      governorate: m['governorate']?.toString(),
      status: m['status']?.toString() ?? 'all',
      search: m['search']?.toString(),
      sort: m['sort']?.toString() ?? 'date_desc',
      page: (m['page'] as num?)?.toInt() ?? 1,
      pageSize: (m['pageSize'] as num?)?.toInt() ?? 25,
    );
  }
}

class AdminOrderListItem {
  final String piece;
  final DateTime? date;
  final String? tiers;
  final String? clientName;
  final String? telephone;
  final String? ville;
  final String? governorate;

  /// EN_ATTENTE | CONFIRME | TENTATIVE | REFUSE
  final String orderStatus;

  /// CONFIRME | EN_LIVRAISON | LIVRE | RETOUR | DEPOT | REPORTE | null
  final String? deliveryStatus;

  final double? amount;
  final String? livreurName;
  final bool hasClaim;

  AdminOrderListItem({
    required this.piece,
    required this.date,
    required this.tiers,
    required this.clientName,
    required this.telephone,
    required this.ville,
    required this.governorate,
    required this.orderStatus,
    required this.deliveryStatus,
    required this.amount,
    required this.livreurName,
    required this.hasClaim,
  });

  factory AdminOrderListItem.fromMap(Map<String, dynamic> m) {
    return AdminOrderListItem(
      piece: m['piece']?.toString() ?? '',
      date: DateTime.tryParse(m['date']?.toString() ?? ''),
      tiers: m['tiers']?.toString(),
      clientName: m['clientName']?.toString(),
      telephone: m['telephone']?.toString(),
      ville: m['ville']?.toString(),
      governorate: m['governorate']?.toString(),
      orderStatus: m['orderStatus']?.toString() ?? 'INCONNU',
      deliveryStatus: m['deliveryStatus']?.toString(),
      amount: (m['amount'] as num?)?.toDouble(),
      livreurName: m['livreurName']?.toString(),
      hasClaim: m['hasClaim'] == true,
    );
  }
}
