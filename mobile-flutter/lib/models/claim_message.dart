class ClaimMessage {
  final int id;
  final int reclamationId;
  final String senderUserId;
  final String senderRole;
  final String senderDisplay;
  final String messageText;
  final String messageType;
  final String? mediaUrl;
  final String? mediaFileName;
  final String? mediaContentType;
  final bool isInternal;
  final DateTime createdAt;
  final DateTime? readAt;

  const ClaimMessage({
    required this.id,
    required this.reclamationId,
    required this.senderUserId,
    required this.senderRole,
    required this.senderDisplay,
    required this.messageText,
    this.messageType = 'TEXT',
    this.mediaUrl,
    this.mediaFileName,
    this.mediaContentType,
    this.isInternal = false,
    required this.createdAt,
    this.readAt,
  });

  factory ClaimMessage.fromMap(Map<String, dynamic> m) => ClaimMessage(
        id: m['id'] as int? ?? 0,
        reclamationId: m['reclamationId'] as int? ?? 0,
        senderUserId: (m['senderUserId'] ?? '').toString(),
        senderRole: (m['senderRole'] ?? '').toString(),
        senderDisplay: (m['senderDisplay'] ?? '').toString(),
        messageText: (m['messageText'] ?? '').toString(),
        messageType: (m['messageType'] ?? 'TEXT').toString(),
        mediaUrl: m['mediaUrl']?.toString(),
        mediaFileName: m['mediaFileName']?.toString(),
        mediaContentType: m['mediaContentType']?.toString(),
        isInternal: m['isInternal'] == true,
        createdAt: DateTime.tryParse((m['createdAt'] ?? '').toString()) ?? DateTime.now(),
        readAt: m['readAt'] != null ? DateTime.tryParse(m['readAt'].toString()) : null,
      );
}
