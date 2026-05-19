import '../../core/api_client.dart';

/// Service CRUD admin pour la gestion des comptes (LIVREUR/CONFIRMATEUR).
/// Endpoints :
/// - POST   /api/admin/users
/// - PUT    /api/admin/users/{userId}/profile
/// - DELETE /api/admin/users/{userId}
class AdminUsersService {
  final ApiClient api;
  AdminUsersService(this.api);

  Future<Map<String, dynamic>> createUser({
    required String email,
    required String password,
    required String role,
    required String gouvernorat,
    required String delegation,
    String? nomComplet,
    String? telephone,
    String? cin,
  }) async {
    final body = <String, dynamic>{
      'email': email.trim(),
      'password': password,
      'role': role,
      'gouvernorat': gouvernorat,
      'delegation': delegation,
      if (nomComplet != null && nomComplet.trim().isNotEmpty)
        'nomComplet': nomComplet.trim(),
      if (telephone != null && telephone.trim().isNotEmpty)
        'telephone': telephone.trim(),
      if (cin != null && cin.trim().isNotEmpty) 'cin': cin.trim(),
    };
    return api.postJson('/api/admin/users', body);
  }

  Future<void> updateProfile({
    required String userId,
    required String gouvernorat,
    String? email,
    String? nomComplet,
    String? telephone,
    String? cin,
    String? delegation,
  }) async {
    final body = <String, dynamic>{
      'gouvernorat': gouvernorat,
      if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      if (nomComplet != null) 'nomComplet': nomComplet.trim(),
      if (telephone != null) 'telephone': telephone.trim(),
      if (cin != null) 'cin': cin.trim(),
      if (delegation != null && delegation.trim().isNotEmpty)
        'delegation': delegation.trim(),
    };
    await api.putEmpty('/api/admin/users/$userId/profile', body);
  }

  Future<void> deleteUser(String userId) async {
    await api.deleteEmpty('/api/admin/users/$userId');
  }
}
