using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.DTO.Refonte;
using Web_Api.Model;

namespace Web_Api.Services.Refonte
{
    public interface IDepotZoneService
    {
        Task<IReadOnlyList<DepotZoneDto>> ListAsync(CancellationToken ct = default);
        Task<F_DEPOT_ZONE> CreateAsync(UpsertDepotZoneRequest request, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task<PickupOptionsDto> GetPickupOptionsAsync(string gouvernorat, string delegation, CancellationToken ct = default);
    }

    public sealed class DepotZoneService : IDepotZoneService
    {
        private readonly AppDbContext _db;

        public DepotZoneService(AppDbContext db) => _db = db;

        public async Task<IReadOnlyList<DepotZoneDto>> ListAsync(CancellationToken ct = default)
        {
            var depots = await _db.F_DEPOTS.AsNoTracking().ToDictionaryAsync(x => x.DE_No, ct);
            var zones = await _db.F_DEPOT_ZONES.AsNoTracking()
                .OrderBy(x => x.Gouvernorat).ThenBy(x => x.Delegation).ThenByDescending(x => x.IsPrimary)
                .ToListAsync(ct);

            return zones.Select(x => new DepotZoneDto
            {
                Id = x.Id,
                DepotNo = x.DepotNo,
                Gouvernorat = x.Gouvernorat,
                Delegation = x.Delegation,
                IsPrimary = x.IsPrimary,
                DepotName = depots.TryGetValue(x.DepotNo, out var depot) ? (depot.DE_Intitule ?? $"Dépôt {x.DepotNo}") : $"Dépôt {x.DepotNo}"
            }).ToList();
        }

        public async Task<F_DEPOT_ZONE> CreateAsync(UpsertDepotZoneRequest request, CancellationToken ct = default)
        {
            var gouvernorat = NormalizeLabel(request.Gouvernorat);
            var delegation = NormalizeLabel(request.Delegation);
            if (string.IsNullOrWhiteSpace(gouvernorat) || string.IsNullOrWhiteSpace(delegation))
                throw new InvalidOperationException("Gouvernorat et délégation sont obligatoires.");

            if (request.IsPrimary)
            {
                var conflict = await _db.F_DEPOT_ZONES.AnyAsync(x =>
                    x.Gouvernorat == gouvernorat && x.Delegation == delegation && x.IsPrimary, ct);
                if (conflict)
                    throw new InvalidOperationException("Une délégation ne peut avoir qu'un seul dépôt principal.");
            }

            var entity = new F_DEPOT_ZONE
            {
                DepotNo = request.DepotNo,
                Gouvernorat = gouvernorat,
                Delegation = delegation,
                IsPrimary = request.IsPrimary,
                CreatedAt = DateTime.UtcNow
            };
            _db.F_DEPOT_ZONES.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity;
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _db.F_DEPOT_ZONES.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity == null) return;
            _db.F_DEPOT_ZONES.Remove(entity);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<PickupOptionsDto> GetPickupOptionsAsync(string gouvernorat, string delegation, CancellationToken ct = default)
        {
            var g = NormalizeLabel(gouvernorat);
            var d = NormalizeLabel(delegation);
            var primary = await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(x => x.Gouvernorat == g && x.Delegation == d && x.IsPrimary)
                .OrderBy(x => x.DepotNo)
                .FirstOrDefaultAsync(ct);

            var depots = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);
            var center = TunisiaCenter(g, d);
            var nearest = depots
                .Select(x => new PickupDepotOptionDto
                {
                    DepotNo = x.DE_No,
                    Name = x.DE_Intitule ?? $"Dépôt {x.DE_No}",
                    City = x.DE_Ville ?? string.Empty,
                    DistanceKm = Math.Round(HaversineKm(center.Lat, center.Lng, DepotCenter(x).Lat, DepotCenter(x).Lng), 1)
                })
                .OrderBy(x => x.DistanceKm)
                .Take(3)
                .ToList();
            if (nearest.Count > 0) nearest[0].IsRecommended = true;

            return new PickupOptionsDto
            {
                IsCovered = primary != null,
                PrimaryDepotNo = primary?.DepotNo,
                NearestDepots = nearest
            };
        }

        private static string NormalizeLabel(string? value) => (value ?? string.Empty).Trim();

        private static (double Lat, double Lng) DepotCenter(F_DEPOT depot)
        {
            var city = (depot.DE_Ville ?? depot.DE_Intitule ?? string.Empty).ToUpperInvariant();
            if (city.Contains("SFAX")) return (34.7406, 10.7603);
            if (city.Contains("SOUSSE")) return (35.8245, 10.6346);
            return (36.8065, 10.1815);
        }

        private static (double Lat, double Lng) TunisiaCenter(string gouvernorat, string delegation)
        {
            var g = gouvernorat.ToUpperInvariant();
            if (g.Contains("SFAX")) return (34.7406, 10.7603);
            if (g.Contains("SOUSSE") || g.Contains("MONASTIR") || g.Contains("MAHDIA") || g.Contains("KAIROUAN")) return (35.8245, 10.6346);
            if (g.Contains("GABES") || g.Contains("MEDENINE") || g.Contains("TATAOUINE")) return (33.8869, 10.0982);
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
    }
}
