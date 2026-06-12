import '../core/api_exception.dart';
import 'package:flutter/foundation.dart';

import '../data/services/livreur_stats_service.dart';

enum StatsScope { today, yesterday, week, month, custom }

class LivreurStatsProvider extends ChangeNotifier {
  final LivreurStatsService service;

  LivreurStatsProvider(this.service);

  StatsScope _scope = StatsScope.today;
  DateTime? _customDate;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _data;

  StatsScope get scope => _scope;
  DateTime? get customDate => _customDate;
  bool get loading => _loading;
  String? get error => _error;
  Map<String, dynamic>? get data => _data;

  Future<void> setScope(StatsScope scope, {DateTime? date}) async {
    _scope = scope;
    _customDate = date;
    await load();
  }

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final result = switch (_scope) {
        StatsScope.today => await service.fetchStats(period: 'today'),
        StatsScope.yesterday => await service.fetchStats(period: 'yesterday'),
        StatsScope.week => await service.fetchStats(period: 'week'),
        StatsScope.month => await service.fetchStats(period: 'month'),
        StatsScope.custom => await service.fetchStats(
            dateIso: _customDate?.toIso8601String().split('T').first,
          ),
      };
      _data = result;
    } catch (e) {
      _error = friendlyError(e);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> remettreCaisse() async {
    try {
      await service.remettreCaisse(
        dateIso: _scope == StatsScope.custom
            ? _customDate?.toIso8601String().split('T').first
            : null,
      );
      await load();
      return true;
    } catch (e) {
      _error = friendlyError(e);
      notifyListeners();
      return false;
    }
  }
}
