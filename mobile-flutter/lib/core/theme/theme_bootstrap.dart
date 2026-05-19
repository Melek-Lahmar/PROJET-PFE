import 'package:flutter/material.dart';

import '../../data/services/admin_theme_service.dart';
import '../../state/theme_provider.dart';
import '../api_client.dart';
import '../constants/storage_keys.dart';
import '../services/local_storage_service.dart';

/// Section 2.24 — Bootstrap du thème global au démarrage de chaque app
/// Flutter (livreur / client / confirmatrice / admin).
///
/// Stratégie :
///  1. Lecture synchrone du cache SharedPreferences (rapide → pas de flash).
///  2. Appel async `GET /api/admin/config/theme` (anonyme) → applique +
///     persiste en cache si différent.
///  3. Sur SignalR `ThemeChanged` (si ReclamationHub branché) → reload sans
///     redémarrer.
///
/// Usage : `await ThemeBootstrap.bootstrap(themeProvider, api);` AVANT
/// le premier render de MaterialApp.
class ThemeBootstrap {
  ThemeBootstrap._();

  /// Charge la valeur cachée et lance le fetch en arrière-plan.
  /// Cette méthode est non bloquante (fire-and-forget pour le réseau).
  static Future<void> bootstrap(
      ThemeProvider provider, ApiClient api) async {
    // 1. Cache synchrone
    final cachedColor = await LocalStorageService.getString(
      StorageKeys.themePrimaryColor,
      defaultValue: '',
    );
    final cachedMode = await LocalStorageService.getString(
      StorageKeys.themeRemoteMode,
      defaultValue: '',
    );
    if (cachedColor.isNotEmpty) {
      provider.setPrimaryColorHex(cachedColor, persistLocal: false);
    }
    if (cachedMode.isNotEmpty) {
      provider.setThemeModeFromString(cachedMode, persist: false);
    }

    // 2. Fetch réseau (best-effort, n'échoue jamais le boot de l'app)
    try {
      final svc = AdminThemeService(api);
      final remote = await svc.fetch();
      if (remote.primaryColor != null && remote.primaryColor!.isNotEmpty) {
        await LocalStorageService.setString(
          StorageKeys.themePrimaryColor,
          remote.primaryColor!,
        );
        provider.setPrimaryColorHex(remote.primaryColor!, persistLocal: false);
      }
      if (remote.themeMode != null && remote.themeMode!.isNotEmpty) {
        await LocalStorageService.setString(
          StorageKeys.themeRemoteMode,
          remote.themeMode!,
        );
        provider.setThemeModeFromString(remote.themeMode!, persist: false);
      }
    } catch (_) {
      // Silencieux : on garde la valeur cachée si le réseau est KO.
    }
  }

  /// Helper : convertit "#3F51B5" en `Color`.
  static Color? parseHexColor(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    var s = hex.trim();
    if (s.startsWith('#')) s = s.substring(1);
    if (s.length == 6) s = 'FF$s';
    final v = int.tryParse(s, radix: 16);
    return v == null ? null : Color(v);
  }
}
