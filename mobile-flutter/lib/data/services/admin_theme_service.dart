import '../../core/api_client.dart';

/// Section 2.24 — accès au thème global admin (`/api/admin/config/theme`).
/// L'endpoint GET est anonyme : toutes les apps Flutter peuvent l'appeler
/// au démarrage.
class AdminThemeService {
  final ApiClient _api;
  AdminThemeService(this._api);

  Future<AdminThemeConfig> fetch() async {
    final m = await _api.getMap('/api/admin/config/theme', auth: false);
    return AdminThemeConfig.fromMap(m);
  }

  Future<void> update({String? primaryColor, String? themeMode}) async {
    await _api.putJson('/api/admin/config/theme', {
      if (primaryColor != null) 'primaryColor': primaryColor,
      if (themeMode != null) 'themeMode': themeMode,
    });
  }
}

class AdminThemeConfig {
  final String? primaryColor; // ex: "#3F51B5"
  final String? themeMode; // "light" | "dark" | "auto"
  final DateTime? updatedAt;

  AdminThemeConfig({this.primaryColor, this.themeMode, this.updatedAt});

  factory AdminThemeConfig.fromMap(Map<String, dynamic> m) {
    return AdminThemeConfig(
      primaryColor: m['primaryColor']?.toString(),
      themeMode: m['themeMode']?.toString(),
      updatedAt: m['updatedAt'] != null
          ? DateTime.tryParse(m['updatedAt'].toString())
          : null,
    );
  }
}
