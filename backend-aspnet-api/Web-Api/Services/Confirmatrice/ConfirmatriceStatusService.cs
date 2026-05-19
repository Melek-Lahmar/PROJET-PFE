using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Confirmatrice;
using Web_Api.Services.Reclamations;

namespace Web_Api.Services.Confirmatrice
{
    /// <summary>
    /// Gestion de l'état de disponibilité d'une confirmatrice (phase 3A).
    /// Les flags IsOnline / IsEligible sont dérivés à la lecture, pas stockés.
    ///
    /// Phase 3C : la mise en pause libère immédiatement tous les cas actifs de la
    /// confirmatrice et les redistribue via les 3 critères en excluant l'ancienne.
    /// </summary>
    public class ConfirmatriceStatusService
    {
        /// <summary>Minutes d'inactivité au-delà desquelles la confirmatrice est considérée hors ligne.</summary>
        public const int OnlineThresholdMinutes = 10;

        private readonly AppDbContext _db;
        private readonly ReclamationsService _reclamations;
        private readonly ILogger<ConfirmatriceStatusService> _logger;

        public ConfirmatriceStatusService(
            AppDbContext db,
            ReclamationsService reclamations,
            ILogger<ConfirmatriceStatusService> logger)
        {
            _db = db;
            _reclamations = reclamations;
            _logger = logger;
        }

        public async Task<ConfirmatriceStatusDto> GetStatusAsync(Guid userId, CancellationToken ct = default)
        {
            var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);
            return BuildDto(userId, profile);
        }

        public async Task<ConfirmatriceStatusDto> PauseAsync(Guid userId, CancellationToken ct = default)
        {
            var profile = await GetOrCreateProfileAsync(userId, ct);
            profile.IsInPause = true;
            profile.DateModification = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            // Phase 3C — libération immédiate des cas actifs + redistribution.
            // Exécuté après SaveChanges pour que FindEligibleConfirmatriceAsync voie bien
            // IsInPause=true et exclue la conf qui vient de se mettre en pause.
            try
            {
                var released = await _reclamations
                    .ReleaseActiveCasesForUserAsync(userId, reason: "pause", ct);
                if (released > 0)
                {
                    _logger.LogInformation(
                        "3C: pause user={UserId} → {Count} cas libérés et redistribués",
                        userId, released);
                }
            }
            catch (Exception ex)
            {
                // Ne pas faire échouer la mise en pause si la redistribution a un souci.
                // Le scan 5 min rattrapera les cas orphelins.
                _logger.LogWarning(ex,
                    "3C: échec libération immédiate pour user={UserId} — sera rattrapé par le scan",
                    userId);
            }

            return BuildDto(userId, profile);
        }

        public async Task<ConfirmatriceStatusDto> ResumeAsync(Guid userId, CancellationToken ct = default)
        {
            var profile = await GetOrCreateProfileAsync(userId, ct);
            profile.IsInPause = false;
            profile.DateModification = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return BuildDto(userId, profile);
        }

        private async Task<ProfilUtilisateur> GetOrCreateProfileAsync(Guid userId, CancellationToken ct)
        {
            var profile = await _db.ProfilsUtilisateurs
                .FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);
            if (profile != null) return profile;

            // Robustesse : si la conf. n'a pas de profil (cas improbable avec le seed),
            // on en crée un minimal pour permettre le toggle pause.
            profile = new ProfilUtilisateur
            {
                UtilisateurId = userId,
                TypeProfil = TypeProfil.Employe,
                DateCreation = DateTime.UtcNow,
                DateModification = DateTime.UtcNow
            };
            _db.ProfilsUtilisateurs.Add(profile);
            return profile;
        }

        private static ConfirmatriceStatusDto BuildDto(Guid userId, ProfilUtilisateur? profile)
        {
            var isInPause = profile?.IsInPause ?? false;
            var lastActivity = profile?.LastActivityAt;
            var lastAssignment = profile?.LastAssignmentAt;
            var isOnline =
                lastActivity.HasValue &&
                (DateTime.UtcNow - lastActivity.Value) <= TimeSpan.FromMinutes(OnlineThresholdMinutes);
            var isEligible = isOnline && !isInPause;

            return new ConfirmatriceStatusDto
            {
                UserId = userId,
                IsInPause = isInPause,
                LastActivityAt = lastActivity,
                LastAssignmentAt = lastAssignment,
                IsOnline = isOnline,
                IsEligible = isEligible,
                OnlineThresholdMinutes = OnlineThresholdMinutes
            };
        }
    }
}
