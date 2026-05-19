using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.DTO.Refonte;
using Web_Api.Model;
using Web_Api.Services.Refonte;

namespace Web_Api.Controllers.Refonte
{
    [ApiController]
    [Route("api/transit")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.SUPERVISEUR + "," + AppRoles.ADMIN)]
    public sealed class TransitController : ControllerBase
    {
        private static readonly string[] FinishedStatuses =
        {
            TransitStatuses.RecuAuDepot,
            TransitStatuses.RecuDepotDestine,
            TransitStatuses.TransitTermine,
            TransitStatuses.Annule
        };

        private readonly AppDbContext _db;
        private readonly IStockTransferService _service;
        private readonly ITransitOrchestrationService _orchestration;

        public TransitController(
            AppDbContext db,
            IStockTransferService service,
            ITransitOrchestrationService orchestration)
        {
            _db = db;
            _service = service;
            _orchestration = orchestration;
        }

        [HttpGet("my-missions")]
        public async Task<IActionResult> MyMissions(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            if (IsElevated())
            {
                var all = await _db.F_TRANSFERTS.AsNoTracking()
                    .OrderByDescending(x => x.AffectedAt)
                    .Take(300)
                    .ToListAsync(ct);
                return Ok(all);
            }

            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            return Ok(await _service.MissionsForLivreurAsync(userId.Value, ct));
        }

        [HttpGet("my-missions/{id:guid}")]
        public async Task<IActionResult> MyMission(Guid id, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            var item = await _service.GetMissionForActorAsync(id, userId.Value, IsElevated(), ct);
            if (item == null) return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = "Mission transit introuvable." });
            return Ok(item);
        }

        [HttpGet("pending")]
        public async Task<IActionResult> Pending(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            return Ok(await _service.PendingAsync(userId.Value, ct));
        }

        [HttpGet("in-progress")]
        public async Task<IActionResult> InProgress(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            return Ok(await _service.InProgressAsync(userId.Value, ct));
        }

        [HttpGet("history")]
        public async Task<IActionResult> History(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            var items = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.TransitLivreurUserId == userId.Value && FinishedStatuses.Contains(x.Status))
                .OrderByDescending(x => x.DeliveredAt ?? x.AffectedAt)
                .Take(100)
                .ToListAsync(ct);
            return Ok(items);
        }

        [HttpGet("stats/personal")]
        public async Task<IActionResult> PersonalStats(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            var query = _db.F_TRANSFERTS.AsNoTracking().Where(x => x.TransitLivreurUserId == userId.Value);
            return Ok(new
            {
                pending = await query.CountAsync(x => x.Status == TransitStatuses.EnAttenteTransit || x.Status == TransitStatuses.EnAttenteAffectationTransit, ct),
                inProgress = await query.CountAsync(x => x.Status == TransitStatuses.EnTransit || x.Status == TransitStatuses.EnCoursTransit, ct),
                completed = await query.CountAsync(x => x.Status == TransitStatuses.RecuAuDepot || x.Status == TransitStatuses.RecuDepotDestine || x.Status == TransitStatuses.TransitTermine, ct)
            });
        }

        [HttpPost("scan")]
        public async Task<IActionResult> Scan([FromBody] TransitScanRequestDto request, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            var elevated = IsElevated();
            if (!elevated && !await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();

            var result = await _service.ScanTransitBarcodeAsync(userId.Value, elevated, request, ct);
            if (result.Success) return Ok(result);

            return result.ErrorCode switch
            {
                "BARCODE_NOT_FOUND" or "WRONG_ORDER" => NotFound(result),
                "FORBIDDEN_TRANSIT_MISSION" => Forbid(),
                _ => Conflict(result)
            };
        }

        [HttpPost("manual-status")]
        public async Task<IActionResult> ManualStatus([FromBody] ChangeTransitStatusDto request, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();
            if (!IsElevated()) return Forbid();

            var id = request.TransfertId ?? request.TransitMissionId;
            if (id == null) return BadRequest(new { errorCode = "TRANSIT_ID_REQUIRED", errorMessage = "Identifiant mission/transfert obligatoire." });

            try
            {
                var updated = await _orchestration.ChangeStatusManuallyAsync(id.Value, request, actor.Value, ct);
                return Ok(updated);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { errorCode = "TRANSIT_CONFLICT", errorMessage = ex.Message }); }
        }

        [HttpPost("scan-pickup")]
        public async Task<IActionResult> ScanPickup([FromBody] TransitScanRequest request, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            try { return Ok(await _service.ScanPickupAsync(userId.Value, request, ct)); }
            catch (KeyNotFoundException ex) { return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { errorCode = "TRANSIT_CONFLICT", errorMessage = ex.Message }); }
        }

        [HttpPost("scan-delivery")]
        public async Task<IActionResult> ScanDelivery([FromBody] TransitScanRequest request, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            try { return Ok(await _service.ScanDeliveryAsync(userId.Value, request, ct)); }
            catch (KeyNotFoundException ex) { return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { errorCode = "TRANSIT_CONFLICT", errorMessage = ex.Message }); }
        }

        private bool IsElevated() => User.IsInRole(AppRoles.SUPERVISEUR) || User.IsInRole(AppRoles.ADMIN);

        private async Task<bool> IsTransitLivreurAsync(Guid userId, CancellationToken ct)
        {
            return await _db.ProfilsUtilisateurs.AsNoTracking()
                .AnyAsync(p => p.UtilisateurId == userId && p.IsTransit && p.DepotRattacheNo != null, ct);
        }

        private Guid? CurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }
}
