using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Avis;
using Web_Api.Services.Avis;

namespace Web_Api.Controllers.Avis
{
    [ApiController]
    [Route("api/avis")]
    [Authorize(Roles = AppRoles.CLIENT)]
    public class AvisController : ControllerBase
    {
        private readonly AvisService _service;
        private readonly ILogger<AvisController> _logger;

        public AvisController(AvisService service, ILogger<AvisController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet("pending")]
        public async Task<ActionResult<List<AvisPendingDto>>> GetPending(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var list = await _service.GetPendingAsync(userId, ct);
                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetPending failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("dismiss")]
        public async Task<IActionResult> Dismiss([FromBody] DismissRequest request, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                await _service.DismissAsync(request.CommandePiece, userId, ct);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Dismiss failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<AvisDto>> Submit([FromBody] SubmitAvisRequestDto request, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var avis = await _service.SubmitAsync(userId, request, ct);
                return Ok(avis);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Submit failed");
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

    public class DismissRequest
    {
        public string CommandePiece { get; set; } = string.Empty;
    }
}
