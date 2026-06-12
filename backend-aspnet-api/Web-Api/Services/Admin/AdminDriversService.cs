using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Geo;
using Web_Api.Model;

namespace Web_Api.Services.Admin
{
    /// <summary>
    /// Onglet Livreurs du cockpit admin : liste + KPIs par livreur,
    /// détail livreur avec activité et derniers colis.
    /// </summary>
    public class AdminDriversService
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _users;

        public AdminDriversService(AppDbContext db, UserManager<ApplicationUser> users)
        {
            _db = db;
            _users = users;
        }

        public async Task<AdminDriversPageDto> GetPageAsync(
            AdminDriversQueryDto query, CancellationToken ct)
        {
            var (from, to) = ResolvePeriod(query);
            var driversInRole = await _users.GetUsersInRoleAsync(AppRoles.LIVREUR);
            var driverIds = driversInRole.Select(u => u.Id).ToHashSet();

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId.HasValue && driverIds.Contains(p.UtilisateurId.Value))
                .ToListAsync(ct);

            var profileIds = profiles.Select(p => (int?)p.cbMarq).ToHashSet();

            var livraisons = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(l => l.LivreurId.HasValue && profileIds.Contains(l.LivreurId))
                .Where(l => l.LI_DateCreation >= from && l.LI_DateCreation < to)
                .ToListAsync(ct);

            var pieces = livraisons.Select(l => l.DO_Piece).ToHashSet();
            var reclamationCount = pieces.Count == 0
                ? new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                : (await _db.F_RECLAMATIONS.AsNoTracking()
                        .Where(r => pieces.Contains(r.DoPiece))
                        .Select(r => r.DoPiece)
                        .ToListAsync(ct))
                    .GroupBy(p => p, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);

            var now = DateTime.UtcNow;
            var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToUpperInvariant();
            var govFilter = string.IsNullOrWhiteSpace(query.Governorate) ? null : NormalizeGovKey(query.Governorate);

            var items = new List<AdminDriverListItemDto>();
            foreach (var u in driversInRole)
            {
                var profile = profiles.FirstOrDefault(p => p.UtilisateurId == u.Id);
                var driverGov = profile?.Gouvernorat;

                if (govFilter != null && (driverGov == null || NormalizeGov(driverGov.Value) != govFilter))
                    continue;

                if (search != null)
                {
                    var hay = $"{profile?.NomComplet} {u.Email} {profile?.Telephone}".ToUpperInvariant();
                    if (!hay.Contains(search)) continue;
                }

                var driverLivs = profile == null
                    ? new List<F_LIVRAISON>()
                    : livraisons.Where(l => l.LivreurId == profile.cbMarq).ToList();

                var delivered = driverLivs.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre);
                var returned = driverLivs.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour);
                var postponed = driverLivs.Count(l => l.LI_Statut == DeliveryStatusCodes.Reporte);
                var inProgress = driverLivs.Count(l => l.LI_Statut == DeliveryStatusCodes.EnLivraison);
                var total = driverLivs.Count;
                var claims = driverLivs.Sum(l => reclamationCount.TryGetValue(l.DO_Piece, out var c) ? c : 0);

                items.Add(new AdminDriverListItemDto
                {
                    UserId = u.Id,
                    ProfileId = profile?.cbMarq,
                    FullName = profile?.NomComplet,
                    Email = u.Email,
                    Phone = profile?.Telephone ?? u.PhoneNumber,
                    Governorate = driverGov?.ToString(),
                    IsTransit = profile?.IsTransit ?? false,
                    Online = IsOnline(profile?.LastActivityAt, now),
                    InPause = profile?.IsInPause ?? false,
                    LastActivityAt = profile?.LastActivityAt,
                    OrdersTotal = total,
                    OrdersInProgress = inProgress,
                    OrdersDelivered = delivered,
                    OrdersReturned = returned,
                    OrdersPostponed = postponed,
                    DeliveryRate = total == 0 ? 0m : Math.Round((decimal)delivered * 100m / total, 1),
                    ReturnRate = total == 0 ? 0m : Math.Round((decimal)returned * 100m / total, 1),
                    Claims = claims
                });
            }

            items = items.OrderByDescending(x => x.OrdersTotal).ToList();

            var totalDrivers = items.Count;
            var onlineCount = items.Count(x => x.Online);
            var pausedCount = items.Count(x => x.InPause);
            var totalDelivered = items.Sum(x => x.OrdersDelivered);
            var totalReturned = items.Sum(x => x.OrdersReturned);
            var totalAll = items.Sum(x => x.OrdersTotal);
            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);

            return new AdminDriversPageDto
            {
                GeneratedAt = DateTime.UtcNow,
                Kpis = new List<AdminKpiDto>
                {
                    Count("drivers", "Livreurs", totalDrivers),
                    Count("online", "En ligne", onlineCount),
                    Count("paused", "En pause", pausedCount),
                    Count("delivered", "Total livrées", totalDelivered),
                    Count("returned", "Total retournées", totalReturned),
                    Percent("deliveryRate", "Taux livraison", Rate(totalDelivered, totalAll)),
                },
                Items = items
            };
        }

        public async Task<AdminDriverDetailDto?> GetDetailAsync(
            Guid userId, AdminDriversQueryDto query, CancellationToken ct)
        {
            var user = await _users.FindByIdAsync(userId.ToString());
            if (user == null) return null;
            var roles = await _users.GetRolesAsync(user);
            if (!roles.Contains(AppRoles.LIVREUR)) return null;

            var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == user.Id, ct);

            var (from, to) = ResolvePeriod(query);
            var livraisons = profile == null
                ? new List<F_LIVRAISON>()
                : await _db.F_LIVRAISONS.AsNoTracking()
                    .Where(l => l.LivreurId == profile.cbMarq)
                    .Where(l => l.LI_DateCreation >= from && l.LI_DateCreation < to)
                    .OrderByDescending(l => l.LI_DateCreation)
                    .ToListAsync(ct);

            var pieces = livraisons.Select(l => l.DO_Piece).ToHashSet();
            var orders = pieces.Count == 0
                ? new Dictionary<string, F_DOCENTETE>(StringComparer.OrdinalIgnoreCase)
                : (await _db.F_DOCENTETES.AsNoTracking()
                        .Where(o => pieces.Contains(o.DO_Piece))
                        .ToListAsync(ct))
                    .Where(o => o.DO_Piece != null)
                    .GroupBy(o => o.DO_Piece!, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            var profilesAll = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var profByCode = profilesAll
                .Where(p => !string.IsNullOrWhiteSpace(p.CodeClientSage))
                .GroupBy(p => p.CodeClientSage!.ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.First());

            var delivered = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre);
            var returned = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour);
            var postponed = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Reporte);
            var inProgress = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.EnLivraison);
            var total = livraisons.Count;
            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);

            var trend = BuildDailyTrend(livraisons, from, to);

            return new AdminDriverDetailDto
            {
                UserId = user.Id,
                ProfileId = profile?.cbMarq,
                FullName = profile?.NomComplet,
                Email = user.Email,
                Phone = profile?.Telephone ?? user.PhoneNumber,
                CIN = profile?.CIN,
                Governorate = profile?.Gouvernorat?.ToString(),
                Delegation = profile?.Delegation,
                Adresse = profile?.Adresse,
                IsTransit = profile?.IsTransit ?? false,
                Online = IsOnline(profile?.LastActivityAt, DateTime.UtcNow),
                InPause = profile?.IsInPause ?? false,
                LastActivityAt = profile?.LastActivityAt,
                Kpis = new List<AdminKpiDto>
                {
                    Count("total", "Total colis", total),
                    Count("inProgress", "En cours", inProgress),
                    Count("delivered", "Livrés", delivered),
                    Count("returned", "Retournés", returned),
                    Count("postponed", "Reportés", postponed),
                    Percent("deliveryRate", "Taux livraison", Rate(delivered, total)),
                    Percent("returnRate", "Taux retour", Rate(returned, total)),
                },
                ActivityTrend = trend,
                RecentDeliveries = livraisons.Take(20).Select(l =>
                {
                    orders.TryGetValue(l.DO_Piece, out var head);
                    ProfilUtilisateur? client = null;
                    if (head?.DO_Tiers != null
                        && profByCode.TryGetValue(head.DO_Tiers.ToUpperInvariant(), out var c))
                    {
                        client = c;
                    }
                    return new AdminDriverRecentDeliveryDto
                    {
                        Piece = l.DO_Piece,
                        CreatedAt = l.LI_DateCreation,
                        DeliveredAt = l.LI_DateLivree,
                        Status = MapDeliveryStatusLabel(l.LI_Statut),
                        Ville = l.LI_Ville,
                        ClientName = client?.NomComplet
                    };
                }).ToList()
            };
        }

        private static List<AdminTrendPointDto> BuildDailyTrend(
            List<F_LIVRAISON> livs, DateTime from, DateTime to)
        {
            var buckets = new List<AdminTrendPointDto>();
            var cursor = from.Date;
            var by = livs.Where(l => l.LI_DateCreation >= from && l.LI_DateCreation < to)
                .GroupBy(l => l.LI_DateCreation.Date)
                .ToDictionary(g => g.Key, g => g.ToList());
            while (cursor < to)
            {
                by.TryGetValue(cursor, out var list);
                buckets.Add(new AdminTrendPointDto
                {
                    Bucket = cursor.ToString("yyyy-MM-dd"),
                    Label = cursor.ToString("dd MMM", CultureInfo.GetCultureInfo("fr-FR")),
                    Primary = list?.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre) ?? 0,
                    Secondary = list?.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour) ?? 0,
                });
                cursor = cursor.AddDays(1);
            }
            return buckets;
        }

        private static bool IsOnline(DateTime? lastActivity, DateTime now)
        {
            if (lastActivity == null) return false;
            return (now - lastActivity.Value).TotalMinutes <= 5;
        }

        private static (DateTime from, DateTime to) ResolvePeriod(AdminDriversQueryDto q)
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

        private static string MapDeliveryStatusLabel(short status) => status switch
        {
            DeliveryStatusCodes.Confirme => DeliveryStatuses.Confirme,
            DeliveryStatusCodes.EnLivraison => DeliveryStatuses.EnLivraison,
            DeliveryStatusCodes.Livre => DeliveryStatuses.Livre,
            DeliveryStatusCodes.Retour => DeliveryStatuses.Retour,
            DeliveryStatusCodes.Depot => DeliveryStatuses.Depot,
            DeliveryStatusCodes.Reporte => DeliveryStatuses.Reporte,
            _ => "INCONNU"
        };

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

        private static string NormalizeGov(GouvernoratTunisie g)
            => g.ToString().ToUpperInvariant().Replace(" ", "").Replace("-", "");

        private static string NormalizeGovKey(string s)
            => (s ?? string.Empty).ToUpperInvariant()
                .Replace(" ", "").Replace("-", "")
                .Replace("É", "E").Replace("È", "E").Replace("Ê", "E");
    }
}
