namespace Web_Api.Auth.Constants
{
    public static class AppRoles
    {
        public const string CLIENT = "CLIENT";
        public const string VENDEUR = "VENDEUR";
        public const string CONFIRMATEUR = "CONFIRMATEUR";
        public const string LIVREUR = "LIVREUR";
        public const string ADMIN = "ADMIN";
        public const string SUPERVISEUR = "SUPERVISEUR";

        public static readonly string[] All = { CLIENT, VENDEUR, CONFIRMATEUR, LIVREUR, ADMIN, SUPERVISEUR };
    }
}
