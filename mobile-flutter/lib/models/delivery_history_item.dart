class DeliveryHistoryItem {
  final String label;
  final String? status;
  final DateTime? date;
  final String? description;

  const DeliveryHistoryItem({
    required this.label,
    this.status,
    this.date,
    this.description,
  });

  factory DeliveryHistoryItem.fromJson(Map<String, dynamic> json) {
    return DeliveryHistoryItem(
      label: (json['label'] ?? '').toString(),
      status: _nullableString(json['status']),
      date: _asDate(json['date']),
      description: _nullableString(json['description']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'status': status,
      'date': date?.toIso8601String(),
      'description': description,
    };
  }

  static String? _nullableString(dynamic value) {
    if (value == null) return null;
    final s = value.toString().trim();
    return s.isEmpty ? null : s;
  }

  static DateTime? _asDate(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;

    final raw = value.toString().trim();
    if (raw.isEmpty) return null;

    return DateTime.tryParse(raw);
  }
}