import '../../core/api_client.dart';
import '../../models/dashboard_models.dart';

class DashboardService {
  final ApiClient api;

  DashboardService(this.api);

  Future<DashboardData> fetch(DashboardRange range) async {
    final rangeValue = switch (range) {
      DashboardRange.today => "today",
      DashboardRange.week7 => "week7",
      DashboardRange.month30 => "month30",
    };

    final data = await api.getMap(
      "/api/statistics/dashboard",
      q: {"range": rangeValue},
    );

    final kpis = ((data["kpis"] as List?) ?? [])
        .map((e) => KpiItem(
      title: (e["title"] ?? "").toString(),
      value: (e["value"] ?? "").toString(),
      subtitle: e["subtitle"]?.toString(),
      deltaPercent: e["deltaPercent"] == null
          ? null
          : double.tryParse(e["deltaPercent"].toString()),
      positiveIsGood: (e["positiveIsGood"] ?? true) == true,
    ))
        .toList();

    final trend = ((data["deliveriesTrend"] as List?) ?? [])
        .map((e) => TimePoint(
      DateTime.tryParse((e["t"] ?? "").toString()) ?? DateTime.now(),
      double.tryParse((e["y"] ?? "0").toString()) ?? 0,
    ))
        .toList();

    final lateByDriver = ((data["lateByDriver"] as List?) ?? [])
        .map((e) => DriverMetric(
      (e["driverName"] ?? "").toString(),
      double.tryParse((e["lateCount"] ?? "0").toString()) ?? 0,
    ))
        .toList();

    final statusBreakdown = ((data["statusBreakdown"] as List?) ?? [])
        .map((e) => StatusSlice(
      (e["label"] ?? "").toString(),
      double.tryParse((e["value"] ?? "0").toString()) ?? 0,
    ))
        .toList();

    return DashboardData(
      kpis: kpis,
      deliveriesTrend: trend,
      lateByDriver: lateByDriver,
      statusBreakdown: statusBreakdown,
    );
  }
}