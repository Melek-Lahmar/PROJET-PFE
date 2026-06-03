using System.Text.Json;

namespace Web_Api.Services.Sage
{
    /// <summary>
    /// Charge la configuration <see cref="Param_Connexion_X3"/> depuis la table
    /// AppSettings (clé "sage.x3.connexion") avec un fallback sur les valeurs
    /// par défaut fournies par l'encadrant.
    /// </summary>
    public sealed class SageX3ConfigService
    {
        public const string SettingKey = "sage.x3.connexion";

        private readonly AppSettingsService _settings;

        public SageX3ConfigService(AppSettingsService settings)
        {
            _settings = settings;
        }

        public async Task<Param_Connexion_X3> GetAsync(CancellationToken ct = default)
        {
            var row = await _settings.GetAsync(SettingKey, ct);

            if (row == null || string.IsNullOrWhiteSpace(row.ValueJson) || row.ValueJson == "null")
                return Default();

            try
            {
                var parsed = JsonSerializer.Deserialize<Param_Connexion_X3>(
                    row.ValueJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return parsed ?? Default();
            }
            catch
            {
                return Default();
            }
        }

        private static Param_Connexion_X3 Default() => new Param_Connexion_X3
        {
            Http = 0,
            AdresseIP_API = "localhost",
            AdresseIP_X3 = "localhost:8124",
            Login = "admin",
            Password = "@Zerty1234",
            Dossier = "SEED",
            Service_Web_BC = "SOH",
            Type_BC = "WEB",
        };
    }
}
