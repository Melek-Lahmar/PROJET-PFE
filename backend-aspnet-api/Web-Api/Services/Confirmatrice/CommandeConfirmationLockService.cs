using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Services.Confirmatrice
{
    /// <summary>
    /// Phase 4 — Gestion du verrou visuel 15 min sur les commandes à confirmer.
    /// Règles :
    ///   - Une commande ne peut être verrouillée que par UNE confirmatrice à la fois.
    ///   - Le verrou expire après 15 min sans activité. Un verrou stale est libéré
    ///     automatiquement au prochain appel qui le rencontre.
    ///   - Prendre un verrou déjà détenu par soi-même = renouvellement (LockedAt = now).
    ///   - Pas d'auto-affectation, pas de score. Pool FIFO classique côté lecture.
    /// </summary>
    public class CommandeConfirmationLockService
    {
        public const int LockTimeoutMinutes = 15;

        private readonly AppDbContext _db;
        private readonly ILogger<CommandeConfirmationLockService> _logger;

        public CommandeConfirmationLockService(
            AppDbContext db,
            ILogger<CommandeConfirmationLockService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public record LockResult(bool Acquired, Guid? CurrentOwner, DateTime? LockedAt);

        /// <summary>
        /// Tente d'acquérir ou de renouveler le verrou sur <paramref name="piece"/>.
        /// Acquisition succès si : aucun verrou, verrou stale (> 15 min), ou verrou déjà à soi.
        /// Sinon retourne le propriétaire actuel.
        /// </summary>
        public async Task<LockResult> TryAcquireAsync(
            string piece, Guid userId, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var cutoff = now.Subtract(TimeSpan.FromMinutes(LockTimeoutMinutes));

            var existing = await _db.CommandeConfirmationLocks
                .FirstOrDefaultAsync(l => l.DoPiece == piece, ct);

            if (existing == null)
            {
                _db.CommandeConfirmationLocks.Add(new CommandeConfirmationLock
                {
                    DoPiece = piece,
                    LockedByUserId = userId,
                    LockedAt = now
                });
                await _db.SaveChangesAsync(ct);
                _logger.LogInformation("4: lock acquis piece={Piece} user={User}", piece, userId);
                return new LockResult(true, userId, now);
            }

            // Déjà détenu par quelqu'un d'autre ET pas stale → refus.
            if (existing.LockedByUserId != userId && existing.LockedAt >= cutoff)
            {
                return new LockResult(false, existing.LockedByUserId, existing.LockedAt);
            }

            // Stale OU déjà à soi → on renouvelle (ou on reprend).
            var wasStaleFrom = existing.LockedByUserId != userId ? existing.LockedByUserId : (Guid?)null;
            existing.LockedByUserId = userId;
            existing.LockedAt = now;
            await _db.SaveChangesAsync(ct);

            if (wasStaleFrom.HasValue)
                _logger.LogInformation(
                    "4: lock stale repris piece={Piece} ancien={Old} nouveau={New}",
                    piece, wasStaleFrom, userId);
            else
                _logger.LogDebug("4: lock renouvelé piece={Piece} user={User}", piece, userId);

            return new LockResult(true, userId, now);
        }

        /// <summary>
        /// Libère explicitement le verrou. N'agit que si le verrou appartient à userId.
        /// Retourne true si une ligne a été supprimée.
        /// </summary>
        public async Task<bool> ReleaseAsync(
            string piece, Guid userId, CancellationToken ct = default)
        {
            var affected = await _db.CommandeConfirmationLocks
                .Where(l => l.DoPiece == piece && l.LockedByUserId == userId)
                .ExecuteDeleteAsync(ct);

            if (affected > 0)
                _logger.LogInformation("4: lock libéré piece={Piece} user={User}", piece, userId);

            return affected > 0;
        }

        /// <summary>
        /// Libération forcée (sans vérifier l'owner). Utilisée quand la commande passe en BL
        /// ou à la suite d'un autre évènement terminal côté confirmatrice.
        /// </summary>
        public async Task ReleaseAnyAsync(string piece, CancellationToken ct = default)
        {
            await _db.CommandeConfirmationLocks
                .Where(l => l.DoPiece == piece)
                .ExecuteDeleteAsync(ct);
        }

        /// <summary>
        /// Retourne l'état des verrous pour une liste de commandes. Les verrous stale
        /// sont filtrés (non retournés). Utilisé par le pool FIFO pour afficher l'état.
        /// </summary>
        public async Task<Dictionary<string, (Guid UserId, DateTime LockedAt)>> GetActiveLocksAsync(
            IReadOnlyCollection<string> pieces, CancellationToken ct = default)
        {
            if (pieces.Count == 0)
                return new Dictionary<string, (Guid, DateTime)>();

            var cutoff = DateTime.UtcNow.Subtract(TimeSpan.FromMinutes(LockTimeoutMinutes));

            var locks = await _db.CommandeConfirmationLocks.AsNoTracking()
                .Where(l => pieces.Contains(l.DoPiece) && l.LockedAt >= cutoff)
                .ToListAsync(ct);

            return locks.ToDictionary(
                l => l.DoPiece,
                l => (l.LockedByUserId, l.LockedAt));
        }
    }
}
