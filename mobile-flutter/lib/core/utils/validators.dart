class AppValidators {
  AppValidators._();

  static String? requiredField(
      String? value, {
        String fieldName = 'Ce champ',
      }) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName est obligatoire';
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email obligatoire';
    }

    final v = value.trim();

    final emailRegex = RegExp(
      r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
    );

    if (!emailRegex.hasMatch(v)) {
      return 'Email invalide';
    }

    return null;
  }

  static String? password(
      String? value, {
        int minLength = 6,
      }) {
    if (value == null || value.isEmpty) {
      return 'Mot de passe obligatoire';
    }

    if (value.length < minLength) {
      return 'Minimum $minLength caractères';
    }

    return null;
  }

  static String? minLength(
      String? value, {
        required int length,
        String fieldName = 'Ce champ',
      }) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName est obligatoire';
    }

    if (value.trim().length < length) {
      return '$fieldName doit contenir au moins $length caractères';
    }

    return null;
  }

  static String? maxLength(
      String? value, {
        required int length,
        String fieldName = 'Ce champ',
      }) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    if (value.trim().length > length) {
      return '$fieldName ne doit pas dépasser $length caractères';
    }

    return null;
  }

  static String? note(
      String? value, {
        int maxLength = 300,
      }) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    if (value.trim().length > maxLength) {
      return 'La note ne doit pas dépasser $maxLength caractères';
    }

    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Numéro obligatoire';
    }

    final v = value.replaceAll(' ', '');

    final regex = RegExp(r'^\+?[0-9]{8,15}$');
    if (!regex.hasMatch(v)) {
      return 'Numéro invalide';
    }

    return null;
  }

  static String? positiveNumber(
      String? value, {
        String fieldName = 'Valeur',
      }) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName est obligatoire';
    }

    final n = double.tryParse(value.replaceAll(',', '.'));
    if (n == null) {
      return '$fieldName invalide';
    }

    if (n <= 0) {
      return '$fieldName doit être supérieur à 0';
    }

    return null;
  }

  static String? combine(List<String? Function()> validators) {
    for (final validator in validators) {
      final result = validator();
      if (result != null) return result;
    }
    return null;
  }
}