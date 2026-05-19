import '../../core/api_client.dart';
import '../../core/token_store.dart';
import '../../models/user_profile_snapshot.dart';

class AuthSession {
  final String accessToken;
  final String userId;
  final String email;
  final List<String> roles;
  final UserProfileSnapshot? profile;
  final bool isTransit;
  final List<String> interfaces;

  const AuthSession({
    required this.accessToken,
    required this.userId,
    required this.email,
    required this.roles,
    this.profile,
    this.isTransit = false,
    this.interfaces = const [],
  });

  bool hasRole(String role) {
    return roles.any((x) => x.toUpperCase() == role.toUpperCase());
  }

  bool get canUseTransitApp => hasRole('LIVREUR') && isTransit;
  bool get canUseSupervisorApp => hasRole('SUPERVISEUR');
  bool get canUseDriverApp => hasRole('LIVREUR') && !isTransit;
  bool get canUseCustomerApp => hasRole('CLIENT');
  bool get canUseConfirmatriceApp => hasRole('CONFIRMATEUR');
  bool get canUseAdminApp => hasRole('ADMIN');

  String get displayName {
    final name = profile?.displayName;
    if (name != null && name.trim().isNotEmpty) {
      return name.trim();
    }
    return email;
  }
}

class AuthService {
  final ApiClient api;
  final TokenStore tokenStore;

  AuthService({required this.api, required this.tokenStore});

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final data = await api.postJson(
      '/api/auth/login',
      {'email': email, 'password': password},
      auth: false,
    );

    final token = (data['accessToken'] ?? '').toString();
    if (token.isEmpty) {
      throw Exception('Token vide.');
    }

    await tokenStore.saveToken(token);
    return restoreSession();
  }

  Future<AuthSession> restoreSession() async {
    final token = await tokenStore.readToken();
    if (token == null || token.isEmpty) {
      throw Exception('Aucun token.');
    }

    final me = await api.getMap('/api/auth/me');
    final roles = ((me['roles'] as List?) ?? [])
        .map((e) => e.toString())
        .where((e) => e.trim().isNotEmpty)
        .toList();

    if (roles.isEmpty) {
      throw Exception('Aucun rôle trouvé pour ce compte.');
    }

    final profileMap = me['profile'];
    final profile = profileMap is Map<String, dynamic>
        ? UserProfileSnapshot.fromMap(profileMap)
        : null;

    return AuthSession(
      accessToken: token,
      userId: (me['userId'] ?? '').toString(),
      email: (me['email'] ?? '').toString(),
      roles: roles,
      profile: profile,
      isTransit: me['isTransit'] == true || profileMap is Map<String, dynamic> && profileMap['isTransit'] == true,
      interfaces: ((me['interfaces'] as List?) ?? []).map((e) => e.toString()).toList(),
    );
  }

  Future<void> logout() async {
    await tokenStore.clear();
  }

  Future<bool> hasToken() async {
    final t = await tokenStore.readToken();
    return t != null && t.isNotEmpty;
  }
}