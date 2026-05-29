using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Module 4 (Master Prompt) — Gestion des clients B2B et de leur remise personnalisée.
    /// </summary>
    [ApiController]
    [Route("api/admin/clients")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminB2BClientsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminB2BClientsController(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        // GET /api/admin/clients/b2b
        [HttpGet("b2b")]
        public async Task<IActionResult> ListB2B(CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.TypeProfil == TypeProfil.Client && p.TypeClient == TypeClient.B2B)
                .OrderBy(p => p.NomSociete ?? p.NomComplet)
                .ToListAsync(ct);

            var userIds = profiles
                .Where(p => p.UtilisateurId.HasValue)
                .Select(p => p.UtilisateurId!.Value)
                .Distinct()
                .ToList();

            var clientCodes = profiles
                .Select(p => p.CodeClientSage)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var docs = await _db.F_DOCENTETES.AsNoTracking()
                .Where(d => d.DO_Domaine == 0
                            && (d.DO_Type == F_DOCENTETE.DOC_TYPE_BC || d.DO_Type == F_DOCENTETE.DOC_TYPE_BL)
                            && d.DO_Valide != F_DOCENTETE.STATUS_REFUSE
                            && (
                                (d.DO_ClientUserId.HasValue && userIds.Contains(d.DO_ClientUserId.Value)) ||
                                (d.DO_Tiers != null && clientCodes.Contains(d.DO_Tiers))
                            ))
                .Select(d => new
                {
                    d.DO_ClientUserId,
                    d.DO_Tiers,
                    d.DO_Type,
                    d.DO_Date,
                    Net = d.DO_NetAPayer ?? d.DO_TotalTTC ?? 0m
                })
                .ToListAsync(ct);

            var clients = profiles.Select(p =>
            {
                var profileDocs = docs
                    .Where(d =>
                        (p.UtilisateurId.HasValue && d.DO_ClientUserId == p.UtilisateurId.Value) ||
                        (!string.IsNullOrWhiteSpace(p.CodeClientSage) && string.Equals(d.DO_Tiers, p.CodeClientSage, StringComparison.OrdinalIgnoreCase)))
                    .ToList();

                var revenueDocs = profileDocs.Where(d => d.DO_Type == F_DOCENTETE.DOC_TYPE_BL).ToList();
                if (revenueDocs.Count == 0)
                    revenueDocs = profileDocs.Where(d => d.DO_Type == F_DOCENTETE.DOC_TYPE_BC).ToList();

                var totalRevenue = revenueDocs.Sum(d => d.Net);
                var ordersCount = revenueDocs.Count;
                var suggested = SuggestDiscount(totalRevenue);

                return new B2BClientListDto
                {
                    UserId = p.UtilisateurId,
                    NomComplet = p.NomComplet,
                    NomSociete = p.NomSociete,
                    Telephone = p.Telephone,
                    DiscountPercent = p.DiscountPercent,
                    LegacyRemise = p.Remise,
                    Gouvernorat = p.Gouvernorat.HasValue ? p.Gouvernorat.Value.ToString() : null,
                    TotalRevenue = totalRevenue,
                    OrdersCount = ordersCount,
                    AverageOrderAmount = ordersCount > 0 ? decimal.Round(totalRevenue / ordersCount, 3) : 0m,
                    LastOrderDate = revenueDocs.OrderByDescending(d => d.DO_Date).Select(d => d.DO_Date).FirstOrDefault(),
                    SuggestedDiscountPercent = suggested,
                    DiscountLevelLabel = DiscountLevelLabel(suggested),
                };
            }).ToList();

            return Ok(clients);
        }

        // PATCH /api/admin/clients/{id}/discount
        [HttpPatch("{id:guid}/discount")]
        public async Task<IActionResult> SetDiscount(Guid id, [FromBody] DiscountUpdateDto dto, CancellationToken ct)
        {
            if (dto == null) return BadRequest(new { message = "Body manquant." });
            if (dto.Value.HasValue && (dto.Value.Value < 0 || dto.Value.Value > 100))
                return BadRequest(new { message = "La remise doit être entre 0 et 100." });

            var profile = await _db.ProfilsUtilisateurs
                .FirstOrDefaultAsync(p => p.UtilisateurId == id, ct);
            if (profile == null) return NotFound();
            if (profile.TypeClient != TypeClient.B2B)
                return BadRequest(new { message = "Le client n'est pas B2B." });

            var adminIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(adminIdRaw, out var adminId);

            var oldValue = profile.DiscountPercent;
            var changed = oldValue != dto.Value;
            if (changed && string.IsNullOrWhiteSpace(dto.Reason))
                return BadRequest(new { message = "Le motif est obligatoire lorsque la remise change." });

            profile.DiscountPercent = dto.Value;
            profile.DateModification = DateTime.UtcNow;

            var changedAt = DateTime.UtcNow;
            if (changed)
            {
                _db.F_B2B_DISCOUNT_HISTORIES.Add(new F_B2B_DISCOUNT_HISTORY
                {
                    ClientUserId = id,
                    OldValue = oldValue,
                    NewValue = dto.Value,
                    ChangedByAdminId = adminId,
                    ChangedAt = changedAt,
                    Reason = dto.Reason?.Trim(),
                });
            }

            await _db.SaveChangesAsync(ct);
            return Ok(new
            {
                clientUserId = id,
                oldValue,
                newValue = dto.Value,
                reason = dto.Reason?.Trim(),
                changedAt,
                discountPercent = profile.DiscountPercent
            });
        }

        // GET /api/admin/clients/{id}/discount-history
        [HttpGet("{id:guid}/discount-history")]
        public async Task<IActionResult> History(Guid id, CancellationToken ct)
        {
            var rows = await _db.F_B2B_DISCOUNT_HISTORIES.AsNoTracking()
                .Where(h => h.ClientUserId == id)
                .OrderByDescending(h => h.ChangedAt)
                .Take(200)
                .ToListAsync(ct);
            return Ok(rows);
        }

        public class B2BClientListDto
        {
            public Guid? UserId { get; set; }
            public string? NomComplet { get; set; }
            public string? NomSociete { get; set; }
            public string? Telephone { get; set; }
            public decimal? DiscountPercent { get; set; }
            public int? LegacyRemise { get; set; }
            public string? Gouvernorat { get; set; }
            public decimal TotalRevenue { get; set; }
            public int OrdersCount { get; set; }
            public decimal AverageOrderAmount { get; set; }
            public DateTime? LastOrderDate { get; set; }
            public decimal SuggestedDiscountPercent { get; set; }
            public string DiscountLevelLabel { get; set; } = "Standard";
        }

        public class DiscountUpdateDto
        {
            public decimal? Value { get; set; }
            public string? Reason { get; set; }
        }

        private static decimal SuggestDiscount(decimal totalRevenue)
        {
            if (totalRevenue >= 20000m) return 15m;
            if (totalRevenue >= 5000m) return 10m;
            if (totalRevenue >= 1000m) return 5m;
            return 0m;
        }

        private static string DiscountLevelLabel(decimal rate)
        {
            return rate switch
            {
                >= 15m => "Platinum",
                >= 10m => "Gold",
                >= 5m => "Silver",
                _ => "Standard"
            };
        }
    }
}
