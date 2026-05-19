import '../../core/api_client.dart';
import 'offline_queue_service.dart';

/// Section 2.1 — service Stats livreur (alimente l'onglet Stats).
///
/// Section 2.15 — refactor offline-first :
///  Si `offline` est fourni dans le constructeur, les actions mutatives
///  (remettreCaisse, encaisser) passent par `enqueueOrSend` qui :
///    1. envoie direct si réseau OK
///    2. enqueue avec X-Client-Action-Id si KO (UI optimiste)
///    3. flush auto au retour
///  Pour les lectures (fetchStats), on reste en appel direct (les données
///  fraîches ne sont pas mises en queue).
class LivreurStatsService {
  final ApiClient api;
  final OfflineQueueService? offline;
  LivreurStatsService(this.api, {this.offline});

  Future<Map<String, dynamic>> fetchStats({
    String? dateIso,
    String? period, // today | yesterday | week | month
    String? from,
    String? to,
  }) async {
    final q = <String, String>{};
    if (dateIso != null) q['date'] = dateIso;
    if (period != null) q['period'] = period;
    if (from != null) q['from'] = from;
    if (to != null) q['to'] = to;
    return api.getMap('/api/livreur/stats', q: q);
  }

  Future<Map<String, dynamic>> remettreCaisse({String? dateIso}) async {
    final body = <String, dynamic>{
      if (dateIso != null) 'date': dateIso,
    };
    final q = offline;
    if (q != null) {
      // Optimiste : retourne immédiatement après enqueue ou succès direct.
      await q.enqueueOrSend(
        method: 'POST',
        endpoint: '/api/livreur/cashbox/remettre',
        body: body,
      );
      return <String, dynamic>{'queued': true};
    }
    return api.postJson('/api/livreur/cashbox/remettre', body);
  }

  Future<Map<String, dynamic>> encaisser({
    required String piece,
    required double montant,
  }) async {
    final body = <String, dynamic>{'montant': montant};
    final q = offline;
    if (q != null) {
      await q.enqueueOrSend(
        method: 'POST',
        endpoint: '/api/livreur/orders/$piece/encaisser',
        body: body,
      );
      return <String, dynamic>{'queued': true};
    }
    return api.postJson('/api/livreur/orders/$piece/encaisser', body);
  }
}
