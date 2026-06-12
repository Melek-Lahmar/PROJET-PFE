using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Web_Api.DTO;
using Web_Api.Options;

namespace Web_Api.Services
{
    public class SageService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SageService> _logger;
        private readonly SageOptions _options;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };

        public SageService(
            HttpClient httpClient,
            IOptions<SageOptions> options,
            ILogger<SageService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
        }

        // -------------------------
        // Méthode générique commune (GET liste)
        // -------------------------
        private async Task<List<T>> GetListAsync<T>(string relativeUrl, CancellationToken ct = default)
        {
            _logger.LogInformation("Sage GET: {Url}", relativeUrl);

            using var response = await _httpClient.GetAsync(relativeUrl, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                // WEB_API_STAGE_X3 peut retourner 400 avec un JSON {isSuccess:false,error:"..."}
                // On tente de désérialiser pour obtenir le message d'erreur métier.
                try
                {
                    var errDto = JsonSerializer.Deserialize<SageResponseDto<T>>(body, _jsonOptions);
                    if (errDto != null && !string.IsNullOrWhiteSpace(errDto.Error))
                    {
                        _logger.LogError("Sage {Url} HTTP {Code}: {Error}", relativeUrl, (int)response.StatusCode, errDto.Error);
                        throw new InvalidOperationException($"Sage X3 erreur ({(int)response.StatusCode}): {errDto.Error}");
                    }
                }
                catch (JsonException) { }

                _logger.LogError("Sage HTTP {Code} sur {Url}. Body: {Body}", (int)response.StatusCode, relativeUrl, body);
                throw new HttpRequestException($"Erreur HTTP Sage {(int)response.StatusCode} sur {relativeUrl}. Body: {body}");
            }

            var sageResponse = JsonSerializer.Deserialize<SageResponseDto<T>>(body, _jsonOptions);

            if (sageResponse is null)
                throw new InvalidOperationException($"Réponse Sage invalide (null) pour {relativeUrl}");

            if (!sageResponse.IsSuccess)
            {
                _logger.LogWarning("Sage isSuccess=false pour {Url}. Error: {Error}", relativeUrl, sageResponse.Error);
                return new List<T>();
            }

            return sageResponse.Value ?? new List<T>();
        }

        // -------------------------
        // Endpoints spécifiques
        // -------------------------

        public Task<List<ArticleSageDto>> GetArticlesFromSage(CancellationToken ct = default)
            => GetListAsync<ArticleSageDto>("Article/GetArticles", ct);

        public Task<List<StockSageDto>> GetStocksFromSage(CancellationToken ct = default)
            => GetListAsync<StockSageDto>("Article/GetStocks", ct);

        public Task<List<CatalogueSageDto>> GetCataloguesFromSage(CancellationToken ct = default)
            => GetListAsync<CatalogueSageDto>("Catalogue/GetCatalogues", ct);

        public Task<List<DepotSageDto>> GetDepotsFromSage(CancellationToken ct = default)
            => GetListAsync<DepotSageDto>("Depot/GetDepots", ct);

        // Simple test de connexion
        public async Task<bool> TestConnection(CancellationToken ct = default)
        {
            try
            {
                var _ = await GetArticlesFromSage(ct);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "TestConnection Sage échoué");
                return false;
            }
        }

        // -------------------------
        // POST DocEntete (BL/BC) → Sage
        // -------------------------

        /// <summary>
        /// Envoie un docentete (typiquement un BL fraîchement transformé) à Sage.
        /// Idempotent : si <see cref="SageOptions.PostBlEnabled"/> est false, on
        /// ne fait rien et on retourne un résultat noop.
        ///
        /// En cas d'erreur HTTP, on log + on renvoie le détail dans la réponse.
        /// L'appelant décide s'il veut faire échouer la transaction métier ou
        /// continuer (BL local OK, juste pas synchronisé Sage).
        /// </summary>
        public async Task<SagePostResult> PostDocEnteteAsync(
            SageDocEntetePayload payload,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(payload);

            if (!_options.PostBlEnabled)
            {
                _logger.LogInformation("Sage POST docentete ignoré (PostBlEnabled=false). Piece={Piece}", payload.DO_Piece);
                return new SagePostResult
                {
                    Sent = false,
                    Success = false,
                    HttpStatus = 0,
                    Message = "Désactivé via configuration (Sage:PostBlEnabled=false)."
                };
            }

            var endpoint = string.IsNullOrWhiteSpace(_options.PostDocEnteteEndpoint)
                ? "Document/PostDocEntete"
                : _options.PostDocEnteteEndpoint;

            _logger.LogInformation("Sage POST {Url} pour piece {Piece} ({Lines} lignes)",
                endpoint, payload.DO_Piece, payload.Lines.Count);

            try
            {
                using var response = await _httpClient.PostAsJsonAsync(endpoint, payload, _jsonOptions, ct);
                var body = await response.Content.ReadAsStringAsync(ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Sage POST {Url} a renvoyé HTTP {Status}. Piece={Piece}. Body={Body}",
                        endpoint, (int)response.StatusCode, payload.DO_Piece, body);

                    return new SagePostResult
                    {
                        Sent = true,
                        Success = false,
                        HttpStatus = (int)response.StatusCode,
                        Message = $"Sage a refusé le POST (HTTP {(int)response.StatusCode}).",
                        RawBody = body
                    };
                }

                _logger.LogInformation("Sage POST {Url} OK pour piece {Piece}.", endpoint, payload.DO_Piece);
                return new SagePostResult
                {
                    Sent = true,
                    Success = true,
                    HttpStatus = (int)response.StatusCode,
                    Message = "OK",
                    RawBody = body
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Sage POST {Url} a levé une exception. Piece={Piece}", endpoint, payload.DO_Piece);

                return new SagePostResult
                {
                    Sent = true,
                    Success = false,
                    HttpStatus = 0,
                    Message = $"Exception lors du POST Sage : {ex.Message}",
                    RawBody = null
                };
            }
        }
    }

    /// <summary>
    /// Payload générique envoyé à Sage pour un docentete (BC ou BL). Les noms
    /// de propriétés reprennent les colonnes F_DOCENTETE / F_DOCLIGNE pour
    /// rester proches du modèle Sage X3.
    /// </summary>
    public sealed class SageDocEntetePayload
    {
        public short? DO_Domaine { get; set; }
        public short? DO_Type { get; set; }
        public string DO_Piece { get; set; } = string.Empty;
        public DateTime? DO_Date { get; set; }
        public string? DO_Tiers { get; set; }
        public int? DE_No { get; set; }
        public decimal? DO_TotalHT { get; set; }
        public decimal? DO_TotalTTC { get; set; }
        public decimal? DO_NetAPayer { get; set; }
        public decimal? DO_FraisLivraison { get; set; }
        public decimal? DO_TimbreFiscal { get; set; }
        public string? DO_ModeLivraison { get; set; }
        public string? DO_ModePaiement { get; set; }
        public string? DO_AdresseLivraison { get; set; }
        public string? DO_VilleLivraison { get; set; }
        public string? DO_CodePostalLivraison { get; set; }
        public string? DO_TelephoneLivraison { get; set; }
        public short? DO_Valide { get; set; }
        public string? DO_Ref { get; set; }
        public List<SageDocLignePayload> Lines { get; set; } = new();
    }

    public sealed class SageDocLignePayload
    {
        public string? AR_Ref { get; set; }
        public string? DL_Design { get; set; }
        public decimal? DL_Qte { get; set; }
        public decimal? DL_PrixUnitaire { get; set; }
        public decimal? DL_MontantHT { get; set; }
        public decimal? DL_MontantTTC { get; set; }
    }

    public sealed class SagePostResult
    {
        public bool Sent { get; set; }
        public bool Success { get; set; }
        public int HttpStatus { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? RawBody { get; set; }
    }
}
