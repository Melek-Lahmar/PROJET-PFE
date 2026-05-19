using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Module 8 (Master Prompt) — Stats CA par client basées sur les BL
    /// (F_DOCENTETE.DO_Type = 6 = Bon de Livraison Vente). Le master prompt
    /// précise explicitement : "CA calculé à partir des Bons de Livraison (BL),
    /// PAS des commandes" → on filtre sur DO_Type=6.
    /// </summary>
    [ApiController]
    [Route("api/admin/stats")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminClientRevenueController : ControllerBase
    {
        private const int BL_DOC_TYPE = 6;
        private readonly AppDbContext _db;

        public AdminClientRevenueController(AppDbContext db) { _db = db; }

        // GET /api/admin/stats/revenue-by-client?from=&to=&type=B2B|B2C
        [HttpGet("revenue-by-client")]
        public async Task<IActionResult> RevenueByClient(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] string? type,
            CancellationToken ct = default)
        {
            var bls = _db.F_DOCENTETES.AsNoTracking().Where(d => d.DO_Type == BL_DOC_TYPE);
            if (from.HasValue) bls = bls.Where(d => d.DO_Date >= from.Value);
            if (to.HasValue) bls = bls.Where(d => d.DO_Date <= to.Value);

            // Agrégation par DO_Tiers (code client Sage)
            var aggregates = await bls
                .GroupBy(d => d.DO_Tiers)
                .Select(g => new
                {
                    DoTiers = g.Key,
                    BlCount = g.Count(),
                    TotalRevenue = g.Sum(x => (decimal?)x.DO_TotalTTC) ?? 0m,
                    LastBlDate = g.Max(x => x.DO_Date) ?? DateTime.MinValue,
                })
                .ToListAsync(ct);

            // Join avec ProfilUtilisateur pour récupérer Type/Nom
            var ctNums = aggregates.Select(a => a.DoTiers).Where(c => c != null).Cast<string>().ToList();
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.CodeClientSage != null && ctNums.Contains(p.CodeClientSage))
                .ToListAsync(ct);

            var profileMap = profiles
                .GroupBy(p => p.CodeClientSage!)
                .ToDictionary(g => g.Key, g => g.First());

            var rows = aggregates.Select(a =>
            {
                var profile = a.DoTiers != null && profileMap.TryGetValue(a.DoTiers, out var p) ? p : null;
                return new ClientRevenueDto
                {
                    DoTiers = a.DoTiers,
                    ClientName = profile?.NomSociete ?? profile?.NomComplet ?? a.DoTiers,
                    Type = profile?.TypeClient?.ToString() ?? "B2C",
                    BlCount = a.BlCount,
                    TotalRevenue = a.TotalRevenue,
                    AverageBasket = a.BlCount > 0 ? Math.Round(a.TotalRevenue / a.BlCount, 3) : 0m,
                    LastBlDate = a.LastBlDate,
                };
            });

            if (!string.IsNullOrWhiteSpace(type))
                rows = rows.Where(r => string.Equals(r.Type, type, StringComparison.OrdinalIgnoreCase));

            return Ok(rows.OrderByDescending(r => r.TotalRevenue).ToList());
        }

        public class ClientRevenueDto
        {
            public string? DoTiers { get; set; }
            public string? ClientName { get; set; }
            public string Type { get; set; } = "B2C";
            public int BlCount { get; set; }
            public decimal TotalRevenue { get; set; }
            public decimal AverageBasket { get; set; }
            public DateTime LastBlDate { get; set; }
        }
    }
}
