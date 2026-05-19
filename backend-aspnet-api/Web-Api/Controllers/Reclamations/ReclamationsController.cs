using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Reclamations;
using Web_Api.Services.Reclamations;

namespace Web_Api.Controllers.Reclamations
{
    [ApiController]
    [Route("api/reclamations")]
    [Authorize(Roles = AppRoles.CLIENT)]
    public class ReclamationsController : ControllerBase
    {
        private readonly ReclamationsService _service;
        private readonly ILogger<ReclamationsController> _logger;

        public ReclamationsController(ReclamationsService service, ILogger<ReclamationsController> logger)
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
                var items = await _service.GetMineAsync(userId, ct);
                return Ok(items);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMine failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<ReclamationResponseDto>> Create([FromBody] CreateReclamationRequestDto request, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var result = await _service.CreateAsync(userId, request, ct);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Create failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ReclamationDetailsDto>> GetDetails(int id, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.GetDetailsForClientAsync(id, userId, ct);
                if (item == null) return NotFound(new { message = "Réclamation introuvable." });
                return Ok(item);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDetails failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{id:int}/photos")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<ReclamationPhotoDto>> AddPhoto(int id, IFormFile file, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var photo = await _service.AddPhotoAsync(id, userId, file, ct);
                return Ok(photo);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AddPhoto failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("{id:int}/repeat-order")]
        public async Task<ActionResult<List<ReclamationOrderLineDto>>> GetRepeatOrderLines(int id, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var lines = await _service.GetOrderLinesForRepeatOrderAsync(id, userId, ct);
                return Ok(lines);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetRepeatOrderLines failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{id:int}/demande-echange")]
        public async Task<ActionResult<ReclamationDetailsDto>> RequestEchange(int id, [FromBody] RequestEchangeBody body, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.RequestEchangeAsync(id, userId, body.Text, ct);
                return Ok(item);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RequestEchange failed");
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

    public class RequestEchangeBody
    {
        public string Text { get; set; } = string.Empty;
    }
}
