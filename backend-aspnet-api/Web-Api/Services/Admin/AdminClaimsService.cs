using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Geo;

namespace Web_Api.Services.Admin
{
    public class AdminClaimsService
    {
        private readonly AppDbContext _db;

        public AdminClaimsService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<AdminClaimsOverviewDto> GetOverviewAsync(
            AdminClaimsQueryDto query, CancellationToken ct)
        {
            var (from, to) = ResolvePeriod(query);

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var profByCode = profiles
                .Where(p => !string.IsNullOrWhiteSpace(p.CodeClientSage))
                .GroupBy(p => p.CodeClientSage!.ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.First());
            var profByUser = profiles
                .Where(p => p.UtilisateurId.HasValue)
                .ToDictionary(p => p.UtilisateurId!.Value, p => p);

            var reclamations = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to)
                .ToListAsync(ct);

            // Filtre gouvernorat (via le profil client de la réclamation)
            string? govKey = string.IsNullOrWhiteSpace(query.Governorate)
                ? null : NormalizeGovKey(query.Governorate);
            if (govKey != null)
            {
                reclamations = reclamations.Where(r =>
                {
                    if (!profByUser.TryGetValue(r.ClientUserId, out var p)) return false;
                    return p.Gouvernorat.HasValue
                           && NormalizeGov(p.Gouvernorat.Value) == govKey;
                }).ToList();
            }

            var claims = reclamations.Where(r => r.TypeCas == TypeCas.RECLAMATION).ToList();
            var demandes = reclamations.Where(r => r.TypeCas == TypeCas.DEMANDE).ToList();
            var total = reclamations.Count;
            // Les compteurs par statut sont restreints aux RECLAMATIONS pour
            // rester cohérents avec la KPI "Total réclamations" (premier KPI
            // rouge). Avant : ils mélangeaient DEMANDE+RECLAMATION → on pouvait
            // voir "0 réclamation" + "1 envoyée" (un DEMANDE non traité).
            var resolved = claims.Count(r => r.Statut == ReclamationStatuses.CLOTUREE);
            var refused = claims.Count(r => r.Statut == ReclamationStatuses.REFUSEE);
            var inProgress = claims.Count(r => r.Statut == ReclamationStatuses.EN_COURS_DE_TRAITEMENT);
            var sent = claims.Count(r => r.Statut == ReclamationStatuses.ENVOYEE);
            var unhandled = claims.Where(r => r.Statut == ReclamationStatuses.ENVOYEE)
                .OrderBy(r => r.CreatedAt)
                .Take(20)
                .ToList();

            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);

            var statusGroupsClaims = new (string key, string label, string st)[]
            {
                ("sent", "Envoyées", ReclamationStatuses.ENVOYEE),
                ("inProgress", "En cours", ReclamationStatuses.EN_COURS_DE_TRAITEMENT),
                ("closed", "Clôturées", ReclamationStatuses.CLOTUREE),
                ("refused", "Refusées", ReclamationStatuses.REFUSEE),
            };

            var trendPerDay = BuildDailyTrend(reclamations, from, to);

            // Top motifs
            var topClaimMotifs = claims
                .GroupBy(r => r.Motif)
                .Select(g => new AdminBreakdownItemDto
                {
                    Key = g.Key,
                    Label = g.Key,
                    Count = g.Count(),
                    Percentage = claims.Count == 0 ? 0m : Math.Round((decimal)g.Count() * 100m / claims.Count, 1),
                })
                .OrderByDescending(x => x.Count)
                .Take(8).ToList();

            var topRequestMotifs = demandes
                .GroupBy(r => r.Motif)
                .Select(g => new AdminBreakdownItemDto
                {
                    Key = g.Key,
                    Label = g.Key,
                    Count = g.Count(),
                    Percentage = demandes.Count == 0 ? 0m : Math.Round((decimal)g.Count() * 100m / demandes.Count, 1),
                })
                .OrderByDescending(x => x.Count)
                .Take(8).ToList();

            // Par gouvernorat (via profil client)
            var govBreakdown = reclamations
                .GroupBy(r =>
                {
                    profByUser.TryGetValue(r.ClientUserId, out var p);
                    return p?.Gouvernorat?.ToString() ?? "Inconnu";
                })
                .Select(g => new AdminBreakdownItemDto
                {
                    Key = g.Key, Label = g.Key, Count = g.Count(),
                    Percentage = total == 0 ? 0m : Math.Round((decimal)g.Count() * 100m / total, 1),
                })
                .OrderByDescending(x => x.Count)
                .Take(10).ToList();

            var unhandledRows = unhandled.Select(r =>
            {
                profByUser.TryGetValue(r.ClientUserId, out var p);
                return new AdminClaimRowDto
                {
                    Id = r.Id,
                    Code = r.CodeReclamation,
                    TypeCas = r.TypeCas,
                    Statut = r.Statut,
                    Motif = r.Motif,
                    DoPiece = r.DoPiece,
                    CreatedAt = r.CreatedAt,
                    Governorate = p?.Gouvernorat?.ToString(),
                    HoursOpen = (int)(DateTime.UtcNow - r.CreatedAt).TotalHours,
                };
            }).ToList();

            return new AdminClaimsOverviewDto
            {
                GeneratedAt = DateTime.UtcNow,
                Kpis = new List<AdminKpiDto>
                {
                    // KPI "Total réclamations" = somme de tous les statuts
                    // (envoyé + en cours + clôturé + refusé) pour le type
                    // RECLAMATION. Voir issue : avant on pouvait voir 0 total
                    // avec 1 envoyée car les compteurs mélangeaient DEMANDE.
                    Count("totalClaims", "Total réclamations", claims.Count),
                    Count("totalRequests", "Demandes", demandes.Count),
                    Count("sent", "Envoyés", sent),
                    Count("inProgress", "En cours", inProgress),
                    Count("closed", "Clôturés", resolved),
                    Count("refused", "Refusés", refused),
                    Percent("resolutionRate", "Taux résolution", Rate(resolved, claims.Count)),
                    Percent("refusalRate", "Taux refus", Rate(refused, claims.Count)),
                    Count("unhandled", "Non traités", sent),
                },
                ClaimsStatusBreakdown = statusGroupsClaims.Select(g =>
                {
                    var c = claims.Count(r => r.Statut == g.st);
                    return new AdminBreakdownItemDto
                    {
                        Key = g.key, Label = g.label, Count = c,
                        Percentage = claims.Count == 0 ? 0m : Math.Round((decimal)c * 100m / claims.Count, 1)
                    };
                }).ToList(),
                RequestsStatusBreakdown = statusGroupsClaims.Select(g =>
                {
                    var c = demandes.Count(r => r.Statut == g.st);
                    return new AdminBreakdownItemDto
                    {
                        Key = g.key, Label = g.label, Count = c,
                        Percentage = demandes.Count == 0 ? 0m : Math.Round((decimal)c * 100m / demandes.Count, 1)
                    };
                }).ToList(),
                GovernorateBreakdown = govBreakdown,
                TopClaimMotifs = topClaimMotifs,
                TopRequestMotifs = topRequestMotifs,
                Trend = trendPerDay,
                UnhandledCases = unhandledRows,
            };
        }

        private static List<AdminTrendPointDto> BuildDailyTrend(
            IEnumerable<Web_Api.Model.F_RECLAMATION> recs, DateTime from, DateTime to)
        {
            var by = recs.GroupBy(r => r.CreatedAt.Date)
                .ToDictionary(g => g.Key, g => g.ToList());
            var result = new List<AdminTrendPointDto>();
            var cursor = from.Date;
            while (cursor < to)
            {
                by.TryGetValue(cursor, out var list);
                result.Add(new AdminTrendPointDto
                {
                    Bucket = cursor.ToString("yyyy-MM-dd"),
                    Label = cursor.ToString("dd MMM", CultureInfo.GetCultureInfo("fr-FR")),
                    Primary = list?.Count(r => r.TypeCas == TypeCas.RECLAMATION) ?? 0,
                    Secondary = list?.Count(r => r.TypeCas == TypeCas.DEMANDE) ?? 0,
                });
                cursor = cursor.AddDays(1);
            }
            return result;
        }

        private static (DateTime from, DateTime to) ResolvePeriod(AdminClaimsQueryDto q)
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

        private static string NormalizeGov(GouvernoratTunisie g)
            => g.ToString().ToUpperInvariant().Replace(" ", "").Replace("-", "");

        private static string NormalizeGovKey(string s)
            => (s ?? string.Empty).ToUpperInvariant()
                .Replace(" ", "").Replace("-", "")
                .Replace("É", "E").Replace("È", "E").Replace("Ê", "E");
    }
}
