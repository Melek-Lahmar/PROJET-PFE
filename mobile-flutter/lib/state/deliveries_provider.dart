import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/constants.dart';
import '../data/repositories/deliveries_repository.dart';
import '../models/delivery.dart';

export '../data/repositories/deliveries_repository.dart' show BatchStatusResult;

class DeliveriesProvider extends ChangeNotifier {
  DeliveriesProvider(this._repo);

  final DeliveriesRepository _repo;

  List<Delivery> _newOrders = [];
  List<Delivery> _myOrders = [];
  Delivery? _selected;
  bool _loading = false;

  Timer? _autoRefreshTimer;
  bool _refreshInProgress = false;

  List<Delivery> get newOrders => _newOrders;
  List<Delivery> get myOrders => _myOrders;
  Delivery? get selected => _selected;
  bool get loading => _loading;

  set selected(Delivery? value) {
    _selected = value;
    notifyListeners();
  }

  void select(Delivery? value) {
    selected = value;
  }

  List<Delivery> get activeForMap =>
      _myOrders.where((d) => d.statut == Statut.enLivraison).toList();

  List<Delivery> get reportedOrders =>
      _myOrders.where((d) => d.statut == Statut.reporte).toList();

  List<Delivery> get finishedOrders => _myOrders
      .where(
        (d) =>
    d.statut == Statut.livre ||
        d.statut == Statut.retourne ||
        d.statut == Statut.depot,
  )
      .toList();

  Future<void> refresh() async {
    if (_refreshInProgress) return;

    _refreshInProgress = true;
    _loading = true;
    notifyListeners();

    try {
      _newOrders = await _repo.fetchNewOrders();
      _myOrders = await _repo.fetchMyOrders();
      _selected = _syncSelected(_selected);

      final changed = await _activateDueReportedOrders();

      if (changed) {
        _newOrders = await _repo.fetchNewOrders();
        _myOrders = await _repo.fetchMyOrders();
        _selected = _syncSelected(_selected);
      }
    } finally {
      _loading = false;
      _refreshInProgress = false;
      notifyListeners();
    }
  }

  void startAutoRefresh({Duration every = const Duration(seconds: 30)}) {
    stopAutoRefresh();

    _autoRefreshTimer = Timer.periodic(every, (_) {
      refresh();
    });
  }

  void stopAutoRefresh() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = null;
  }

  Future<void> pick(String doPiece) async {
    await _repo.pick(doPiece);
    await refresh();
  }

  Future<void> setStatus({
    required String doPiece,
    required int statut,
    String? motif,
    String? noteLivreur,
    DateTime? dateReplanification,
  }) async {
    await _repo.setStatus(
      doPiece: doPiece,
      statut: statut,
      motif: motif,
      noteLivreur: noteLivreur,
      dateReplanification: dateReplanification,
    );

    _patchLocal(
      doPiece,
          (d) => d.copyWith(
        statut: statut,
        noteLivreur: _buildStoredComment(
          motif: motif,
          note: noteLivreur,
        ),
        dateReplanification:
        statut == Statut.reporte ? dateReplanification : null,
        clearDateReplanification: statut != Statut.reporte,
        dateLivree: statut == Statut.livre ? DateTime.now() : d.dateLivree,
      ),
    );

    notifyListeners();
  }

  Future<BatchStatusResult> setStatusBatch({
    required List<String> doPieces,
    required int statut,
    String? motif,
    String? noteLivreur,
    String? apiStatusOverride,
  }) async {
    final result = await _repo.setStatusBatch(
      doPieces: doPieces,
      statut: statut,
      motif: motif,
      noteLivreur: noteLivreur,
      apiStatusOverride: apiStatusOverride,
    );

    final updated = result.updatedPieces.toSet();

    for (final piece in updated) {
      _patchLocal(
        piece,
        (d) => d.copyWith(
          statut: statut,
          noteLivreur: _buildStoredComment(motif: motif, note: noteLivreur),
          clearDateReplanification: statut != Statut.reporte,
          dateLivree: statut == Statut.livre ? DateTime.now() : d.dateLivree,
        ),
      );
    }

    if (updated.isNotEmpty) notifyListeners();

    return result;
  }

  Future<bool> _activateDueReportedOrders() async {
    final now = DateTime.now();

    final dueOrders = _myOrders.where((d) {
      return d.statut == Statut.reporte &&
          d.dateReplanification != null &&
          !now.isBefore(d.dateReplanification!);
    }).toList();

    if (dueOrders.isEmpty) return false;

    var changed = false;

    for (final d in dueOrders) {
      try {
        await _repo.setStatus(
          doPiece: d.doPiece,
          statut: Statut.enLivraison,
          motif: null,
          noteLivreur: d.noteLivreur,
          dateReplanification: null,
        );

        _patchLocal(
          d.doPiece,
              (old) => old.copyWith(
            statut: Statut.enLivraison,
            clearDateReplanification: true,
          ),
        );

        changed = true;
      } catch (_) {
        // Ignore l'échec individuel pour ne pas bloquer tout le refresh.
      }
    }

    return changed;
  }

  Delivery? _syncSelected(Delivery? value) {
    if (value == null) return null;

    for (final d in _myOrders) {
      if (d.doPiece == value.doPiece) return d;
    }

    for (final d in _newOrders) {
      if (d.doPiece == value.doPiece) return d;
    }

    return value;
  }

  void _patchLocal(String doPiece, Delivery Function(Delivery d) map) {
    _newOrders = _newOrders
        .map((d) => d.doPiece == doPiece ? map(d) : d)
        .toList();

    _myOrders = _myOrders
        .map((d) => d.doPiece == doPiece ? map(d) : d)
        .toList();

    if (_selected?.doPiece == doPiece) {
      _selected = map(_selected!);
    }
  }

  String? _buildStoredComment({
    String? motif,
    String? note,
  }) {
    final safeMotif = (motif ?? '').trim();
    final safeNote = (note ?? '').trim();

    if (safeMotif.isEmpty && safeNote.isEmpty) return null;
    if (safeMotif.isNotEmpty && safeNote.isNotEmpty) {
      return 'Motif: $safeMotif | Note: $safeNote';
    }
    if (safeMotif.isNotEmpty) {
      return 'Motif: $safeMotif';
    }
    return safeNote;
  }

  @override
  void dispose() {
    stopAutoRefresh();
    super.dispose();
  }
}