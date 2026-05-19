import '../../core/api_client.dart';
import 'offline_queue_service.dart';

class ClientAddress {
  final String id;
  String label;
  String adresse;
  String gouvernorat;
  String? delegation;
  String ville;
  String? codePostal;
  double? latitude;
  double? longitude;
  bool isDefault;
  DateTime? createdAt;
  DateTime? updatedAt;

  ClientAddress({
    required this.id,
    required this.label,
    required this.adresse,
    required this.gouvernorat,
    required this.ville,
    this.delegation,
    this.codePostal,
    this.latitude,
    this.longitude,
    this.isDefault = false,
    this.createdAt,
    this.updatedAt,
  });

  factory ClientAddress.fromMap(Map<String, dynamic> m) => ClientAddress(
        id: m['id']?.toString() ?? '',
        label: (m['label'] ?? '').toString(),
        adresse: (m['adresse'] ?? '').toString(),
        gouvernorat: (m['gouvernorat'] ?? '').toString(),
        ville: (m['ville'] ?? '').toString(),
        delegation: m['delegation']?.toString(),
        codePostal: m['codePostal']?.toString(),
        latitude: (m['latitude'] as num?)?.toDouble(),
        longitude: (m['longitude'] as num?)?.toDouble(),
        isDefault: m['isDefault'] == true,
        createdAt: DateTime.tryParse(m['createdAt']?.toString() ?? ''),
        updatedAt: DateTime.tryParse(m['updatedAt']?.toString() ?? ''),
      );
}

/// Section 2.8 — service carnet d'adresses client.
class ClientAddressesService {
  final ApiClient api;

  /// V2-2 — quand non null, les écritures (create/update/delete/setDefault)
  /// passent par la queue offline.
  final OfflineQueueService? offline;

  ClientAddressesService(this.api, {this.offline});

  Future<List<ClientAddress>> list() async {
    final raw = await api.getList('/api/client/addresses');
    return raw.whereType<Map<String, dynamic>>().map(ClientAddress.fromMap).toList();
  }

  Future<ClientAddress> create(Map<String, dynamic> body) async {
    final q = offline;
    if (q != null) {
      final result = await q.sendOrQueue(
        method: 'POST',
        endpoint: '/api/client/addresses',
        body: body,
      );
      if (result.wasSent && result.responseBody != null) {
        return ClientAddress.fromMap(result.responseBody!);
      }
      // Queued offline → instance optimiste avec id local (clientActionId).
      return ClientAddress.fromMap({
        'id': result.actionId,
        ...body,
      });
    }
    final raw = await api.postJson('/api/client/addresses', body);
    return ClientAddress.fromMap(raw);
  }

  Future<ClientAddress> update(String id, Map<String, dynamic> body) async {
    final q = offline;
    if (q != null) {
      final result = await q.sendOrQueue(
        method: 'PUT',
        endpoint: '/api/client/addresses/$id',
        body: body,
      );
      if (result.wasSent && result.responseBody != null) {
        return ClientAddress.fromMap(result.responseBody!);
      }
      return ClientAddress.fromMap({'id': id, ...body});
    }
    final raw = await api.putJson('/api/client/addresses/$id', body);
    return ClientAddress.fromMap(raw);
  }

  Future<void> delete(String id) async {
    final q = offline;
    if (q != null) {
      await q.sendOrQueue(
        method: 'DELETE',
        endpoint: '/api/client/addresses/$id',
      );
      return;
    }
    await api.deleteEmpty('/api/client/addresses/$id');
  }

  Future<ClientAddress> setDefault(String id) async {
    final q = offline;
    if (q != null) {
      final result = await q.sendOrQueue(
        method: 'PUT',
        endpoint: '/api/client/addresses/$id/set-default',
        body: const {},
      );
      if (result.wasSent && result.responseBody != null) {
        return ClientAddress.fromMap(result.responseBody!);
      }
      return ClientAddress.fromMap({'id': id, 'isDefault': true});
    }
    final raw = await api.putJson('/api/client/addresses/$id/set-default', {});
    return ClientAddress.fromMap(raw);
  }
}
