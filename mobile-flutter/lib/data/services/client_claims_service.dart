import 'dart:io';

import '../../core/api_client.dart';
import '../../models/client_claim.dart';
import 'offline_photos_queue_service.dart';
import 'offline_queue_service.dart';

class ClientClaimsService {
  final ApiClient api;

  /// V2-2 — quand non null, les actions d'écriture (create / reply / echange)
  /// passent par la queue offline (envoi direct si réseau OK, sinon enqueue
  /// + UI optimiste).
  final OfflineQueueService? offline;

  /// V2-2 — queue dédiée aux uploads binaires (photos réclamation).
  final OfflinePhotosQueueService? photosQueue;

  ClientClaimsService(this.api, {this.offline, this.photosQueue});

  Future<List<ClientClaim>> fetchMine() async {
    final data = await api.getList('/api/reclamations/mine');
    return data.whereType<Map<String, dynamic>>().map(ClientClaim.fromListItem).toList();
  }

  Future<ClientClaim> fetchDetails(int id) async {
    final data = await api.getMap('/api/reclamations/$id');
    return ClientClaim.fromDetails(data);
  }

  Future<ClientClaim> create({
    required String doPiece,
    required String motif,
    required String description,
    required bool isGlobal,
    String? arRef,
    String? typeReclamation,
    String? priorite,
    String? correctionProposee,
    // Phase 7 — spécifique motif REPROGRAMMATION. Le backend valide la date
    // (J+1 à J+14) et le créneau (MATIN / APRES_MIDI / SOIR).
    DateTime? reprogrammationDate,
    String? reprogrammationCreneau,
  }) async {
    final trimmedPiece = doPiece.trim();
    if (trimmedPiece.isEmpty) throw Exception('La commande est obligatoire.');
    final trimmedAr = (arRef ?? '').trim();
    if (!isGlobal && trimmedAr.isEmpty) {
      throw Exception('Sélectionne l\'article concerné ou choisis "Toute la commande".');
    }

    final body = <String, dynamic>{
      'doPiece': trimmedPiece,
      'isGlobal': isGlobal,
      if (!isGlobal) 'arRef': trimmedAr,
      'motif': motif,
      'description': description,
      if (typeReclamation != null && typeReclamation.trim().isNotEmpty)
        'typeReclamation': typeReclamation,
      if (priorite != null && priorite.trim().isNotEmpty) 'priorite': priorite,
      if (correctionProposee != null && correctionProposee.trim().isNotEmpty)
        'correctionProposee': correctionProposee,
      if (reprogrammationDate != null)
        'reprogrammationDate': reprogrammationDate.toUtc().toIso8601String(),
      if (reprogrammationCreneau != null && reprogrammationCreneau.trim().isNotEmpty)
        'reprogrammationCreneau': reprogrammationCreneau.trim().toUpperCase(),
    };

    final q = offline;
    if (q != null) {
      final result = await q.sendOrQueue(
        method: 'POST',
        endpoint: '/api/reclamations',
        body: body,
      );
      if (result.wasSent && result.responseBody != null) {
        final claim = result.responseBody!['reclamation'];
        if (claim is Map<String, dynamic>) {
          return ClientClaim.fromDetails(claim);
        }
      }
      // Queued offline → instance optimiste minimale (id=0 marqueur).
      return ClientClaim.fromDetails({
        'id': 0,
        'codeReclamation': '',
        'doPiece': trimmedPiece,
        'arRef': trimmedAr,
        'isGlobal': isGlobal,
        'motif': motif,
        'description': description,
        'statut': 'ENVOYEE',
        'source': 'CLIENT',
        'typeCas': 'RECLAMATION',
        'priorite': priorite,
        'correctionProposee': correctionProposee,
      });
    }

    final data = await api.postJson('/api/reclamations', body);
    final claim = data['reclamation'];
    if (claim is Map<String, dynamic>) {
      return ClientClaim.fromDetails(claim);
    }
    throw Exception('Réponse inattendue après création.');
  }

  Future<Map<String, dynamic>> uploadPhoto(int claimId, File file) async {
    final queue = photosQueue;
    if (queue != null) {
      final localPath = await queue.enqueueOrSend(
        endpoint: '/api/reclamations/$claimId/photos',
        source: file,
      );
      // L'UI affiche le chemin local en attendant l'upload réel (photoLocalPath).
      return {'photoLocalPath': localPath, 'queued': true};
    }
    return api.postMultipart(
      '/api/reclamations/$claimId/photos',
      file: file,
      fileFieldName: 'file',
    );
  }

  // Demandes (TypeCas=DEMANDE) — direction livreur → client
  Future<List<ClientClaim>> fetchMyDemandes() async {
    final data = await api.getList('/api/demandes/mine');
    return data.whereType<Map<String, dynamic>>().map(ClientClaim.fromListItem).toList();
  }

  Future<ClientClaim> fetchDemandeDetails(int id) async {
    final data = await api.getMap('/api/demandes/$id');
    return ClientClaim.fromDetails(data);
  }

  Future<ClientClaim> replyToDemande(
    int id, {
    String? newAddress,
    double? latitude,
    double? longitude,
    String? newPhone,
    String? repere,
    String? instructionsLivreur,
  }) async {
    final body = <String, dynamic>{
      if (newAddress != null) 'newAddress': newAddress,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (newPhone != null) 'newPhone': newPhone,
      if (repere != null && repere.trim().isNotEmpty) 'repere': repere,
      if (instructionsLivreur != null && instructionsLivreur.trim().isNotEmpty)
        'instructionsLivreur': instructionsLivreur,
    };

    final q = offline;
    if (q != null) {
      final result = await q.sendOrQueue(
        method: 'POST',
        endpoint: '/api/demandes/$id/reply',
        body: body,
      );
      if (result.wasSent && result.responseBody != null) {
        return ClientClaim.fromDetails(result.responseBody!);
      }
      // Queued offline → instance optimiste minimale.
      return ClientClaim.fromDetails({
        'id': id,
        'codeReclamation': '',
        'doPiece': '',
        'isGlobal': true,
        'motif': '',
        'description': '',
        'statut': 'ENVOYEE',
        'source': 'CLIENT',
        'typeCas': 'DEMANDE',
      });
    }

    final data = await api.postJson('/api/demandes/$id/reply', body);
    return ClientClaim.fromDetails(data);
  }

  // Colis endommagé : commander à nouveau
  Future<List<Map<String, dynamic>>> fetchRepeatOrderLines(int reclamationId) async {
    final data = await api.getList('/api/reclamations/$reclamationId/repeat-order');
    return data.whereType<Map<String, dynamic>>().toList();
  }

  // Colis endommagé : demander un échange avec texte court
  Future<ClientClaim> requestEchange(int reclamationId, String text) async {
    final body = {'text': text};
    final q = offline;
    if (q != null) {
      final result = await q.sendOrQueue(
        method: 'POST',
        endpoint: '/api/reclamations/$reclamationId/demande-echange',
        body: body,
      );
      if (result.wasSent && result.responseBody != null) {
        return ClientClaim.fromDetails(result.responseBody!);
      }
      return ClientClaim.fromDetails({
        'id': reclamationId,
        'codeReclamation': '',
        'doPiece': '',
        'isGlobal': true,
        'motif': 'COLIS_ENDOMMAGE',
        'description': text,
        'statut': 'ENVOYEE',
        'source': 'CLIENT',
        'typeCas': 'RECLAMATION',
        'echangeDemandeText': text,
      });
    }
    final data = await api.postJson(
      '/api/reclamations/$reclamationId/demande-echange',
      body,
    );
    return ClientClaim.fromDetails(data);
  }
}
