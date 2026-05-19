using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Reclamations;
using Web_Api.Services.Reclamations;

namespace Web_Api.Controllers.Confirmateur
{
    [ApiController]
    [Route("api/confirmateur/reclamations")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR)]
    public class ConfirmateurReclamationsController : ControllerBase
    {
        private readonly ReclamationsService _service;
        private readonly ILogger<ConfirmateurReclamationsController> _logger;

        public ConfirmateurReclamationsController(ReclamationsService service, ILogger<ConfirmateurReclamationsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<List<ReclamationListItemDto>>> GetAll(
            [FromQuery] string? tab,
            [FromQuery] bool crossGouvernorat = false,
            [FromQuery] string? statut = null,
            [FromQuery] string? source = null,
            [FromQuery] string? typeCas = null,
            [FromQuery] string? motif = null,
            [FromQuery] string? doPiece = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            CancellationToken ct = default)
        {
            try
            {
                var filter = new ReclamationFilter
                {
                    Statut = statut,
                    Source = source,
                    TypeCas = typeCas,
                    Motif = motif,
                    DoPiece = doPiece,
                    FromDate = fromDate,
                    ToDate = toDate
                };
                var items = string.IsNullOrWhiteSpace(tab)
                    ? await _service.GetForStaffAsync(filter, ct)
                    : await _service.GetForStaffByTabAsync(tab, crossGouvernorat, filter, ct);
                return Ok(items);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAll failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{id:int}/echange")]
        public async Task<IActionResult> CreateEchange(int id, [FromBody] CreateEchangeV2RequestDto body, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var echange = await _service.CreateEchangeCommandeAsync(
                    id, userId,
                    body.Lignes, body.Note, ct);

                return Ok(new
                {
                    echangeDoPiece = echange.DO_Piece,
                    reclamationId = id,
                    message = "Commande d'échange créée et ajoutée au pool.",
                    lignesCount = body.Lignes.Count
                });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateEchange failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("{id:int}/echange/lignes-originales")]
        public async Task<ActionResult<List<EchangeLigneDto>>> GetOriginalLinesForEchange(int id, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var lignes = await _service.GetOriginalOrderLinesForEchangeAsync(id, userId, ct);
                return Ok(lignes);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetOriginalLinesForEchange failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{id:int}/reprendre")]
        public async Task<ActionResult<ReclamationDetailsDto>> Reprise(int id, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.RepriseAsync(id, userId, ct);
                return Ok(item);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Reprise failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ReclamationDetailsDto>> GetDetails(int id, CancellationToken ct)
        {
            try
            {
                var item = await _service.GetDetailsForStaffAsync(id, ct);
                if (item == null) return NotFound(new { message = "Réclamation introuvable." });
                return Ok(item);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetDetails failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPut("{id:int}/status")]
        public async Task<ActionResult<ReclamationDetailsDto>> UpdateStatus(
            int id,
            [FromBody] UpdateReclamationStatusRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.UpdateStatusAsync(id, request.Statut, request.MotifRefus, userId, ct);
                return Ok(item);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateStatus failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{id:int}/take-over")]
        public async Task<ActionResult<ReclamationDetailsDto>> TakeOver(int id, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.TakeOverAsync(id, userId, ct);
                return Ok(item);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TakeOver failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPut("{id:int}/correction")]
        public async Task<ActionResult<ReclamationDetailsDto>> ApplyCorrection(
            int id,
            [FromBody] ApplyCorrectionRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.ApplyCorrectionAsync(id, request, userId, ct);
                return Ok(item);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ApplyCorrection failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPut("{id:int}/change-commande-status")]
        public async Task<ActionResult<ReclamationDetailsDto>> ChangeCommandeStatus(
            int id,
            [FromBody] ChangeCommandeStatusFromDemandeRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.ChangeCommandeStatusAsync(id, request, userId, ct);
                return Ok(item);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ChangeCommandeStatus failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPut("{id:int}/note")]
        public async Task<ActionResult<ReclamationDetailsDto>> UpdateNote(
            int id,
            [FromBody] UpdateReclamationNoteRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.UpdateNoteAsync(id, request.NoteInterne, userId, ct);
                return Ok(item);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateNote failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPut("{id:int}/assign")]
        public async Task<ActionResult<ReclamationDetailsDto>> Assign(
            int id,
            [FromBody] AssignReclamationRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.AssignAsync(id, request.ConfirmatriceUserId, userId, ct);
                return Ok(item);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Assign failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpGet("{id:int}/depot-damaged/stock-check")]
        public async Task<ActionResult<StockAvailabilityCheckDto>> CheckStockForDepotDamaged(int id, CancellationToken ct)
        {
            try
            {
                var result = await _service.CheckStockForReclamationAsync(id, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CheckStockForDepotDamaged failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("{id:int}/depot-damaged/decide")]
        public async Task<ActionResult<ReclamationDetailsDto>> DecideDepotDamaged(
            int id,
            [FromBody] DecideDepotDamagedRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var item = await _service.DecideDepotDamagedAsync(
                    id, userId, request.Decision, request.Note, ct);
                return Ok(item);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DecideDepotDamaged failed");
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
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AddPhoto failed");
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
