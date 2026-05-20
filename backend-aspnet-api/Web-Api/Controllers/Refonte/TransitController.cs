// backend-aspnet-api/Web-Api/Controllers/Refonte/TransitController.cs

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

        /// Fenêtre d'annulation d'un scan accidentel (en minutes).
        private const int RevertWindowMinutes = 10;

        private readonly AppDbContext _db;
        private readonly IStockTransferService _service;
        private readonly ITransitOrchestrationService _orchestration;
        private readonly ILogger<TransitController> _logger;

        public TransitController(
            AppDbContext db,
            IStockTransferService service,
            ITransitOrchestrationService orchestration,
            ILogger<TransitController> logger)
        {
            _db           = db;
            _service      = service;
            _orchestration = orchestration;
            _logger       = logger;
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/transit/my-missions
        // Liste toutes les missions du livreur-transit connecté.
        // Les superviseurs/admins voient toutes les missions (300 dernières).
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/transit/my-missions/{id}
        // Détail d'une mission. Le livreur-transit ne peut voir que les siennes.
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("my-missions/{id:guid}")]
        public async Task<IActionResult> MyMission(Guid id, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            var item = await _service.GetMissionForActorAsync(
                id, userId.Value, IsElevated(), ct);

            if (item == null)
                return NotFound(new
                {
                    errorCode    = "TRANSIT_NOT_FOUND",
                    errorMessage = "Mission transit introuvable."
                });

            return Ok(item);
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/transit/pending
        // Missions en attente (EN_ATTENTE_TRANSIT / EN_ATTENTE_AFFECTATION).
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("pending")]
        public async Task<IActionResult> Pending(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            return Ok(await _service.PendingAsync(userId.Value, ct));
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/transit/in-progress
        // Missions en cours (EN_TRANSIT / EN_COURS_TRANSIT).
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("in-progress")]
        public async Task<IActionResult> InProgress(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();
            return Ok(await _service.InProgressAsync(userId.Value, ct));
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/transit/history
        // Missions terminées (RECU_AU_DEPOT / RECU_DEPOT_DESTINE / TRANSIT_TERMINE / ANNULE).
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("history")]
        public async Task<IActionResult> History(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();

            var items = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.TransitLivreurUserId == userId.Value
                         && FinishedStatuses.Contains(x.Status))
                .OrderByDescending(x => x.DeliveredAt ?? x.AffectedAt)
                .Take(100)
                .ToListAsync(ct);

            return Ok(items);
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/transit/stats/personal
        // Statistiques personnelles du livreur-transit.
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("stats/personal")]
        public async Task<IActionResult> PersonalStats(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();

            var query = _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.TransitLivreurUserId == userId.Value);

            return Ok(new
            {
                pending = await query.CountAsync(
                    x => x.Status == TransitStatuses.EnAttenteTransit
                      || x.Status == TransitStatuses.EnAttenteAffectationTransit, ct),

                inProgress = await query.CountAsync(
                    x => x.Status == TransitStatuses.EnTransit
                      || x.Status == TransitStatuses.EnCoursTransit, ct),

                completed = await query.CountAsync(
                    x => x.Status == TransitStatuses.RecuAuDepot
                      || x.Status == TransitStatuses.RecuDepotDestine
                      || x.Status == TransitStatuses.TransitTermine, ct)
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/transit/scan
        // Scan générique : le service détecte automatiquement si c'est un
        // pickup (statut EN_ATTENTE) ou une livraison (statut EN_TRANSIT).
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("scan")]
        public async Task<IActionResult> Scan(
            [FromBody] TransitScanRequestDto request,
            CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            var elevated = IsElevated();
            if (!elevated && !await IsTransitLivreurAsync(userId.Value, ct))
                return Forbid();

            var result = await _service.ScanTransitBarcodeAsync(
                userId.Value, elevated, request, ct);

            if (result.Success) return Ok(result);

            return result.ErrorCode switch
            {
                "BARCODE_NOT_FOUND" or "WRONG_ORDER" => NotFound(result),
                "FORBIDDEN_TRANSIT_MISSION"           => Forbid(),
                _                                     => Conflict(result)
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/transit/scan-pickup
        // Premier scan : prise en charge au dépôt source.
        // Passe le transfert à EN_TRANSIT et enregistre PickedUpAt + GPS.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("scan-pickup")]
        public async Task<IActionResult> ScanPickup(
            [FromBody] TransitScanRequest request,
            CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();

            try
            {
                return Ok(await _service.ScanPickupAsync(userId.Value, request, ct));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { errorCode = "TRANSIT_CONFLICT", errorMessage = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/transit/scan-delivery
        // Deuxième scan : réception au dépôt destination.
        // Passe le transfert à RECU_DEPOT_DESTINE et enregistre DeliveredAt + GPS.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("scan-delivery")]
        public async Task<IActionResult> ScanDelivery(
            [FromBody] TransitScanRequest request,
            CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (!await IsTransitLivreurAsync(userId.Value, ct)) return Forbid();

            try
            {
                return Ok(await _service.ScanDeliveryAsync(userId.Value, request, ct));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { errorCode = "TRANSIT_CONFLICT", errorMessage = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/transit/my-missions/{id}/revert-pickup
        //
        // Annule un scan de pickup accidentel et remet la mission à
        // EN_ATTENTE_TRANSIT. Accessible uniquement au livreur-transit
        // propriétaire. Fenêtre d'annulation : RevertWindowMinutes (10 min).
        // Au-delà → seul le superviseur peut intervenir via manual-status.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("my-missions/{id:guid}/revert-pickup")]
        public async Task<IActionResult> RevertPickup(
            Guid id,
            [FromBody] RevertPickupRequest request,
            CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            // Seul un livreur-transit peut appeler cet endpoint
            if (!await IsTransitLivreurAsync(userId.Value, ct))
                return Forbid();

            var transfert = await _db.F_TRANSFERTS
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (transfert == null)
                return NotFound(new
                {
                    errorCode    = "TRANSIT_NOT_FOUND",
                    errorMessage = "Mission transit introuvable."
                });

            // La mission doit appartenir à ce livreur
            if (transfert.TransitLivreurUserId != userId.Value)
                return StatusCode(403, new
                {
                    errorCode    = "FORBIDDEN_TRANSIT_MISSION",
                    errorMessage = "Cette mission n'est pas affectée à ce livreur."
                });

            // Seul EN_TRANSIT peut être annulé
            var isInTransit =
                transfert.Status == TransitStatuses.EnTransit ||
                transfert.Status == TransitStatuses.EnCoursTransit;

            if (!isInTransit)
                return Conflict(new
                {
                    errorCode    = "INVALID_STATUS_FOR_REVERT",
                    errorMessage = $"Impossible d'annuler : statut actuel '{transfert.Status}'. " +
                                   "Seul EN_TRANSIT est annulable."
                });

            // Vérification fenêtre de 10 minutes
            if (transfert.PickedUpAt.HasValue)
            {
                var elapsed = DateTime.UtcNow - transfert.PickedUpAt.Value;
                if (elapsed.TotalMinutes > RevertWindowMinutes)
                    return Conflict(new
                    {
                        errorCode    = "REVERT_WINDOW_EXPIRED",
                        errorMessage = $"La fenêtre d'annulation de {RevertWindowMinutes} min " +
                                       "est dépassée. Contactez votre superviseur."
                    });
            }

            // Justification obligatoire
            var justification = (request?.Justification ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(justification))
                return BadRequest(new
                {
                    errorCode    = "JUSTIFICATION_REQUIRED",
                    errorMessage = "Une justification est obligatoire pour annuler un scan."
                });

            // Snapshot avant modification
            var before = System.Text.Json.JsonSerializer.Serialize(transfert);

            // Retour à EN_ATTENTE_TRANSIT + reset PickedUpAt
            transfert.Status     = TransitStatuses.EnAttenteTransit;
            transfert.PickedUpAt = null;
            transfert.Version++;

            _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
            {
                TransfertId    = transfert.Id,
                ActionType     = "LIVREUR_REVERT_PICKUP",
                ActorUserId    = userId.Value,
                SnapshotBefore = before,
                SnapshotAfter  = System.Text.Json.JsonSerializer.Serialize(transfert),
                Motif          = $"Scan annulé par livreur-transit : {justification}",
                OccurredAt     = DateTime.UtcNow
            });

            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Transit revert-pickup: id={Id} livreur={UserId} justification={Just}",
                id, userId.Value, justification);

            return Ok(new
            {
                missionId  = transfert.Id,
                newStatus  = transfert.Status,
                message    = "Scan annulé. La mission est revenue à EN_ATTENTE_TRANSIT.",
                revertedAt = DateTime.UtcNow
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/transit/manual-status
        // Changement manuel de statut — réservé au superviseur et admin.
        // Le livreur-transit NE peut PAS appeler cet endpoint.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("manual-status")]
        public async Task<IActionResult> ManualStatus(
            [FromBody] ChangeTransitStatusDto request,
            CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();
            if (!IsElevated()) return Forbid();

            var id = request.TransfertId ?? request.TransitMissionId;
            if (id == null)
                return BadRequest(new
                {
                    errorCode    = "TRANSIT_ID_REQUIRED",
                    errorMessage = "Identifiant mission/transfert obligatoire."
                });

            try
            {
                var updated = await _orchestration.ChangeStatusManuallyAsync(
                    id.Value, request, actor.Value, ct);
                return Ok(updated);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { errorCode = "TRANSIT_CONFLICT", errorMessage = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Helpers privés
        // ─────────────────────────────────────────────────────────────────────

        /// Retourne true si l'utilisateur est SUPERVISEUR ou ADMIN.
        private bool IsElevated() =>
            User.IsInRole(AppRoles.SUPERVISEUR) || User.IsInRole(AppRoles.ADMIN);

        /// Retourne true si l'utilisateur est un livreur-transit valide
        /// (IsTransit = true ET DepotRattacheNo renseigné).
        private async Task<bool> IsTransitLivreurAsync(Guid userId, CancellationToken ct) =>
            await _db.ProfilsUtilisateurs.AsNoTracking()
                .AnyAsync(p => p.UtilisateurId == userId
                            && p.IsTransit
                            && p.DepotRattacheNo != null, ct);

        /// Extrait le GUID de l'utilisateur depuis les claims JWT.
        private Guid? CurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DTO pour le endpoint revert-pickup
    // À placer dans Web-Api/DTO/Refonte/RevertPickupRequest.cs
    // (ou dans le fichier DTO existant des autres DTOs transit)
    // ─────────────────────────────────────────────────────────────────────────
    public class RevertPickupRequest
    {
        /// Raison de l'annulation — obligatoire (tracée dans l'audit log).
        public string? Justification { get; set; }
    }
}
