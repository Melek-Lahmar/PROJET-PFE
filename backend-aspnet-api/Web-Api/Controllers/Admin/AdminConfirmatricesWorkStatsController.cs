using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Admin;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// A.2 — Statistiques temps de travail / temps de pause par confirmatrice
    /// sur une période arbitraire (date + heure début → date + heure fin).
    /// </summary>
    [ApiController]
    [Route("api/admin/confirmatrices/work-stats")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminConfirmatricesWorkStatsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminConfirmatricesWorkStatsController(
            AppDbContext db,
            UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<AdminConfirmatricesWorkStatsDto>> Get(
            [FromQuery] DateTime from,
            [FromQuery] DateTime to,
            CancellationToken ct)
        {
            if (from >= to)
            {
                return BadRequest(new { message = "Le champ 'from' doit être strictement avant 'to'." });
            }

            // Normalise en UTC (l'horloge DB est en UTC partout).
            var fromUtc = from.Kind == DateTimeKind.Utc ? from : from.ToUniversalTime();
            var toUtc = to.Kind == DateTimeKind.Utc ? to : to.ToUniversalTime();
            var nowUtc = DateTime.UtcNow;

            var expectedMinutes = (toUtc - fromUtc).TotalMinutes;

            // 1) Liste des confirmatrices : tous les utilisateurs avec le rôle.
            var confirmatricesIds = await (
                from u in _db.Users
                join ur in _db.UserRoles on u.Id equals ur.UserId
                join r in _db.Roles on ur.RoleId equals r.Id
                where r.Name == AppRoles.CONFIRMATEUR
                select u.Id
            ).ToListAsync(ct);

            if (confirmatricesIds.Count == 0)
            {
                return Ok(new AdminConfirmatricesWorkStatsDto
                {
                    Period = new AdminConfirmatricesWorkStatsPeriodDto
                    {
                        From = fromUtc,
                        To = toUtc,
                    },
                    Confirmatrices = new List<AdminConfirmatriceWorkStatsItemDto>(),
                });
            }

            // 2) Profils + statut online courant
            var profils = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId != null
                            && confirmatricesIds.Contains(p.UtilisateurId.Value))
                .ToListAsync(ct);

            // 3) Sessions chevauchant la période
            var sessions = await _db.F_CONFIRMATRICE_SESSIONS.AsNoTracking()
                .Where(s =>
                    confirmatricesIds.Contains(s.ConfirmatriceId)
                    && s.StartedAt < toUtc
                    && (s.EndedAt == null || s.EndedAt > fromUtc))
                .ToListAsync(ct);

            // 4) Cas clos sur la période + cas en cours actuellement
            var reclamationsAgg = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId != null
                            && confirmatricesIds.Contains(r.AssignedToUserId.Value))
                .GroupBy(r => r.AssignedToUserId!.Value)
                .Select(g => new
                {
                    UserId = g.Key,
                    InProgress = g.Count(r => r.Statut == "EN_COURS_DE_TRAITEMENT"),
                    ClosedInPeriod = g.Count(r =>
                        (r.Statut == "CLOTUREE" || r.Statut == "REFUSEE")
                        && r.UpdatedAt >= fromUtc && r.UpdatedAt <= toUtc),
                })
                .ToDictionaryAsync(x => x.UserId, ct);

            // 5) Construit chaque ligne
            var items = new List<AdminConfirmatriceWorkStatsItemDto>();
            foreach (var uid in confirmatricesIds)
            {
                // Total minutes travaillées sur la période (overlap).
                double workMinutes = 0;
                bool isOnline = false;
                foreach (var s in sessions.Where(x => x.ConfirmatriceId == uid))
                {
                    var start = s.StartedAt < fromUtc ? fromUtc : s.StartedAt;
                    var end = s.EndedAt ?? nowUtc;
                    if (end > toUtc) end = toUtc;
                    if (end <= start) continue;
                    workMinutes += (end - start).TotalMinutes;
                    if (s.EndedAt == null) isOnline = true;
                }
                workMinutes = Math.Min(workMinutes, expectedMinutes);
                var pauseMinutes = Math.Max(0, expectedMinutes - workMinutes);
                var pauseRate = expectedMinutes > 0
                    ? (pauseMinutes / expectedMinutes) * 100.0
                    : 0;

                var profil = profils.FirstOrDefault(p => p.UtilisateurId == uid);
                reclamationsAgg.TryGetValue(uid, out var agg);

                items.Add(new AdminConfirmatriceWorkStatsItemDto
                {
                    Id = uid,
                    Nom = profil?.NomComplet ?? "—",
                    Telephone = profil?.Telephone,
                    Gouvernorat = profil?.Gouvernorat.ToString(),
                    IsOnline = isOnline,
                    CurrentLoad = agg?.InProgress ?? 0,
                    CasCloturees = agg?.ClosedInPeriod ?? 0,
                    WorkMinutes = (int)Math.Round(workMinutes),
                    PauseMinutes = (int)Math.Round(pauseMinutes),
                    PauseRatePercent = Math.Round(pauseRate, 1),
                });
            }

            // Trie par charge décroissante (les plus chargées en haut).
            items = items
                .OrderByDescending(i => i.CurrentLoad)
                .ThenByDescending(i => i.CasCloturees)
                .ToList();

            return Ok(new AdminConfirmatricesWorkStatsDto
            {
                Period = new AdminConfirmatricesWorkStatsPeriodDto
                {
                    From = fromUtc,
                    To = toUtc,
                },
                Confirmatrices = items,
            });
        }
    }
}
