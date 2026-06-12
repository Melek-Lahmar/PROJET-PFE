using System.Text.Json;
using Microsoft.Extensions.Options;
using Web_Api.Options;

namespace Web_Api.Services.Sage
{
    /// <summary>
    /// Charge la configuration <see cref="Param_Connexion_X3"/> depuis la table
    /// AppSettings (clé "sage.x3.connexion") avec un fallback sur les valeurs
    /// par défaut issues de appsettings.json ("SageX3" section).
    /// </summary>
    public sealed class SageX3ConfigService
    {
        public const string SettingKey = "sage.x3.connexion";

        private readonly AppSettingsService _settings;
        private readonly SageX3Options _x3Options;

        public SageX3ConfigService(AppSettingsService settings, IOptions<SageX3Options> x3Options)
        {
            _settings = settings;
            _x3Options = x3Options.Value;
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

                if (parsed != null)
                {

                    parsed.AdresseIP_API = _x3Options.ApiHost;
                    parsed.DefaultDepotNo = _x3Options.DefaultDepotNo;
                    parsed.DemoCtNum = _x3Options.DefaultClientCode;
                }

                return parsed ?? Default();
            }
            catch
            {
                return Default();
            }
        }

        private Param_Connexion_X3 Default() => new Param_Connexion_X3
        {
            Http = 0,
            AdresseIP_API = _x3Options.ApiHost,
            AdresseIP_X3 = "localhost:8124",
            Login = "admin",
            Password = "@Zerty1234",
            Dossier = "SEED",
            Service_Web_BC = "SOH",
            Type_BC = "WEB",
            DefaultDepotNo = _x3Options.DefaultDepotNo,
            DemoMode = false,
            DemoCtNum = _x3Options.DefaultClientCode,
            DemoDeNo = 26,
            DemoArRef1 = "DIS007",
            DemoArRef2 = "DIS009",
        };
    }
}
