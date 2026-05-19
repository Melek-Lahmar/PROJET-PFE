import 'package:flutter/material.dart';

extension BuildContextX on BuildContext {
  ThemeData get theme => Theme.of(this);
  ColorScheme get colorScheme => Theme.of(this).colorScheme;
  TextTheme get textTheme => Theme.of(this).textTheme;
  Size get screenSize => MediaQuery.of(this).size;
  double get screenWidth => MediaQuery.of(this).size.width;
  double get screenHeight => MediaQuery.of(this).size.height;
  bool get isKeyboardOpen => MediaQuery.of(this).viewInsets.bottom > 0;
}

extension StringX on String? {
  bool get isNullOrBlank => this == null || this!.trim().isEmpty;
  String get orEmpty => this ?? '';
}

extension DateTimeX on DateTime {
  String toShortDate() {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(day)}/${two(month)}/$year';
  }

  String toShortDateTime() {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(day)}/${two(month)}/$year ${two(hour)}:${two(minute)}';
  }

  String toHourMinute() {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(hour)}:${two(minute)}';
  }

  bool isSameDay(DateTime other) {
    return day == other.day &&
        month == other.month &&
        year == other.year;
  }
}

extension NumX on num {
  String toKmLabel() {
    if (this < 1000) {
      return '${toStringAsFixed(0)} m';
    }
    return '${(this / 1000).toStringAsFixed(1)} km';
  }

  String toDurationMinutesLabel() {
    final minutes = (this / 60).round();
    if (minutes < 60) return '${minutes}min';

    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h}h${m.toString().padLeft(2, '0')}';
  }
}