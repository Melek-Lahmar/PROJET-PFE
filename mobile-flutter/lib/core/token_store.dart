import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  static const _kToken = "access_token";

  // ✅ CORRIGÉ : options web pour flutter_secure_storage
  // Sur Flutter Web, IndexedDB est utilisé par défaut
  // Ces options évitent les problèmes de lecture/écriture sur Web
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    webOptions: WebOptions(
      dbName: 'delivery_app_secure',
      publicKey: 'delivery_app_key',
    ),
  );

  Future<void> saveToken(String token) => _storage.write(key: _kToken, value: token);
  Future<String?> readToken() => _storage.read(key: _kToken);
  Future<void> clear() => _storage.delete(key: _kToken);
}
