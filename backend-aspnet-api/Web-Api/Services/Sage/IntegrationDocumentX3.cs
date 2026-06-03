using System.ComponentModel;
using System.Net.Http.Headers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using static Web_Api.Services.Sage.Enumeration;

namespace Web_Api.Services.Sage
{
    public static class INTEGRATION_DOCUMENT_X3
    {
        public static async Task<Result<Message>?> Integration_Document(
            DOCUMENT dOCUMENT,
            Param_Connexion_X3 param_Connexion_X3)
        {
            var http_API = (Http)(param_Connexion_X3?.Http ?? (short)Http.Http);
            var http = http_API == Http.Http ? "http://" : "https://";
            var adresseIP_API = string.IsNullOrWhiteSpace(param_Connexion_X3?.AdresseIP_API)
                ? "localhost"
                : param_Connexion_X3!.AdresseIP_API;

            var jsonObject = new JObject
                {
                   { "Param_Connexion_X3", JsonConvert.SerializeObject(param_Connexion_X3) },
                   { "Document", JsonConvert.SerializeObject(dOCUMENT) },
                };

            var rep = JsonConvert.DeserializeObject<Result<Message>>(await DataService.SetObjects("", $@"{http}{adresseIP_API}/WEB_API_STAGE_X3/api/v1/document", jsonObject));

            return rep;
        }
    }

    public class Param_Connexion_X3
    {
        public short Http { get; set; }

        public string AdresseIP_X3 { get; set; } = "localhost:8124";
        public string Login { get; set; } = "admin";
        public string Password { get; set; } = "@Zerty1234";

        public string Dossier { get; set; } = "SEED";

        public string Service_Web_BC { get; set; } = "SOH";

        public string Type_BC { get; set; } = "WEB";

        // Hôte du wrapper REST WEB_API_STAGE_X3 (ex: "localhost" ou "10.0.0.5").
        // Volontairement non sérialisé : ce n'est PAS un paramètre attendu par
        // le wrapper Sage X3, c'est juste l'adresse du wrapper lui-même.
        [JsonIgnore]
        public string AdresseIP_API { get; set; } = "localhost";

        // Numéro de dépôt Sage X3 utilisé par défaut quand le BL local n'en a
        // pas (DE_No null ou 0). Pas envoyé au wrapper directement, il est
        // appliqué côté Document.
        [JsonIgnore]
        public int DefaultDepotNo { get; set; } = 1;
    }

    public class DOCUMENT
    {
        public string DO_NumDocument { get; set; }//Numero document web

        public DateTime DO_Date { get; set; }

        public int DE_No { get; set; }

        public string CT_Num { get; set; }//Code client

        public string DO_Ref { get; set; }//Reference document web

        public decimal? DO_TotalTTC { get; set; }

        public List<LIGNE_DOCUMENT> LIGNEDOCUMENTs { get; set; }
    }

    public class LIGNE_DOCUMENT
    {
        public string AR_Ref { get; set; }

        public decimal? LP_QteMvt { get; set; }

        public decimal? LP_PrixUnitaire { get; set; }

        public decimal? LP_ValeurRemise { get; set; }

        public decimal? LP_PUTTC { get; set; }

        public decimal LP_MontantTTC { get; set; }

    }

    public class DataService
    {
        // Logger statique pour tracer l'appel HTTP brut vers le wrapper Sage X3.
        public static Microsoft.Extensions.Logging.ILogger? Logger { get; set; }

        private static HttpClientHandler GetClientProxy()
        {
            var handler = new HttpClientHandler();
            handler.UseProxy = false;
            // Accepte les certificats auto-signés en dev (HTTPS local).
            handler.ServerCertificateCustomValidationCallback = (_, _, _, _) => true;
            return handler;
        }

        public static async Task<string> SetObjects(string token, string url, JObject jObject)
        {
            string data = "";
            string json = JsonConvert.SerializeObject(jObject);

            Logger?.LogInformation("Sage X3 → POST {Url} | body={Body}", url, json);

            try
            {
                using (HttpClient http = new HttpClient(GetClientProxy()))
                {
                    HttpContent httpContent = new StringContent(json);
                    httpContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                    http.Timeout = TimeSpan.FromMinutes(30);

                    var response = await http.PostAsync(url, httpContent);
                    data = response.Content != null ? await response.Content.ReadAsStringAsync() : "";

                    Logger?.LogInformation(
                        "Sage X3 ← HTTP {Status} {Reason} | body={Body}",
                        (int)response.StatusCode, response.ReasonPhrase, data);

                    return data ?? "";
                }
            }
            catch (Exception ex)
            {
                Logger?.LogError(ex, "Sage X3 EXCEPTION lors du POST {Url}", url);
                return "";
            }
        }
    }

    public class Enumeration
    {
        public enum Http
        {
            [Description("Http")]
            Http = 0,
            [Description("Https")]
            Https = 1,
        }
    }

    public class Result<T>
    {
        public bool IsSuccess { get; set; }

        public T Value { get; set; }

        public string Error { get; set; }

        public Result()
        {
        }

        public Result(bool isSuccess, T value, string error)
        {
            IsSuccess = isSuccess;
            Value = value;
            Error = error;
        }

        public static Result<T> Success(T value) => new Result<T> { IsSuccess = true, Value = value };
        public static Result<T> Failure(string error) => new Result<T> { IsSuccess = false, Error = error };
    }

    public class Message
    {
        public bool M_Statut { get; set; }

        public string M_NumeroSite { get; set; }

        public string M_NumeroSage { get; set; }
    }
}
