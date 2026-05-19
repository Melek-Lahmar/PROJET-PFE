import 'package:flutter/material.dart';

import '../core/constants/storage_keys.dart';
import '../core/services/local_storage_service.dart';
import '../core/theme/theme_bootstrap.dart';

/// Section 2.24 — étendu pour gérer la couleur primaire dynamique du thème
/// global admin (`/api/admin/config/theme`).
///
/// Deux sources de vérité :
///  - `themeMode` (local par utilisateur, persisté SharedPreferences) =
///    light/dark/system côté UI flottante.
///  - `primaryColor` + `themeMode` côté admin = configuration globale appliquée
///    à toutes les apps. Le ThemeBootstrap branche ces deux valeurs sur le
///    provider au démarrage.
///
/// L'utilisateur final peut toujours toggle son `themeMode` local depuis le
/// switch — il prend la priorité sur la valeur admin pour cette installation.
class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;
  bool _loaded = false;
  Color? _primaryColor;

  ThemeMode get themeMode => _themeMode;
  bool get loaded => _loaded;
  Color? get primaryColor => _primaryColor;

  /// Charge la préférence locale utilisateur (light/dark/system).
  /// La couleur primaire vient ensuite du ThemeBootstrap.
  Future<void> load() async {
    final raw = await LocalStorageService.getString(
      StorageKeys.themeMode,
      defaultValue: 'system',
    );

    switch (raw) {
      case 'light':
        _themeMode = ThemeMode.light;
        break;
      case 'dark':
        _themeMode = ThemeMode.dark;
        break;
      default:
        _themeMode = ThemeMode.system;
        break;
    }

    _loaded = true;
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;

    final raw = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };

    await LocalStorageService.setString(StorageKeys.themeMode, raw);
    notifyListeners();
  }

  Future<void> setLight() => setThemeMode(ThemeMode.light);
  Future<void> setDark() => setThemeMode(ThemeMode.dark);
  Future<void> setSystem() => setThemeMode(ThemeMode.system);

  /// Section 2.24 — bootstrap : applique la couleur primaire reçue de l'API
  /// admin (et persiste en cache si demandé).
  void setPrimaryColorHex(String hex, {bool persistLocal = true}) {
    final c = ThemeBootstrap.parseHexColor(hex);
    if (c == null) return;
    if (_primaryColor == c) return;
    _primaryColor = c;
    if (persistLocal) {
      // ignore: discarded_futures
      LocalStorageService.setString(StorageKeys.themePrimaryColor, hex);
    }
    notifyListeners();
  }

  /// Section 2.24 — bootstrap : applique le mode reçu (admin) si l'utilisateur
  /// n'a pas explicitement choisi un mode local. Ici on respecte le choix
  /// utilisateur si déjà défini autre que system.
  void setThemeModeFromString(String mode, {bool persist = false}) {
    // Si l'utilisateur a déjà fixé light/dark explicitement, on ne l'écrase pas.
    if (_themeMode != ThemeMode.system) return;
    final next = switch (mode.toLowerCase()) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    if (_themeMode == next) return;
    _themeMode = next;
    if (persist) {
      // ignore: discarded_futures
      LocalStorageService.setString(StorageKeys.themeMode,
          next == ThemeMode.light
              ? 'light'
              : next == ThemeMode.dark
                  ? 'dark'
                  : 'system');
    }
    notifyListeners();
  }
}
