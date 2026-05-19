import 'package:flutter/foundation.dart';

import '../core/services/local_storage_service.dart';

/// Phase 10 — Préférences utilisateur sur les notifications locales.
/// Persisté via `LocalStorageService` (SharedPreferences).
///
/// V1 : un seul toggle global `soundEnabled`. La logique de mute pendant la
/// pause confirmatrice est gérée par le [NotificationCoordinator], pas ici
/// (éviter de mélanger préférence utilisateur et contexte applicatif).
class NotificationPreferences extends ChangeNotifier {
  static const _kSoundEnabled = 'notif_sound_enabled';

  bool _soundEnabled = true;
  bool get soundEnabled => _soundEnabled;

  Future<void> load() async {
    _soundEnabled =
        await LocalStorageService.getBool(_kSoundEnabled, defaultValue: true);
    notifyListeners();
  }

  Future<void> setSoundEnabled(bool value) async {
    if (_soundEnabled == value) return;
    _soundEnabled = value;
    await LocalStorageService.setBool(_kSoundEnabled, value);
    notifyListeners();
  }
}
