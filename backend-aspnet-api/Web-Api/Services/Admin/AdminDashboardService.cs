using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
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
    /// Agrégateur dédié au cockpit admin Flutter : KPI logistique (livrées,
    /// retournées, reportées, en cours, en attente), réclamations / demandes,
    /// taux de livraison/retour/report, comparaison période actuelle vs
    /// précédente, et séries temporelles pour les graphiques.
    /// </summary>
    public class AdminDashboardService
    {
        private const short DomainVente = 0;
        private const short BcType = 0;

        private readonly AppDbContext _db;

        public AdminDashboardService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<AdminDashboardOverviewDto> GetOverviewAsync(
            AdminDashboardQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var current = await LoadSnapshotAsync(filter, ct);
            var previous = await LoadSnapshotAsync(filter.PreviousPeriod(), ct);

            return new AdminDashboardOverviewDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = new AdminDashboardAppliedFiltersDto
                {
                    Period = filter.Period,
                    From = filter.From,
                    To = filter.To,
                    Governorate = filter.Governorate,
                    TopN = filter.TopN
                },
                Kpis = BuildKpis(current, previous),
                DeliveriesVsReturns = BuildDeliveriesVsReturns(current, filter),
                VolumeTrend = BuildVolumeTrend(current, filter),
                StatusBreakdown = BuildStatusBreakdown(current),
                GovernorateBreakdown = BuildGovernorateBreakdown(current, filter.TopN)
            };
        }

        // ====================================================================
        // Snapshot — données filtrées (orders + livraisons + réclamations)
        // ====================================================================
        private async Task<Snapshot> LoadSnapshotAsync(Filter filter, CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var profileLookup = BuildProfileLookup(profiles);
            var matchingTiers = filter.Governorate == null
                ? null
                : profiles
                    .Where(p => p.Gouvernorat.HasValue &&
                                NormalizeGov(p.Gouvernorat.Value) == NormalizeGovKey(filter.Governorate))
                    .Select(p => Normalize(p.CodeClientSage))
                    .Where(c => c != null)
                    .Cast<string>()
                    .ToHashSet();

            var ordersQuery = _db.F_DOCENTETES
                .AsNoTracking()
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                .Where(x => x.DO_Date >= filter.From && x.DO_Date < filter.To);

            var orders = await ordersQuery.ToListAsync(ct);
            if (matchingTiers != null)
            {
                orders = orders
                    .Where(o => o.DO_Tiers != null && matchingTiers.Contains(o.DO_Tiers.ToUpperInvariant()))
                    .ToList();
            }

            var pieces = orders
                .Select(o => o.DO_Piece)
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Cast<string>()
                .ToHashSet();

            var livraisons = pieces.Count == 0
                ? new List<F_LIVRAISON>()
                : await _db.F_LIVRAISONS
                    .AsNoTracking()
                    .Where(l => pieces.Contains(l.DO_Piece))
                    .ToListAsync(ct);

            var reclamationsQuery = _db.F_RECLAMATIONS
                .AsNoTracking()
                .Where(r => r.CreatedAt >= filter.From && r.CreatedAt < filter.To);

            var reclamations = await reclamationsQuery.ToListAsync(ct);
            if (matchingTiers != null)
            {
                reclamations = reclamations
                    .Where(r => pieces.Contains(r.DoPiece))
                    .ToList();
            }

            return new Snapshot
            {
                Orders = orders,
                Livraisons = livraisons,
                Reclamations = reclamations,
                ProfileByAlias = profileLookup
            };
        }

        // ====================================================================
        // KPIs
        // ====================================================================
        private static List<AdminKpiDto> BuildKpis(Snapshot current, Snapshot previous)
        {
            var ordersCur = current.Orders.Count;
            var ordersPrev = previous.Orders.Count;

            var livreesCur = current.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre);
            var livreesPrev = previous.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre);

            var retoursCur = current.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour);
            var retoursPrev = previous.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour);

            var reportesCur = current.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Reporte);
            var reportesPrev = previous.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Reporte);

            var enCoursCur = current.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.EnLivraison);
            var enCoursPrev = previous.Livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.EnLivraison);

            var enAttenteCur = current.Orders.Count(o => o.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE);
            var enAttentePrev = previous.Orders.Count(o => o.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE);

            var reclamCur = current.Reclamations.Count(r => r.TypeCas == TypeCas.RECLAMATION);
            var reclamPrev = previous.Reclamations.Count(r => r.TypeCas == TypeCas.RECLAMATION);

            var demandesCur = current.Reclamations.Count(r => r.TypeCas == TypeCas.DEMANDE);
            var demandesPrev = previous.Reclamations.Count(r => r.TypeCas == TypeCas.DEMANDE);

            var totalLivCur = current.Livraisons.Count;
            var totalLivPrev = previous.Livraisons.Count;

            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);

            return new List<AdminKpiDto>
            {
                Count("orders", "Commandes", ordersCur, ordersPrev),
                Count("delivered", "Livrées", livreesCur, livreesPrev),
                Count("returned", "Retournées", retoursCur, retoursPrev),
                Count("postponed", "Reportées", reportesCur, reportesPrev),
                Count("inProgress", "En livraison", enCoursCur, enCoursPrev),
                Count("pending", "En attente", enAttenteCur, enAttentePrev),
                Count("claims", "Réclamations", reclamCur, reclamPrev),
                Count("demandes", "Demandes", demandesCur, demandesPrev),
                Percent("deliveryRate", "Taux livraison", Rate(livreesCur, totalLivCur), Rate(livreesPrev, totalLivPrev)),
                Percent("returnRate", "Taux retour", Rate(retoursCur, totalLivCur), Rate(retoursPrev, totalLivPrev)),
                Percent("postponedRate", "Taux report", Rate(reportesCur, totalLivCur), Rate(reportesPrev, totalLivPrev)),
                Percent("claimRate", "Taux réclamation", Rate(reclamCur, ordersCur), Rate(reclamPrev, ordersPrev))
            };
        }

        private static AdminKpiDto Count(string key, string label, int value, int prev)
        {
            var dec = (decimal)value;
            var prevDec = (decimal)prev;
            return new AdminKpiDto
            {
                Key = key,
                Label = label,
                Value = dec,
                FormattedValue = value.ToString("N0", CultureInfo.GetCultureInfo("fr-FR")),
                PreviousValue = prevDec,
                DeltaPercent = ComputeDelta(dec, prevDec),
                DeltaDirection = ComputeDirection(dec, prevDec),
                Format = "count"
            };
        }

        private static AdminKpiDto Percent(string key, string label, decimal value, decimal prev)
        {
            return new AdminKpiDto
            {
                Key = key,
                Label = label,
                Value = value,
                FormattedValue = $"{value.ToString("0.#", CultureInfo.GetCultureInfo("fr-FR"))} %",
                PreviousValue = prev,
                DeltaPercent = ComputeDelta(value, prev),
                DeltaDirection = ComputeDirection(value, prev),
                Format = "percent"
            };
        }

        private static decimal? ComputeDelta(decimal value, decimal prev)
        {
            if (prev == 0m)
                return value == 0m ? 0m : null;
            return Math.Round((value - prev) * 100m / prev, 1);
        }

        private static string ComputeDirection(decimal value, decimal prev)
        {
            if (value > prev) return "up";
            if (value < prev) return "down";
            return "flat";
        }

        // ====================================================================
        // Time series : livrées vs retournées
        // ====================================================================
        private static List<AdminTrendPointDto> BuildDeliveriesVsReturns(
            Snapshot snapshot, Filter filter)
        {
            var groupBy = filter.GroupBy;
            var buckets = BuildBuckets(filter);

            var byBucket = snapshot.Livraisons
                .Where(l => l.LI_DateLivree.HasValue)
                .GroupBy(l => BucketKey(l.LI_DateLivree!.Value, groupBy))
                .ToDictionary(g => g.Key, g => g.ToList());

            return buckets.Select(b => new AdminTrendPointDto
            {
                Bucket = b.Key,
                Label = b.Label,
                Primary = byBucket.TryGetValue(b.Key, out var list)
                    ? list.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre)
                    : 0,
                Secondary = byBucket.TryGetValue(b.Key, out var list2)
                    ? list2.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour)
                    : 0
            }).ToList();
        }

        // ====================================================================
        // Time series : volume commandes
        // ====================================================================
        private static List<AdminTrendPointDto> BuildVolumeTrend(
            Snapshot snapshot, Filter filter)
        {
            var groupBy = filter.GroupBy;
            var buckets = BuildBuckets(filter);

            var byBucket = snapshot.Orders
                .Where(o => o.DO_Date.HasValue)
                .GroupBy(o => BucketKey(o.DO_Date!.Value, groupBy))
                .ToDictionary(g => g.Key, g => g.Count());

            return buckets.Select(b => new AdminTrendPointDto
            {
                Bucket = b.Key,
                Label = b.Label,
                Primary = byBucket.TryGetValue(b.Key, out var c) ? c : 0
            }).ToList();
        }

        // ====================================================================
        // Donut : répartition orders par statut métier
        // ====================================================================
        private static List<AdminBreakdownItemDto> BuildStatusBreakdown(Snapshot snapshot)
        {
            var total = snapshot.Orders.Count;
            if (total == 0) return new List<AdminBreakdownItemDto>();

            var groups = new (short status, string key, string label)[]
            {
                (F_DOCENTETE.STATUS_EN_ATTENTE, "EN_ATTENTE", "En attente"),
                (F_DOCENTETE.STATUS_CONFIRME, "CONFIRME", "Confirmées"),
                (F_DOCENTETE.STATUS_TENTATIVE, "TENTATIVE", "Tentatives"),
                (F_DOCENTETE.STATUS_REFUSE, "REFUSE", "Refusées")
            };

            return groups.Select(g =>
            {
                var count = snapshot.Orders.Count(o => o.DO_Valide == g.status);
                return new AdminBreakdownItemDto
                {
                    Key = g.key,
                    Label = g.label,
                    Count = count,
                    Percentage = Math.Round((decimal)count * 100m / total, 1)
                };
            }).ToList();
        }

        // ====================================================================
        // Bar : répartition par gouvernorat
        // ====================================================================
        private static List<AdminBreakdownItemDto> BuildGovernorateBreakdown(
            Snapshot snapshot, int topN)
        {
            var total = snapshot.Orders.Count;
            if (total == 0) return new List<AdminBreakdownItemDto>();

            var groupedByGov = snapshot.Orders
                .GroupBy(o =>
                {
                    var profile = ResolveProfile(o.DO_Tiers, snapshot.ProfileByAlias);
                    return profile?.Gouvernorat?.ToString() ?? "Inconnu";
                })
                .Select(g => new AdminBreakdownItemDto
                {
                    Key = g.Key,
                    Label = FormatGovernorate(g.Key),
                    Count = g.Count(),
                    Percentage = Math.Round((decimal)g.Count() * 100m / total, 1)
                })
                .OrderByDescending(x => x.Count)
                .Take(topN)
                .ToList();

            return groupedByGov;
        }

        // ====================================================================
        // Plumbing
        // ====================================================================
        private static Filter BuildFilter(AdminDashboardQueryDto query)
        {
            var (period, from, to) = ResolvePeriod(query);
            var span = to - from;
            var groupBy = ChooseGroupBy(span);
            var topN = (query.TopN.HasValue && query.TopN.Value > 0 && query.TopN.Value <= 50)
                ? query.TopN.Value : 5;

            return new Filter
            {
                Period = period,
                From = from,
                To = to,
                Governorate = string.IsNullOrWhiteSpace(query.Governorate) ? null : query.Governorate.Trim(),
                GroupBy = groupBy,
                TopN = topN
            };
        }

        private static (string period, DateTime from, DateTime to) ResolvePeriod(
            AdminDashboardQueryDto q)
        {
            var now = DateTime.UtcNow;

            if (q.From.HasValue && q.To.HasValue)
                return ("custom", q.From.Value.Date, q.To.Value.Date.AddDays(1));

            var p = (q.Period ?? "30d").ToLowerInvariant();
            return p switch
            {
                "today" => ("today", DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(1)),
                "7d" => ("7d", now.Date.AddDays(-7), now.Date.AddDays(1)),
                "3m" => ("3m", now.Date.AddMonths(-3), now.Date.AddDays(1)),
                "12m" => ("12m", now.Date.AddYears(-1), now.Date.AddDays(1)),
                _ => ("30d", now.Date.AddDays(-30), now.Date.AddDays(1))
            };
        }

        private static string ChooseGroupBy(TimeSpan span)
        {
            if (span.TotalDays <= 2) return "hour";
            if (span.TotalDays <= 60) return "day";
            if (span.TotalDays <= 180) return "week";
            return "month";
        }

        private static List<(string Key, string Label)> BuildBuckets(Filter filter)
        {
            var result = new List<(string, string)>();
            var cursor = filter.From;
            switch (filter.GroupBy)
            {
                case "hour":
                    while (cursor < filter.To)
                    {
                        result.Add((cursor.ToString("yyyy-MM-ddTHH"),
                            cursor.ToString("HH'h'", CultureInfo.GetCultureInfo("fr-FR"))));
                        cursor = cursor.AddHours(1);
                    }
                    break;
                case "day":
                    while (cursor < filter.To)
                    {
                        result.Add((cursor.ToString("yyyy-MM-dd"),
                            cursor.ToString("dd MMM", CultureInfo.GetCultureInfo("fr-FR"))));
                        cursor = cursor.AddDays(1);
                    }
                    break;
                case "week":
                    cursor = StartOfWeek(cursor);
                    while (cursor < filter.To)
                    {
                        result.Add((cursor.ToString("yyyy-MM-dd"),
                            "Sem. " + ISOWeek.GetWeekOfYear(cursor)));
                        cursor = cursor.AddDays(7);
                    }
                    break;
                case "month":
                default:
                    cursor = new DateTime(cursor.Year, cursor.Month, 1);
                    while (cursor < filter.To)
                    {
                        result.Add((cursor.ToString("yyyy-MM"),
                            cursor.ToString("MMM yy", CultureInfo.GetCultureInfo("fr-FR"))));
                        cursor = cursor.AddMonths(1);
                    }
                    break;
            }
            return result;
        }

        private static string BucketKey(DateTime d, string groupBy) => groupBy switch
        {
            "hour" => d.ToString("yyyy-MM-ddTHH"),
            "day" => d.ToString("yyyy-MM-dd"),
            "week" => StartOfWeek(d).ToString("yyyy-MM-dd"),
            "month" => d.ToString("yyyy-MM"),
            _ => d.ToString("yyyy-MM-dd")
        };

        private static DateTime StartOfWeek(DateTime d)
        {
            var diff = ((int)d.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
            return d.Date.AddDays(-diff);
        }

        private static Dictionary<string, ProfilUtilisateur> BuildProfileLookup(
            IEnumerable<ProfilUtilisateur> profiles)
        {
            var dict = new Dictionary<string, ProfilUtilisateur>(StringComparer.OrdinalIgnoreCase);
            foreach (var profile in profiles)
            {
                AddAlias(dict, profile.CodeClientSage, profile);
                if (profile.UtilisateurId.HasValue)
                {
                    var userId = profile.UtilisateurId.Value;
                    AddAlias(dict, userId.ToString(), profile);
                    AddAlias(dict, userId.ToString("N"), profile);
                    var n = userId.ToString("N");
                    if (n.Length >= 15)
                        AddAlias(dict, "CL" + n.Substring(0, 15), profile);
                }
            }
            return dict;
        }

        private static void AddAlias(Dictionary<string, ProfilUtilisateur> dict,
            string? value, ProfilUtilisateur profile)
        {
            var n = Normalize(value);
            if (n != null && !dict.ContainsKey(n)) dict[n] = profile;
        }

        private static ProfilUtilisateur? ResolveProfile(string? tiers,
            IReadOnlyDictionary<string, ProfilUtilisateur> lookup)
        {
            var n = Normalize(tiers);
            return n != null && lookup.TryGetValue(n, out var p) ? p : null;
        }

        private static string? Normalize(string? value)
        {
            var n = (value ?? string.Empty).Trim();
            return string.IsNullOrWhiteSpace(n) ? null : n.ToUpperInvariant();
        }

        private static string NormalizeGov(GouvernoratTunisie g)
            => g.ToString().ToUpperInvariant().Replace(" ", "").Replace("-", "");

        private static string NormalizeGovKey(string s)
            => (s ?? string.Empty).ToUpperInvariant()
                .Replace(" ", "").Replace("-", "")
                .Replace("É", "E").Replace("È", "E").Replace("Ê", "E");

        private static string FormatGovernorate(string raw)
        {
            // Dégrade joliment "BenArous" → "Ben Arous", garde le reste tel quel.
            if (raw == "BenArous") return "Ben Arous";
            if (raw == "SidiBouzid") return "Sidi Bouzid";
            return raw;
        }

        // ====================================================================
        // Types internes
        // ====================================================================
        private class Filter
        {
            public string Period { get; set; } = "30d";
            public DateTime From { get; set; }
            public DateTime To { get; set; }
            public string? Governorate { get; set; }
            public string GroupBy { get; set; } = "day";
            public int TopN { get; set; } = 5;

            public Filter PreviousPeriod()
            {
                var span = To - From;
                return new Filter
                {
                    Period = Period,
                    From = From - span,
                    To = From,
                    Governorate = Governorate,
                    GroupBy = GroupBy,
                    TopN = TopN
                };
            }
        }

        private class Snapshot
        {
            public List<F_DOCENTETE> Orders { get; set; } = new();
            public List<F_LIVRAISON> Livraisons { get; set; } = new();
            public List<F_RECLAMATION> Reclamations { get; set; } = new();
            public Dictionary<string, ProfilUtilisateur> ProfileByAlias { get; set; } =
                new(StringComparer.OrdinalIgnoreCase);
        }
    }
}
