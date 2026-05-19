using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.Services.Livreur;

namespace Web_Api.Controllers.Livreur
{
    [ApiController]
    [Route("api/livreur/pool")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.ADMIN)]
    public class LivreurPoolController : ControllerBase
    {
        private readonly CommandePoolService _service;
        private readonly ILogger<LivreurPoolController> _logger;

        public LivreurPoolController(CommandePoolService service, ILogger<LivreurPoolController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet("disponibles")]
        public async Task<ActionResult<List<PoolCommandeDto>>> GetDisponibles(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var items = await _service.GetPoolForLivreurAsync(userId, ct);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDisponibles failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("{doPiece}/detail")]
        public async Task<ActionResult<CommandeDetailDto>> GetDetail(string doPiece, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var detail = await _service.GetCommandeDetailAsync(userId, doPiece, ct);
                return Ok(detail);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDetail failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("mes-livraisons")]
        public async Task<ActionResult<List<PoolCommandeDto>>> GetMesLivraisons(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var items = await _service.GetMyLivraisonsAsync(userId, ct);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMesLivraisons failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{doPiece}/prendre")]
        public async Task<IActionResult> Prendre(string doPiece, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var success = await _service.TakeCommandeAsync(userId, doPiece, ct);
                if (!success)
                    return Conflict(new { message = "Cette commande vient d'être prise par un autre livreur." });
                return Ok(new { ok = true });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Prendre failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{doPiece}/abandon")]
        public async Task<IActionResult> Abandon(string doPiece, [FromBody] AbandonBody body, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var result = await _service.AbandonCommandeAsync(userId, doPiece, body?.Note, ct);
                return Ok(new
                {
                    ok = result.Success,
                    abandonsToday = result.AbandonsTodayCount,
                    warning = result.WarningTriggered
                });
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Abandon failed");
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

    public class AbandonBody
    {
        public string? Note { get; set; }
    }
}
