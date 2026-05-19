/// A.2 — Modèle miroir de `AdminConfirmatricesWorkStatsDto` côté backend.
class AdminConfirmatricesWorkStats {
  final DateTime from;
  final DateTime to;
  final List<AdminConfirmatriceWorkStatsItem> confirmatrices;

  AdminConfirmatricesWorkStats({
    required this.from,
    required this.to,
    required this.confirmatrices,
  });

  factory AdminConfirmatricesWorkStats.fromMap(Map<String, dynamic> m) {
    final period = m['period'] is Map<String, dynamic>
        ? m['period'] as Map<String, dynamic>
        : <String, dynamic>{};
    final list = (m['confirmatrices'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .map(AdminConfirmatriceWorkStatsItem.fromMap)
            .toList() ??
        const [];
    return AdminConfirmatricesWorkStats(
      from: DateTime.tryParse(period['from']?.toString() ?? '')?.toLocal() ??
          DateTime.now(),
      to: DateTime.tryParse(period['to']?.toString() ?? '')?.toLocal() ??
          DateTime.now(),
      confirmatrices: list,
    );
  }
}

class AdminConfirmatriceWorkStatsItem {
  final String id;
  final String nom;
  final String? telephone;
  final String? gouvernorat;
  final bool isOnline;
  final int currentLoad;
  final int casCloturees;
  final int workMinutes;
  final int pauseMinutes;
  final double pauseRatePercent;

  AdminConfirmatriceWorkStatsItem({
    required this.id,
    required this.nom,
    this.telephone,
    this.gouvernorat,
    required this.isOnline,
    required this.currentLoad,
    required this.casCloturees,
    required this.workMinutes,
    required this.pauseMinutes,
    required this.pauseRatePercent,
  });

  factory AdminConfirmatriceWorkStatsItem.fromMap(Map<String, dynamic> m) {
    return AdminConfirmatriceWorkStatsItem(
      id: m['id']?.toString() ?? '',
      nom: m['nom']?.toString() ?? '—',
      telephone: m['telephone']?.toString(),
      gouvernorat: m['gouvernorat']?.toString(),
      isOnline: m['isOnline'] == true,
      currentLoad: (m['currentLoad'] as num?)?.toInt() ?? 0,
      casCloturees: (m['casCloturees'] as num?)?.toInt() ?? 0,
      workMinutes: (m['workMinutes'] as num?)?.toInt() ?? 0,
      pauseMinutes: (m['pauseMinutes'] as num?)?.toInt() ?? 0,
      pauseRatePercent: (m['pauseRatePercent'] as num?)?.toDouble() ?? 0,
    );
  }

  String formatPauseDuration() {
    final h = pauseMinutes ~/ 60;
    final m = pauseMinutes % 60;
    if (h == 0) return '${m}min';
    return '${h}h ${m}min';
  }
}
