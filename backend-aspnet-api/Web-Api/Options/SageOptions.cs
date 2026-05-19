namespace Web_Api.Options
{
    public sealed class SageOptions
    {
        public const string SectionName = "Sage";

        /// <summary>
        /// Racine de l'API REST Sage (incl. trailing slash). Localhost par défaut
        /// pour développer contre une instance Sage X3 installée sur le poste.
        /// L'IP du poste change selon le réseau Wi-Fi : utiliser localhost évite
        /// de toucher à appsettings à chaque switch.
        /// </summary>
        public string BaseUrl { get; set; } = "http://localhost:8124/";

        /// <summary>Utilisateur Basic Auth Sage. Vide = pas d'auth envoyée.</summary>
        public string? Username { get; set; }

        /// <summary>Mot de passe Basic Auth Sage.</summary>
        public string? Password { get; set; }

        /// <summary>
        /// Path relatif (sans / initial) pour POSTer un docentete dans Sage.
        /// Exposé en config car selon le wrapper REST déployé devant Sage X3
        /// le chemin peut varier (Document/PostDocEntete, api/Sales/SDH, etc.).
        /// </summary>
        public string PostDocEnteteEndpoint { get; set; } = "Document/PostDocEntete";

        /// <summary>
        /// Si false, le service local n'appelle pas Sage (utile en dev offline).
        /// La transformation BC→BL reste appliquée en base locale dans tous les cas.
        /// </summary>
        public bool PostBlEnabled { get; set; } = true;

        public bool HasBasicAuth =>
            !string.IsNullOrWhiteSpace(Username) && !string.IsNullOrWhiteSpace(Password);
    }
}
