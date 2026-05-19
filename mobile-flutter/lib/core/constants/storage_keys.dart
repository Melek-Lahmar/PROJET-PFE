class StorageKeys {
  StorageKeys._();

  static const String onboardingSeen = 'onboarding_seen';
  static const String themeMode = 'theme_mode';
  static const String lastTabIndex = 'last_tab_index';

  // Section 2.24 — ThemeBootstrap : cache global du thème admin pour éviter
  // le flash au démarrage (lecture sync avant runApp).
  static const String themePrimaryColor = 'theme_primary_color_v1';
  static const String themeRemoteMode = 'theme_remote_mode_v1';
}