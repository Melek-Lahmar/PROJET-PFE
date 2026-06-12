import '../core/api_exception.dart';
import 'package:flutter/foundation.dart';

import '../data/services/client_claims_service.dart';
import '../models/client_claim.dart';

class ClientDemandesProvider extends ChangeNotifier {
  final ClientClaimsService service;

  ClientDemandesProvider(this.service);

  bool loading = false;
  bool saving = false;
  String? error;
  List<ClientClaim> items = const [];

  int get pendingCount =>
      items.where((c) => c.statut.toUpperCase() == 'ENVOYEE').length;

  Future<void> refresh() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      items = await service.fetchMyDemandes();
    } catch (e) {
      error = friendlyError(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<ClientClaim?> fetchDetails(int id) async {
    try {
      return await service.fetchDemandeDetails(id);
    } catch (e) {
      error = friendlyError(e);
      notifyListeners();
      return null;
    }
  }

  Future<ClientClaim?> reply(
    int id, {
    String? newAddress,
    double? latitude,
    double? longitude,
    String? newPhone,
    String? repere,
    String? instructionsLivreur,
  }) async {
    saving = true;
    notifyListeners();
    try {
      final updated = await service.replyToDemande(
        id,
        newAddress: newAddress,
        latitude: latitude,
        longitude: longitude,
        newPhone: newPhone,
        repere: repere,
        instructionsLivreur: instructionsLivreur,
      );
      // replace in list
      final idx = items.indexWhere((c) => c.id == id);
      if (idx >= 0) {
        final copy = [...items];
        copy[idx] = updated;
        items = copy;
      }
      return updated;
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }
}
