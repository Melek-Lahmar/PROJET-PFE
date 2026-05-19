import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/realtime_service.dart';
import '../data/services/commande_lock_service.dart';
import '../data/services/confirmatrice_orders_service.dart';
import '../models/commande_lock.dart';
import '../models/confirmatrice_order.dart';

class ConfirmatriceOrdersProvider extends ChangeNotifier {
  final ConfirmatriceOrdersService service;
  final CommandeLockService? lockService;
  final RealtimeService? realtime;

  ConfirmatriceOrdersProvider(
    this.service, {
    this.lockService,
    this.realtime,
  }) {
    _wireRealtime();
  }

  bool loading = false;
  bool saving = false;
  String? error;
  int? currentStatus;
  List<ConfirmatriceOrder> items = const [];

  /// Phase 4 — État local des verrous par pièce (doPiece). Une entrée
  /// absente signifie "libre". Mis à jour après refresh / acquire / release
  /// et via les événements SignalR CommandePriseEnCharge / CommandeLiberee.
  final Map<String, CommandeLock> _locks = <String, CommandeLock>{};

  Map<String, CommandeLock> get locks => Map.unmodifiable(_locks);
  CommandeLock? lockFor(String piece) => _locks[piece];
  bool isLockedByOther(String piece) {
    final l = _locks[piece];
    return l != null && !l.isMine;
  }

  bool isLockedByMe(String piece) {
    final l = _locks[piece];
    return l != null && l.isMine;
  }

  StreamSubscription<CommandeLockEvent>? _subLockTaken;
  StreamSubscription<CommandeLockEvent>? _subLockReleased;

  void _wireRealtime() {
    final r = realtime;
    if (r == null) return;
    _subLockTaken = r.commandePriseEnCharge.listen(_onLockTaken);
    _subLockReleased = r.commandeLiberee.listen(_onLockReleased);
  }

  @override
  void dispose() {
    _subLockTaken?.cancel();
    _subLockReleased?.cancel();
    super.dispose();
  }

  void _onLockTaken(CommandeLockEvent ev) {
    if (ev.doPiece.isEmpty) return;
    // On ne connaît pas l'email ni "isMine" depuis le broadcast — on recharge
    // la vérité depuis l'API pour cette pièce pour récupérer les infos complètes.
    unawaited(_refreshOneLock(ev.doPiece));
  }

  void _onLockReleased(CommandeLockEvent ev) {
    if (ev.doPiece.isEmpty) return;
    if (_locks.remove(ev.doPiece) != null) {
      notifyListeners();
    }
  }

  Future<void> _refreshOneLock(String piece) async {
    final ls = lockService;
    if (ls == null) return;
    try {
      final list = await ls.fetchActive([piece]);
      if (list.isEmpty) {
        _locks.remove(piece);
      } else {
        _locks[piece] = list.first;
      }
      notifyListeners();
    } catch (_) {
      // Non bloquant : le prochain refresh global rattrapera.
    }
  }

  /// Rafraîchit la liste avec le statut courant (ne le modifie pas).
  /// Appelée après une action (update, confirm, etc.).
  Future<void> refresh({int? status}) async {
    // Bug historique : `status ?? currentStatus` empêchait de vraiment
    // passer "Tous" (status=null) car on retombait sur currentStatus. Si le
    // caller veut appliquer un nouveau filtre, il passe par `setFilter`.
    if (status != null && status != currentStatus) {
      currentStatus = status;
    }
    await _fetch();
  }

  /// Change le filtre (y compris "Tous" via null) et recharge.
  /// Utilisé par les chips de filtre dans l'écran Commandes.
  Future<void> setFilter(int? status) async {
    currentStatus = status;
    await _fetch();
  }

  Future<void> _fetch() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      items = await service.fetchOrders(status: currentStatus);
      // Recharge les verrous pour les pièces visibles (non bloquant).
      await _refreshLocksForItems();
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> _refreshLocksForItems() async {
    final ls = lockService;
    if (ls == null) return;
    final pieces = items.map((o) => o.piece).toList();
    if (pieces.isEmpty) {
      _locks.clear();
      return;
    }
    try {
      final list = await ls.fetchActive(pieces);
      _locks
        ..clear()
        ..addEntries(list.map((l) => MapEntry(l.doPiece, l)));
    } catch (_) {
      // Silencieux : un échec de lookup des verrous ne doit pas casser la liste.
    }
  }

  Future<ConfirmatriceOrder?> fetchDetails(String piece) async {
    try {
      error = null;
      notifyListeners();
      return await service.fetchOrderDetails(piece);
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> updateStatus(String piece, int status) async {
    saving = true;
    error = null;
    notifyListeners();

    try {
      await service.updateStatus(piece, status);
      await _fetch();
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  /// 1.E — Action étendue : la confirmatrice peut pousser tous les
  /// statuts EN_LIVRAISON / DEPOT / REPORTE / RETOUR / LIVRE en plus
  /// des statuts BC habituels.
  Future<bool> updateStatusExtended(
    String piece,
    String statusKey, {
    int? tentativeCount,
    String? note,
  }) async {
    saving = true;
    error = null;
    notifyListeners();

    try {
      await service.updateStatusExtended(
        piece,
        statusKey,
        tentativeCount: tentativeCount,
        note: note,
      );
      await _fetch();
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<String?> confirmToBl(String piece) async {
    saving = true;
    error = null;
    notifyListeners();

    try {
      final blPiece = await service.transformToBl(piece);
      // Après transform → le backend supprime le lock côté serveur. On
      // nettoie le cache local avant le refresh.
      _locks.remove(piece);
      await _fetch();
      return blPiece;
    } catch (e) {
      error = e.toString();
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  /// Phase 4 — Tentative d'acquisition du verrou avant ouverture du détail.
  Future<AcquireLockResult> acquireLock(String piece) async {
    final ls = lockService;
    if (ls == null) {
      return const AcquireLockResult(acquired: true);
    }
    try {
      final result = await ls.acquire(piece);
      if (result.acquired && result.lock != null) {
        _locks[piece] = result.lock!;
        notifyListeners();
      } else if (!result.acquired) {
        // Si on apprend ici qu'un autre détient le lock, on le reflète
        // immédiatement dans la map pour que la tuile se grise sans attendre.
        // On conserve l'entrée existante si déjà présente (mêmes données).
      }
      return result;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Phase 4 — Libération explicite (quitter le détail sans transformer).
  Future<bool> releaseLock(String piece) async {
    final ls = lockService;
    if (ls == null) return true;
    try {
      final released = await ls.release(piece);
      if (released) {
        _locks.remove(piece);
        notifyListeners();
      }
      return released;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    error = null;
    notifyListeners();
  }
}
