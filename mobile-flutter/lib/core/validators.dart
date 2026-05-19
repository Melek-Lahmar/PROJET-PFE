/// Validation numéro tunisien.
/// Accepte :
///   - 8 chiffres commençant par 2, 4, 5, 7 ou 9 (ex: 22123456, 54987654)
///   - Optionnel : préfixe +216 ou 00216
class TunisianPhoneValidator {
  static final RegExp _regex = RegExp(r'^(\+216|00216)?[2457-9]\d{7}$');

  static bool isValid(String value) {
    final cleaned = value.replaceAll(RegExp(r'[\s-]'), '');
    return _regex.hasMatch(cleaned);
  }

  /// Normalise au format +216 XX XXX XXX
  static String normalize(String value) {
    var cleaned = value.replaceAll(RegExp(r'[\s-]'), '');
    if (cleaned.startsWith('00216')) cleaned = '+216${cleaned.substring(5)}';
    else if (!cleaned.startsWith('+216')) cleaned = '+216$cleaned';
    return cleaned;
  }

  static String? validate(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Numéro obligatoire';
    if (!isValid(v)) return 'Numéro tunisien invalide (ex: 22123456 ou +216 22 123 456)';
    return null;
  }
}
