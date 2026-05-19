using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Module 3 (Master Prompt) — endpoint admin qui expose les adresses d'un client
    /// SANS jamais retourner les coordonnées GPS (Latitude/Longitude).
    /// Le client conserve l'accès complet via /api/client/addresses.
    /// </summary>
    [ApiController]
    [Route("api/admin/clients/{clientId:guid}/addresses")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminClientAddressesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminClientAddressesController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> List(Guid clientId, CancellationToken ct)
        {
            var addresses = await _db.F_CLIENT_ADDRESSES
                .AsNoTracking()
                .Where(a => a.ClientUserId == clientId)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreatedAt)
                .Select(a => new ClientAddressAdminDto
                {
                    Id = a.Id,
                    Label = a.Label,
                    Adresse = a.Adresse,
                    Gouvernorat = a.Gouvernorat,
                    Delegation = a.Delegation,
                    Ville = a.Ville,
                    CodePostal = a.CodePostal,
                    IsDefault = a.IsDefault,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt,
                })
                .ToListAsync(ct);

            return Ok(addresses);
        }

        public class ClientAddressAdminDto
        {
            public Guid Id { get; set; }
            public string Label { get; set; } = string.Empty;
            public string Adresse { get; set; } = string.Empty;
            public string Gouvernorat { get; set; } = string.Empty;
            public string? Delegation { get; set; }
            public string Ville { get; set; } = string.Empty;
            public string? CodePostal { get; set; }
            public bool IsDefault { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
            // ❌ INTERDIT : Latitude / Longitude (sécurité Module 3 — voir IMPLEMENTATION_DECISIONS.md D13)
        }
    }
}
