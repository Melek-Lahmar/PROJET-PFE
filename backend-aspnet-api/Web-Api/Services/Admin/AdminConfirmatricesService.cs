using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Admin;

namespace Web_Api.Services.Admin
{
    public class AdminConfirmatricesService
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _users;

        public AdminConfirmatricesService(AppDbContext db, UserManager<ApplicationUser> users)
        {
            _db = db;
            _users = users;
        }

        public async Task<AdminConfirmatricesPageDto> GetPageAsync(
            AdminConfirmatricesQueryDto query, CancellationToken ct)
        {
            var (from, to) = ResolvePeriod(query);
            var inRole = await _users.GetUsersInRoleAsync(AppRoles.CONFIRMATEUR);
            var ids = inRole.Select(u => u.Id).ToHashSet();

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId.HasValue && ids.Contains(p.UtilisateurId.Value))
                .ToListAsync(ct);

            var reclamations = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId.HasValue && ids.Contains(r.AssignedToUserId.Value))
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to)
                .ToListAsync(ct);

            var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToUpperInvariant();
            var now = DateTime.UtcNow;
            var items = new List<AdminConfirmatriceListItemDto>();

            foreach (var u in inRole)
            {
                var profile = profiles.FirstOrDefault(p => p.UtilisateurId == u.Id);
                if (search != null)
                {
                    var hay = $"{profile?.NomComplet} {u.Email} {profile?.Telephone}".ToUpperInvariant();
                    if (!hay.Contains(search)) continue;
                }
                var mine = reclamations.Where(r => r.AssignedToUserId == u.Id).ToList();
                var claims = mine.Where(r => r.TypeCas == TypeCas.RECLAMATION).ToList();
                var demandes = mine.Where(r => r.TypeCas == TypeCas.DEMANDE).ToList();

                items.Add(new AdminConfirmatriceListItemDto
                {
                    UserId = u.Id,
                    FullName = profile?.NomComplet,
                    Email = u.Email,
                    Phone = profile?.Telephone ?? u.PhoneNumber,
                    Governorate = profile?.Gouvernorat?.ToString(),
                    Online = IsOnline(profile?.LastActivityAt, now),
                    InPause = profile?.IsInPause ?? false,
                    LastActivityAt = profile?.LastActivityAt,
                    LastAssignmentAt = profile?.LastAssignmentAt,
                    ClaimsTotal = claims.Count,
                    ClaimsInProgress = claims.Count(r => r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT
                                                       || r.Statut == ReclamationStatuses.ENVOYEE),
                    ClaimsClosed = claims.Count(r => r.Statut == ReclamationStatuses.CLOTUREE),
                    ClaimsRefused = claims.Count(r => r.Statut == ReclamationStatuses.REFUSEE),
                    RequestsTotal = demandes.Count,
                    RequestsInProgress = demandes.Count(r => r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT
                                                            || r.Statut == ReclamationStatuses.ENVOYEE),
                    RequestsClosed = demandes.Count(r => r.Statut == ReclamationStatuses.CLOTUREE),
                    RequestsRefused = demandes.Count(r => r.Statut == ReclamationStatuses.REFUSEE),
                });
            }
            items = items.OrderByDescending(x => x.ClaimsTotal + x.RequestsTotal).ToList();

            var total = items.Count;
            var online = items.Count(x => x.Online);
            var paused = items.Count(x => x.InPause);
            var totalClaims = items.Sum(x => x.ClaimsTotal);
            var totalReq = items.Sum(x => x.RequestsTotal);
            var totalClosed = items.Sum(x => x.ClaimsClosed + x.RequestsClosed);
            var totalAll = items.Sum(x => x.ClaimsTotal + x.RequestsTotal);
            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);

            return new AdminConfirmatricesPageDto
            {
                GeneratedAt = DateTime.UtcNow,
                Kpis = new List<AdminKpiDto>
                {
                    Count("confirmatrices", "Confirmatrices", total),
                    Count("online", "En ligne", online),
                    Count("paused", "En pause", paused),
                    Count("claims", "Réclamations", totalClaims),
                    Count("requests", "Demandes", totalReq),
                    Percent("resolutionRate", "Taux résolution", Rate(totalClosed, totalAll)),
                },
                Items = items
            };
        }

        public async Task<AdminConfirmatriceDetailDto?> GetDetailAsync(
            Guid userId, AdminConfirmatricesQueryDto query, CancellationToken ct)
        {
            var user = await _users.FindByIdAsync(userId.ToString());
            if (user == null) return null;
            var roles = await _users.GetRolesAsync(user);
            if (!roles.Contains(AppRoles.CONFIRMATEUR)) return null;

            var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);
            var (from, to) = ResolvePeriod(query);

            var reclamations = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId == userId)
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync(ct);

            var claims = reclamations.Where(r => r.TypeCas == TypeCas.RECLAMATION).ToList();
            var demandes = reclamations.Where(r => r.TypeCas == TypeCas.DEMANDE).ToList();
            var total = reclamations.Count;
            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);
            var resolved = reclamations.Count(r => r.Statut == ReclamationStatuses.CLOTUREE);
            var refused = reclamations.Count(r => r.Statut == ReclamationStatuses.REFUSEE);
            var inProgress = reclamations.Count(r => r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT
                                                  || r.Statut == ReclamationStatuses.ENVOYEE);

            var statuses = new (string key, string label, int count)[]
            {
                ("inProgress", "En cours", inProgress),
                ("closed", "Clôturées", resolved),
                ("refused", "Refusées", refused),
            };

            return new AdminConfirmatriceDetailDto
            {
                UserId = userId,
                FullName = profile?.NomComplet,
                Email = user.Email,
                Phone = profile?.Telephone ?? user.PhoneNumber,
                Governorate = profile?.Gouvernorat?.ToString(),
                Online = IsOnline(profile?.LastActivityAt, DateTime.UtcNow),
                InPause = profile?.IsInPause ?? false,
                LastActivityAt = profile?.LastActivityAt,
                LastAssignmentAt = profile?.LastAssignmentAt,
                Kpis = new List<AdminKpiDto>
                {
                    Count("total", "Total cas", total),
                    Count("claims", "Réclamations", claims.Count),
                    Count("requests", "Demandes", demandes.Count),
                    Count("inProgress", "En cours", inProgress),
                    Count("closed", "Clôturés", resolved),
                    Count("refused", "Refusés", refused),
                    Percent("resolutionRate", "Taux résolution", Rate(resolved, total)),
                },
                StatusBreakdown = statuses.Select(s => new AdminBreakdownItemDto
                {
                    Key = s.key,
                    Label = s.label,
                    Count = s.count,
                    Percentage = total == 0 ? 0m : Math.Round((decimal)s.count * 100m / total, 1)
                }).ToList(),
                RecentCases = reclamations.Take(20).Select(r => new AdminConfirmatriceRecentCaseDto
                {
                    Code = r.CodeReclamation,
                    TypeCas = r.TypeCas,
                    Statut = r.Statut,
                    Motif = r.Motif,
                    DoPiece = r.DoPiece,
                    CreatedAt = r.CreatedAt,
                }).ToList()
            };
        }

        private static bool IsOnline(DateTime? last, DateTime now)
            => last != null && (now - last.Value).TotalMinutes <= 5;

        private static (DateTime from, DateTime to) ResolvePeriod(AdminConfirmatricesQueryDto q)
        {
            var now = DateTime.UtcNow;
            if (q.From.HasValue && q.To.HasValue)
                return (q.From.Value.Date, q.To.Value.Date.AddDays(1));
            var p = (q.Period ?? "30d").ToLowerInvariant();
            return p switch
            {
                "today" => (now.Date, now.Date.AddDays(1)),
                "7d" => (now.Date.AddDays(-7), now.Date.AddDays(1)),
                "3m" => (now.Date.AddMonths(-3), now.Date.AddDays(1)),
                "12m" => (now.Date.AddYears(-1), now.Date.AddDays(1)),
                _ => (now.Date.AddDays(-30), now.Date.AddDays(1))
            };
        }

        private static AdminKpiDto Count(string key, string label, int value) => new()
        {
            Key = key, Label = label, Value = value,
            FormattedValue = value.ToString("N0", CultureInfo.GetCultureInfo("fr-FR")),
            DeltaDirection = "flat", Format = "count"
        };

        private static AdminKpiDto Percent(string key, string label, decimal value) => new()
        {
            Key = key, Label = label, Value = value,
            FormattedValue = $"{value.ToString("0.#", CultureInfo.GetCultureInfo("fr-FR"))} %",
            DeltaDirection = "flat", Format = "percent"
        };
    }
}
