import '../core/api_exception.dart';
import 'package:flutter/foundation.dart';

import '../data/services/avis_service.dart';
import '../models/avis.dart';

class AvisProvider extends ChangeNotifier {
  final AvisService service;

  AvisProvider(this.service);

  bool loading = false;
  bool submitting = false;
  String? error;
  List<AvisPending> pending = const [];
  Set<String> _recentlyPrompted = <String>{};

  Future<void> refresh() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      pending = await service.fetchPending();
    } catch (e) {
      error = friendlyError(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Renvoie le prochain avis à afficher (s'il y en a un non encore montré dans cette session)
  AvisPending? nextPrompt() {
    for (final p in pending) {
      if (!_recentlyPrompted.contains(p.commandePiece)) {
        return p;
      }
    }
    return null;
  }

  void markPromptShown(String commandePiece) {
    _recentlyPrompted.add(commandePiece);
    notifyListeners();
  }

  Future<void> dismiss(String commandePiece) async {
    try {
      await service.dismiss(commandePiece);
      pending = pending.where((p) => p.commandePiece != commandePiece).toList();
      _recentlyPrompted.add(commandePiece);
      notifyListeners();
    } catch (e) {
      error = friendlyError(e);
      notifyListeners();
    }
  }

  Future<bool> submit({
    required String commandePiece,
    required int note,
    String? commentaire,
  }) async {
    submitting = true;
    notifyListeners();
    try {
      await service.submit(
        commandePiece: commandePiece,
        note: note,
        commentaire: commentaire,
      );
      pending = pending.where((p) => p.commandePiece != commandePiece).toList();
      _recentlyPrompted.add(commandePiece);
      return true;
    } catch (e) {
      error = friendlyError(e);
      return false;
    } finally {
      submitting = false;
      notifyListeners();
    }
  }
}
