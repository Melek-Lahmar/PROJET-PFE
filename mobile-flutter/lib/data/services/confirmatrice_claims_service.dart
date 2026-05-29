import 'dart:io';

import '../../core/api_client.dart';
import '../../models/client_claim.dart';

class ConfirmatriceClaimsService {
  final ApiClient api;

  ConfirmatriceClaimsService(this.api);

  Future<List<ClientClaim>> fetchAll({
    String? tab,
    bool crossGouvernorat = false,
    String? statut,
    String? source,
    String? typeCas,
    String? motif,
    String? doPiece,
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final q = <String, String>{};
    if (tab != null && tab.trim().isNotEmpty) q['tab'] = tab.trim();
    if (crossGouvernorat) q['crossGouvernorat'] = 'true';
    if (statut != null && statut.trim().isNotEmpty) q['statut'] = statut.trim();
    if (source != null && source.trim().isNotEmpty) q['source'] = source.trim();
    if (typeCas != null && typeCas.trim().isNotEmpty) q['typeCas'] = typeCas.trim();
    if (motif != null && motif.trim().isNotEmpty) q['motif'] = motif.trim();
    if (doPiece != null && doPiece.trim().isNotEmpty) q['doPiece'] = doPiece.trim();
    if (fromDate != null) q['fromDate'] = fromDate.toUtc().toIso8601String();
    if (toDate != null) q['toDate'] = toDate.toUtc().toIso8601String();

    final data = await api.getList('/api/confirmateur/reclamations', q: q);
    return data.whereType<Map<String, dynamic>>().map(ClientClaim.fromListItem).toList();
  }

  Future<ClientClaim> reprise(int id) async {
    final data = await api.postJson('/api/confirmateur/reclamations/$id/reprendre', const {});
    return ClientClaim.fromDetails(data);
  }

  Future<Map<String, dynamic>> createEchange(
    int reclamationId, {
    required List<Map<String, dynamic>> lignes,
    String? note,
  }) async {
    return api.postJson('/api/confirmateur/reclamations/$reclamationId/echange', {
      'lignes': lignes,
      if (note != null && note.trim().isNotEmpty) 'note': note,
    });
  }

  Future<List<Map<String, dynamic>>> fetchOriginalLinesForEchange(int reclamationId) async {
    final data = await api.getList('/api/confirmateur/reclamations/$reclamationId/echange/lignes-originales');
    return data.whereType<Map<String, dynamic>>().toList();
  }

  Future<ClientClaim> fetchDetails(int id) async {
    final data = await api.getMap('/api/confirmateur/reclamations/$id');
    return ClientClaim.fromDetails(data);
  }

  Future<ClientClaim> takeOver(int id) async {
    final data = await api.postJson('/api/confirmateur/reclamations/$id/take-over', const {});
    return ClientClaim.fromDetails(data);
  }

  Future<ClientClaim> updateStatus(int id, String statut, {String? motifRefus}) async {
    final data = await api.putJson('/api/confirmateur/reclamations/$id/status', {
      'statut': statut,
      if (motifRefus != null && motifRefus.trim().isNotEmpty) 'motifRefus': motifRefus,
    });
    return ClientClaim.fromDetails(data);
  }

  Future<ClientClaim> applyCorrection(
    int id, {
    String? newAddress,
    double? newLatitude,
    double? newLongitude,
    String? newPhone,
  }) async {
    final data = await api.putJson('/api/confirmateur/reclamations/$id/correction', {
      if (newAddress != null) 'newAddress': newAddress,
      if (newLatitude != null) 'newLatitude': newLatitude,
      if (newLongitude != null) 'newLongitude': newLongitude,
      if (newPhone != null) 'newPhone': newPhone,
    });
    return ClientClaim.fromDetails(data);
  }

  Future<ClientClaim> changeCommandeStatus(int id, int newStatus, {String? note}) async {
    final data = await api.putJson('/api/confirmateur/reclamations/$id/change-commande-status', {
      'newStatus': newStatus,
      if (note != null) 'note': note,
    });
    return ClientClaim.fromDetails(data);
  }

  Future<ClientClaim> updateNote(int id, String? note) async {
    final data = await api.putJson('/api/confirmateur/reclamations/$id/note', {
      'noteInterne': note,
    });
    return ClientClaim.fromDetails(data);
  }

  Future<Map<String, dynamic>> uploadPhoto(int id, File file) async {
    return api.postMultipart(
      '/api/confirmateur/reclamations/$id/photos',
      file: file,
      fileFieldName: 'file',
    );
  }

  /// Vérifie le stock disponible pour les articles de la commande liée à
  /// une réclamation COLIS_ENDOMMAGE_DEPOT. Retourne `{allAvailable, shortages: []}`.
  Future<Map<String, dynamic>> checkStockForDepotDamaged(int id) async {
    return api.getMap(
      '/api/confirmateur/reclamations/$id/depot-damaged/stock-check',
    );
  }

  /// Applique la décision finale sur un signalement COLIS_ENDOMMAGE_DEPOT :
  /// `decision` = 'ECHANGE' (stock OK, on relance) ou 'RETOUR_APPEL'
  /// (pas de stock, retour + appel client).
  Future<ClientClaim> decideDepotDamaged(
    int id, {
    required String decision,
    String? note,
  }) async {
    final data = await api.postJson(
      '/api/confirmateur/reclamations/$id/depot-damaged/decide',
      {
        'decision': decision,
        if (note != null && note.trim().isNotEmpty) 'note': note,
      },
    );
    return ClientClaim.fromDetails(data);
  }
}
