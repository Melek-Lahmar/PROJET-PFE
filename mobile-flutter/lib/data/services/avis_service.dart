import '../../core/api_client.dart';
import '../../models/avis.dart';
import 'offline_queue_service.dart';

class AvisService {
  final ApiClient api;

  /// V2-2 — quand non null, les actions d'écriture (submit/dismiss)
  /// passent par la queue offline (envoi direct si réseau OK, sinon
  /// enqueue + UI optimiste).
  final OfflineQueueService? offline;

  AvisService(this.api, {this.offline});

  Future<List<AvisPending>> fetchPending() async {
    final data = await api.getList('/api/avis/pending');
    return data.whereType<Map<String, dynamic>>().map(AvisPending.fromMap).toList();
  }

  Future<void> dismiss(String commandePiece) async {
    final body = {'commandePiece': commandePiece};
    final q = offline;
    if (q != null) {
      await q.sendOrQueue(
        method: 'POST',
        endpoint: '/api/avis/dismiss',
        body: body,
      );
      return;
    }
    await api.postJson('/api/avis/dismiss', body);
  }

  Future<AvisSubmitted> submit({
    required String commandePiece,
    required int note,
    String? commentaire,
  }) async {
    final body = <String, dynamic>{
      'commandePiece': commandePiece,
      'note': note,
      if (commentaire != null && commentaire.trim().isNotEmpty) 'commentaire': commentaire,
    };
    final q = offline;
    if (q != null) {
      final result = await q.sendOrQueue(
        method: 'POST',
        endpoint: '/api/avis',
        body: body,
      );
      if (result.wasSent && result.responseBody != null) {
        return AvisSubmitted.fromMap(result.responseBody!);
      }
      // Queued offline → instance optimiste locale (id=0 marqueur).
      return AvisSubmitted(
        id: 0,
        commandePiece: commandePiece,
        note: note,
        commentaire: commentaire,
        createdAt: DateTime.now(),
      );
    }
    final data = await api.postJson('/api/avis', body);
    return AvisSubmitted.fromMap(data);
  }
}

class LivreurSignalService {
  final ApiClient api;

  LivreurSignalService(this.api);

  /// À appeler en même temps que le livreur change le statut commande.
  /// Le backend classe le motif (immédiat/différé), incrémente tentative,
  /// crée une demande si le seuil est atteint.
  Future<Map<String, dynamic>> recordAttempt({
    required String doPiece,
    required String motif,
    String? description,
    double? latitude,
    double? longitude,
  }) async {
    return api.postForm(
      '/api/livreur/reclamations/attempt',
      fields: {
        'doPiece': doPiece,
        'motif': motif,
        if (description != null) 'description': description,
        if (latitude != null) 'latitude': latitude.toString(),
        if (longitude != null) 'longitude': longitude.toString(),
      },
    );
  }

  Future<void> markDelivered({required String doPiece, String? clientUserId}) async {
    await api.postJson('/api/livreur/reclamations/delivered', {
      'doPiece': doPiece,
      if (clientUserId != null) 'clientUserId': clientUserId,
    });
  }
}
