class CustomerTrackingEvent {
  final String label;
  final String status;
  final DateTime? date;
  final String? description;
  final bool isDone;
  /// DONE | ACTIVE | PENDING | ERROR
  final String state;

  const CustomerTrackingEvent({
    required this.label,
    required this.status,
    this.date,
    this.description,
    required this.isDone,
    this.state = 'PENDING',
  });

  factory CustomerTrackingEvent.fromMap(Map<String, dynamic> map) {
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      return DateTime.tryParse(value.toString())?.toLocal();
    }

    final isDone = (map['isDone'] ?? false) == true;
    final raw = (map['state'] ?? '').toString().toUpperCase();
    const valid = {'DONE', 'ACTIVE', 'PENDING', 'ERROR'};
    final state = valid.contains(raw) ? raw : (isDone ? 'DONE' : 'PENDING');

    return CustomerTrackingEvent(
      label: (map['label'] ?? '').toString(),
      status: (map['status'] ?? '').toString(),
      date: parseDate(map['date']),
      description: map['description']?.toString(),
      isDone: isDone,
      state: state,
    );
  }
}
