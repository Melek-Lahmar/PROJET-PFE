import 'package:flutter/foundation.dart';

import '../data/services/confirmatrice_status_service.dart';
import '../models/confirmatrice_status.dart';

/// Phase 3A + 9 — Provider central pour la section Profil confirmatrice.
/// Gère l'état de disponibilité (pause / online) et les stats personnelles.
class ConfirmatriceStatusProvider extends ChangeNotifier {
  final ConfirmatriceStatusService service;

  ConfirmatriceStatusProvider(this.service);

  bool loading = false;
  bool saving = false;
  String? error;

  ConfirmatriceStatus? status;
  ConfirmatriceStats? stats;

  bool get isInPause => status?.isInPause ?? false;
  bool get isOnline => status?.isOnline ?? false;
  bool get isEligible => status?.isEligible ?? false;

  Future<void> refresh() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      // Stats inclut déjà un sous-ensemble de status ; on récupère aussi
      // le status complet car il contient userId et onlineThresholdMinutes.
      final results = await Future.wait([
        service.fetchMyStatus(),
        service.fetchMyStats(),
      ]);
      status = results[0] as ConfirmatriceStatus;
      stats = results[1] as ConfirmatriceStats;
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<bool> pause() async {
    if (saving) return false;
    saving = true;
    error = null;
    notifyListeners();
    try {
      status = await service.pause();
      // Les stats dépendent du status (IsInPause) ; on refresh pour garder
      // cohérent l'affichage "En pause" côté cartes.
      try {
        stats = await service.fetchMyStats();
      } catch (_) {
        // Non bloquant — le switch principal a déjà changé.
      }
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<bool> resume() async {
    if (saving) return false;
    saving = true;
    error = null;
    notifyListeners();
    try {
      status = await service.resume();
      try {
        stats = await service.fetchMyStats();
      } catch (_) {}
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  void clearError() {
    error = null;
    notifyListeners();
  }
}
