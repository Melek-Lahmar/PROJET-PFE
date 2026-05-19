using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Web_Api.Services.Sms
{
    /// <summary>
    /// Section 1.3 — gateway Tunisie Telecom (stub prêt à brancher).
    /// Lit ApiKey + Sender + BaseUrl depuis appsettings. Pour l'instant, retourne
    /// succès sans vraiment appeler (à activer en prod une fois le contrat signé).
    /// </summary>
    public class TunisieTelecomSmsGateway : ISmsGateway
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<TunisieTelecomSmsGateway> _logger;
        private readonly string _apiKey;
        private readonly string _sender;
        private readonly string _baseUrl;
        private readonly bool _liveCalls;

        public TunisieTelecomSmsGateway(
            IConfiguration configuration,
            IHttpClientFactory httpFactory,
            ILogger<TunisieTelecomSmsGateway> logger)
        {
            _httpFactory = httpFactory;
            _logger = logger;
            _apiKey = configuration["Sms:TunisieTelecom:ApiKey"] ?? string.Empty;
            _sender = configuration["Sms:TunisieTelecom:Sender"] ?? "DELIVERY";
            _baseUrl = configuration["Sms:TunisieTelecom:BaseUrl"]
                ?? "https://api.tunisietelecom.tn/sms/v1";
            // On ne fait des appels live que si LiveCalls=true (config). Sinon, retour succès simulé.
            _liveCalls = bool.TryParse(configuration["Sms:TunisieTelecom:LiveCalls"], out var b) && b;
        }

        public string ProviderName => "TunisieTelecom";

        public async Task<SmsResult> SendAsync(string phone, string message)
        {
            if (!_liveCalls)
            {
                _logger.LogInformation(
                    "[TT-SMS-Stub] Pas de live call (LiveCalls=false). Phone={Phone} Sender={Sender}",
                    phone, _sender);
                return new SmsResult { Success = true };
            }

            try
            {
                var http = _httpFactory.CreateClient("TT-SMS");
                http.BaseAddress = new System.Uri(_baseUrl.EndsWith("/") ? _baseUrl : _baseUrl + "/");
                http.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", _apiKey);

                var resp = await http.PostAsJsonAsync("sms/send", new
                {
                    to = phone,
                    from = _sender,
                    text = message,
                });

                if (resp.IsSuccessStatusCode)
                    return new SmsResult { Success = true };

                var body = await resp.Content.ReadAsStringAsync();
                return new SmsResult { Success = false, ErrorMessage = $"HTTP {(int)resp.StatusCode} : {body}" };
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "TunisieTelecom SMS send failed");
                return new SmsResult { Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}
