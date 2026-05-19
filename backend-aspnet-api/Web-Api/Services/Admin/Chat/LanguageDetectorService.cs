using System.Linq;
using System.Text.RegularExpressions;

namespace Web_Api.Services.Admin.Chat
{
    /// <summary>
    /// Section 5.3 — détection de langue (FR / AR / Tounsi).
    /// Tounsi = mélange ASCII tunisien (3andek, 9adech, ch7al…) avec chiffres
    /// utilisés comme lettres (3, 7, 9). Service stateless, injectable singleton.
    /// </summary>
    public class LanguageDetectorService
    {
        private static readonly string[] TounsiMarkers =
        {
            "3andek", "3andi", "3andna", "9adech", "ch7al", "lyoum", "barcha",
            "marra", "wache", "kifech", "fama", "mra3", "9bal", "5ater", "7sebi",
            "labes", "barra", "yezzi"
        };

        private static readonly Regex TounsiNumeralLetters =
            new(@"\b[a-z]*[3679][a-z]*\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex ArabicChars =
            new(@"[؀-ۿ]", RegexOptions.Compiled);

        public ChatLanguage Detect(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return ChatLanguage.French;

            // 1. Caractères arabes natifs → AR
            if (ArabicChars.IsMatch(text)) return ChatLanguage.Arabic;

            var lower = text.ToLowerInvariant();

            // 2. Markers Tounsi
            if (TounsiMarkers.Any(m => lower.Contains(m))) return ChatLanguage.Tounsi;

            // 3. Chiffres-comme-lettres (3andek, 9adech…) entourés de lettres
            if (TounsiNumeralLetters.IsMatch(text)) return ChatLanguage.Tounsi;

            return ChatLanguage.French;
        }
    }

    public enum ChatLanguage
    {
        French,
        Arabic,
        Tounsi,
    }
}
