using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;

namespace Web_Api.Controllers.Client
{
    /// <summary>
    /// Section 2.10 — préférence de contact client.
    /// </summary>
    [ApiController]
    [Route("api/client/profile")]
    [Authorize(Roles = AppRoles.CLIENT + "," + AppRoles.ADMIN)]
    public class ClientContactPrefsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ClientContactPrefsController(AppDbContext db)
        {
            _db = db;
        }

        public class ContactPrefDto
        {
            public string? ContactPreference { get; set; }
        }

        [HttpPut("contact-preference")]
        public async Task<IActionResult> Update([FromBody] ContactPrefDto dto, CancellationToken ct)
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(raw, out var userId)) return Forbid();

            var v = (dto?.ContactPreference ?? "Both").Trim();
            if (v != "Both" && v != "AppelOnly" && v != "SmsOnly")
                return BadRequest(new { message = "Valeur attendue : Both | AppelOnly | SmsOnly." });

            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);
            if (profile == null) return NotFound();
            profile.ContactPreference = v;
            await _db.SaveChangesAsync(ct);
            return Ok(new { contactPreference = profile.ContactPreference });
        }
    }
}
