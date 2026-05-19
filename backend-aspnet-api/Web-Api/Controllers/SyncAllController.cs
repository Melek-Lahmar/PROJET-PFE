using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using Web_Api.Auth.Constants;

namespace Web_Api.Controllers
{
    [ApiController]
    [Authorize(Roles = AppRoles.ADMIN)]
    [Route("api/[controller]")]
    public class SyncAllController : ControllerBase
    {
        private readonly ILogger<SyncAllController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public SyncAllController(ILogger<SyncAllController> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        /// <summary>
        /// Propage le header Authorization de la requête entrante aux appels
        /// HTTP internes vers /api/sync/* (qui sont eux aussi protégés
        /// [Authorize(Roles=ADMIN)]). Sans ça, le full-sync recevait des 401.
        /// </summary>
        private void ForwardAuth(HttpClient httpClient)
        {
            var auth = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrWhiteSpace(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", auth.Substring("Bearer ".Length).Trim());
            }
        }

        // POST: /api/SyncAll
        [HttpPost]
        public async Task<IActionResult> FullSync()
        {
            _logger.LogInformation("🚀 Début synchronisation complète...");

            var results = new List<object>();
            var errors = new List<string>();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            ForwardAuth(httpClient);

            // ✅ Endpoints réels du projet (selon ton architecture)
            var syncEndpoints = new (string Name, string Url)[]
            {
                ("Articles",   $"{baseUrl}/api/sync/articles"),
                ("Catalogues", $"{baseUrl}/api/sync/catalogues"),
                ("Dépôts",     $"{baseUrl}/api/sync/depots"),
                ("Stocks",     $"{baseUrl}/api/sync/stocks"),
            };

            foreach (var (name, url) in syncEndpoints)
            {
                try
                {
                    var response = await httpClient.PostAsync(url, content: null);
                    var body = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        errors.Add($"{name}: HTTP {(int)response.StatusCode} - {response.ReasonPhrase} - {body}");
                        continue;
                    }

                    // On garde le body brut (robuste si ton endpoint retourne texte / json / etc.)
                    results.Add(new
                    {
                        Type = name,
                        StatusCode = (int)response.StatusCode,
                        Response = string.IsNullOrWhiteSpace(body) ? null : body
                    });
                }
                catch (Exception ex)
                {
                    errors.Add($"{name}: {ex.Message}");
                }
            }

            _logger.LogInformation("✅ Synchronisation complète terminée");

            return Ok(new
            {
                Message = "Synchronisation complète terminée",
                Results = results,
                Errors = errors.Any() ? errors : null,
                Date = DateTime.Now
            });
        }

        // GET: /api/SyncAll/status
        // ⚠️ Seulement si tes controllers /api/sync/* ont aussi un GET /status.
        // Sinon, ce endpoint renverra une liste vide.
        [HttpGet("status")]
        public async Task<IActionResult> GetGlobalStatus()
        {
            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                ForwardAuth(httpClient);
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var statuses = new List<object>();

                var statusEndpoints = new (string Name, string Url)[]
                {
                    ("Articles",   $"{baseUrl}/api/sync/articles/status"),
                    ("Catalogues", $"{baseUrl}/api/sync/catalogues/status"),
                    ("Dépôts",     $"{baseUrl}/api/sync/depots/status"),
                    ("Stocks",     $"{baseUrl}/api/sync/stocks/status"),
                };

                foreach (var (name, url) in statusEndpoints)
                {
                    try
                    {
                        var response = await httpClient.GetAsync(url);
                        var body = await response.Content.ReadAsStringAsync();

                        if (!response.IsSuccessStatusCode) continue;

                        statuses.Add(new
                        {
                            Type = name,
                            StatusCode = (int)response.StatusCode,
                            Response = string.IsNullOrWhiteSpace(body) ? null : body
                        });
                    }
                    catch
                    {
                        // ignore endpoint individuel
                    }
                }

                return Ok(new
                {
                    Message = "Statut global",
                    Statuses = statuses,
                    Date = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }
}
