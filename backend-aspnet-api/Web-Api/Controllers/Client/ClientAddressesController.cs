using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Controllers.Client
{
    /// <summary>
    /// Section 3.6 — Carnet d'adresses client (max 4 par client). Validé côté API.
    /// </summary>
    [ApiController]
    [Route("api/client/addresses")]
    [Authorize(Roles = AppRoles.CLIENT + "," + AppRoles.ADMIN)]
    public class ClientAddressesController : ControllerBase
    {
        private const int MaxAddresses = 4;
        private readonly AppDbContext _db;

        public ClientAddressesController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            var items = await _db.F_CLIENT_ADDRESSES.AsNoTracking()
                .Where(a => a.ClientUserId == userId.Value)
                .OrderByDescending(a => a.IsDefault).ThenByDescending(a => a.CreatedAt)
                .ToListAsync(ct);

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AddressUpsertDto dto, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (dto == null) return BadRequest(new { message = "Body manquant." });

            var count = await _db.F_CLIENT_ADDRESSES.CountAsync(a => a.ClientUserId == userId.Value, ct);
            if (count >= MaxAddresses)
            {
                var currentAddresses = await _db.F_CLIENT_ADDRESSES.AsNoTracking()
                    .Where(a => a.ClientUserId == userId.Value)
                    .OrderByDescending(a => a.IsDefault).ThenByDescending(a => a.CreatedAt)
                    .ToListAsync(ct);
                return Conflict(new { message = $"Maximum {MaxAddresses} adresses.", currentAddresses });
            }

            var entity = new F_CLIENT_ADDRESS
            {
                ClientUserId = userId.Value,
                Label = (dto.Label ?? "Adresse").Trim(),
                Adresse = (dto.Adresse ?? string.Empty).Trim(),
                Gouvernorat = (dto.Gouvernorat ?? string.Empty).Trim(),
                Delegation = dto.Delegation,
                Ville = (dto.Ville ?? string.Empty).Trim(),
                CodePostal = dto.CodePostal,
                Landmark = dto.Landmark,
                GeoValidationStatus = dto.Latitude.HasValue && dto.Longitude.HasValue ? "Ok" : "Unknown",
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                IsDefault = dto.IsDefault,
            };
            // Si la liste est vide, la première adresse devient par défaut.
            if (count == 0) entity.IsDefault = true;

            // Si on définit cette nouvelle adresse comme défaut, retirer le flag des autres.
            if (entity.IsDefault)
            {
                var others = await _db.F_CLIENT_ADDRESSES
                    .Where(a => a.ClientUserId == userId.Value && a.IsDefault)
                    .ToListAsync(ct);
                foreach (var o in others) o.IsDefault = false;
            }

            _db.F_CLIENT_ADDRESSES.Add(entity);
            await _db.SaveChangesAsync(ct);

            return Ok(entity);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] AddressUpsertDto dto, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (dto == null) return BadRequest();

            var entity = await _db.F_CLIENT_ADDRESSES
                .FirstOrDefaultAsync(a => a.Id == id && a.ClientUserId == userId.Value, ct);
            if (entity == null) return NotFound();

            entity.Label = (dto.Label ?? entity.Label).Trim();
            entity.Adresse = (dto.Adresse ?? entity.Adresse).Trim();
            entity.Gouvernorat = (dto.Gouvernorat ?? entity.Gouvernorat).Trim();
            entity.Delegation = dto.Delegation ?? entity.Delegation;
            entity.Ville = (dto.Ville ?? entity.Ville).Trim();
            entity.CodePostal = dto.CodePostal ?? entity.CodePostal;
            entity.Landmark = dto.Landmark ?? entity.Landmark;
            entity.GeoValidationStatus = dto.Latitude.HasValue && dto.Longitude.HasValue ? "Ok" : entity.GeoValidationStatus;
            entity.Latitude = dto.Latitude ?? entity.Latitude;
            entity.Longitude = dto.Longitude ?? entity.Longitude;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(entity);
        }


        [HttpPost("replace")]
        public async Task<IActionResult> Replace([FromQuery] Guid addressIdToReplace, [FromBody] AddressUpsertDto dto, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (dto == null) return BadRequest(new { message = "Body manquant." });

            var existing = await _db.F_CLIENT_ADDRESSES
                .FirstOrDefaultAsync(a => a.Id == addressIdToReplace && a.ClientUserId == userId.Value, ct);
            if (existing == null) return NotFound(new { message = "Adresse à remplacer introuvable." });

            _db.F_CLIENT_ADDRESSES.Remove(existing);
            var entity = new F_CLIENT_ADDRESS
            {
                ClientUserId = userId.Value,
                Label = (dto.Label ?? "Adresse").Trim(),
                Adresse = (dto.Adresse ?? string.Empty).Trim(),
                Gouvernorat = (dto.Gouvernorat ?? string.Empty).Trim(),
                Delegation = dto.Delegation,
                Ville = (dto.Ville ?? string.Empty).Trim(),
                CodePostal = dto.CodePostal,
                Landmark = dto.Landmark,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                GeoValidationStatus = dto.Latitude.HasValue && dto.Longitude.HasValue ? "Ok" : "Unknown",
                IsDefault = dto.IsDefault || existing.IsDefault,
                CreatedAt = DateTime.UtcNow
            };
            _db.F_CLIENT_ADDRESSES.Add(entity);
            await _db.SaveChangesAsync(ct);
            return Ok(entity);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            var entity = await _db.F_CLIENT_ADDRESSES
                .FirstOrDefaultAsync(a => a.Id == id && a.ClientUserId == userId.Value, ct);
            if (entity == null) return NotFound();

            var wasDefault = entity.IsDefault;
            _db.F_CLIENT_ADDRESSES.Remove(entity);
            await _db.SaveChangesAsync(ct);

            // Si on a supprimé l'adresse par défaut, en désigner une autre arbitrairement.
            if (wasDefault)
            {
                var fallback = await _db.F_CLIENT_ADDRESSES
                    .FirstOrDefaultAsync(a => a.ClientUserId == userId.Value, ct);
                if (fallback != null)
                {
                    fallback.IsDefault = true;
                    fallback.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync(ct);
                }
            }

            return NoContent();
        }

        [HttpPut("{id}/set-default")]
        public async Task<IActionResult> SetDefault(Guid id, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            var all = await _db.F_CLIENT_ADDRESSES
                .Where(a => a.ClientUserId == userId.Value)
                .ToListAsync(ct);

            var target = all.FirstOrDefault(a => a.Id == id);
            if (target == null) return NotFound();

            foreach (var a in all) a.IsDefault = (a.Id == id);
            target.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(target);
        }

        private Guid? CurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var g) ? g : null;
        }

        public class AddressUpsertDto
        {
            public string? Label { get; set; }
            public string? Adresse { get; set; }
            public string? Gouvernorat { get; set; }
            public string? Delegation { get; set; }
            public string? Ville { get; set; }
            public string? CodePostal { get; set; }
            public string? Landmark { get; set; }
            public decimal? Latitude { get; set; }
            public decimal? Longitude { get; set; }
            public bool IsDefault { get; set; }
        }
    }
}
