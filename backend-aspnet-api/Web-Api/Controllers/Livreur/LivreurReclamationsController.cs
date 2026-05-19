using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Reclamations;
using Web_Api.Services.Avis;
using Web_Api.Services.Reclamations;

namespace Web_Api.Controllers.Livreur
{
    /// <summary>
    /// Endpoints livreur liés aux signalements terrain.
    /// Le livreur NE crée PAS une demande via un bouton séparé : l'endpoint
    /// RecordAttempt est appelé par l'app livreur en même temps qu'il change
    /// le statut d'une commande vers un statut autre que LIVRE.
    /// </summary>
    [ApiController]
    [Route("api/livreur/reclamations")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.ADMIN)]
    public class LivreurReclamationsController : ControllerBase
    {
        private readonly ReclamationsService _service;
        private readonly AvisService _avisService;
        private readonly ILogger<LivreurReclamationsController> _logger;

        public LivreurReclamationsController(
            ReclamationsService service,
            AvisService avisService,
            ILogger<LivreurReclamationsController> logger)
        {
            _service = service;
            _avisService = avisService;
            _logger = logger;
        }

        /// <summary>
        /// Enregistre une tentative de livraison (avec motif). Si le motif est
        /// immédiat ou si c'est le 3e jour d'échec avec motif différé, la
        /// demande est créée automatiquement et envoyée à la confirmatrice.
        /// </summary>
        [HttpPost("attempt")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> RecordAttempt(
            [FromForm] string doPiece,
            [FromForm] string motif,
            [FromForm] string? description,
            [FromForm] decimal? latitude,
            [FromForm] decimal? longitude,
            IFormFile? photo,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var request = new LivreurTentativeRequestDto
                {
                    DoPiece = doPiece,
                    Motif = motif,
                    Description = description,
                    Latitude = latitude,
                    Longitude = longitude
                };
                var demande = await _service.RecordLivreurAttemptAsync(userId, request, photo, ct);

                return Ok(new
                {
                    demandeCreated = demande != null,
                    demandeId = demande?.Id,
                    demandeCode = demande?.CodeReclamation,
                    demandeStatut = demande?.Statut
                });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RecordAttempt failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        /// <summary>
        /// Appelé par l'app livreur quand une commande passe en LIVRE.
        /// Auto-résout les demandes ouvertes + marque la commande comme "avis attendu".
        /// </summary>
        [HttpPost("delivered")]
        public async Task<IActionResult> MarkDelivered(
            [FromBody] MarkDeliveredRequest request,
            CancellationToken ct)
        {
            try
            {
                await _service.AutoResolveOnDeliveredAsync(request.DoPiece, ct);
                if (request.ClientUserId.HasValue)
                    await _avisService.MarkCommandeDeliveredAsync(request.DoPiece, request.ClientUserId.Value, ct);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MarkDelivered failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        /// <summary>
        /// Retourne l'état d'escalade d'une commande pour le livreur courant.
        /// Utilisé par l'app livreur pour afficher le bandeau persistant
        /// "Cas remonté au support" + désactiver les actions inutiles.
        /// </summary>
        [HttpGet("commandes/{piece}/escalation-status")]
        public async Task<ActionResult<OrderEscalationStatusDto>> GetEscalationStatus(
            string piece, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var status = await _service.GetOrderEscalationStatusAsync(piece, userId, ct);
                return Ok(status);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetEscalationStatus failed");
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

    public class MarkDeliveredRequest
    {
        public string DoPiece { get; set; } = string.Empty;
        public Guid? ClientUserId { get; set; }
    }
}
