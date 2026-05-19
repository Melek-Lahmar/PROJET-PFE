import 'dart:io';

import 'package:flutter/foundation.dart';

import '../data/services/client_claims_service.dart';
import '../models/client_claim.dart';

class ClientClaimsProvider extends ChangeNotifier {
  final ClientClaimsService service;

  ClientClaimsProvider(this.service);

  bool loading = false;
  String? error;
  List<ClientClaim> items = const [];

  Future<void> refresh() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      items = await service.fetchMine();
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<ClientClaim?> fetchDetails(int id) async {
    try {
      return await service.fetchDetails(id);
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<ClientClaim?> requestEchange(int reclamationId, String text) async {
    try {
      final updated = await service.requestEchange(reclamationId, text);
      final idx = items.indexWhere((c) => c.id == reclamationId);
      if (idx >= 0) {
        final copy = [...items];
        copy[idx] = updated;
        items = copy;
      }
      notifyListeners();
      return updated;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> fetchRepeatOrderLines(int reclamationId) async {
    try {
      return await service.fetchRepeatOrderLines(reclamationId);
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return const [];
    }
  }

  Future<ClientClaim?> create({
    required String doPiece,
    required String motif,
    required String description,
    required bool isGlobal,
    String? arRef,
    String? typeReclamation,
    String? priorite,
    String? correctionProposee,
    List<File>? photos,
    DateTime? reprogrammationDate,
    String? reprogrammationCreneau,
  }) async {
    error = null;
    try {
      final created = await service.create(
        doPiece: doPiece,
        motif: motif,
        description: description,
        isGlobal: isGlobal,
        arRef: arRef,
        typeReclamation: typeReclamation,
        priorite: priorite,
        correctionProposee: correctionProposee,
        reprogrammationDate: reprogrammationDate,
        reprogrammationCreneau: reprogrammationCreneau,
      );

      if (photos != null && photos.isNotEmpty) {
        for (final p in photos) {
          try {
            await service.uploadPhoto(created.id, p);
          } catch (_) {
            // best effort, la demande est créée même si photo échoue
          }
        }
      }

      items = [created, ...items];
      notifyListeners();
      return created;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }
}
