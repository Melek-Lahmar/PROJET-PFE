/// Phase 3A — État de disponibilité de la confirmatrice.
/// Retourné par GET /api/confirmateur/status/me et par pause/resume.
class ConfirmatriceStatus {
  final String userId;
  final bool isInPause;
  final DateTime? lastActivityAt;
  final DateTime? lastAssignmentAt;
  final bool isOnline;
  final bool isEligible;
  final int onlineThresholdMinutes;

  const ConfirmatriceStatus({
    required this.userId,
    required this.isInPause,
    this.lastActivityAt,
    this.lastAssignmentAt,
    required this.isOnline,
    required this.isEligible,
    required this.onlineThresholdMinutes,
  });

  factory ConfirmatriceStatus.fromMap(Map<String, dynamic> map) {
    return ConfirmatriceStatus(
      userId: (map['userId'] ?? map['UserId'] ?? '').toString(),
      isInPause: (map['isInPause'] ?? map['IsInPause']) == true,
      lastActivityAt: _date(map['lastActivityAt'] ?? map['LastActivityAt']),
      lastAssignmentAt:
          _date(map['lastAssignmentAt'] ?? map['LastAssignmentAt']),
      isOnline: (map['isOnline'] ?? map['IsOnline']) == true,
      isEligible: (map['isEligible'] ?? map['IsEligible']) == true,
      onlineThresholdMinutes: _int(
          map['onlineThresholdMinutes'] ?? map['OnlineThresholdMinutes']),
    );
  }
}

/// Phase 9 — Statistiques personnelles de la confirmatrice (endpoint
/// GET /api/confirmateur/status/me/stats). Inclut aussi un sous-ensemble
/// de l'état de disponibilité pour éviter un aller-retour supplémentaire.
class ConfirmatriceStats {
  final int active;
  final int closedToday;
  final int closedThisWeek;
  final int closedThisMonth;
  final bool isInPause;
  final bool isOnline;
  final DateTime? lastActivityAt;
  final DateTime? lastAssignmentAt;

  const ConfirmatriceStats({
    required this.active,
    required this.closedToday,
    required this.closedThisWeek,
    required this.closedThisMonth,
    required this.isInPause,
    required this.isOnline,
    this.lastActivityAt,
    this.lastAssignmentAt,
  });

  factory ConfirmatriceStats.fromMap(Map<String, dynamic> map) {
    return ConfirmatriceStats(
      active: _int(map['active']),
      closedToday: _int(map['closedToday']),
      closedThisWeek: _int(map['closedThisWeek']),
      closedThisMonth: _int(map['closedThisMonth']),
      isInPause: map['isInPause'] == true,
      isOnline: map['isOnline'] == true,
      lastActivityAt: _date(map['lastActivityAt']),
      lastAssignmentAt: _date(map['lastAssignmentAt']),
    );
  }
}

int _int(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('${v ?? ''}') ?? 0;
}

DateTime? _date(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  if (s.isEmpty) return null;
  return DateTime.tryParse(s);
}
