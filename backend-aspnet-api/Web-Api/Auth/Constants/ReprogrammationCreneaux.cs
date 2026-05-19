namespace Web_Api.Auth.Constants
{
    /// <summary>
    /// Phase 7 — Créneaux de reprogrammation client (figés V1).
    ///   - MATIN : 9h - 13h
    ///   - APRES_MIDI : 13h - 18h
    ///   - SOIR : 18h - 20h
    /// </summary>
    public static class ReprogrammationCreneaux
    {
        public const string MATIN = "MATIN";
        public const string APRES_MIDI = "APRES_MIDI";
        public const string SOIR = "SOIR";

        public static readonly string[] All = { MATIN, APRES_MIDI, SOIR };

        /// <summary>Horizon de reprogrammation en jours calendaires (J+1 minimum, J+MaxDaysAhead maximum).</summary>
        public const int MinDaysAhead = 1;
        public const int MaxDaysAhead = 14;

        public static bool IsValidCreneau(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            return All.Contains(value.Trim().ToUpperInvariant());
        }

        /// <summary>
        /// Vrai si la date <paramref name="date"/> est entre J+MinDaysAhead et J+MaxDaysAhead
        /// inclus (calculé en jours calendaires UTC, ignorant l'heure).
        /// </summary>
        public static bool IsValidDate(DateTime date)
        {
            var today = DateTime.UtcNow.Date;
            var d = date.Date;
            var diff = (d - today).TotalDays;
            return diff >= MinDaysAhead && diff <= MaxDaysAhead;
        }
    }
}
