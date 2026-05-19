using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.DTO.Confirmatrice;
using Web_Api.Services.Confirmatrice;

namespace Web_Api.Controllers.Confirmateur
{
    /// <summary>
    /// Endpoints d'état de disponibilité de la confirmatrice (phase 3A).
    /// Utilisés par l'app confirmatrice pour se mettre en pause, en reprendre,
    /// et vérifier son état courant.
    /// Phase 9 : endpoint de stats pour la section Profil (4e section).
    /// </summary>
    [ApiController]
    [Route("api/confirmateur/status")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR + "," + AppRoles.ADMIN)]
    public class ConfirmatriceStatusController : ControllerBase
    {
        private readonly ConfirmatriceStatusService _service;
        private readonly AppDbContext _db;
        private readonly ILogger<ConfirmatriceStatusController> _logger;

        public ConfirmatriceStatusController(
            ConfirmatriceStatusService service,
            AppDbContext db,
            ILogger<ConfirmatriceStatusController> logger)
        {
            _service = service;
            _db = db;
            _logger = logger;
        }

        [HttpGet("me")]
        public async Task<ActionResult<ConfirmatriceStatusDto>> GetMyStatus(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var status = await _service.GetStatusAsync(userId, ct);
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyStatus failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("pause")]
        public async Task<ActionResult<ConfirmatriceStatusDto>> Pause(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var status = await _service.PauseAsync(userId, ct);
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Pause failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        [HttpPost("resume")]
        public async Task<ActionResult<ConfirmatriceStatusDto>> Resume(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var status = await _service.ResumeAsync(userId, ct);
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Resume failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        /// <summary>
        /// Phase 9 — Statistiques personnelles pour la section Profil de l'app conf.
        /// Retourne les compteurs utiles : cas actifs, clôturés du jour / semaine / mois.
        /// </summary>
        [HttpGet("me/stats")]
        public async Task<IActionResult> GetMyStats(CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var now = DateTime.UtcNow;
                var today = now.Date;
                var weekStart = today.AddDays(-(int)today.DayOfWeek);
                var monthStart = new DateTime(today.Year, today.Month, 1);

                var active = await _db.F_RECLAMATIONS.AsNoTracking()
                    .CountAsync(r => r.AssignedToUserId == userId
                        && (r.Statut == ReclamationStatuses.ENVOYEE
                            || r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT), ct);

                var closedToday = await _db.F_RECLAMATIONS.AsNoTracking()
                    .CountAsync(r => r.AssignedToUserId == userId
                        && r.ClosedAt != null && r.ClosedAt >= today, ct);

                var closedThisWeek = await _db.F_RECLAMATIONS.AsNoTracking()
                    .CountAsync(r => r.AssignedToUserId == userId
                        && r.ClosedAt != null && r.ClosedAt >= weekStart, ct);

                var closedThisMonth = await _db.F_RECLAMATIONS.AsNoTracking()
                    .CountAsync(r => r.AssignedToUserId == userId
                        && r.ClosedAt != null && r.ClosedAt >= monthStart, ct);

                var status = await _service.GetStatusAsync(userId, ct);

                return Ok(new
                {
                    active,
                    closedToday,
                    closedThisWeek,
                    closedThisMonth,
                    isInPause = status.IsInPause,
                    isOnline = status.IsOnline,
                    lastActivityAt = status.LastActivityAt,
                    lastAssignmentAt = status.LastAssignmentAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyStats failed");
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
