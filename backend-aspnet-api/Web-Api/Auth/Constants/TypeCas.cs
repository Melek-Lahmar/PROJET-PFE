namespace Web_Api.Auth.Constants
{
    public static class TypeCas
    {
        public const string RECLAMATION = "RECLAMATION";
        public const string DEMANDE = "DEMANDE";

        public static readonly string[] All = { RECLAMATION, DEMANDE };

        public static bool IsValid(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return All.Contains(value.Trim().ToUpperInvariant());
        }
    }

    public static class TypeCommande
    {
        public const string NORMALE = "NORMALE";
        public const string ECHANGE = "ECHANGE";

        public static readonly string[] All = { NORMALE, ECHANGE };
    }
}
