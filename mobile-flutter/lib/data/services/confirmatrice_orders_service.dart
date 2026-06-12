import '../../core/api_client.dart';
import '../../models/confirmatrice_order.dart';

class ConfirmatriceOrdersService {
  final ApiClient api;

  ConfirmatriceOrdersService(this.api);

  Future<List<ConfirmatriceOrder>> fetchOrders({int? status}) async {
    final data = await api.getList(
      '/api/confirmateur/commandes',
      q: status == null ? null : {'status': '$status'},
    );

    return data
        .whereType<Map<String, dynamic>>()
        .map((e) => ConfirmatriceOrder.fromMap(e))
        .toList();
  }

  Future<ConfirmatriceOrder> fetchOrderDetails(String piece) async {
    final data = await api.getMap('/api/confirmateur/commandes/$piece');
    return ConfirmatriceOrder.fromMap(data);
  }

  Future<void> updateStatus(String piece, int status) async {
    if (status < 0 || status > 3) {
      throw Exception('Statut commande invalide.');
    }

    await api.putJson(
      '/api/confirmateur/commandes/$piece/status',
      {
        'status': status,
      },
    );
  }

  /// 1.E — Statuts étendus accessibles à la confirmatrice : en plus des
  /// 4 statuts BC (EN_ATTENTE/CONFIRME/TENTATIVE/REFUSE), elle peut
  /// pousser EN_LIVRAISON, DEPOT, REPORTE, RETOUR, LIVRE — ce qui agit
  /// sur la ligne F_LIVRAISON du BL associé.
  static const extendedStatusKeys = <String>[
    'EN_ATTENTE',
    'CONFIRME',
    'TENTATIVE',
    'EN_LIVRAISON',
    'DEPOT',
    'REPORTE',
    'RETOUR',
    'LIVRE',
    'REFUSE',
  ];

  Future<void> updateStatusExtended(
    String piece,
    String statusKey, {
    int? tentativeCount,
    String? note,
  }) async {
    final key = statusKey.trim().toUpperCase();
    if (!extendedStatusKeys.contains(key)) {
      throw Exception('Statut commande invalide : $key.');
    }

    await api.putJson(
      '/api/confirmateur/commandes/$piece/status-extended',
      {
        'statusKey': key,
        if (tentativeCount != null) 'tentativeCount': tentativeCount,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
  }

  /// Ajuste le compteur de tentatives (+1 / -1). Chaque +1 est journalisé
  /// (qui + quand) côté backend et visible par les autres confirmatrices.
  Future<Map<String, dynamic>> adjustTentative(String piece, int delta) async {
    return api.putJson(
      '/api/confirmateur/commandes/$piece/tentative',
      {'delta': delta},
    );
  }

  /// Retourne la couverture de zone pour la commande (livreur dispo dans la
  /// gouvernorat/délégation du client). Backend : `{ hasCoverage: bool,
  /// gouvernorat: string?, delegation: string?, livreurCount: int }`.
  Future<Map<String, dynamic>> getZoneCoverage(String piece) async {
    return api.getMap('/api/confirmateur/commandes/$piece/zone-coverage');
  }

  /// Liste des superviseurs (nom + téléphone) à contacter si aucun livreur
  /// ne couvre la zone du client.
  Future<List<Map<String, dynamic>>> getSupervisors() async {
    final data = await api.getList('/api/confirmateur/supervisors');
    return data.whereType<Map<String, dynamic>>().toList();
  }

  Future<String?> transformToBl(String piece) async {
    final data = await api.postJson(
      '/api/confirmateur/commandes/$piece/transform-to-bl',
      {},
    );

    return _readBlPiece(data);
  }

  String? _readBlPiece(Map<String, dynamic> data) {
    final candidates = [
      data['blPiece'],
      data['BlPiece'],
      data['piece'],
      data['Piece'],
    ];

    for (final value in candidates) {
      final text = value?.toString().trim();
      if (text != null && text.isNotEmpty) {
        return text;
      }
    }

    return null;
  }
}