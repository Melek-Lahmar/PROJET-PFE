import '../constants.dart';

class AppFormatters {
  AppFormatters._();

  static String twoDigits(int value) {
    return value.toString().padLeft(2, '0');
  }

  static String date(DateTime? value) {
    if (value == null) return '--/--/----';
    return '${twoDigits(value.day)}/${twoDigits(value.month)}/${value.year}';
  }

  static String time(DateTime? value) {
    if (value == null) return '--:--';
    return '${twoDigits(value.hour)}:${twoDigits(value.minute)}';
  }

  static String dateTime(DateTime? value) {
    if (value == null) return '--/--/---- --:--';
    return '${date(value)} ${time(value)}';
  }

  static String distanceMeters(double? meters) {
    if (meters == null || meters <= 0) return '--';
    if (meters < 1000) return '${meters.toStringAsFixed(0)} m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  static String durationSeconds(double? seconds) {
    if (seconds == null || seconds <= 0) return '--';

    final totalMinutes = (seconds / 60).round();

    if (totalMinutes < 60) {
      return '${totalMinutes}min';
    }

    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;

    return '${hours}h${minutes.toString().padLeft(2, '0')}';
  }

  static String durationMinutes(int? minutes) {
    if (minutes == null || minutes <= 0) return '--';

    if (minutes < 60) {
      return '${minutes}min';
    }

    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;

    return '${hours}h${remainingMinutes.toString().padLeft(2, '0')}';
  }

  static String statusLabel(int statut) {
    switch (statut) {
      case Statut.confirme:
        return 'Confirmé';
      case Statut.enLivraison:
        return 'En livraison';
      case Statut.livre:
        return 'Livré';
      case Statut.reporte:
        return 'Reporté';
      case Statut.retourne:
        return 'Retourné';
      case Statut.depot:
        return 'Dépôt';
      default:
        return 'Inconnu';
    }
  }

  static String fallback(
      String? value, {
        String placeholder = '--',
      }) {
    if (value == null || value.trim().isEmpty) return placeholder;
    return value.trim();
  }

  static String cityAndAddress({
    required String? city,
    required String? address,
  }) {
    final c = fallback(city, placeholder: '');
    final a = fallback(address, placeholder: '');

    if (c.isEmpty && a.isEmpty) return '--';
    if (c.isEmpty) return a;
    if (a.isEmpty) return c;

    return '$c • $a';
  }
}