using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Refonte;
using Web_Api.Geo;
using Web_Api.Model;
using Web_Api.Services.Refonte;

namespace Web_Api.Controllers.Refonte
{
    [ApiController]
    [Route("api/supervisor")]
    [Authorize(Policy = "RequireSupervisor")]
    public sealed class SupervisorController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _users;
        private readonly ISupervisorAlertService _alerts;
        private readonly ITransitOrchestrationService _orchestration;

        public SupervisorController(
            AppDbContext db,
            UserManager<ApplicationUser> users,
            ISupervisorAlertService alerts,
            ITransitOrchestrationService orchestration)
        {
            _db = db;
            _users = users;
            _alerts = alerts;
            _orchestration = orchestration;
        }

        /// <summary>
        /// Liste opérationnelle de tous les livreurs. Le superviseur y voit les livreurs classiques
        /// et les livreurs-transit. Un livreur-transit reste Role=LIVREUR + IsTransit=true.
        /// </summary>
        [HttpGet("livreurs")]
        public async Task<IActionResult> Livreurs(CancellationToken ct)
        {
            var livreurs = await _users.GetUsersInRoleAsync(AppRoles.LIVREUR);
            var ids = livreurs.Select(x => x.Id).ToArray();

            var profils = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(x => x.UtilisateurId != null && ids.Contains(x.UtilisateurId.Value))
                .ToListAsync(ct);

            var zones = await _db.F_LIVREUR_ZONES.AsNoTracking()
                .Where(x => ids.Contains(x.LivreurUserId))
                .OrderBy(x => x.Gouvernorat)
                .ThenBy(x => x.Delegation)
                .ToListAsync(ct);

            var depots = await _db.F_DEPOTS.AsNoTracking().ToDictionaryAsync(x => x.DE_No, ct);

            return Ok(livreurs.Select(u =>
            {
                var p = profils.FirstOrDefault(x => x.UtilisateurId == u.Id);
                var depotName = p?.DepotRattacheNo != null && depots.TryGetValue(p.DepotRattacheNo.Value, out var depot)
                    ? depot.DE_Intitule ?? $"Dépôt {p.DepotRattacheNo.Value}"
                    : null;

                return new
                {
                    id = u.Id,
                    email = u.Email,
                    fullName = p?.NomComplet ?? u.Email,
                    telephone = p?.Telephone,
                    gouvernorat = p?.Gouvernorat?.ToString(),
                    gouvernoratId = p?.Gouvernorat != null ? (int)p.Gouvernorat.Value : (int?)null,
                    delegation = p?.Delegation,
                    isTransit = p?.IsTransit ?? false,
                    depotRattacheNo = p?.DepotRattacheNo,
                    depotRattacheName = depotName,
                    zones = zones.Where(z => z.LivreurUserId == u.Id)
                        .Select(z => new { z.Gouvernorat, z.Delegation })
                        .ToArray()
                };
            }));
        }

        /// <summary>
        /// Création d'un livreur depuis l'espace superviseur. Le superviseur ne crée que des comptes Role=LIVREUR.
        /// IsTransit=true signifie livreur-transit et impose un dépôt rattaché.
        /// </summary>
        [HttpPost("livreurs")]
        public async Task<IActionResult> CreateLivreur([FromBody] SupervisorCreateLivreurRequest request, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();

            var email = (request.Email ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(email)) return BadRequest(new { errorCode = "EMAIL_REQUIRED", errorMessage = "Email obligatoire." });
            if (await _users.FindByEmailAsync(email) != null)
                return Conflict(new { errorCode = "EMAIL_ALREADY_USED", errorMessage = "Un utilisateur existe déjà avec cet email." });
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                return BadRequest(new { errorCode = "PASSWORD_INVALID", errorMessage = "Mot de passe obligatoire, 6 caractères minimum." });

            var gouvernorat = ParseGouvernorat(request.Gouvernorat);
            if (gouvernorat == null) return BadRequest(new { errorCode = "GOUVERNORAT_INVALID", errorMessage = "Gouvernorat invalide." });
            if (!TunisieDecoupage.IsDelegationValide(gouvernorat.Value, request.Delegation))
                return BadRequest(new { errorCode = "DELEGATION_INVALID", errorMessage = "La délégation ne correspond pas au gouvernorat choisi." });
            if (request.IsTransit && request.DepotRattacheNo == null)
                return BadRequest(new { errorCode = "DEPOT_REQUIRED", errorMessage = "Un livreur-transit doit être rattaché à un dépôt." });

            var user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            var create = await _users.CreateAsync(user, request.Password);
            if (!create.Succeeded) return BadRequest(new { errorCode = "USER_CREATE_FAILED", errors = create.Errors });

            var addRole = await _users.AddToRoleAsync(user, AppRoles.LIVREUR);
            if (!addRole.Succeeded) return BadRequest(new { errorCode = "ROLE_ASSIGN_FAILED", errors = addRole.Errors });

            var profile = new ProfilUtilisateur
            {
                UtilisateurId = user.Id,
                TypeProfil = TypeProfil.Employe,
                NomComplet = request.NomComplet,
                Telephone = request.Telephone,
                Gouvernorat = gouvernorat.Value,
                Delegation = TunisieDecoupage.NormalizeDelegation(request.Delegation),
                Adresse = "Adresse livreur",
                Pays = "Tunisie",
                Poste = request.IsTransit ? "Livreur Transit" : "Livreur",
                IsTransit = request.IsTransit,
                DepotRattacheNo = request.DepotRattacheNo,
                CodeDepot = request.DepotRattacheNo?.ToString(),
                ZoneLivraison = request.IsTransit ? "TRANSIT" : "ZONE",
                DateCreation = DateTime.UtcNow,
                DateModification = DateTime.UtcNow
            };

            _db.ProfilsUtilisateurs.Add(profile);
            await _db.SaveChangesAsync(ct);

            if (!request.IsTransit)
            {
                var zones = request.Zones.Count > 0
                    ? request.Zones
                    : new List<LivreurZoneInput> { new() { Gouvernorat = gouvernorat.Value.ToString(), Delegation = request.Delegation } };
                await ReplaceZonesInternalAsync(user.Id, zones, actor.Value, ct);
            }

            return Ok(new { id = user.Id, email = user.Email, isTransit = profile.IsTransit, depotRattacheNo = profile.DepotRattacheNo });
        }

        /// <summary>
        /// Mise à jour opérationnelle d'un livreur : identité affichée, zone principale,
        /// statut transit, dépôt rattaché et zones classiques.
        /// </summary>
        [HttpPut("livreurs/{id:guid}")]
        public async Task<IActionResult> UpdateLivreur(Guid id, [FromBody] SupervisorUpdateLivreurRequest request, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();

            var user = await _users.FindByIdAsync(id.ToString());
            if (user == null) return NotFound(new { errorCode = "LIVREUR_NOT_FOUND", errorMessage = "Livreur introuvable." });

            var roles = await _users.GetRolesAsync(user);
            if (!roles.Contains(AppRoles.LIVREUR))
                return BadRequest(new { errorCode = "NOT_LIVREUR", errorMessage = "Le superviseur ne peut gérer que des utilisateurs ayant le rôle LIVREUR." });

            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == id, ct);
            if (profile == null)
            {
                profile = new ProfilUtilisateur { UtilisateurId = id, TypeProfil = TypeProfil.Employe, DateCreation = DateTime.UtcNow };
                _db.ProfilsUtilisateurs.Add(profile);
            }

            if (request.Gouvernorat.HasValue)
            {
                var gov = ParseGouvernorat(request.Gouvernorat.Value);
                if (gov == null) return BadRequest(new { errorCode = "GOUVERNORAT_INVALID", errorMessage = "Gouvernorat invalide." });
                if (!string.IsNullOrWhiteSpace(request.Delegation) && !TunisieDecoupage.IsDelegationValide(gov.Value, request.Delegation))
                    return BadRequest(new { errorCode = "DELEGATION_INVALID", errorMessage = "La délégation ne correspond pas au gouvernorat choisi." });
                profile.Gouvernorat = gov.Value;
            }

            if (!string.IsNullOrWhiteSpace(request.Delegation))
                profile.Delegation = TunisieDecoupage.NormalizeDelegation(request.Delegation);
            if (request.NomComplet != null) profile.NomComplet = request.NomComplet.Trim();
            if (request.Telephone != null) profile.Telephone = request.Telephone.Trim();
            if (request.IsTransit.HasValue) profile.IsTransit = request.IsTransit.Value;
            if (profile.IsTransit && !request.DepotRattacheNo.HasValue)
                return BadRequest(new { errorCode = "DEPOT_REQUIRED", errorMessage = "Un livreur-transit doit être rattaché à un dépôt." });
            profile.DepotRattacheNo = profile.IsTransit ? request.DepotRattacheNo : null;
            profile.CodeDepot = profile.DepotRattacheNo?.ToString();
            profile.Poste = profile.IsTransit ? "Livreur Transit" : "Livreur";
            profile.ZoneLivraison = profile.IsTransit ? "TRANSIT" : "ZONE";
            profile.DateModification = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            if (!profile.IsTransit && request.Zones != null)
                await ReplaceZonesInternalAsync(id, request.Zones, actor.Value, ct);
            if (profile.IsTransit)
                await ReplaceZonesInternalAsync(id, new List<LivreurZoneInput>(), actor.Value, ct);

            return NoContent();
        }

        [HttpPut("livreurs/{id:guid}/zones")]
        public async Task<IActionResult> ReplaceZones(Guid id, [FromBody] AssignLivreurZonesRequest request, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();
            await ReplaceZonesInternalAsync(id, request.Zones, actor.Value, ct);
            return Ok(new { message = "Zones livreur remplacées.", count = request.Zones.Count });
        }

        [HttpGet("dashboard/stats")]
        public async Task<IActionResult> DashboardStats(CancellationToken ct)
        {
            return Ok(new
            {
                pending = await _db.F_TRANSFERTS.CountAsync(x => x.Status == TransitStatuses.EnAttenteTransit || x.Status == TransitStatuses.EnAttenteAffectationTransit, ct),
                inProgress = await _db.F_TRANSFERTS.CountAsync(x => x.Status == TransitStatuses.EnTransit || x.Status == TransitStatuses.EnCoursTransit, ct),
                receivedToday = await _db.F_TRANSFERTS.CountAsync(x => (x.Status == TransitStatuses.RecuAuDepot || x.Status == TransitStatuses.RecuDepotDestine || x.Status == TransitStatuses.TransitTermine) && x.DeliveredAt >= DateTime.UtcNow.Date, ct),
                blocked24h = await _db.F_TRANSFERTS.CountAsync(x => (x.Status == TransitStatuses.EnAttenteTransit || x.Status == TransitStatuses.EnAttenteAffectationTransit) && x.AffectedAt < DateTime.UtcNow.AddHours(-24), ct)
            });
        }

        [HttpGet("transferts")]
        [HttpGet("transit-missions")]
        public async Task<IActionResult> Transferts([FromQuery] string? status, CancellationToken ct)
        {
            var query = _db.F_TRANSFERTS.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
            return Ok(await query.OrderByDescending(x => x.AffectedAt).Take(300).ToListAsync(ct));
        }

        [HttpGet("transit-missions/{id:guid}")]
        public async Task<IActionResult> TransitMission(Guid id, CancellationToken ct)
        {
            var transfert = await _db.F_TRANSFERTS.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (transfert == null) return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = "Transfert introuvable." });

            var logs = await _db.F_TRANSFERT_AUDIT_LOGS.AsNoTracking()
                .Where(x => x.TransfertId == id)
                .OrderByDescending(x => x.OccurredAt)
                .Take(100)
                .ToListAsync(ct);

            return Ok(new { transfert, logs });
        }

        [HttpGet("transferts/{id:guid}/reassign-candidates")]
        [HttpGet("transit-missions/{id:guid}/reassign-candidates")]
        public async Task<IActionResult> ReassignCandidates(Guid id, CancellationToken ct)
        {
            var transfert = await _db.F_TRANSFERTS.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (transfert == null) return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = "Transfert introuvable." });

            var candidates = await BuildTransitCandidatesAsync(transfert.ArRef, transfert.Quantite, transfert.DestinationDepotNo, ct);
            return Ok(candidates);
        }

        [HttpPost("transferts/{id:guid}/reassign")]
        [HttpPost("transit-missions/{id:guid}/reassign")]
        public async Task<IActionResult> Reassign(Guid id, [FromBody] ReassignTransfertRequest request, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();
            var transfert = await _db.F_TRANSFERTS.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (transfert == null) return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = "Transfert introuvable." });
            if (transfert.Version != request.Version)
                return Conflict(new { errorCode = "VERSION_MISMATCH", errorMessage = "Le transfert a déjà été modifié. Rechargez les données." });

            var transitLivreurOk = request.TransitLivreurUserId == null || await _db.ProfilsUtilisateurs.AsNoTracking().AnyAsync(p =>
                p.UtilisateurId == request.TransitLivreurUserId && p.IsTransit && p.DepotRattacheNo == request.SourceDepotNo, ct);
            if (!transitLivreurOk)
                return BadRequest(new { errorCode = "TRANSIT_LIVREUR_INVALID", errorMessage = "Le livreur-transit choisi doit être rattaché au dépôt source." });

            var before = System.Text.Json.JsonSerializer.Serialize(transfert);
            transfert.SourceDepotNo = request.SourceDepotNo;
            transfert.TransitLivreurUserId = request.TransitLivreurUserId;
            transfert.Version++;
            _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
            {
                TransfertId = transfert.Id,
                ActionType = "SUPERVISOR_OVERRIDE",
                ActorUserId = actor.Value,
                SnapshotBefore = before,
                SnapshotAfter = System.Text.Json.JsonSerializer.Serialize(transfert),
                Motif = request.Motif,
                OccurredAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
            return Ok(transfert);
        }

        [HttpPost("transit-missions/{id:guid}/assign")]
        public async Task<IActionResult> AssignTransitMission(Guid id, [FromBody] ManualTransitAssignmentDto request, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();

            var transfert = await _db.F_TRANSFERTS.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (transfert == null) return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = "Transfert introuvable." });
            if (request.Version.HasValue && transfert.Version != request.Version.Value)
                return Conflict(new { errorCode = "VERSION_MISMATCH", errorMessage = "Le transfert a déjà été modifié. Rechargez les données." });

            var sourceDepotNo = request.SourceDepotNo ?? transfert.SourceDepotNo;
            var transitLivreurOk = request.TransitLivreurUserId == null || await _db.ProfilsUtilisateurs.AsNoTracking().AnyAsync(p =>
                p.UtilisateurId == request.TransitLivreurUserId && p.IsTransit && p.DepotRattacheNo == sourceDepotNo, ct);
            if (!transitLivreurOk)
                return BadRequest(new { errorCode = "TRANSIT_LIVREUR_INVALID", errorMessage = "Le livreur-transit choisi doit être rattaché au dépôt source." });

            var before = System.Text.Json.JsonSerializer.Serialize(transfert);
            transfert.SourceDepotNo = sourceDepotNo;
            transfert.TransitLivreurUserId = request.TransitLivreurUserId;
            transfert.Status = request.TransitLivreurUserId == null
                ? TransitStatuses.EnAttenteAffectationTransit
                : TransitStatuses.EnAttenteTransit;
            transfert.Version++;

            _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
            {
                TransfertId = transfert.Id,
                ActionType = "SUPERVISOR_ASSIGN",
                ActorUserId = actor.Value,
                SnapshotBefore = before,
                SnapshotAfter = System.Text.Json.JsonSerializer.Serialize(transfert),
                Motif = request.Motif,
                OccurredAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync(ct);
            return Ok(transfert);
        }

        [HttpPost("transit-missions/{id:guid}/change-status")]
        public async Task<IActionResult> ChangeTransitStatus(Guid id, [FromBody] ChangeTransitStatusDto request, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();

            request.TransfertId = id;
            try
            {
                var updated = await _orchestration.ChangeStatusManuallyAsync(id, request, actor.Value, ct);
                return Ok(updated);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { errorCode = "TRANSIT_NOT_FOUND", errorMessage = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { errorCode = "TRANSIT_CONFLICT", errorMessage = ex.Message }); }
        }

        [HttpGet("alerts")]
        [HttpGet("issues")]
        public async Task<IActionResult> Alerts([FromQuery] bool includeRead, CancellationToken ct) => Ok(await _alerts.ListAsync(includeRead, ct));

        [HttpPut("alerts/{id:guid}/acknowledge")]
        public async Task<IActionResult> Acknowledge(Guid id, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();
            await _alerts.AcknowledgeAsync(id, actor.Value, ct);
            return NoContent();
        }

        [HttpPost("issues/{id:guid}/resolve")]
        public async Task<IActionResult> ResolveIssue(Guid id, CancellationToken ct)
        {
            var actor = CurrentUserId();
            if (actor == null) return Forbid();
            await _alerts.AcknowledgeAsync(id, actor.Value, ct);
            return NoContent();
        }

        [HttpPost("orders/{commandeId}/retry-assignment")]
        public async Task<IActionResult> RetryAssignment(string commandeId, CancellationToken ct)
        {
            try
            {
                var count = await _orchestration.RetryAssignmentAsync(commandeId, ct);
                return Ok(new { commandeId, reassigned = count });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { errorCode = "RETRY_ASSIGNMENT_FAILED", errorMessage = ex.Message });
            }
        }

        private async Task ReplaceZonesInternalAsync(Guid livreurId, IReadOnlyCollection<LivreurZoneInput> zones, Guid actorId, CancellationToken ct)
        {
            var old = await _db.F_LIVREUR_ZONES.Where(x => x.LivreurUserId == livreurId).ToListAsync(ct);
            _db.F_LIVREUR_ZONES.RemoveRange(old);

            foreach (var z in zones)
            {
                var g = (z.Gouvernorat ?? string.Empty).Trim();
                var d = (z.Delegation ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(g) || string.IsNullOrWhiteSpace(d)) continue;

                _db.F_LIVREUR_ZONES.Add(new F_LIVREUR_ZONE
                {
                    LivreurUserId = livreurId,
                    Gouvernorat = g,
                    Delegation = d,
                    AssignedByUserId = actorId,
                    AssignedAt = DateTime.UtcNow
                });
            }
            await _db.SaveChangesAsync(ct);
        }

        private async Task<IReadOnlyList<object>> BuildTransitCandidatesAsync(string arRef, decimal quantite, int destinationDepotNo, CancellationToken ct)
        {
            var depots = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);
            var depotByNo = depots.ToDictionary(x => x.DE_No);
            depotByNo.TryGetValue(destinationDepotNo, out var destinationDepot);

            var stocks = await _db.F_ARTSTOCKS.AsNoTracking()
                .Where(x => x.AR_Ref == arRef && x.DE_No != destinationDepotNo && x.AS_QteSto >= quantite)
                .ToListAsync(ct);

            var sourceDepotNos = stocks.Select(x => x.DE_No).Distinct().ToArray();
            var waitingCounts = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => sourceDepotNos.Contains(x.SourceDepotNo)
                    && x.DestinationDepotNo == destinationDepotNo
                    && (x.Status == TransitStatuses.EnAttenteTransit || x.Status == TransitStatuses.EnAttenteAffectationTransit))
                .GroupBy(x => x.SourceDepotNo)
                .Select(g => new { SourceDepotNo = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SourceDepotNo, x => x.Count, ct);

            var transitLivreurs = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId != null && p.IsTransit && p.DepotRattacheNo != null && sourceDepotNos.Contains(p.DepotRattacheNo.Value))
                .ToListAsync(ct);

            return stocks
                .Select(s =>
                {
                    depotByNo.TryGetValue(s.DE_No, out var sourceDepot);
                    var waiting = waitingCounts.TryGetValue(s.DE_No, out var c) ? c : 0;
                    var distance = DistanceKm(sourceDepot, destinationDepot);
                    var livreur = transitLivreurs.FirstOrDefault(p => p.DepotRattacheNo == s.DE_No);
                    return new
                    {
                        sourceDepotNo = s.DE_No,
                        sourceDepotName = sourceDepot?.DE_Intitule ?? $"Dépôt {s.DE_No}",
                        destinationDepotNo,
                        waitingTransitsToDestination = waiting,
                        distanceKm = Math.Round(distance, 1),
                        transitLivreurUserId = livreur?.UtilisateurId,
                        transitLivreurName = livreur?.NomComplet,
                        availableStock = s.AS_QteSto,
                        isRecommended = false
                    };
                })
                .OrderByDescending(x => x.waitingTransitsToDestination)
                .ThenBy(x => x.distanceKm)
                .Select((x, index) => new
                {
                    x.sourceDepotNo,
                    x.sourceDepotName,
                    x.destinationDepotNo,
                    x.waitingTransitsToDestination,
                    x.distanceKm,
                    x.transitLivreurUserId,
                    x.transitLivreurName,
                    x.availableStock,
                    isRecommended = index == 0
                })
                .Cast<object>()
                .ToList();
        }

        private static GouvernoratTunisie? ParseGouvernorat(int value)
        {
            return Enum.IsDefined(typeof(GouvernoratTunisie), value) ? (GouvernoratTunisie)value : null;
        }

        private static double DistanceKm(F_DEPOT? source, F_DEPOT? destination)
        {
            var s = DepotCenter(source);
            var d = DepotCenter(destination);
            return HaversineKm(s.Lat, s.Lng, d.Lat, d.Lng);
        }

        private static (double Lat, double Lng) DepotCenter(F_DEPOT? depot)
        {
            var city = (depot?.DE_Ville ?? depot?.DE_Intitule ?? string.Empty).ToUpperInvariant();
            if (city.Contains("SFAX")) return (34.7406, 10.7603);
            if (city.Contains("SOUSSE")) return (35.8245, 10.6346);
            if (city.Contains("GABES") || city.Contains("GABÈS")) return (33.8869, 10.0982);
            return (36.8065, 10.1815);
        }

        private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
        {
            const double r = 6371.0;
            double ToRad(double deg) => deg * Math.PI / 180.0;
            var dLat = ToRad(lat2 - lat1);
            var dLon = ToRad(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return 2 * r * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private Guid? CurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }
}
