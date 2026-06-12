import '../core/api_exception.dart';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../data/services/confirmatrice_claims_service.dart';
import '../models/client_claim.dart';

class ConfirmatriceClaimsFilter {
  final String? statut;
  final String? source;
  final String? typeCas; // RECLAMATION / DEMANDE
  final String? motif;
  final String? doPiece;
  final DateTime? fromDate;
  final DateTime? toDate;

  const ConfirmatriceClaimsFilter({
    this.statut,
    this.source,
    this.typeCas,
    this.motif,
    this.doPiece,
    this.fromDate,
    this.toDate,
  });

  ConfirmatriceClaimsFilter copyWith({
    String? statut,
    String? source,
    String? typeCas,
    String? motif,
    String? doPiece,
    DateTime? fromDate,
    DateTime? toDate,
    bool clearStatut = false,
    bool clearSource = false,
    bool clearTypeCas = false,
    bool clearMotif = false,
    bool clearDoPiece = false,
    bool clearFromDate = false,
    bool clearToDate = false,
  }) {
    return ConfirmatriceClaimsFilter(
      statut: clearStatut ? null : (statut ?? this.statut),
      source: clearSource ? null : (source ?? this.source),
      typeCas: clearTypeCas ? null : (typeCas ?? this.typeCas),
      motif: clearMotif ? null : (motif ?? this.motif),
      doPiece: clearDoPiece ? null : (doPiece ?? this.doPiece),
      fromDate: clearFromDate ? null : (fromDate ?? this.fromDate),
      toDate: clearToDate ? null : (toDate ?? this.toDate),
    );
  }

  bool get isEmpty =>
      statut == null &&
      source == null &&
      typeCas == null &&
      motif == null &&
      doPiece == null &&
      fromDate == null &&
      toDate == null;
}

/// Constantes métier utilisées pour la priorisation côté Flutter.
/// Ces listes dupliquent les règles V final pour rester indépendantes
/// du code serveur (priorisation pure UI, pas d'API dédiée).
class _PrioRules {
  static const reclamationUrgentMotifs = <String>{
    'COLIS_ENDOMMAGE',
    'COLIS_NON_CORRESPONDANT',
  };

  static const demandeUrgentMotifs = <String>{
    'CLIENT_REFUSE',
    'AUTRE',
  };

  /// Motifs livreur "différés" (C) — escaladés après 3 tentatives.
  static const demandeDeferredMotifs = <String>{
    'TELEPHONE_ETEINT',
    'CLIENT_INJOIGNABLE',
    'CLIENT_ABSENT',
  };
}

class ConfirmatriceClaimsProvider extends ChangeNotifier {
  final ConfirmatriceClaimsService service;

  ConfirmatriceClaimsProvider(this.service);

  bool loading = false;
  bool saving = false;
  String? error;

  /// Liste consolidée (ancien comportement — garde la compat pour les
  /// appelants qui n'utilisent pas le split 2 listes).
  List<ClientClaim> items = const [];

  /// Bloc 6 — Deux listes internes distinctes alimentées par `refreshFor`.
  /// Les écrans `Réclamations` et `Demandes` en lisent chacune une.
  List<ClientClaim> reclamations = const [];
  List<ClientClaim> demandes = const [];

  ConfirmatriceClaimsFilter filter = const ConfirmatriceClaimsFilter();

  // 3 onglets : a-traiter, en-attente-client, historique
  String currentTab = 'a-traiter';
  bool crossGouvernorat = false;

  List<ClientClaim> listFor(String? typeCas) {
    switch ((typeCas ?? '').toUpperCase()) {
      case 'RECLAMATION':
        return reclamations;
      case 'DEMANDE':
        return demandes;
      default:
        return items;
    }
  }

  /// Recherche d'un cas déjà chargé par id, sur les 3 caches internes.
  /// Utile comme fallback dans les écrans de détail quand le fetch réseau
  /// échoue : on préfère afficher une vue partielle plutôt qu'un écran vide
  /// "Demande introuvable".
  ClientClaim? findCachedById(int id) {
    for (final list in [items, reclamations, demandes]) {
      for (final c in list) {
        if (c.id == id) return c;
      }
    }
    return null;
  }

  /// Comportement historique : rafraîchit la liste consolidée selon le
  /// filtre courant (filtre TypeCas optionnel). Conservé pour la compat
  /// avec d'éventuels écrans non verrouillés (mode admin).
  Future<void> refresh() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final fetched = await service.fetchAll(
        tab: currentTab,
        crossGouvernorat: crossGouvernorat,
        statut: filter.statut,
        source: filter.source,
        typeCas: filter.typeCas,
        motif: filter.motif,
        doPiece: filter.doPiece,
        fromDate: filter.fromDate,
        toDate: filter.toDate,
      );
      items = _prioritize(fetched, forTypeCas: filter.typeCas);
    } catch (e) {
      error = friendlyError(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Bloc 6 — Refresh ciblé sur un TypeCas (RECLAMATION ou DEMANDE),
  /// écrit dans la liste interne correspondante avec priorisation.
  /// Utilisé par les écrans verrouillés (un onglet = un TypeCas).
  Future<void> refreshFor(String typeCas) async {
    final normalized = typeCas.toUpperCase();
    if (normalized != 'RECLAMATION' && normalized != 'DEMANDE') {
      return refresh();
    }

    loading = true;
    error = null;
    notifyListeners();
    try {
      final fetched = await service.fetchAll(
        tab: currentTab,
        crossGouvernorat: crossGouvernorat,
        statut: filter.statut,
        source: filter.source,
        typeCas: normalized,
        motif: filter.motif,
        doPiece: filter.doPiece,
        fromDate: filter.fromDate,
        toDate: filter.toDate,
      );
      final sorted = _prioritize(fetched, forTypeCas: normalized);
      if (normalized == 'RECLAMATION') {
        reclamations = sorted;
      } else {
        demandes = sorted;
      }
    } catch (e) {
      error = friendlyError(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void setTab(String tab, {String? typeCas}) {
    if (currentTab == tab) return;
    currentTab = tab;
    if (typeCas != null) {
      refreshFor(typeCas);
    } else {
      refresh();
    }
  }

  void setCrossGouvernorat(bool value, {String? typeCas}) {
    if (crossGouvernorat == value) return;
    crossGouvernorat = value;
    if (typeCas != null) {
      refreshFor(typeCas);
    } else {
      refresh();
    }
  }

  void setFilter(ConfirmatriceClaimsFilter newFilter, {String? typeCas}) {
    filter = newFilter;
    if (typeCas != null) {
      refreshFor(typeCas);
    } else {
      refresh();
    }
  }

  Future<ClientClaim?> reprise(int id) async {
    saving = true;
    notifyListeners();
    try {
      final claim = await service.reprise(id);
      _replaceInAllLists(claim);
      return claim;
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> createEchange(
    int reclamationId, {
    required List<Map<String, dynamic>> lignes,
    String? note,
  }) async {
    saving = true;
    notifyListeners();
    try {
      return await service.createEchange(
        reclamationId,
        lignes: lignes,
        note: note,
      );
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<List<Map<String, dynamic>>> fetchOriginalLinesForEchange(int reclamationId) async {
    try {
      return await service.fetchOriginalLinesForEchange(reclamationId);
    } catch (e) {
      error = friendlyError(e);
      notifyListeners();
      return const [];
    }
  }

  Future<ClientClaim?> fetchDetails(int id) async {
    try {
      return await service.fetchDetails(id);
    } catch (e) {
      error = friendlyError(e);
      notifyListeners();
      return null;
    }
  }

  Future<ClientClaim?> takeOver(int id) async {
    saving = true;
    notifyListeners();
    try {
      final claim = await service.takeOver(id);
      _replaceInAllLists(claim);
      return claim;
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<ClientClaim?> updateStatus(int id, String statut, {String? motifRefus}) async {
    saving = true;
    notifyListeners();
    try {
      final claim = await service.updateStatus(id, statut, motifRefus: motifRefus);
      _replaceInAllLists(claim);
      return claim;
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<ClientClaim?> applyCorrection(
    int id, {
    String? newAddress,
    double? newLatitude,
    double? newLongitude,
    String? newPhone,
  }) async {
    saving = true;
    notifyListeners();
    try {
      final claim = await service.applyCorrection(
        id,
        newAddress: newAddress,
        newLatitude: newLatitude,
        newLongitude: newLongitude,
        newPhone: newPhone,
      );
      _replaceInAllLists(claim);
      return claim;
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<ClientClaim?> changeCommandeStatus(int id, int newStatus, {String? note}) async {
    saving = true;
    notifyListeners();
    try {
      final claim = await service.changeCommandeStatus(id, newStatus, note: note);
      _replaceInAllLists(claim);
      return claim;
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<ClientClaim?> updateNote(int id, String? note) async {
    saving = true;
    notifyListeners();
    try {
      final claim = await service.updateNote(id, note);
      _replaceInAllLists(claim);
      return claim;
    } catch (e) {
      error = friendlyError(e);
      return null;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<bool> uploadPhoto(int id, File file) async {
    try {
      await service.uploadPhoto(id, file);
      return true;
    } catch (e) {
      error = friendlyError(e);
      notifyListeners();
      return false;
    }
  }

  void _replaceInAllLists(ClientClaim updated) {
    items = _replaceOne(items, updated);
    reclamations = _replaceOne(reclamations, updated);
    demandes = _replaceOne(demandes, updated);
  }

  List<ClientClaim> _replaceOne(List<ClientClaim> list, ClientClaim updated) {
    final idx = list.indexWhere((c) => c.id == updated.id);
    if (idx < 0) return list;
    final copy = [...list];
    copy[idx] = updated;
    return copy;
  }

  /// Bloc 6 — Priorisation UI (aucune API dédiée, tri stable côté client).
  /// Règles V final :
  ///   Réclamations : urgent (colis endommagé / non correspondant) → FIFO
  ///   Demandes     : urgent (refus client / autre incident)
  ///                  → 3 tentatives (motifs différés avec compteur ≥ 3)
  ///                  → FIFO
  List<ClientClaim> _prioritize(
    List<ClientClaim> list, {
    String? forTypeCas,
  }) {
    final type = (forTypeCas ?? '').toUpperCase();
    int rankFor(ClientClaim c) {
      final motif = c.motif.toUpperCase();
      if (type == 'RECLAMATION') {
        return _PrioRules.reclamationUrgentMotifs.contains(motif) ? 0 : 1;
      }
      if (type == 'DEMANDE') {
        if (_PrioRules.demandeUrgentMotifs.contains(motif)) return 0;
        if (_PrioRules.demandeDeferredMotifs.contains(motif)
            && c.tentativesCount >= 3) {
          return 1;
        }
        return 2;
      }
      // Mode mixte (legacy) — urgents (tous types) d'abord.
      if (_PrioRules.reclamationUrgentMotifs.contains(motif)) return 0;
      if (_PrioRules.demandeUrgentMotifs.contains(motif)) return 0;
      if (_PrioRules.demandeDeferredMotifs.contains(motif)
          && c.tentativesCount >= 3) {
        return 1;
      }
      return 2;
    }

    final withRank = list
        .asMap()
        .entries
        .map((e) => _Ranked(c: e.value, rank: rankFor(e.value), originalIdx: e.key))
        .toList();
    // Tri stable : rank croissant, ordre d'origine conservé à rang égal.
    withRank.sort((a, b) {
      final r = a.rank.compareTo(b.rank);
      return r != 0 ? r : a.originalIdx.compareTo(b.originalIdx);
    });
    return withRank.map((e) => e.c).toList();
  }
}

class _Ranked {
  final ClientClaim c;
  final int rank;
  final int originalIdx;
  _Ranked({required this.c, required this.rank, required this.originalIdx});
}
