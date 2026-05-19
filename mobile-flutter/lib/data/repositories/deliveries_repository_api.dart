import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/delivery.dart';
import '../services/offline_queue_service.dart';
import 'deliveries_repository.dart';

class DeliveriesRepositoryApi implements DeliveriesRepository {
  final ApiClient api;
  final OfflineQueueService? offline;

  DeliveriesRepositoryApi({required this.api, this.offline});

  String? _normalizeApiStatus(String? apiStatus) {
    final s = apiStatus?.trim().toUpperCase();
    if (s == null || s.isEmpty) return null;
    return s.replaceAll(' ', '_').replaceAll('-', '_');
  }

  int _mapApiStatusToApp(String? apiStatus) {
    switch (_normalizeApiStatus(apiStatus)) {
      case 'CONFIRME':
      case 'EN_ATTENTE':
        return Statut.confirme;
      case 'EN_LIVRAISON':
        return Statut.enLivraison;
      case 'LIVRE':
        return Statut.livre;
      case 'REPORTE':
        return Statut.reporte;
      case 'RETOUR':
      case 'RETOURNE':
        return Statut.retourne;
      case 'DEPOT':
      // Côté livreur on garde le mapping Statut.depot pour les 3 sous-statuts
      // dépôt — la distinction "en préparation" / "prête" / "au dépôt" se fait
      // via `apiStatus` qui reste le string brut ("DEPOT_EN_COURS_DE_PREPARATION"
      // / "DEPOT_PRET" / "DEPOT"). L'UI client mappe tout vers "Au dépôt".
      case 'DEPOT_EN_COURS_DE_PREPARATION':
      case 'DEPOT_PRET':
        return Statut.depot;
      default:
        return Statut.confirme;
    }
  }

  String _mapAppStatusToApi(int statut) {
    switch (statut) {
      case Statut.enLivraison:
        return 'EN_LIVRAISON';
      case Statut.livre:
        return 'LIVRE';
      case Statut.reporte:
        return 'REPORTE';
      case Statut.retourne:
        return 'RETOUR';
      case Statut.depot:
        return 'DEPOT';
      case Statut.confirme:
      default:
        return 'CONFIRME';
    }
  }

  double _toDouble(dynamic v) {
    if (v == null) return 0.0;
    final raw = v.toString().trim().replaceAll(',', '.');
    return double.tryParse(raw) ?? 0.0;
  }

  DateTime? _toDate(dynamic v) {
    if (v == null) return null;
    final raw = v.toString().trim();
    if (raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  String? _nullableString(dynamic v) {
    if (v == null) return null;
    final raw = v.toString().trim();
    return raw.isEmpty ? null : raw;
  }

  dynamic _pick(Map<String, dynamic> m, List<String> keys) {
    for (final k in keys) {
      if (m.containsKey(k) && m[k] != null) return m[k];
    }
    return null;
  }

  Delivery _mapDelivery(Map<String, dynamic> m) {
    final rawStatus = _nullableString(
      _pick(m, ['apiStatus', 'status', 'documentStatus', 'StatusLabel']),
    );

    return Delivery(
      doPiece: (_pick(m, ['piece', 'doPiece', 'DO_Piece']) ?? '').toString(),
      adresse: (_pick(m, [
        'address',
        'adresse',
        'LI_Adresse',
        'DO_AdresseLivraison',
      ]) ??
          '')
          .toString(),
      ville: (_pick(m, [
        'city',
        'ville',
        'LI_Ville',
        'DO_VilleLivraison',
      ]) ??
          '')
          .toString(),
      lat: _toDouble(
        _pick(m, ['lat', 'latitude', 'LI_Latitude', 'DO_LatitudeLivraison']),
      ),
      lng: _toDouble(
        _pick(m, ['lng', 'longitude', 'LI_Longitude', 'DO_LongitudeLivraison']),
      ),
      statut: _mapApiStatusToApp(rawStatus),
      dateAffectation: _toDate(
        _pick(m, ['assignedAt', 'dateAffectation', 'LI_DateCreation']),
      ),
      dateLivree: _toDate(
        _pick(m, ['deliveredAt', 'dateLivree', 'LI_DateLivree']),
      ),
      dateReplanification: _toDate(
        _pick(m, ['replannedAt', 'dateReplanification']),
      ),
      noteLivreur: _nullableString(
        _pick(m, ['note', 'noteLivreur', 'driverNote', 'LI_Commentaire']),
      ),
      apiStatus: rawStatus,
      clientCode: _nullableString(
        _pick(m, ['clientCode', 'client_code', 'ClientCode']),
      ),
      clientDisplay: _nullableString(
        _pick(m, ['clientDisplay', 'client_display', 'ClientDisplay']),
      ),
      clientPhone: _nullableString(
        _pick(m, ['clientPhone', 'client_phone', 'ClientPhone']),
      ),
      paymentMethod: _nullableString(
        _pick(m, ['paymentMethod', 'payment_method', 'PaymentMethod']),
      ),
      deliveryType: _nullableString(
        _pick(m, ['deliveryType', 'delivery_type', 'DeliveryType']),
      ),
      postalCode: _nullableString(
        _pick(m, ['postalCode', 'postal_code', 'PostalCode']),
      ),
      netAPayer: _toDouble(
        _pick(m, ['netAPayer', 'NetAPayer', 'net_a_payer']),
      ),
      depotPassageNumber: _toIntOrNull(
        _pick(m, ['depotPassageNumber', 'DepotPassageNumber', 'depot_passage_number']),
      ),
      isActiveDelivery: _toBool(
        _pick(m, ['isActiveDelivery', 'IsActiveDelivery', 'is_active_delivery']),
      ),
    );
  }

  bool _toBool(dynamic v) {
    if (v == null) return false;
    if (v is bool) return v;
    final s = v.toString().toLowerCase();
    return s == 'true' || s == '1';
  }

  int? _toIntOrNull(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString());
  }

  @override
  Future<List<Delivery>> fetchNewOrders() async {
    final list = await api.getList('/api/livreur/orders/available');
    return list
        .map((e) => _mapDelivery(e as Map<String, dynamic>))
        .where((d) => d.shouldAppearInNewOrders)
        .toList();
  }

  @override
  Future<List<Delivery>> fetchMyOrders() async {
    final list = await api.getList('/api/livreur/orders/mine');
    return list
        .map((e) => _mapDelivery(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> pick(String doPiece) async {
    try {
      await api.postEmpty('/api/livreur/orders/$doPiece/assign');
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('409') || msg.contains('déjà affectée')) {
        throw const PickConflictException();
      }
      rethrow;
    }
  }

  @override
  Future<void> setStatus({
    required String doPiece,
    required int statut,
    String? motif,
    DateTime? dateReplanification,
    String? noteLivreur,
  }) async {
    final body = <String, dynamic>{
      'status': _mapAppStatusToApi(statut),
      'motif': motif,
      'note': noteLivreur,
      'replannedAt': dateReplanification?.toIso8601String(),
    };
    final q = offline;
    if (q != null) {
      // Section 2.15 — UI optimiste + idempotence X-Client-Action-Id
      await q.enqueueOrSend(
        method: 'PUT',
        endpoint: '/api/livreur/orders/$doPiece/status',
        body: body,
      );
      return;
    }
    await api.putJson('/api/livreur/orders/$doPiece/status', body);
  }

  @override
  Future<BatchStatusResult> setStatusBatch({
    required List<String> doPieces,
    required int statut,
    String? motif,
    String? noteLivreur,
    String? apiStatusOverride,
  }) async {
    // apiStatusOverride permet d'envoyer un statut non couvert par l'enum
    // local Statut (ex: DEPOT_PRET, DEPOT_EN_COURS_DE_PREPARATION).
    final apiStatus = apiStatusOverride ?? _mapAppStatusToApi(statut);
    final res = await api.putJson(
      '/api/livreur/orders/batch-status',
      {
        'pieces': doPieces,
        'status': apiStatus,
        'motif': motif,
        'note': noteLivreur,
      },
    );

    List<String> readList(String key) {
      final raw = res[key];
      if (raw is List) {
        return raw.map((e) => e.toString()).toList();
      }
      return const <String>[];
    }

    return BatchStatusResult(
      updated: (res['updated'] as num?)?.toInt() ?? 0,
      updatedPieces: readList('updatedPieces'),
      skippedPieces: readList('skippedPieces'),
      notFoundPieces: readList('notFoundPieces'),
    );
  }
}