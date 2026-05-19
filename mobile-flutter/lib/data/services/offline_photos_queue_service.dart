import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import 'backend_health_service.dart';

/// V2-2 — Queue séparée pour les photos binaires (multipart) liée aux
/// réclamations. Ne peut pas vivre dans OfflineQueueService car celui-ci
/// transporte uniquement du JSON.
///
/// Stratégie :
///  1. La photo est copiée dans `app_documents/offline_photos/<uuid>.jpg`
///     dès la sélection (l'utilisateur peut quitter l'écran ImagePicker).
///  2. Une entrée Hive est créée avec `endpoint`, `localPath`,
///     `clientActionId` et `retries`.
///  3. Si le backend est healthy → upload immédiat (multipart) puis
///     suppression du fichier + entrée Hive.
///  4. Sinon → l'entrée reste en queue ; flush automatique au retour réseau.
///  5. Après 5 retries → abandon avec log.
class OfflinePhotosQueueService extends ChangeNotifier {
  static const _boxName = 'offline_photos_v1';
  final ApiClient _api;
  final BackendHealthService _health;
  Box<Map>? _box;
  bool _flushing = false;
  Timer? _watcher;
  final _uuid = const Uuid();

  OfflinePhotosQueueService(this._api, this._health) {
    _health.addListener(_onHealthChange);
  }

  Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox<Map>(_boxName);
    _watcher?.cancel();
    _watcher = Timer.periodic(const Duration(seconds: 30), (_) => _maybeFlush());
  }

  int get pendingCount => _box?.length ?? 0;
  bool get isFlushing => _flushing;

  /// Met une photo en queue. Retourne le chemin local persisté pour permettre
  /// à l'UI de l'afficher en preview optimiste avant l'upload.
  Future<String> enqueueOrSend({
    required String endpoint,
    required File source,
    String fileFieldName = 'file',
  }) async {
    final actionId = _uuid.v4();
    final dir = await getApplicationDocumentsDirectory();
    final folder = Directory('${dir.path}/offline_photos');
    if (!await folder.exists()) {
      await folder.create(recursive: true);
    }
    final ext = _extOf(source.path);
    final localPath = '${folder.path}/$actionId$ext';
    await source.copy(localPath);

    final payload = <String, dynamic>{
      'clientActionId': actionId,
      'endpoint': endpoint,
      'localPath': localPath,
      'fileFieldName': fileFieldName,
      'createdAt': DateTime.now().toIso8601String(),
      'retries': 0,
    };

    if (_health.status == BackendStatus.healthy) {
      try {
        await _upload(payload);
        await _cleanupFile(localPath);
        notifyListeners();
        return localPath;
      } catch (_) {
        // fall through
      }
    }
    await _box?.put(actionId, payload);
    notifyListeners();
    return localPath;
  }

  Future<void> _upload(Map<String, dynamic> payload) async {
    final endpoint = payload['endpoint'].toString();
    final localPath = payload['localPath'].toString();
    final fileField = (payload['fileFieldName'] ?? 'file').toString();
    final file = File(localPath);
    if (!await file.exists()) {
      // Le fichier a disparu (utilisateur a vidé l'app, etc.) → on abandonne
      // silencieusement pour ne pas bloquer la queue.
      return;
    }
    await _api.postMultipart(
      endpoint,
      file: file,
      fileFieldName: fileField,
    );
  }

  Future<void> _cleanupFile(String path) async {
    try {
      final f = File(path);
      if (await f.exists()) await f.delete();
    } catch (_) {/* tolère */}
  }

  void _onHealthChange() {
    if (_health.status == BackendStatus.healthy && pendingCount > 0) {
      _maybeFlush();
    }
  }

  Future<void> _maybeFlush() async {
    if (_flushing) return;
    if (_box == null || _box!.isEmpty) return;
    if (_health.status != BackendStatus.healthy) return;
    _flushing = true;
    notifyListeners();
    try {
      final entries = _box!.toMap().entries.toList()
        ..sort((a, b) {
          final ax = (a.value['createdAt'] ?? '').toString();
          final bx = (b.value['createdAt'] ?? '').toString();
          return ax.compareTo(bx);
        });
      for (final entry in entries) {
        final data = Map<String, dynamic>.from(entry.value);
        try {
          await _upload(data);
          await _cleanupFile(data['localPath'].toString());
          await _box!.delete(entry.key);
          notifyListeners();
        } catch (e) {
          data['retries'] = ((data['retries'] as num?)?.toInt() ?? 0) + 1;
          if ((data['retries'] as int) >= 5) {
            await _cleanupFile(data['localPath'].toString());
            await _box!.delete(entry.key);
            // ignore: avoid_print
            print('[OfflinePhotos] action $entry.key abandonnée après 5 retries : $e');
          } else {
            await _box!.put(entry.key, data);
          }
          break;
        }
      }
    } finally {
      _flushing = false;
      notifyListeners();
    }
  }

  List<Map<String, dynamic>> snapshot() {
    if (_box == null) return [];
    return _box!.values
        .map((m) => Map<String, dynamic>.from(m))
        .toList(growable: false);
  }

  static String _extOf(String path) {
    final i = path.lastIndexOf('.');
    if (i < 0 || i == path.length - 1) return '.jpg';
    return path.substring(i);
  }

  @override
  void dispose() {
    _health.removeListener(_onHealthChange);
    _watcher?.cancel();
    super.dispose();
  }
}
