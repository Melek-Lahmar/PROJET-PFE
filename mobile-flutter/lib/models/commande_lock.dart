/// Phase 4 — État d'un verrou sur une commande à confirmer (pool FIFO,
/// mécanisme A). Le verrou expire côté serveur après 15 min d'inactivité.
class CommandeLock {
  final String doPiece;
  final String lockedByUserId;
  final String? lockedByEmail;
  final DateTime lockedAt;
  final bool isMine;
  final int expiresInSeconds;

  const CommandeLock({
    required this.doPiece,
    required this.lockedByUserId,
    this.lockedByEmail,
    required this.lockedAt,
    required this.isMine,
    required this.expiresInSeconds,
  });

  factory CommandeLock.fromMap(Map<String, dynamic> map) {
    return CommandeLock(
      doPiece: (map['doPiece'] ?? map['DoPiece'] ?? '').toString(),
      lockedByUserId:
          (map['lockedByUserId'] ?? map['LockedByUserId'] ?? '').toString(),
      lockedByEmail:
          (map['lockedByEmail'] ?? map['LockedByEmail'])?.toString(),
      lockedAt: DateTime.tryParse(
              (map['lockedAt'] ?? map['LockedAt'] ?? '').toString()) ??
          DateTime.now(),
      isMine: (map['isMine'] ?? map['IsMine']) == true,
      expiresInSeconds:
          _int(map['expiresInSeconds'] ?? map['ExpiresInSeconds']),
    );
  }

  CommandeLock copyWith({int? expiresInSeconds}) {
    return CommandeLock(
      doPiece: doPiece,
      lockedByUserId: lockedByUserId,
      lockedByEmail: lockedByEmail,
      lockedAt: lockedAt,
      isMine: isMine,
      expiresInSeconds: expiresInSeconds ?? this.expiresInSeconds,
    );
  }
}

int _int(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('${v ?? ''}') ?? 0;
}
