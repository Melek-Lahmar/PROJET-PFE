class AvisPending {
  final String commandePiece;
  final DateTime? deliveredAt;
  final DateTime? lastPromptAt;
  final int promptCount;

  const AvisPending({
    required this.commandePiece,
    this.deliveredAt,
    this.lastPromptAt,
    this.promptCount = 0,
  });

  factory AvisPending.fromMap(Map<String, dynamic> map) => AvisPending(
        commandePiece: (map['commandePiece'] ?? '').toString(),
        deliveredAt: DateTime.tryParse('${map['deliveredAt'] ?? ''}')?.toLocal(),
        lastPromptAt: DateTime.tryParse('${map['lastPromptAt'] ?? ''}')?.toLocal(),
        promptCount: map['promptCount'] is int
            ? map['promptCount'] as int
            : int.tryParse('${map['promptCount'] ?? 0}') ?? 0,
      );
}

class AvisSubmitted {
  final int id;
  final String commandePiece;
  final int note;
  final String? commentaire;
  final DateTime createdAt;

  const AvisSubmitted({
    required this.id,
    required this.commandePiece,
    required this.note,
    this.commentaire,
    required this.createdAt,
  });

  factory AvisSubmitted.fromMap(Map<String, dynamic> map) => AvisSubmitted(
        id: map['id'] is int ? map['id'] as int : int.tryParse('${map['id'] ?? 0}') ?? 0,
        commandePiece: (map['commandePiece'] ?? '').toString(),
        note: map['note'] is int ? map['note'] as int : int.tryParse('${map['note'] ?? 0}') ?? 0,
        commentaire: map['commentaire']?.toString(),
        createdAt: DateTime.tryParse('${map['createdAt'] ?? ''}')?.toLocal() ?? DateTime.now(),
      );
}
