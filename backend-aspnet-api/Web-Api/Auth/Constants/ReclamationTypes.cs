namespace Web_Api.Auth.Constants
{
    public static class ReclamationTypes
    {
        public const string LIVRAISON = "LIVRAISON";
        public const string PRODUIT = "PRODUIT";
        public const string PAIEMENT = "PAIEMENT";
        public const string SERVICE = "SERVICE";
        public const string AUTRE = "AUTRE";

        public static readonly string[] All =
        {
            LIVRAISON,
            PRODUIT,
            PAIEMENT,
            SERVICE,
            AUTRE
        };

        public static bool IsValid(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;

            return All.Contains(value.Trim().ToUpperInvariant());
        }
    }
}
