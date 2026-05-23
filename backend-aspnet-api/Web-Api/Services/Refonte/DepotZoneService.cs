// backend-aspnet-api/Web-Api/Services/Refonte/DepotZoneService.cs
// Règle métier : 1 dépôt = 1 gouvernorat
// Un dépôt ne peut pas couvrir plusieurs gouvernorats différents.

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

        // ── Nouveau : filtre par gouvernorat ──────────────────────────────────
        /// <summary>
        /// Retourne les dépôts qui couvrent le gouvernorat donné.
        /// Avec la règle 1 dépôt = 1 gouvernorat, retourne en général 1 seul dépôt.
        /// Utilisé par le superviseur pour filtrer les dépôts lors de la création
        /// d'un livreur-transit.
        /// </summary>
        Task<IReadOnlyList<DepotForGouvernoratDto>> GetDepotsForGouvernoratAsync(string gouvernorat, CancellationToken ct = default);

        /// <summary>
        /// Retourne le gouvernorat couvert par un dépôt donné.
        /// Avec la règle 1 dépôt = 1 gouvernorat, retourne toujours 1 résultat.
        /// </summary>
        Task<string?> GetGouvernoratForDepotAsync(int depotNo, CancellationToken ct = default);
    }

    public sealed class DepotZoneService : IDepotZoneService
    {
        private readonly AppDbContext _db;

        public DepotZoneService(AppDbContext db) => _db = db;

        // ── Liste toutes les zones ─────────────────────────────────────────────
        public async Task<IReadOnlyList<DepotZoneDto>> ListAsync(CancellationToken ct = default)
        {
            var depots = await _db.F_DEPOTS.AsNoTracking()
                .ToDictionaryAsync(x => x.DE_No, ct);

            var zones = await _db.F_DEPOT_ZONES.AsNoTracking()
                .OrderBy(x => x.Gouvernorat)
                .ThenBy(x => x.Delegation)
                .ThenByDescending(x => x.IsPrimary)
                .ToListAsync(ct);

            return zones.Select(x => new DepotZoneDto
            {
                Id         = x.Id,
                DepotNo    = x.DepotNo,
                Gouvernorat = x.Gouvernorat,
                Delegation  = x.Delegation,
                IsPrimary   = x.IsPrimary,
                DepotName   = depots.TryGetValue(x.DepotNo, out var depot)
                    ? (depot.DE_Intitule ?? $"Dépôt {x.DepotNo}")
                    : $"Dépôt {x.DepotNo}"
            }).ToList();
        }

        // ── Créer une zone ────────────────────────────────────────────────────
        public async Task<F_DEPOT_ZONE> CreateAsync(UpsertDepotZoneRequest request, CancellationToken ct = default)
        {
            var gouvernorat = NormalizeLabel(request.Gouvernorat);
            var delegation  = NormalizeLabel(request.Delegation);

            if (string.IsNullOrWhiteSpace(gouvernorat) || string.IsNullOrWhiteSpace(delegation))
                throw new InvalidOperationException("Gouvernorat et délégation sont obligatoires.");

            // ── RÈGLE : 1 dépôt = 1 gouvernorat ───────────────────────────────
            // Vérifier que ce dépôt ne couvre pas déjà un autre gouvernorat
            var existingGouvernorat = await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(x => x.DepotNo == request.DepotNo)
                .Select(x => x.Gouvernorat)
                .Distinct()
                .FirstOrDefaultAsync(ct);

            if (existingGouvernorat != null &&
                !string.Equals(existingGouvernorat, gouvernorat, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Ce dépôt couvre déjà le gouvernorat '{existingGouvernorat}'. " +
                    "Un dépôt ne peut couvrir qu'un seul gouvernorat.");
            }

            // ── Vérifier qu'une délégation n'a pas déjà un dépôt principal ────
            if (request.IsPrimary)
            {
                var conflict = await _db.F_DEPOT_ZONES.AnyAsync(x =>
                    x.Gouvernorat == gouvernorat &&
                    x.Delegation  == delegation  &&
                    x.IsPrimary, ct);

                if (conflict)
                    throw new InvalidOperationException(
                        $"La délégation '{delegation}' a déjà un dépôt principal.");
            }

            // ── Vérifier doublons (même dépôt + même délégation) ──────────────
            var duplicate = await _db.F_DEPOT_ZONES.AnyAsync(x =>
                x.DepotNo     == request.DepotNo &&
                x.Gouvernorat == gouvernorat &&
                x.Delegation  == delegation, ct);

            if (duplicate)
                throw new InvalidOperationException(
                    $"La zone '{gouvernorat} · {delegation}' existe déjà pour ce dépôt.");

            var entity = new F_DEPOT_ZONE
            {
                DepotNo     = request.DepotNo,
                Gouvernorat = gouvernorat,
                Delegation  = delegation,
                IsPrimary   = request.IsPrimary,
                CreatedAt   = DateTime.UtcNow
            };

            _db.F_DEPOT_ZONES.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity;
        }

        // ── Supprimer une zone ────────────────────────────────────────────────
        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _db.F_DEPOT_ZONES.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity == null) return;
            _db.F_DEPOT_ZONES.Remove(entity);
            await _db.SaveChangesAsync(ct);
        }

        // ── Options de retrait (pickup) pour un client ────────────────────────
        public async Task<PickupOptionsDto> GetPickupOptionsAsync(
            string gouvernorat, string delegation, CancellationToken ct = default)
        {
            var g = NormalizeLabel(gouvernorat);
            var d = NormalizeLabel(delegation);

            var primary = await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(x => x.Gouvernorat == g && x.Delegation == d && x.IsPrimary)
                .OrderBy(x => x.DepotNo)
                .FirstOrDefaultAsync(ct);

            var depots  = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);
            var center  = TunisiaCenter(g, d);

            var nearest = depots
                .Select(x => new PickupDepotOptionDto
                {
                    DepotNo    = x.DE_No,
                    Name       = x.DE_Intitule ?? $"Dépôt {x.DE_No}",
                    City       = x.DE_Ville ?? string.Empty,
                    DistanceKm = Math.Round(
                        HaversineKm(center.Lat, center.Lng, DepotCenter(x).Lat, DepotCenter(x).Lng), 1)
                })
                .OrderBy(x => x.DistanceKm)
                .Take(3)
                .ToList();

            if (nearest.Count > 0) nearest[0].IsRecommended = true;

            return new PickupOptionsDto
            {
                IsCovered      = primary != null,
                PrimaryDepotNo = primary?.DepotNo,
                NearestDepots  = nearest
            };
        }

        // ── NOUVEAU : dépôts couvrant un gouvernorat ──────────────────────────
        public async Task<IReadOnlyList<DepotForGouvernoratDto>> GetDepotsForGouvernoratAsync(
            string gouvernorat, CancellationToken ct = default)
        {
            var g = NormalizeLabel(gouvernorat);

            // Dépôt(s) qui ont au moins une zone dans ce gouvernorat
            var depotNos = await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(x => x.Gouvernorat == g)
                .Select(x => x.DepotNo)
                .Distinct()
                .ToListAsync(ct);

            if (depotNos.Count == 0)
                return Array.Empty<DepotForGouvernoratDto>();

            var depots = await _db.F_DEPOTS.AsNoTracking()
                .Where(x => depotNos.Contains(x.DE_No))
                .OrderBy(x => x.DE_No)
                .ToListAsync(ct);

            return depots.Select(x => new DepotForGouvernoratDto
            {
                DepotNo    = x.DE_No,
                Code       = x.DE_Code ?? string.Empty,
                Intitule   = x.DE_Intitule ?? $"Dépôt {x.DE_No}",
                Ville      = x.DE_Ville ?? string.Empty,
                Principal  = x.DE_Principal == 1
            }).ToList();
        }

        // ── NOUVEAU : gouvernorat d'un dépôt ──────────────────────────────────
        public async Task<string?> GetGouvernoratForDepotAsync(int depotNo, CancellationToken ct = default)
        {
            return await _db.F_DEPOT_ZONES.AsNoTracking()
                .Where(x => x.DepotNo == depotNo)
                .Select(x => x.Gouvernorat)
                .FirstOrDefaultAsync(ct);
        }

        // ── Helpers géographiques (inchangés) ────────────────────────────────

        private static string NormalizeLabel(string? value) =>
            (value ?? string.Empty).Trim();

        private static (double Lat, double Lng) DepotCenter(F_DEPOT depot)
        {
            var city = (depot.DE_Ville ?? depot.DE_Intitule ?? string.Empty).ToLowerInvariant();
            return city switch
            {
                var c when c.Contains("tunis")   => (36.8065, 10.1815),
                var c when c.Contains("sfax")    => (34.7398, 10.7601),
                var c when c.Contains("sousse")  => (35.8245, 10.6346),
                var c when c.Contains("bizerte") => (37.2746, 9.8739),
                var c when c.Contains("nabeul")  => (36.4513, 10.7357),
                var c when c.Contains("kairouan")=> (35.6781, 10.0963),
                var c when c.Contains("monastir")=> (35.7643, 10.8113),
                var c when c.Contains("gabes")   => (33.8833, 10.0983),
                var c when c.Contains("gafsa")   => (34.4311, 8.7757),
                var c when c.Contains("medenine")=> (33.3549, 10.5055),
                _ => (34.0, 9.0) // centre Tunisie par défaut
            };
        }

        private static (double Lat, double Lng) TunisiaCenter(string gouvernorat, string delegation)
        {
            var g = gouvernorat.ToLowerInvariant();
            return g switch
            {
                var x when x.Contains("tunis")     => (36.8065, 10.1815),
                var x when x.Contains("ariana")    => (36.8625, 10.1956),
                var x when x.Contains("manouba")   => (36.8097, 10.0989),
                var x when x.Contains("ben arous") => (36.7533, 10.2283),
                var x when x.Contains("nabeul")    => (36.4513, 10.7357),
                var x when x.Contains("zaghouan")  => (36.4029, 10.1429),
                var x when x.Contains("bizerte")   => (37.2746, 9.8739),
                var x when x.Contains("beja")      => (36.7256, 9.1817),
                var x when x.Contains("jendouba")  => (36.5011, 8.7803),
                var x when x.Contains("kef")       => (36.1674, 8.7048),
                var x when x.Contains("siliana")   => (36.0849, 9.3709),
                var x when x.Contains("kairouan")  => (35.6781, 10.0963),
                var x when x.Contains("kasserine") => (35.1676, 8.8365),
                var x when x.Contains("sidi bouzid") => (35.0382, 9.4856),
                var x when x.Contains("sousse")    => (35.8245, 10.6346),
                var x when x.Contains("monastir")  => (35.7643, 10.8113),
                var x when x.Contains("mahdia")    => (35.5047, 11.0622),
                var x when x.Contains("sfax")      => (34.7398, 10.7601),
                var x when x.Contains("gafsa")     => (34.4311, 8.7757),
                var x when x.Contains("tozeur")    => (33.9197, 8.1335),
                var x when x.Contains("kebili")    => (33.7042, 8.9719),
                var x when x.Contains("gabes")     => (33.8833, 10.0983),
                var x when x.Contains("medenine")  => (33.3549, 10.5055),
                var x when x.Contains("tataouine") => (32.9211, 10.4518),
                _ => (34.0, 9.0)
            };
        }

        private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6371;
            var dLat = ToRad(lat2 - lat1);
            var dLng = ToRad(lng2 - lng1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                  + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                  * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static double ToRad(double deg) => deg * Math.PI / 180;
    }

    // ── DTO ajouté ────────────────────────────────────────────────────────────
    // À placer dans Web-Api/DTO/Refonte/RefonteDtos.cs
    public sealed class DepotForGouvernoratDto
    {
        public int    DepotNo  { get; set; }
        public string Code     { get; set; } = string.Empty;
        public string Intitule { get; set; } = string.Empty;
        public string Ville    { get; set; } = string.Empty;
        public bool   Principal { get; set; }
    }
}
