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
            var clients = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.TypeProfil == TypeProfil.Client && p.TypeClient == TypeClient.B2B)
                .OrderBy(p => p.NomSociete ?? p.NomComplet)
                .Select(p => new B2BClientListDto
                {
                    UserId = p.UtilisateurId,
                    NomComplet = p.NomComplet,
                    NomSociete = p.NomSociete,
                    Telephone = p.Telephone,
                    DiscountPercent = p.DiscountPercent,
                    LegacyRemise = p.Remise,
                    Gouvernorat = p.Gouvernorat.HasValue ? p.Gouvernorat.Value.ToString() : null,
                })
                .ToListAsync(ct);

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
            profile.DiscountPercent = dto.Value;
            profile.DateModification = DateTime.UtcNow;

            _db.F_B2B_DISCOUNT_HISTORIES.Add(new F_B2B_DISCOUNT_HISTORY
            {
                ClientUserId = id,
                OldValue = oldValue,
                NewValue = dto.Value,
                ChangedByAdminId = adminId,
                Reason = dto.Reason,
            });

            await _db.SaveChangesAsync(ct);
            return Ok(new { discountPercent = profile.DiscountPercent });
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
        }

        public class DiscountUpdateDto
        {
            public decimal? Value { get; set; }
            public string? Reason { get; set; }
        }
    }
}
