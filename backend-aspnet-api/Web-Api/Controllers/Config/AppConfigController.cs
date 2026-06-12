using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Web_Api.data;

namespace Web_Api.Controllers.Config
{
    [ApiController]
    [Route("api/config")]
    public class AppConfigController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AppConfigController(AppDbContext db) => _db = db;

        // ── Delivery config (public) ───────────────────────────────────────────

        [HttpGet("delivery")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDelivery(CancellationToken ct)
        {
            var raw = await _db.AppSettings.AsNoTracking()
                .Where(s => s.Key == "delivery.config")
                .Select(s => s.ValueJson)
                .FirstOrDefaultAsync(ct);

            var cfg = DeliveryConfigDto.Default();
            if (!string.IsNullOrWhiteSpace(raw) && raw != "null")
            {
                try { cfg = JsonSerializer.Deserialize<DeliveryConfigDto>(raw, _jsonOpts) ?? cfg; }
                catch { }
            }
            return Ok(cfg);
        }

        // ── Client motifs (auth) ──────────────────────────────────────────────

        [HttpGet("reclamation-motifs/client")]
        [Authorize]
        public async Task<IActionResult> GetClientMotifs(CancellationToken ct)
        {
            var raw = await _db.AppSettings.AsNoTracking()
                .Where(s => s.Key == "reclamation.motifs.client")
                .Select(s => s.ValueJson)
                .FirstOrDefaultAsync(ct);

            var cfg = ClientMotifsConfigDto.Default();
            if (!string.IsNullOrWhiteSpace(raw) && raw != "null")
            {
                try { cfg = JsonSerializer.Deserialize<ClientMotifsConfigDto>(raw, _jsonOpts) ?? cfg; }
                catch { }
            }
            return Ok(cfg);
        }

        // ── Livreur motifs (auth) ─────────────────────────────────────────────

        [HttpGet("reclamation-motifs/livreur")]
        [Authorize]
        public async Task<IActionResult> GetLivreurMotifs(CancellationToken ct)
        {
            var raw = await _db.AppSettings.AsNoTracking()
                .Where(s => s.Key == "reclamation.motifs.livreur")
                .Select(s => s.ValueJson)
                .FirstOrDefaultAsync(ct);

            var motifs = LivreurMotifDto.Defaults();
            if (!string.IsNullOrWhiteSpace(raw) && raw != "null")
            {
                try { motifs = JsonSerializer.Deserialize<List<LivreurMotifDto>>(raw, _jsonOpts) ?? motifs; }
                catch { }
            }
            return Ok(motifs);
        }

        private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNameCaseInsensitive = true };
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public class DeliveryConfigDto
    {
        public decimal FraisHome { get; set; }
        public decimal TimbreFiscal { get; set; }
        public int DelaiJours { get; set; }

        public static DeliveryConfigDto Default() => new()
        {
            FraisHome = 8m,
            TimbreFiscal = 1m,
            DelaiJours = 8
        };
    }

    public class ClientMotifDto
    {
        public string Code { get; set; } = "";
        public string Label { get; set; } = "";
        public bool Enabled { get; set; } = true;
        public bool NeedsPhoto { get; set; }
        public bool NeedsCorrection { get; set; }
    }

    public class ClientMotifsConfigDto
    {
        public List<ClientMotifDto> AvantLivre { get; set; } = new();
        public List<ClientMotifDto> ApresLivre { get; set; } = new();

        public static ClientMotifsConfigDto Default() => new()
        {
            AvantLivre = new List<ClientMotifDto>
            {
                new() { Code = "CHANGEMENT_ADRESSE",    Label = "Changement d'adresse",  Enabled = true, NeedsCorrection = true },
                new() { Code = "CHANGEMENT_NUMERO",     Label = "Changement de numéro",  Enabled = true, NeedsCorrection = true },
                new() { Code = "REPROGRAMMATION",       Label = "Reprogrammation",        Enabled = true },
                new() { Code = "ANNULATION",            Label = "Annulation",             Enabled = true },
                new() { Code = "COLIS_NON_RECU",        Label = "Colis non reçu",         Enabled = true },
            },
            ApresLivre = new List<ClientMotifDto>
            {
                new() { Code = "COLIS_ENDOMMAGE",          Label = "Colis endommagé",    Enabled = true, NeedsPhoto = true },
                new() { Code = "COLIS_NON_CORRESPONDANT",  Label = "Colis non conforme", Enabled = true, NeedsPhoto = true },
            }
        };
    }

    public class LivreurMotifDto
    {
        public string Code { get; set; } = "";
        public string Label { get; set; } = "";
        public bool Enabled { get; set; } = true;
        public bool Deferred { get; set; }
        public string? Immediate { get; set; }
        public bool ClientVisible { get; set; }
        public bool NeedsPhoto { get; set; }
        public bool NeedsDescription { get; set; }

        public static List<LivreurMotifDto> Defaults() => new()
        {
            new() { Code = "CLIENT_INJOIGNABLE",    Label = "Client non joignable",        Enabled = true, Deferred = true },
            new() { Code = "TELEPHONE_ETEINT",      Label = "Téléphone éteint",            Enabled = true, Deferred = true },
            new() { Code = "CLIENT_ABSENT",         Label = "Client absent",               Enabled = true, Deferred = true },
            new() { Code = "NUMERO_INCORRECT",      Label = "Numéro incorrect",            Enabled = true, Immediate = "A", ClientVisible = true },
            new() { Code = "ADRESSE_INCORRECTE",    Label = "Adresse incorrecte",          Enabled = true, Immediate = "A", ClientVisible = true },
            new() { Code = "CLIENT_REFUSE",         Label = "Refus client",                Enabled = true, Immediate = "B" },
            new() { Code = "AUTRE",                 Label = "Autre incident",              Enabled = true, Immediate = "B", NeedsDescription = true },
            new() { Code = "COLIS_ENDOMMAGE_DEPOT", Label = "Colis endommagé au dépôt",   Enabled = true, Immediate = "B", NeedsPhoto = true },
        };
    }
}
