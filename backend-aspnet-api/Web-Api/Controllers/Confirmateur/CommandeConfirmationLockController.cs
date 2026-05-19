using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Hubs;
using Web_Api.Services.Confirmatrice;

namespace Web_Api.Controllers.Confirmateur
{
    /// <summary>
    /// Phase 4 — endpoints du verrou visuel 15 min sur les commandes à confirmer
    /// (mécanisme A, pool FIFO). Laisse intact le GET /api/confirmateur/commandes
    /// existant ; le client combine les deux pour afficher le pool avec état de lock.
    /// Phase 5 — émet CommandePriseEnCharge / CommandeLiberee vers le groupe confirmateurs.
    /// </summary>
    [ApiController]
    [Route("api/confirmateur/commandes")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR + "," + AppRoles.ADMIN)]
    public class CommandeConfirmationLockController : ControllerBase
    {
        private readonly CommandeConfirmationLockService _locks;
        private readonly AppDbContext _db;
        private readonly IHubContext<ReclamationHub> _hub;
        private readonly ILogger<CommandeConfirmationLockController> _logger;

        public CommandeConfirmationLockController(
            CommandeConfirmationLockService locks,
            AppDbContext db,
            IHubContext<ReclamationHub> hub,
            ILogger<CommandeConfirmationLockController> logger)
        {
            _locks = locks;
            _db = db;
            _hub = hub;
            _logger = logger;
        }

        public class LockStatusDto
        {
            public string DoPiece { get; set; } = string.Empty;
            public Guid LockedByUserId { get; set; }
            public string? LockedByEmail { get; set; }
            public DateTime LockedAt { get; set; }
            public bool IsMine { get; set; }
            public int ExpiresInSeconds { get; set; }
        }

        /// <summary>
        /// Retourne les verrous actifs pour une liste de commandes (stale filtré).
        /// Utilisé par l'écran pool pour griser les lignes verrouillées par les autres confs.
        /// </summary>
        [HttpPost("locks")]
        public async Task<ActionResult<List<LockStatusDto>>> GetLocks(
            [FromBody] List<string> pieces,
            CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                var pieceSet = (pieces ?? new List<string>()).Where(p => !string.IsNullOrWhiteSpace(p))
                    .Select(p => p.Trim()).Distinct().ToList();

                var map = await _locks.GetActiveLocksAsync(pieceSet, ct);
                if (map.Count == 0) return Ok(new List<LockStatusDto>());

                var ownerIds = map.Values.Select(v => v.UserId).Distinct().ToList();
                var owners = await _db.Users.AsNoTracking()
                    .Where(u => ownerIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.Email })
                    .ToDictionaryAsync(x => x.Id, x => x.Email, ct);

                var now = DateTime.UtcNow;
                var timeoutSec = CommandeConfirmationLockService.LockTimeoutMinutes * 60;
                var result = map.Select(kv =>
                {
                    var elapsed = (int)(now - kv.Value.LockedAt).TotalSeconds;
                    return new LockStatusDto
                    {
                        DoPiece = kv.Key,
                        LockedByUserId = kv.Value.UserId,
                        LockedByEmail = owners.TryGetValue(kv.Value.UserId, out var e) ? e : null,
                        LockedAt = kv.Value.LockedAt,
                        IsMine = kv.Value.UserId == userId,
                        ExpiresInSeconds = Math.Max(0, timeoutSec - elapsed)
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetLocks failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        /// <summary>Acquiert ou renouvelle le verrou sur la commande.</summary>
        [HttpPost("{piece}/lock")]
        public async Task<ActionResult<LockStatusDto>> Lock(
            string piece, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                piece = (piece ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(piece))
                    return BadRequest(new { message = "Pièce obligatoire." });

                var result = await _locks.TryAcquireAsync(piece, userId, ct);
                if (!result.Acquired)
                {
                    var email = await _db.Users.AsNoTracking()
                        .Where(u => u.Id == result.CurrentOwner)
                        .Select(u => u.Email)
                        .FirstOrDefaultAsync(ct);
                    return Conflict(new
                    {
                        message = "Cette commande est en cours de traitement par une autre confirmatrice.",
                        lockedByUserId = result.CurrentOwner,
                        lockedByEmail = email,
                        lockedAt = result.LockedAt
                    });
                }

                var now = DateTime.UtcNow;
                var timeoutSec = CommandeConfirmationLockService.LockTimeoutMinutes * 60;

                // Phase 5 — CommandePriseEnCharge vers le groupe confirmateurs (les autres
                // grisent la ligne). L'échec de l'émission ne compromet pas le lock.
                try
                {
                    await _hub.Clients.Group(ReclamationEvents.GroupConfirmateurs)
                        .SendAsync(ReclamationEvents.CommandePriseEnCharge,
                            new { doPiece = piece, userId, lockedAt = result.LockedAt ?? now }, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "5: émission CommandePriseEnCharge échouée");
                }

                return Ok(new LockStatusDto
                {
                    DoPiece = piece,
                    LockedByUserId = userId,
                    LockedAt = result.LockedAt ?? now,
                    IsMine = true,
                    ExpiresInSeconds = timeoutSec
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lock failed");
                return StatusCode(500, new { message = "Erreur serveur : " + ex.Message });
            }
        }

        /// <summary>Libère explicitement le verrou (quitter l'écran sans transformer).</summary>
        [HttpPost("{piece}/unlock")]
        public async Task<IActionResult> Unlock(
            string piece, CancellationToken ct)
        {
            try
            {
                var userId = GetUserId();
                piece = (piece ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(piece))
                    return BadRequest(new { message = "Pièce obligatoire." });

                var released = await _locks.ReleaseAsync(piece, userId, ct);

                if (released)
                {
                    // Phase 5 — CommandeLiberee vers le groupe confirmateurs.
                    try
                    {
                        await _hub.Clients.Group(ReclamationEvents.GroupConfirmateurs)
                            .SendAsync(ReclamationEvents.CommandeLiberee,
                                new { doPiece = piece, userId, reason = "unlock" }, ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "5: émission CommandeLiberee échouée");
                    }
                }

                return Ok(new { released });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unlock failed");
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
