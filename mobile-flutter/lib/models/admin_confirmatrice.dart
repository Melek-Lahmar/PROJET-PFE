import 'admin_dashboard_overview.dart' show AdminKpi, AdminBreakdownItem;

class AdminConfirmatriceListItem {
  final String userId;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? governorate;
  final bool online;
  final bool inPause;
  final DateTime? lastActivityAt;
  final DateTime? lastAssignmentAt;
  final int claimsTotal;
  final int claimsInProgress;
  final int claimsClosed;
  final int claimsRefused;
  final int requestsTotal;
  final int requestsInProgress;
  final int requestsClosed;
  final int requestsRefused;

  AdminConfirmatriceListItem({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.governorate,
    required this.online,
    required this.inPause,
    required this.lastActivityAt,
    required this.lastAssignmentAt,
    required this.claimsTotal,
    required this.claimsInProgress,
    required this.claimsClosed,
    required this.claimsRefused,
    required this.requestsTotal,
    required this.requestsInProgress,
    required this.requestsClosed,
    required this.requestsRefused,
  });

  factory AdminConfirmatriceListItem.fromMap(Map<String, dynamic> m) {
    return AdminConfirmatriceListItem(
      userId: m['userId']?.toString() ?? '',
      fullName: m['fullName']?.toString(),
      email: m['email']?.toString(),
      phone: m['phone']?.toString(),
      governorate: m['governorate']?.toString(),
      online: m['online'] == true,
      inPause: m['inPause'] == true,
      lastActivityAt: DateTime.tryParse(m['lastActivityAt']?.toString() ?? ''),
      lastAssignmentAt: DateTime.tryParse(m['lastAssignmentAt']?.toString() ?? ''),
      claimsTotal: (m['claimsTotal'] as num?)?.toInt() ?? 0,
      claimsInProgress: (m['claimsInProgress'] as num?)?.toInt() ?? 0,
      claimsClosed: (m['claimsClosed'] as num?)?.toInt() ?? 0,
      claimsRefused: (m['claimsRefused'] as num?)?.toInt() ?? 0,
      requestsTotal: (m['requestsTotal'] as num?)?.toInt() ?? 0,
      requestsInProgress: (m['requestsInProgress'] as num?)?.toInt() ?? 0,
      requestsClosed: (m['requestsClosed'] as num?)?.toInt() ?? 0,
      requestsRefused: (m['requestsRefused'] as num?)?.toInt() ?? 0,
    );
  }
}

class AdminConfirmatricesPage {
  final DateTime generatedAt;
  final List<AdminKpi> kpis;
  final List<AdminConfirmatriceListItem> items;

  AdminConfirmatricesPage({
    required this.generatedAt,
    required this.kpis,
    required this.items,
  });

  factory AdminConfirmatricesPage.fromMap(Map<String, dynamic> m) {
    return AdminConfirmatricesPage(
      generatedAt: DateTime.tryParse(m['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
      kpis: (m['kpis'] as List?)
              ?.whereType<Map>()
              .map((e) => AdminKpi.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      items: (m['items'] as List?)
              ?.whereType<Map>()
              .map((e) => AdminConfirmatriceListItem.fromMap(
                  Map<String, dynamic>.from(e)))
              .toList() ??
          [],
    );
  }
}

class AdminConfirmatriceDetail {
  final String userId;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? governorate;
  final bool online;
  final bool inPause;
  final DateTime? lastActivityAt;
  final DateTime? lastAssignmentAt;
  final List<AdminKpi> kpis;
  final List<AdminBreakdownItem> statusBreakdown;
  final List<AdminConfirmatriceRecentCase> recentCases;

  AdminConfirmatriceDetail({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.governorate,
    required this.online,
    required this.inPause,
    required this.lastActivityAt,
    required this.lastAssignmentAt,
    required this.kpis,
    required this.statusBreakdown,
    required this.recentCases,
  });

  factory AdminConfirmatriceDetail.fromMap(Map<String, dynamic> m) {
    return AdminConfirmatriceDetail(
      userId: m['userId']?.toString() ?? '',
      fullName: m['fullName']?.toString(),
      email: m['email']?.toString(),
      phone: m['phone']?.toString(),
      governorate: m['governorate']?.toString(),
      online: m['online'] == true,
      inPause: m['inPause'] == true,
      lastActivityAt: DateTime.tryParse(m['lastActivityAt']?.toString() ?? ''),
      lastAssignmentAt: DateTime.tryParse(m['lastAssignmentAt']?.toString() ?? ''),
      kpis: (m['kpis'] as List?)
              ?.whereType<Map>()
              .map((e) => AdminKpi.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      statusBreakdown: (m['statusBreakdown'] as List?)
              ?.whereType<Map>()
              .map((e) =>
                  AdminBreakdownItem.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      recentCases: (m['recentCases'] as List?)
              ?.whereType<Map>()
              .map((e) => AdminConfirmatriceRecentCase.fromMap(
                  Map<String, dynamic>.from(e)))
              .toList() ??
          [],
    );
  }
}

class AdminConfirmatriceRecentCase {
  final String code;
  final String typeCas;
  final String statut;
  final String motif;
  final String doPiece;
  final DateTime createdAt;

  AdminConfirmatriceRecentCase({
    required this.code,
    required this.typeCas,
    required this.statut,
    required this.motif,
    required this.doPiece,
    required this.createdAt,
  });

  factory AdminConfirmatriceRecentCase.fromMap(Map<String, dynamic> m) {
    return AdminConfirmatriceRecentCase(
      code: m['code']?.toString() ?? '',
      typeCas: m['typeCas']?.toString() ?? '',
      statut: m['statut']?.toString() ?? '',
      motif: m['motif']?.toString() ?? '',
      doPiece: m['doPiece']?.toString() ?? '',
      createdAt:
          DateTime.tryParse(m['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
