class KpiItem {
  final String title;
  final String value;
  final String? subtitle;
  final double? deltaPercent; // + ou -
  final bool positiveIsGood;

  const KpiItem({
    required this.title,
    required this.value,
    this.subtitle,
    this.deltaPercent,
    this.positiveIsGood = true,
  });
}

class TimePoint {
  final DateTime t;
  final double y;
  const TimePoint(this.t, this.y);
}

class DriverMetric {
  final String driverName;
  final double lateCount;
  const DriverMetric(this.driverName, this.lateCount);
}

class StatusSlice {
  final String label; // Livré / Reporté / Retourné
  final double value;
  const StatusSlice(this.label, this.value);
}

class DashboardData {
  final List<KpiItem> kpis;
  final List<TimePoint> deliveriesTrend; // line
  final List<DriverMetric> lateByDriver; // bar
  final List<StatusSlice> statusBreakdown; // pie/donut

  const DashboardData({
    required this.kpis,
    required this.deliveriesTrend,
    required this.lateByDriver,
    required this.statusBreakdown,
  });
}

enum DashboardRange { today, week7, month30 }