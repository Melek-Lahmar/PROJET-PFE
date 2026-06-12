import 'admin_dashboard_overview.dart' show AdminKpi, AdminTrendPoint;

class AdminDriverListItem {
  final String userId;
  final int? profileId;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? governorate;
  final bool isTransit;
  final bool online;
  final bool inPause;
  final DateTime? lastActivityAt;
  final int ordersTotal;
  final int ordersInProgress;
  final int ordersDelivered;
  final int ordersReturned;
  final int ordersPostponed;
  final double deliveryRate;
  final double returnRate;
  final int claims;

  AdminDriverListItem({
    required this.userId,
    required this.profileId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.governorate,
    this.isTransit = false,
    required this.online,
    required this.inPause,
    required this.lastActivityAt,
    required this.ordersTotal,
    required this.ordersInProgress,
    required this.ordersDelivered,
    required this.ordersReturned,
    required this.ordersPostponed,
    required this.deliveryRate,
    required this.returnRate,
    required this.claims,
  });

  factory AdminDriverListItem.fromMap(Map<String, dynamic> m) {
    return AdminDriverListItem(
      userId: m['userId']?.toString() ?? '',
      profileId: (m['profileId'] as num?)?.toInt(),
      fullName: m['fullName']?.toString(),
      email: m['email']?.toString(),
      phone: m['phone']?.toString(),
      governorate: m['governorate']?.toString(),
      isTransit: m['isTransit'] == true,
      online: m['online'] == true,
      inPause: m['inPause'] == true,
      lastActivityAt: DateTime.tryParse(m['lastActivityAt']?.toString() ?? ''),
      ordersTotal: (m['ordersTotal'] as num?)?.toInt() ?? 0,
      ordersInProgress: (m['ordersInProgress'] as num?)?.toInt() ?? 0,
      ordersDelivered: (m['ordersDelivered'] as num?)?.toInt() ?? 0,
      ordersReturned: (m['ordersReturned'] as num?)?.toInt() ?? 0,
      ordersPostponed: (m['ordersPostponed'] as num?)?.toInt() ?? 0,
      deliveryRate: (m['deliveryRate'] as num?)?.toDouble() ?? 0,
      returnRate: (m['returnRate'] as num?)?.toDouble() ?? 0,
      claims: (m['claims'] as num?)?.toInt() ?? 0,
    );
  }
}

class AdminDriversPage {
  final DateTime generatedAt;
  final List<AdminKpi> kpis;
  final List<AdminDriverListItem> items;

  AdminDriversPage({
    required this.generatedAt,
    required this.kpis,
    required this.items,
  });

  factory AdminDriversPage.fromMap(Map<String, dynamic> m) {
    final kpis = (m['kpis'] as List?)
            ?.whereType<Map>()
            .map((e) => AdminKpi.fromMap(Map<String, dynamic>.from(e)))
            .toList() ??
        <AdminKpi>[];
    final items = (m['items'] as List?)
            ?.whereType<Map>()
            .map((e) => AdminDriverListItem.fromMap(Map<String, dynamic>.from(e)))
            .toList() ??
        <AdminDriverListItem>[];
    return AdminDriversPage(
      generatedAt: DateTime.tryParse(m['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
      kpis: kpis,
      items: items,
    );
  }
}

class AdminDriverDetail {
  final String userId;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? cin;
  final String? governorate;
  final String? delegation;
  final String? adresse;
  final bool isTransit;
  final bool online;
  final bool inPause;
  final DateTime? lastActivityAt;
  final List<AdminKpi> kpis;
  final List<AdminTrendPoint> activityTrend;
  final List<AdminDriverRecentDelivery> recentDeliveries;

  AdminDriverDetail({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.cin,
    required this.governorate,
    required this.delegation,
    required this.adresse,
    this.isTransit = false,
    required this.online,
    required this.inPause,
    required this.lastActivityAt,
    required this.kpis,
    required this.activityTrend,
    required this.recentDeliveries,
  });

  factory AdminDriverDetail.fromMap(Map<String, dynamic> m) {
    return AdminDriverDetail(
      userId: m['userId']?.toString() ?? '',
      fullName: m['fullName']?.toString(),
      email: m['email']?.toString(),
      phone: m['phone']?.toString(),
      cin: m['cin']?.toString(),
      governorate: m['governorate']?.toString(),
      delegation: m['delegation']?.toString(),
      adresse: m['adresse']?.toString(),
      isTransit: m['isTransit'] == true,
      online: m['online'] == true,
      inPause: m['inPause'] == true,
      lastActivityAt: DateTime.tryParse(m['lastActivityAt']?.toString() ?? ''),
      kpis: (m['kpis'] as List?)
              ?.whereType<Map>()
              .map((e) => AdminKpi.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      activityTrend: (m['activityTrend'] as List?)
              ?.whereType<Map>()
              .map((e) => AdminTrendPoint.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      recentDeliveries: (m['recentDeliveries'] as List?)
              ?.whereType<Map>()
              .map((e) =>
                  AdminDriverRecentDelivery.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
    );
  }
}

class AdminDriverRecentDelivery {
  final String piece;
  final DateTime createdAt;
  final DateTime? deliveredAt;
  final String status;
  final String? ville;
  final String? clientName;

  AdminDriverRecentDelivery({
    required this.piece,
    required this.createdAt,
    required this.deliveredAt,
    required this.status,
    required this.ville,
    required this.clientName,
  });

  factory AdminDriverRecentDelivery.fromMap(Map<String, dynamic> m) {
    return AdminDriverRecentDelivery(
      piece: m['piece']?.toString() ?? '',
      createdAt:
          DateTime.tryParse(m['createdAt']?.toString() ?? '') ?? DateTime.now(),
      deliveredAt: DateTime.tryParse(m['deliveredAt']?.toString() ?? ''),
      status: m['status']?.toString() ?? 'INCONNU',
      ville: m['ville']?.toString(),
      clientName: m['clientName']?.toString(),
    );
  }
}
