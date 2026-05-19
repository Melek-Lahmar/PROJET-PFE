import 'package:flutter/foundation.dart';
import '../data/services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService auth;

  AuthProvider(this.auth);

  bool loading = false;
  String? error;
  AuthSession? session;

  String get userKey => session?.userId ?? "";

  Future<void> tryAutoLogin() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      final has = await auth.hasToken();
      if (!has) {
        session = null;
        return;
      }
      session = await auth.restoreSession();
    } catch (e) {
      session = null;
      error = e.toString();
      await auth.logout();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      session = await auth.login(email: email, password: password);
    } catch (e) {
      session = null;
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await auth.logout();
    session = null;
    error = null;
    notifyListeners();
  }
}