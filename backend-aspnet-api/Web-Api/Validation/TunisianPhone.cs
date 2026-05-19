using System.Text.RegularExpressions;

namespace Web_Api.Validation
{
    /// <summary>
    /// Validation / normalisation d'un numéro de téléphone tunisien.
    /// Règle : 8 chiffres, commence par 2, 3, 4, 5, 7 ou 9.
    /// Préfixe international optionnel : +216, 00216 ou 216. Espaces et tirets tolérés en entrée.
    /// </summary>
    public static class TunisianPhone
    {
        // Strip tout ce qui n'est pas un chiffre ou '+' pour normaliser
        private static readonly Regex NonDigit = new(@"[^\d+]", RegexOptions.Compiled);

        // Pattern final sur la forme normalisée (sans séparateurs)
        private static readonly Regex NormalizedPattern =
            new(@"^(?:\+?216|00216)?[234579]\d{7}$", RegexOptions.Compiled);

        /// <summary>
        /// Vrai si la valeur représente un numéro tunisien valide.
        /// </summary>
        public static bool IsValid(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            var stripped = NonDigit.Replace(value.Trim(), string.Empty);
            return NormalizedPattern.IsMatch(stripped);
        }

        /// <summary>
        /// Renvoie le numéro au format "8 chiffres" (sans préfixe).
        /// Suppose que IsValid(value) est vrai. Retourne la chaîne brute sinon.
        /// </summary>
        public static string Normalize(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var stripped = NonDigit.Replace(value.Trim(), string.Empty);

            // Retirer préfixes +216 / 00216 / 216 si présents
            if (stripped.StartsWith("+216")) stripped = stripped[4..];
            else if (stripped.StartsWith("00216")) stripped = stripped[5..];
            else if (stripped.StartsWith("216") && stripped.Length == 11) stripped = stripped[3..];

            return stripped;
        }
    }
}
