using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Hubs;
using Web_Api.Model;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Section 4.6 — Personnalisation thème global. Une seule ligne dans F_APP_CONFIG
    /// (Id=1, contrainte CHECK). Lue par toutes les apps au démarrage et propagée
    /// via SignalR ThemeChanged pour rafraîchir sans redémarrer.
    /// </summary>
    [ApiController]
    [Route("api/admin/config")]
    public class AdminThemeController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<ReclamationHub> _hub;

        public AdminThemeController(AppDbContext db, IHubContext<ReclamationHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        [HttpGet("theme")]
        [AllowAnonymous]
        public async Task<IActionResult> Get(CancellationToken ct)
        {
            var cfg = await _db.F_APP_CONFIGS.AsNoTracking().FirstOrDefaultAsync(c => c.Id == 1, ct);
            if (cfg == null)
            {
                cfg = new F_APP_CONFIG { Id = 1, PrimaryColor = "#3F51B5", ThemeMode = "auto" };
            }
            return Ok(new { primaryColor = cfg.PrimaryColor, themeMode = cfg.ThemeMode, updatedAt = cfg.UpdatedAt });
        }

        [HttpPut("theme")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> Update([FromBody] ThemeUpdateDto dto, CancellationToken ct)
        {
            if (dto == null) return BadRequest();
            if (!IsValidHex(dto.PrimaryColor))
                return BadRequest(new { message = "Couleur HEX invalide. Format attendu : #RRGGBB." });

            var mode = (dto.ThemeMode ?? "auto").Trim().ToLowerInvariant();
            if (mode != "light" && mode != "dark" && mode != "auto")
                return BadRequest(new { message = "ThemeMode doit être light | dark | auto." });

            var cfg = await _db.F_APP_CONFIGS.FirstOrDefaultAsync(c => c.Id == 1, ct);
            if (cfg == null)
            {
                cfg = new F_APP_CONFIG { Id = 1 };
                _db.F_APP_CONFIGS.Add(cfg);
            }

            cfg.PrimaryColor = dto.PrimaryColor!.Trim();
            cfg.ThemeMode = mode;
            cfg.UpdatedAt = DateTime.UtcNow;

            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(raw, out var uid)) cfg.UpdatedByUserId = uid;

            await _db.SaveChangesAsync(ct);

            // Propagation temps réel à toutes les apps connectées
            await _hub.Clients.All.SendAsync("ThemeChanged",
                new { primaryColor = cfg.PrimaryColor, themeMode = cfg.ThemeMode }, ct);

            return Ok(new { primaryColor = cfg.PrimaryColor, themeMode = cfg.ThemeMode, updatedAt = cfg.UpdatedAt });
        }

        private static bool IsValidHex(string? s)
        {
            if (string.IsNullOrEmpty(s) || s.Length != 7 || s[0] != '#') return false;
            return s.Skip(1).All(c =>
                (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
        }

        public class ThemeUpdateDto
        {
            public string? PrimaryColor { get; set; }
            public string? ThemeMode { get; set; }
        }
    }
}
