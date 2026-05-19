/// Modèles miroir des DTOs `AdminDashboardOverviewDto` côté backend.
class AdminDashboardOverview {
  final DateTime generatedAt;
  final AdminAppliedFilters appliedFilters;
  final List<AdminKpi> kpis;
  final List<AdminTrendPoint> deliveriesVsReturns;
  final List<AdminTrendPoint> volumeTrend;
  final List<AdminBreakdownItem> statusBreakdown;
  final List<AdminBreakdownItem> governorateBreakdown;

  AdminDashboardOverview({
    required this.generatedAt,
    required this.appliedFilters,
    required this.kpis,
    required this.deliveriesVsReturns,
    required this.volumeTrend,
    required this.statusBreakdown,
    required this.governorateBreakdown,
  });

  factory AdminDashboardOverview.fromMap(Map<String, dynamic> m) {
    List<T> _list<T>(dynamic raw, T Function(Map<String, dynamic>) f) {
      if (raw is! List) return <T>[];
      return raw
          .whereType<Map>()
          .map((e) => f(Map<String, dynamic>.from(e)))
          .toList();
    }

    return AdminDashboardOverview(
      generatedAt: DateTime.tryParse(m['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
      appliedFilters: AdminAppliedFilters.fromMap(
        Map<String, dynamic>.from(m['appliedFilters'] ?? {}),
      ),
      kpis: _list(m['kpis'], AdminKpi.fromMap),
      deliveriesVsReturns:
          _list(m['deliveriesVsReturns'], AdminTrendPoint.fromMap),
      volumeTrend: _list(m['volumeTrend'], AdminTrendPoint.fromMap),
      statusBreakdown:
          _list(m['statusBreakdown'], AdminBreakdownItem.fromMap),
      governorateBreakdown:
          _list(m['governorateBreakdown'], AdminBreakdownItem.fromMap),
    );
  }
}

class AdminAppliedFilters {
  final String period;
  final DateTime from;
  final DateTime to;
  final String? governorate;
  final int topN;

  AdminAppliedFilters({
    required this.period,
    required this.from,
    required this.to,
    required this.governorate,
    required this.topN,
  });

  factory AdminAppliedFilters.fromMap(Map<String, dynamic> m) {
    return AdminAppliedFilters(
      period: m['period']?.toString() ?? '30d',
      from: DateTime.tryParse(m['from']?.toString() ?? '') ?? DateTime.now(),
      to: DateTime.tryParse(m['to']?.toString() ?? '') ?? DateTime.now(),
      governorate: m['governorate']?.toString(),
      topN: (m['topN'] as num?)?.toInt() ?? 5,
    );
  }
}

class AdminKpi {
  final String key;
  final String label;
  final double value;
  final String formattedValue;
  final double? previousValue;
  final double? deltaPercent;
  final String deltaDirection; // up | down | flat
  final String format; // count | currency | percent

  AdminKpi({
    required this.key,
    required this.label,
    required this.value,
    required this.formattedValue,
    required this.previousValue,
    required this.deltaPercent,
    required this.deltaDirection,
    required this.format,
  });

  factory AdminKpi.fromMap(Map<String, dynamic> m) {
    return AdminKpi(
      key: m['key']?.toString() ?? '',
      label: m['label']?.toString() ?? '',
      value: (m['value'] as num?)?.toDouble() ?? 0,
      formattedValue: m['formattedValue']?.toString() ?? '',
      previousValue: (m['previousValue'] as num?)?.toDouble(),
      deltaPercent: (m['deltaPercent'] as num?)?.toDouble(),
      deltaDirection: m['deltaDirection']?.toString() ?? 'flat',
      format: m['format']?.toString() ?? 'count',
    );
  }
}

class AdminTrendPoint {
  final String bucket;
  final String label;
  final double primary;
  final double? secondary;

  AdminTrendPoint({
    required this.bucket,
    required this.label,
    required this.primary,
    required this.secondary,
  });

  factory AdminTrendPoint.fromMap(Map<String, dynamic> m) {
    return AdminTrendPoint(
      bucket: m['bucket']?.toString() ?? '',
      label: m['label']?.toString() ?? '',
      primary: (m['primary'] as num?)?.toDouble() ?? 0,
      secondary: (m['secondary'] as num?)?.toDouble(),
    );
  }
}

class AdminBreakdownItem {
  final String key;
  final String label;
  final int count;
  final double percentage;

  AdminBreakdownItem({
    required this.key,
    required this.label,
    required this.count,
    required this.percentage,
  });

  factory AdminBreakdownItem.fromMap(Map<String, dynamic> m) {
    return AdminBreakdownItem(
      key: m['key']?.toString() ?? '',
      label: m['label']?.toString() ?? '',
      count: (m['count'] as num?)?.toInt() ?? 0,
      percentage: (m['percentage'] as num?)?.toDouble() ?? 0,
    );
  }
}
