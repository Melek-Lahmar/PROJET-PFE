namespace Web_Api.Auth.Constants
{
    public static class ReclamationSources
    {
        public const string CLIENT = "CLIENT";
        public const string LIVREUR = "LIVREUR";

        public static readonly string[] All = { CLIENT, LIVREUR };

        public static bool IsValid(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            return All.Contains(value.Trim().ToUpperInvariant());
        }
    }
}
