
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Geo;
using Web_Api.Model;

namespace Web_Api.Services.Admin
{
    public class AdminProductsService
    {
        private const short DomainVente = 0;
        private const short BcType = 0;

        private readonly AppDbContext _db;
        public AdminProductsService(AppDbContext db) { _db = db; }

        public async Task<AdminProductsOverviewDto> GetOverviewAsync(
            AdminProductsQueryDto query, CancellationToken ct)
        {
            var (from, to) = ResolvePeriod(query);
            var topN = (query.TopN.HasValue && query.TopN.Value > 0 && query.TopN.Value <= 50)
                ? query.TopN.Value : 10;

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var profByCode = profiles
                .Where(p => !string.IsNullOrWhiteSpace(p.CodeClientSage))
                .GroupBy(p => p.CodeClientSage!.ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.First());

            var orders = await _db.F_DOCENTETES.AsNoTracking()
                .Where(o => o.DO_Domaine == DomainVente && o.DO_Type == BcType)
                .Where(o => o.DO_Date >= from && o.DO_Date < to)
                .ToListAsync(ct);

            string? govKey = string.IsNullOrWhiteSpace(query.Governorate)
                ? null : NormalizeGovKey(query.Governorate);
            HashSet<string>? matchingTiers = null;
            if (govKey != null)
            {
                matchingTiers = profiles
                    .Where(p => p.Gouvernorat.HasValue
                                && NormalizeGov(p.Gouvernorat.Value) == govKey)
                    .Select(p => p.CodeClientSage?.ToUpperInvariant())
                    .Where(s => s != null).Cast<string>().ToHashSet();
                orders = orders.Where(o => o.DO_Tiers != null
                                           && matchingTiers.Contains(o.DO_Tiers.ToUpperInvariant()))
                    .ToList();
            }

            var pieces = orders.Where(o => o.DO_Piece != null).Select(o => o.DO_Piece!).ToHashSet();
            var lines = pieces.Count == 0
                ? new List<F_DOCLIGNE>()
                : await _db.F_DOCLIGNES.AsNoTracking()
                    .Where(l => l.DO_Domaine == DomainVente && l.DO_Type == BcType
                                && pieces.Contains(l.DO_Piece))
                    .ToListAsync(ct);

            var refs = lines.Select(l => l.AR_Ref).Where(r => !string.IsNullOrWhiteSpace(r))
                .Cast<string>().Distinct().ToList();
            var articles = refs.Count == 0
                ? new Dictionary<string, F_ARTICLE>()
                : (await _db.F_ARTICLES.AsNoTracking()
                        .Where(a => refs.Contains(a.AR_Ref))
                        .ToListAsync(ct))
                    .ToDictionary(a => a.AR_Ref, a => a, StringComparer.OrdinalIgnoreCase);

            // Group by article ref → metrics
            var byRef = lines.Where(l => !string.IsNullOrWhiteSpace(l.AR_Ref))
                .GroupBy(l => l.AR_Ref!)
                .Select(g => new AdminProductRowDto
                {
                    ArticleRef = g.Key,
                    Designation = articles.TryGetValue(g.Key, out var a) ? a.AR_Design : g.First().DL_Design,
                    Quantity = g.Where(l => l.LigneType != "RETOUR").Sum(l => l.DL_Qte ?? 0),
                    Revenue = g.Where(l => l.LigneType != "RETOUR").Sum(l => l.DL_MontantTTC ?? 0),
                    OrdersCount = g.Where(l => l.LigneType != "RETOUR").Select(l => l.DO_Piece).Distinct().Count(),
                    ReturnsCount = g.Count(l => l.LigneType == "RETOUR"),
                })
                .ToList();

            var totalRevenue = byRef.Sum(x => x.Revenue);
            var totalQuantity = byRef.Sum(x => x.Quantity);
            var totalReturns = byRef.Sum(x => x.ReturnsCount);
            var distinctProducts = byRef.Count;
            decimal Rate(int n, int d) => d == 0 ? 0m : Math.Round((decimal)n * 100m / d, 1);

            // Revenue by governorate
            var revByGov = orders.GroupBy(o =>
                {
                    if (o.DO_Tiers == null) return "Inconnu";
                    profByCode.TryGetValue(o.DO_Tiers.ToUpperInvariant(), out var p);
                    return p?.Gouvernorat?.ToString() ?? "Inconnu";
                })
                .Select(g => new AdminBreakdownItemDto
                {
                    Key = g.Key, Label = g.Key,
                    Count = g.Count(),
                    Percentage = orders.Count == 0 ? 0m :
                        Math.Round((decimal)g.Count() * 100m / orders.Count, 1),
                })
                .OrderByDescending(x => x.Count)
                .Take(10).ToList();

            // Returns by governorate
            var retLinesByPiece = lines.Where(l => l.LigneType == "RETOUR")
                .GroupBy(l => l.DO_Piece).Select(g => g.Key).Where(p => p != null).Cast<string>()
                .ToHashSet();
            var ordersWithReturns = orders.Where(o => o.DO_Piece != null && retLinesByPiece.Contains(o.DO_Piece)).ToList();
            var retByGov = ordersWithReturns.GroupBy(o =>
                {
                    if (o.DO_Tiers == null) return "Inconnu";
                    profByCode.TryGetValue(o.DO_Tiers.ToUpperInvariant(), out var p);
                    return p?.Gouvernorat?.ToString() ?? "Inconnu";
                })
                .Select(g => new AdminBreakdownItemDto
                {
                    Key = g.Key, Label = g.Key,
                    Count = g.Count(),
                    Percentage = ordersWithReturns.Count == 0 ? 0m :
                        Math.Round((decimal)g.Count() * 100m / ordersWithReturns.Count, 1),
                })
                .OrderByDescending(x => x.Count)
                .Take(10).ToList();

            return new AdminProductsOverviewDto
            {
                GeneratedAt = DateTime.UtcNow,
                Kpis = new List<AdminKpiDto>
                {
                    Count("products", "Produits vendus", distinctProducts),
                    Count("quantity", "Unités totales", (int)totalQuantity),
                    Count("orders", "Commandes", orders.Count),
                    Count("returns", "Retours", totalReturns),
                    new AdminKpiDto
                    {
                        Key = "revenue", Label = "Chiffre d'affaires",
                        Value = totalRevenue,
                        FormattedValue = totalRevenue.ToString("N3", CultureInfo.GetCultureInfo("fr-FR")) + " TND",
                        DeltaDirection = "flat", Format = "currency"
                    },
                    Percent("returnRate", "Taux retour", Rate(totalReturns, orders.Count)),
                },
                TopByQuantity = byRef.OrderByDescending(x => x.Quantity).Take(topN).ToList(),
                TopByRevenue = byRef.OrderByDescending(x => x.Revenue).Take(topN).ToList(),
                TopByReturns = byRef.Where(x => x.ReturnsCount > 0)
                    .OrderByDescending(x => x.ReturnsCount).Take(topN).ToList(),
                RevenueByGovernorate = revByGov,
                ReturnsByGovernorate = retByGov,
            };
        }

        private static (DateTime from, DateTime to) ResolvePeriod(AdminProductsQueryDto q)
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
