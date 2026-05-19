using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Reclamations;
using Web_Api.Services.Reclamations;

namespace Web_Api.Controllers.Client
{
    [ApiController]
    [Route("api/demandes")]
    [Authorize(Roles = AppRoles.CLIENT)]
    public class ClientDemandesController : ControllerBase
    {
        private readonly ReclamationsService _service;
        private readonly ILogger<ClientDemandesController> _logger;

        public ClientDemandesController(ReclamationsService service, ILogger<ClientDemandesController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet("mine")]
        public async Task<ActionResult<List<ReclamationListItemDto>>> GetMine(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var items = await _service.GetMyDemandesAsync(userId, ct);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMine demandes failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ReclamationDetailsDto>> GetDetails(int id, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                // Filtre VisibleClient = true : le client ne peut jamais ouvrir une Demande
                // livreur interne (motifs B, motifs C après 3 tentatives).
                var item = await _service.GetDemandeDetailsForClientAsync(id, userId, ct);
                if (item == null) return NotFound(new { message = "Demande introuvable." });
                return Ok(item);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDetails demande failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{id:int}/reply")]
        public async Task<ActionResult<ReclamationDetailsDto>> Reply(
            int id,
            [FromBody] ReplyDemandeRequest request,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.ReplyToDemandeAsync(
                    id,
                    userId,
                    request.NewAddress,
                    request.Latitude,
                    request.Longitude,
                    request.NewPhone,
                    request.Repere,
                    request.InstructionsLivreur,
                    ct);
                return Ok(item);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Reply demande failed");
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

    public class ReplyDemandeRequest
    {
        public string? NewAddress { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public string? NewPhone { get; set; }
        // Phase 6
        public string? Repere { get; set; }
        public string? InstructionsLivreur { get; set; }
    }
}
