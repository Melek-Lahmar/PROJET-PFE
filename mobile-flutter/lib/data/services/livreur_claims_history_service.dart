import '../../core/api_client.dart';

class LivreurClaimHistoryItem {
  final int id;
  final String codeReclamation;
  final String doPiece;
  final String motif;
  final String statut;
  final String source;
  final String typeCas;
  final bool visibleClient;
  final int tentativesCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? closedAt;

  const LivreurClaimHistoryItem({
    required this.id,
    required this.codeReclamation,
    required this.doPiece,
    required this.motif,
    required this.statut,
    required this.source,
    required this.typeCas,
    required this.visibleClient,
    required this.tentativesCount,
    required this.createdAt,
    required this.updatedAt,
    this.closedAt,
  });

  bool get isClosed => statut == 'CLOTUREE' || statut == 'REFUSEE';
  bool get isDemande => typeCas == 'DEMANDE';

  factory LivreurClaimHistoryItem.fromMap(Map<String, dynamic> m) {
    return LivreurClaimHistoryItem(
      id: m['id'] as int? ?? 0,
      codeReclamation: (m['codeReclamation'] ?? '').toString(),
      doPiece: (m['doPiece'] ?? '').toString(),
      motif: (m['motif'] ?? '').toString(),
      statut: (m['statut'] ?? '').toString(),
      source: (m['source'] ?? '').toString(),
      typeCas: (m['typeCas'] ?? '').toString(),
      visibleClient: m['visibleClient'] == true,
      tentativesCount: m['tentativesCount'] as int? ?? 0,
      createdAt: DateTime.tryParse((m['createdAt'] ?? '').toString()) ?? DateTime.now(),
      updatedAt: DateTime.tryParse((m['updatedAt'] ?? '').toString()) ?? DateTime.now(),
      closedAt: m['closedAt'] != null ? DateTime.tryParse(m['closedAt'].toString()) : null,
    );
  }
}

class LivreurClaimsHistoryService {
  final ApiClient api;
  LivreurClaimsHistoryService(this.api);

  Future<List<LivreurClaimHistoryItem>> fetchMine() async {
    final data = await api.getList('/api/livreur/reclamations/mine');
    return data
        .whereType<Map<String, dynamic>>()
        .map(LivreurClaimHistoryItem.fromMap)
        .toList();
  }
}
