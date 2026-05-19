import 'admin_dashboard_overview.dart'
    show AdminKpi, AdminBreakdownItem, AdminTrendPoint;

class AdminClaimsOverview {
  final DateTime generatedAt;
  final List<AdminKpi> kpis;
  final List<AdminBreakdownItem> claimsStatusBreakdown;
  final List<AdminBreakdownItem> requestsStatusBreakdown;
  final List<AdminBreakdownItem> governorateBreakdown;
  final List<AdminBreakdownItem> topClaimMotifs;
  final List<AdminBreakdownItem> topRequestMotifs;
  final List<AdminTrendPoint> trend;
  final List<AdminClaimRow> unhandledCases;

  AdminClaimsOverview({
    required this.generatedAt,
    required this.kpis,
    required this.claimsStatusBreakdown,
    required this.requestsStatusBreakdown,
    required this.governorateBreakdown,
    required this.topClaimMotifs,
    required this.topRequestMotifs,
    required this.trend,
    required this.unhandledCases,
  });

  static List<T> _list<T>(dynamic raw, T Function(Map<String, dynamic>) f) {
    if (raw is! List) return <T>[];
    return raw
        .whereType<Map>()
        .map((e) => f(Map<String, dynamic>.from(e)))
        .toList();
  }

  factory AdminClaimsOverview.fromMap(Map<String, dynamic> m) {
    return AdminClaimsOverview(
      generatedAt: DateTime.tryParse(m['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
      kpis: _list(m['kpis'], AdminKpi.fromMap),
      claimsStatusBreakdown:
          _list(m['claimsStatusBreakdown'], AdminBreakdownItem.fromMap),
      requestsStatusBreakdown:
          _list(m['requestsStatusBreakdown'], AdminBreakdownItem.fromMap),
      governorateBreakdown:
          _list(m['governorateBreakdown'], AdminBreakdownItem.fromMap),
      topClaimMotifs: _list(m['topClaimMotifs'], AdminBreakdownItem.fromMap),
      topRequestMotifs:
          _list(m['topRequestMotifs'], AdminBreakdownItem.fromMap),
      trend: _list(m['trend'], AdminTrendPoint.fromMap),
      unhandledCases: _list(m['unhandledCases'], AdminClaimRow.fromMap),
    );
  }
}

class AdminClaimRow {
  final int id;
  final String code;
  final String typeCas;
  final String statut;
  final String motif;
  final String doPiece;
  final DateTime createdAt;
  final String? governorate;
  final int hoursOpen;

  AdminClaimRow({
    required this.id,
    required this.code,
    required this.typeCas,
    required this.statut,
    required this.motif,
    required this.doPiece,
    required this.createdAt,
    required this.governorate,
    required this.hoursOpen,
  });

  factory AdminClaimRow.fromMap(Map<String, dynamic> m) => AdminClaimRow(
        id: (m['id'] as num?)?.toInt() ?? 0,
        code: m['code']?.toString() ?? '',
        typeCas: m['typeCas']?.toString() ?? '',
        statut: m['statut']?.toString() ?? '',
        motif: m['motif']?.toString() ?? '',
        doPiece: m['doPiece']?.toString() ?? '',
        createdAt: DateTime.tryParse(m['createdAt']?.toString() ?? '') ??
            DateTime.now(),
        governorate: m['governorate']?.toString(),
        hoursOpen: (m['hoursOpen'] as num?)?.toInt() ?? 0,
      );
}
