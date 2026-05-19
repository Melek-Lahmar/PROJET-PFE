import 'dart:async';

import 'package:signalr_netcore/signalr_client.dart';

import 'token_store.dart';

/// Payload standard d'un cas (Réclamation ou Demande).
/// Utilisé par : NouveauCas, StatutCasChange, ClientARepondu,
/// SeuilTentativesAtteint, CorrectionAppliquee.
class CasEvent {
  final int id;
  final String? code;
  final String? statut;
  final String? motif;
  final String? source;
  final String? typeCas;
  final String? doPiece;
  final String? newAddress;
  final String? newPhone;

  const CasEvent({
    required this.id,
    this.code,
    this.statut,
    this.motif,
    this.source,
    this.typeCas,
    this.doPiece,
    this.newAddress,
    this.newPhone,
  });

  factory CasEvent.fromMap(Map<String, dynamic> map) {
    return CasEvent(
      id: _toInt(map['id'] ?? map['Id']) ?? 0,
      code: _s(map['code'] ?? map['Code']),
      statut: _s(map['statut'] ?? map['Statut']),
      motif: _s(map['motif'] ?? map['Motif']),
      source: _s(map['source'] ?? map['Source']),
      typeCas: _s(map['typeCas'] ?? map['TypeCas']),
      doPiece: _s(map['doPiece'] ?? map['DoPiece']),
      newAddress: _s(map['newAddress'] ?? map['NewAddress']),
      newPhone: _s(map['newPhone'] ?? map['NewPhone']),
    );
  }
}

/// Payload verrou commande (CommandePriseEnCharge / CommandeLiberee).
class CommandeLockEvent {
  final String doPiece;
  final String? userId;
  final DateTime? lockedAt;
  final String? reason;

  const CommandeLockEvent({
    required this.doPiece,
    this.userId,
    this.lockedAt,
    this.reason,
  });

  factory CommandeLockEvent.fromMap(Map<String, dynamic> map) {
    return CommandeLockEvent(
      doPiece: _s(map['doPiece'] ?? map['DoPiece']) ?? '',
      userId: _s(map['userId'] ?? map['UserId']),
      lockedAt: _toDate(map['lockedAt'] ?? map['LockedAt']),
      reason: _s(map['reason'] ?? map['Reason']),
    );
  }
}

/// Payload changement de statut commande (StatutCommandeChange).
class StatutCommandeEvent {
  final String doPiece;
  final String? blPiece;
  final String? newStatut;

  const StatutCommandeEvent({
    required this.doPiece,
    this.blPiece,
    this.newStatut,
  });

  factory StatutCommandeEvent.fromMap(Map<String, dynamic> map) {
    return StatutCommandeEvent(
      doPiece: _s(map['doPiece'] ?? map['DoPiece']) ?? '',
      blPiece: _s(map['blPiece'] ?? map['BlPiece']),
      newStatut: _s(map['newStatut'] ?? map['NewStatut']),
    );
  }
}

/// Payload redistribution 3C (CasReattribue).
class CasReattribueEvent {
  final int id;
  final String? previousUserId;
  final String? newUserId;

  const CasReattribueEvent({
    required this.id,
    this.previousUserId,
    this.newUserId,
  });

  factory CasReattribueEvent.fromMap(Map<String, dynamic> map) {
    return CasReattribueEvent(
      id: _toInt(map['id'] ?? map['Id']) ?? 0,
      previousUserId: _s(map['previousUserId'] ?? map['PreviousUserId']),
      newUserId: _s(map['newUserId'] ?? map['NewUserId']),
    );
  }
}

/// Section 2.24 — Payload thème global modifié par l'admin.
/// Émis par AdminThemeController.Update sur `Clients.All`.
class ThemeChangedEvent {
  final String? primaryColor;
  final String? themeMode;

  const ThemeChangedEvent({this.primaryColor, this.themeMode});

  factory ThemeChangedEvent.fromMap(Map<String, dynamic> map) {
    return ThemeChangedEvent(
      primaryColor: _s(map['primaryColor'] ?? map['PrimaryColor']),
      themeMode: _s(map['themeMode'] ?? map['ThemeMode']),
    );
  }
}

int? _toInt(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v == null) return null;
  return int.tryParse('$v');
}

String? _s(dynamic v) {
  if (v == null) return null;
  final str = v.toString();
  return str.isEmpty ? null : str;
}

DateTime? _toDate(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  return DateTime.tryParse(v.toString());
}

/// Backbone SignalR Phase 5 — 8 événements figés + CasReattribue (3C).
///
/// Règle de principe : événement = signal, API = vérité. Sur reconnexion,
/// le consommateur doit recharger via REST et ne pas se baser uniquement
/// sur le flux SignalR.
class RealtimeService {
  final TokenStore tokenStore;
  final String baseUrl;

  HubConnection? _connection;
  Future<void>? _starting;

  final StreamController<CasEvent> _nouveauCas =
      StreamController<CasEvent>.broadcast();
  final StreamController<CasEvent> _statutCasChange =
      StreamController<CasEvent>.broadcast();
  final StreamController<CommandeLockEvent> _commandePriseEnCharge =
      StreamController<CommandeLockEvent>.broadcast();
  final StreamController<CommandeLockEvent> _commandeLiberee =
      StreamController<CommandeLockEvent>.broadcast();
  final StreamController<CasEvent> _clientARepondu =
      StreamController<CasEvent>.broadcast();
  final StreamController<CasEvent> _seuilTentativesAtteint =
      StreamController<CasEvent>.broadcast();
  final StreamController<StatutCommandeEvent> _statutCommandeChange =
      StreamController<StatutCommandeEvent>.broadcast();
  final StreamController<CasEvent> _correctionAppliquee =
      StreamController<CasEvent>.broadcast();
  final StreamController<CasReattribueEvent> _casReattribue =
      StreamController<CasReattribueEvent>.broadcast();
  final StreamController<ThemeChangedEvent> _themeChanged =
      StreamController<ThemeChangedEvent>.broadcast();

  RealtimeService({
    required this.tokenStore,
    required this.baseUrl,
  });

  // Phase 5 — les 8 événements du plan V final.
  Stream<CasEvent> get nouveauCas => _nouveauCas.stream;
  Stream<CasEvent> get statutCasChange => _statutCasChange.stream;
  Stream<CommandeLockEvent> get commandePriseEnCharge =>
      _commandePriseEnCharge.stream;
  Stream<CommandeLockEvent> get commandeLiberee => _commandeLiberee.stream;
  Stream<CasEvent> get clientARepondu => _clientARepondu.stream;
  Stream<CasEvent> get seuilTentativesAtteint =>
      _seuilTentativesAtteint.stream;
  Stream<StatutCommandeEvent> get statutCommandeChange =>
      _statutCommandeChange.stream;
  Stream<CasEvent> get correctionAppliquee => _correctionAppliquee.stream;

  // Événement additionnel Mécanisme B (redistribution 3C).
  Stream<CasReattribueEvent> get casReattribue => _casReattribue.stream;

  // Section 2.24 — couleur/thème global modifié par l'admin.
  Stream<ThemeChangedEvent> get themeChanged => _themeChanged.stream;

  bool get isConnected =>
      _connection?.state == HubConnectionState.Connected;

  Future<void> ensureConnected() async {
    if (isConnected) return;
    if (_starting != null) return _starting;
    _starting = _connectInternal();
    try {
      await _starting;
    } finally {
      _starting = null;
    }
  }

  Future<void> _connectInternal() async {
    final token = await tokenStore.readToken();
    final hubUrl = '$baseUrl/hubs/reclamations';

    final conn = HubConnectionBuilder()
        .withUrl(
          hubUrl,
          options: HttpConnectionOptions(
            accessTokenFactory: () async => token ?? '',
          ),
        )
        .withAutomaticReconnect()
        .build();

    conn.on('NouveauCas', (args) {
      final map = _asMap(args);
      if (map != null) _nouveauCas.add(CasEvent.fromMap(map));
    });
    conn.on('StatutCasChange', (args) {
      final map = _asMap(args);
      if (map != null) _statutCasChange.add(CasEvent.fromMap(map));
    });
    conn.on('CommandePriseEnCharge', (args) {
      final map = _asMap(args);
      if (map != null) {
        _commandePriseEnCharge.add(CommandeLockEvent.fromMap(map));
      }
    });
    conn.on('CommandeLiberee', (args) {
      final map = _asMap(args);
      if (map != null) {
        _commandeLiberee.add(CommandeLockEvent.fromMap(map));
      }
    });
    conn.on('ClientARepondu', (args) {
      final map = _asMap(args);
      if (map != null) _clientARepondu.add(CasEvent.fromMap(map));
    });
    conn.on('SeuilTentativesAtteint', (args) {
      final map = _asMap(args);
      if (map != null) {
        _seuilTentativesAtteint.add(CasEvent.fromMap(map));
      }
    });
    conn.on('StatutCommandeChange', (args) {
      final map = _asMap(args);
      if (map != null) {
        _statutCommandeChange.add(StatutCommandeEvent.fromMap(map));
      }
    });
    conn.on('CorrectionAppliquee', (args) {
      final map = _asMap(args);
      if (map != null) _correctionAppliquee.add(CasEvent.fromMap(map));
    });
    conn.on('CasReattribue', (args) {
      final map = _asMap(args);
      if (map != null) {
        _casReattribue.add(CasReattribueEvent.fromMap(map));
      }
    });
    conn.on('ThemeChanged', (args) {
      final map = _asMap(args);
      if (map != null) {
        _themeChanged.add(ThemeChangedEvent.fromMap(map));
      }
    });

    await conn.start();
    _connection = conn;
  }

  Map<String, dynamic>? _asMap(List<Object?>? args) {
    if (args == null || args.isEmpty) return null;
    final first = args.first;
    if (first is Map<String, dynamic>) return first;
    if (first is Map) return Map<String, dynamic>.from(first);
    return null;
  }

  Future<void> dispose() async {
    await _connection?.stop();
    await _nouveauCas.close();
    await _statutCasChange.close();
    await _commandePriseEnCharge.close();
    await _commandeLiberee.close();
    await _clientARepondu.close();
    await _seuilTentativesAtteint.close();
    await _statutCommandeChange.close();
    await _correctionAppliquee.close();
    await _casReattribue.close();
    await _themeChanged.close();
  }
}
