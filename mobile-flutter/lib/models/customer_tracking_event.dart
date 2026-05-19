class CustomerTrackingEvent {
  final String label;
  final String status;
  final DateTime? date;
  final String? description;
  final bool isDone;

  const CustomerTrackingEvent({
    required this.label,
    required this.status,
    this.date,
    this.description,
    required this.isDone,
  });

  factory CustomerTrackingEvent.fromMap(Map<String, dynamic> map) {
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      return DateTime.tryParse(value.toString())?.toLocal();
    }

    return CustomerTrackingEvent(
      label: (map['label'] ?? '').toString(),
      status: (map['status'] ?? '').toString(),
      date: parseDate(map['date']),
      description: map['description']?.toString(),
      isDone: (map['isDone'] ?? false) == true,
    );
  }
}
