namespace Web_Api.Auth.Constants
{
    public static class ReclamationStatuses
    {
        public const string ENVOYEE = "ENVOYEE";
        public const string EN_COURS_DE_TRAITEMENT = "EN_COURS_DE_TRAITEMENT";
        public const string CLOTUREE = "CLOTUREE";
        public const string REFUSEE = "REFUSEE";

        public static readonly string[] All = { ENVOYEE, EN_COURS_DE_TRAITEMENT, CLOTUREE, REFUSEE };

        public static readonly string[] StaffEditable = { EN_COURS_DE_TRAITEMENT, CLOTUREE, REFUSEE };

        public static bool IsValid(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return All.Contains(value.Trim().ToUpperInvariant());
        }

        public static bool IsStaffEditable(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return StaffEditable.Contains(value.Trim().ToUpperInvariant());
        }

        public static bool IsClosed(string? value)
        {
            var v = (value ?? string.Empty).Trim().ToUpperInvariant();
            return v == CLOTUREE || v == REFUSEE;
        }
    }
}
