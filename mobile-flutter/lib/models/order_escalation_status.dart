/// État d'escalade d'une commande côté livreur.
/// Correspond au DTO backend OrderEscalationStatusDto.
class OrderEscalationStatus {
  final String doPiece;
  final int tentativesCount;
  final int threshold;
  final bool isEscalated;
  final int? openDemandeId;
  final String? openDemandeStatut;
  final String? openDemandeMotif;

  const OrderEscalationStatus({
    required this.doPiece,
    required this.tentativesCount,
    required this.threshold,
    required this.isEscalated,
    this.openDemandeId,
    this.openDemandeStatut,
    this.openDemandeMotif,
  });

  factory OrderEscalationStatus.fromMap(Map<String, dynamic> map) =>
      OrderEscalationStatus(
        doPiece: (map['doPiece'] ?? '').toString(),
        tentativesCount: _int(map['tentativesCount']),
        threshold: _int(map['threshold']),
        isEscalated: _bool(map['isEscalated']),
        openDemandeId: map['openDemandeId'] is int
            ? map['openDemandeId'] as int
            : int.tryParse('${map['openDemandeId'] ?? ''}'),
        openDemandeStatut: _nullableString(map['openDemandeStatut']),
        openDemandeMotif: _nullableString(map['openDemandeMotif']),
      );

  /// État "neutre" utilisé en fallback quand on n'a pas encore de réponse.
  static const OrderEscalationStatus empty = OrderEscalationStatus(
    doPiece: '',
    tentativesCount: 0,
    threshold: 3,
    isEscalated: false,
  );
}

int _int(dynamic v) {
  if (v is int) return v;
  return int.tryParse('${v ?? 0}') ?? 0;
}

bool _bool(dynamic v) {
  if (v is bool) return v;
  if (v == null) return false;
  final s = v.toString().trim().toLowerCase();
  return s == 'true' || s == '1';
}

String? _nullableString(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}
