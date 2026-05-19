using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.Services.Orders;

namespace Web_Api.Controllers.Client
{
    /// <summary>
    /// Phase 8 — Endpoint de tracking client (6 blocs). Retourne les informations de
    /// tracking pour une commande appartenant au client authentifié.
    /// </summary>
    [ApiController]
    [Route("api/client/orders")]
    [Authorize(Roles = AppRoles.CLIENT)]
    public class ClientTrackingController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly CustomerTrackingBuilder _builder;
        private readonly ILogger<ClientTrackingController> _logger;

        public ClientTrackingController(
            AppDbContext db,
            CustomerTrackingBuilder builder,
            ILogger<ClientTrackingController> logger)
        {
            _db = db;
            _builder = builder;
            _logger = logger;
        }

        [HttpGet("{piece}/tracking")]
        public async Task<ActionResult<CustomerOrderTrackingDto>> GetTracking(
            string piece, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                piece = (piece ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(piece))
                    return BadRequest(new { message = "Pièce obligatoire." });

                // Vérifier propriété : la commande doit appartenir au client (via CodeClientSage).
                var sageCode = await _db.ProfilsUtilisateurs.AsNoTracking()
                    .Where(p => p.UtilisateurId == userId)
                    .Select(p => p.CodeClientSage)
                    .FirstOrDefaultAsync(ct);

                if (string.IsNullOrWhiteSpace(sageCode))
                    return Forbid();

                var owns = await _db.F_DOCENTETES.AsNoTracking()
                    .AnyAsync(o => o.DO_Piece == piece && o.DO_Tiers == sageCode, ct);
                if (!owns)
                    return NotFound(new { message = "Commande introuvable." });

                var dto = await _builder.BuildAsync(piece, ct);
                if (dto == null)
                    return NotFound(new { message = "Commande introuvable." });

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetTracking failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        private Guid GetUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(raw, out var userId))
                throw new UnauthorizedAccessException("Utilisateur non authentifié.");
            return userId;
        }
    }
}
