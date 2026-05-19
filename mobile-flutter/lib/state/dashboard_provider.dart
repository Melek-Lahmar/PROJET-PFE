import 'package:flutter/foundation.dart';
import '../data/services/dashboard_service.dart';
import '../models/dashboard_models.dart';

class DashboardProvider extends ChangeNotifier {
  final DashboardService service;
  DashboardProvider(this.service);

  DashboardRange range = DashboardRange.week7;
  bool loading = false;
  String? error;
  DashboardData? data;

  Future<void> load({DashboardRange? newRange}) async {
    if (newRange != null) range = newRange;

    loading = true;
    error = null;
    notifyListeners();

    try {
      data = await service.fetch(range);
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}