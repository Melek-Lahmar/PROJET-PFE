import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_exception.dart';
import 'token_store.dart';

/// Client HTTP unique pour toute l'app Flutter (livreur/client/confirmatrice/admin).
///
/// Garanties :
///  - Toutes les méthodes lèvent **`ApiException`** (et plus jamais une
///    `Exception` générique) avec `statusCode`, `message`, `isNetwork`,
///    `isTimeout` — les widgets peuvent ainsi router proprement.
///  - Timeout par défaut : 30 s par requête.
///  - Si statut 401 reçu : appel du callback `onUnauthorized` (si enregistré)
///    pour permettre à `AuthProvider` de purger la session et rediriger.
///  - SocketException → `ApiException.isNetwork=true`.
///  - TimeoutException → `ApiException.isTimeout=true`.
class ApiClient {
  final TokenStore tokenStore;
  final String baseUrl;
  final Duration defaultTimeout;

  /// Callback appelé quand le serveur retourne 401 sur n'importe quelle
  /// requête. À enregistrer une fois (côté AuthProvider) pour purger le
  /// token et naviguer vers le LoginScreen.
  void Function()? onUnauthorized;

  ApiClient({
    required this.tokenStore,
    String? baseUrl,
    this.defaultTimeout = const Duration(seconds: 30),
  }) : baseUrl = baseUrl ?? _defaultBaseUrl;

  static String get _defaultBaseUrl => defaultBaseUrl;

  /// ============================================================
  /// CONFIGURATION URL API
  /// ============================================================
  ///
  /// Pour téléphone réel connecté au même Wi-Fi que le PC :
  /// - Utilise l'adresse IP de ton PC.
  /// - Exemple : http://192.168.100.19:5000
  ///
  /// Pour Android Emulator :
  /// - Utilise : http://10.0.2.2:5000
  ///
  /// Pour Web/Desktop local :
  /// - Utilise : http://localhost:5000
  /// ============================================================

  static const String phoneRealBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.100.20:5123',
  );

  /// Default backend base URL inferred from the current platform.
  static String get defaultBaseUrl => phoneRealBaseUrl;

  /// Resolve a relative URL returned by the backend, par exemple `/uploads/...`,
  /// en URL absolue avec le même baseUrl que l'API.
  String resolveMediaUrl(String raw) {
    final value = raw.trim();
    if (value.isEmpty) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/')) return '$baseUrl$value';
    return '$baseUrl/$value';
  }

  Uri _buildUri(String path, {Map<String, String>? q}) {
    final normalized = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$baseUrl$normalized');
    if (q == null || q.isEmpty) return uri;
    return uri.replace(queryParameters: {...uri.queryParameters, ...q});
  }

  Future<Map<String, String>> _headers({bool auth = true, bool json = true}) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (json) headers['Content-Type'] = 'application/json';
    if (auth) {
      final token = await tokenStore.readToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  dynamic _decodeBody(http.Response response) {
    if (response.body.isEmpty) return null;
    try {
      return jsonDecode(response.body);
    } catch (_) {
      return response.body;
    }
  }

  Never _throwApi(http.Response response) {
    final body = _decodeBody(response);
    String message = 'HTTP ${response.statusCode}';
    if (body is Map<String, dynamic>) {
      final m = (body['message'] ?? body['errorMessage'])?.toString().trim();
      if (m != null && m.isNotEmpty) message = m;
    } else if (body is String && body.trim().isNotEmpty) {
      message = body.trim();
    }
    if (response.statusCode == 401 && onUnauthorized != null) {
      // ignore: avoid_dynamic_calls
      try {
        onUnauthorized!.call();
      } catch (_) {}
    }
    throw ApiException(
      statusCode: response.statusCode,
      message: message,
      body: body,
    );
  }

  /// Wrapper unique : timeout + traduction SocketException/TimeoutException
  /// en ApiException.
  Future<http.Response> _send(
      Future<http.Response> Function() exec, {
        Duration? timeout,
      }) async {
    try {
      return await exec().timeout(timeout ?? defaultTimeout);
    } on TimeoutException {
      throw ApiException(
        statusCode: 0,
        message: 'Délai d\'attente dépassé.',
        isTimeout: true,
      );
    } on SocketException catch (e) {
      throw ApiException(
        statusCode: 0,
        message: 'Pas de connexion réseau (${e.message}).',
        isNetwork: true,
      );
    } on http.ClientException catch (e) {
      throw ApiException(
        statusCode: 0,
        message: 'Erreur réseau : ${e.message}',
        isNetwork: true,
      );
    }
  }

  void _ensureSuccess(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      _throwApi(response);
    }
  }

  Future<Map<String, dynamic>> getMap(
      String path, {
        Map<String, String>? q,
        bool auth = true,
      }) async {
    final response = await _send(() async => http.get(
          _buildUri(path, q: q),
          headers: await _headers(auth: auth),
        ));
    _ensureSuccess(response);
    final body = _decodeBody(response);
    if (body is Map<String, dynamic>) return body;
    throw ApiException(
      statusCode: response.statusCode,
      message: 'Réponse inattendue : objet JSON attendu.',
    );
  }

  Future<List<dynamic>> getList(
      String path, {
        Map<String, String>? q,
        bool auth = true,
      }) async {
    final response = await _send(() async => http.get(
          _buildUri(path, q: q),
          headers: await _headers(auth: auth),
        ));
    _ensureSuccess(response);
    final body = _decodeBody(response);
    if (body is List<dynamic>) return body;
    throw ApiException(
      statusCode: response.statusCode,
      message: 'Réponse inattendue : liste JSON attendue.',
    );
  }

  Future<Map<String, dynamic>> postJson(
      String path,
      Map<String, dynamic> payload, {
        bool auth = true,
      }) async {
    final response = await _send(() async => http.post(
          _buildUri(path),
          headers: await _headers(auth: auth),
          body: jsonEncode(payload),
        ));
    _ensureSuccess(response);
    final body = _decodeBody(response);
    if (body == null) return <String, dynamic>{};
    if (body is Map<String, dynamic>) return body;
    throw ApiException(
      statusCode: response.statusCode,
      message: 'Réponse inattendue : objet JSON attendu.',
    );
  }

  Future<List<dynamic>> postJsonList(
      String path,
      Object payload, {
        bool auth = true,
      }) async {
    final response = await _send(() async => http.post(
          _buildUri(path),
          headers: await _headers(auth: auth),
          body: jsonEncode(payload),
        ));
    _ensureSuccess(response);
    final body = _decodeBody(response);
    if (body == null) return const <dynamic>[];
    if (body is List<dynamic>) return body;
    throw ApiException(
      statusCode: response.statusCode,
      message: 'Réponse inattendue : liste JSON attendue.',
    );
  }

  /// POST brut : ne lève pas sur les statuts non-2xx — l'appelant peut gérer
  /// 409 Conflict (verrou déjà pris, etc.).
  Future<http.Response> rawPostJson(
      String path,
      Object payload, {
        bool auth = true,
      }) async {
    return _send(() async => http.post(
          _buildUri(path),
          headers: await _headers(auth: auth),
          body: jsonEncode(payload),
        ));
  }

  Future<Map<String, dynamic>> putJson(
      String path,
      Map<String, dynamic> payload, {
        bool auth = true,
      }) async {
    final response = await _send(() async => http.put(
          _buildUri(path),
          headers: await _headers(auth: auth),
          body: jsonEncode(payload),
        ));
    _ensureSuccess(response);
    final body = _decodeBody(response);
    if (body == null) return <String, dynamic>{};
    if (body is Map<String, dynamic>) return body;
    throw ApiException(
      statusCode: response.statusCode,
      message: 'Réponse inattendue : objet JSON attendu.',
    );
  }

  Future<Map<String, dynamic>> patchJson(
      String path,
      Map<String, dynamic> payload, {
        bool auth = true,
      }) async {
    final response = await _send(() async => http.patch(
          _buildUri(path),
          headers: await _headers(auth: auth),
          body: jsonEncode(payload),
        ));
    _ensureSuccess(response);
    final body = _decodeBody(response);
    if (body == null) return <String, dynamic>{};
    if (body is Map<String, dynamic>) return body;
    throw ApiException(
      statusCode: response.statusCode,
      message: 'Réponse inattendue : objet JSON attendu.',
    );
  }

  Future<void> postEmpty(String path, {bool auth = true}) async {
    final response = await _send(() async => http.post(
          _buildUri(path),
          headers: await _headers(auth: auth, json: false),
        ));
    _ensureSuccess(response);
  }

  Future<void> deleteEmpty(String path, {bool auth = true}) async {
    final response = await _send(() async => http.delete(
          _buildUri(path),
          headers: await _headers(auth: auth, json: false),
        ));
    _ensureSuccess(response);
  }

  Future<void> putEmpty(
      String path,
      Map<String, dynamic> payload, {
        bool auth = true,
      }) async {
    final response = await _send(() async => http.put(
          _buildUri(path),
          headers: await _headers(auth: auth),
          body: jsonEncode(payload),
        ));
    _ensureSuccess(response);
  }

  Future<Map<String, dynamic>> postMultipart(
      String path, {
        File? file,
        String fileFieldName = 'file',
        Map<String, String>? fields,
        bool auth = true,
      }) async {
    Future<http.Response> exec() async {
      final request = http.MultipartRequest('POST', _buildUri(path));
      request.headers['Accept'] = 'application/json';
      if (auth) {
        final token = await tokenStore.readToken();
        if (token != null && token.isNotEmpty) {
          request.headers['Authorization'] = 'Bearer $token';
        }
      }
      if (fields != null && fields.isNotEmpty) request.fields.addAll(fields);
      if (file != null) {
        final filename = file.path.split(RegExp(r'[\\/]')).last;
        request.files.add(await http.MultipartFile.fromPath(
          fileFieldName,
          file.path,
          filename: filename,
        ));
      }
      final streamed = await request.send();
      return http.Response.fromStream(streamed);
    }

    // Multipart : timeout doublé (upload binaire)
    final response = await _send(exec, timeout: const Duration(seconds: 60));
    _ensureSuccess(response);
    final body = _decodeBody(response);
    if (body == null) return <String, dynamic>{};
    if (body is Map<String, dynamic>) return body;
    throw ApiException(
      statusCode: response.statusCode,
      message: 'Réponse inattendue : objet JSON attendu.',
    );
  }

  /// Helper : POST multipart/form-data sans fichier.
  Future<Map<String, dynamic>> postForm(
      String path, {
        Map<String, String>? fields,
        bool auth = true,
      }) async {
    return postMultipart(path, fields: fields, auth: auth);
  }
}
