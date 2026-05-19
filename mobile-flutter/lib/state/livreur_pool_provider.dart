import 'package:flutter/foundation.dart';

import '../data/services/livreur_pool_service.dart';
import '../models/pool_commande.dart';

class LivreurPoolProvider extends ChangeNotifier {
  final LivreurPoolService service;

  LivreurPoolProvider(this.service);

  bool loadingPool = false;
  bool loadingMine = false;
  bool saving = false;
  String? error;
  List<PoolCommande> pool = const [];
  List<PoolCommande> mine = const [];

  Future<void> refreshPool() async {
    loadingPool = true;
    error = null;
    notifyListeners();
    try {
      pool = await service.fetchDisponibles();
    } catch (e) {
      error = e.toString();
    } finally {
      loadingPool = false;
      notifyListeners();
    }
  }

  Future<void> refreshMine() async {
    loadingMine = true;
    error = null;
    notifyListeners();
    try {
      mine = await service.fetchMesLivraisons();
    } catch (e) {
      error = e.toString();
    } finally {
      loadingMine = false;
      notifyListeners();
    }
  }

  Future<bool> prendre(String doPiece) async {
    saving = true;
    notifyListeners();
    try {
      final ok = await service.prendre(doPiece);
      if (ok) {
        await refreshPool();
        await refreshMine();
      }
      return ok;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<CommandeDetail?> fetchDetail(String doPiece) async {
    try {
      return await service.fetchDetail(doPiece);
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<AbandonResult?> abandon(String doPiece, {String? note}) async {
    saving = true;
    notifyListeners();
    try {
      final result = await service.abandon(doPiece, note: note);
      await refreshPool();
      await refreshMine();
      return result;
    } catch (e) {
      error = e.toString();
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }
}
