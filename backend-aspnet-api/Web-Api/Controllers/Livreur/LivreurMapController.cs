using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Livreur;

namespace Web_Api.Controllers.Livreur
{
    /// <summary>
    /// Section 1.6 — endpoints carte enrichis livreur :
    ///  - Heatmap des retours/reports (1.6.2)
    ///  - Optimisation de tournée par "plus proche voisin" (1.6.4)
    ///
    /// Pas de Google Directions ici : Haversine + vitesse moyenne suffisent
    /// pour une démo PFE et restent gratuits.
    /// </summary>
    [ApiController]
    [Route("api/livreur")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.ADMIN)]
    public class LivreurMapController : ControllerBase
    {
        private readonly AppDbContext _db;
        private const double AvgUrbanSpeedKmh = 35.0;
        private const double EarthRadiusKm = 6371.0;

        public LivreurMapController(AppDbContext db)
        {
            _db = db;
        }

        // -------------------------------------------------------------------
        // GET /api/livreur/map/heatmap?gouvernorat=Sousse&days=90
        // -------------------------------------------------------------------
        [HttpGet("map/heatmap")]
        public async Task<IActionResult> Heatmap(
            [FromQuery] string? gouvernorat,
            [FromQuery] int days = 90,
            CancellationToken ct = default)
        {
            if (days <= 0 || days > 365) days = 90;

            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var since = DateTime.UtcNow.AddDays(-days);

            // On agrège par cellule de ~500m (≈ 0.0045°). Pour rester simple, on
            // groupe les statuts Reporte+Retour comme "incidents" et compare au
            // total des livraisons sur la zone.
            var commandes = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Where(x => x.LI_DateCreation >= since
                         && !string.IsNullOrEmpty(x.LI_Latitude)
                         && !string.IsNullOrEmpty(x.LI_Longitude))
                .Select(x => new
                {
                    x.LI_Latitude,
                    x.LI_Longitude,
                    x.LI_Statut,
                    x.LI_Ville,
                })
                .ToListAsync(ct);

            if (!string.IsNullOrWhiteSpace(gouvernorat))
            {
                var g = gouvernorat.Trim().ToUpperInvariant();
                commandes = commandes
                    .Where(c => (c.LI_Ville ?? "").ToUpperInvariant().Contains(g))
                    .ToList();
            }

            const double cellDeg = 0.0045; // ~500 m

            var cells = commandes
                .Select(c => new
                {
                    Lat = ParseLatLng(c.LI_Latitude),
                    Lng = ParseLatLng(c.LI_Longitude),
                    Incident = c.LI_Statut == DeliveryStatusCodes.Reporte
                            || c.LI_Statut == DeliveryStatusCodes.Retour,
                })
                .Where(c => c.Lat != null && c.Lng != null)
                .GroupBy(c => (
                    Lat: Math.Round(c.Lat!.Value / cellDeg) * cellDeg,
                    Lng: Math.Round(c.Lng!.Value / cellDeg) * cellDeg))
                .Select(g => new HeatmapCellDto
                {
                    Lat = g.Key.Lat,
                    Lng = g.Key.Lng,
                    Weight = g.Count() == 0
                        ? 0
                        : Math.Round((double)g.Count(c => c.Incident) / g.Count(), 3),
                })
                .Where(c => c.Weight > 0)
                .OrderByDescending(c => c.Weight)
                .Take(500)
                .ToList();

            return Ok(new HeatmapResponseDto
            {
                Cells = cells,
                Days = days,
                Gouvernorat = gouvernorat,
            });
        }

        // -------------------------------------------------------------------
        // GET /api/livreur/tournee/optimize?lat=35.82&lng=10.63
        // -------------------------------------------------------------------
        [HttpGet("tournee/optimize")]
        public async Task<IActionResult> OptimizeTournee(
            [FromQuery] double lat,
            [FromQuery] double lng,
            CancellationToken ct)
        {
            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var commandes = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Where(x => x.LivreurId == profile.cbMarq
                         && (x.LI_Statut == DeliveryStatusCodes.EnLivraison
                          || x.LI_Statut == DeliveryStatusCodes.Depot)
                         && !string.IsNullOrEmpty(x.LI_Latitude)
                         && !string.IsNullOrEmpty(x.LI_Longitude))
                .ToListAsync(ct);

            var stops = new List<TourneeStopDto>();
            var remaining = commandes
                .Select(c => new TourneeStopDto
                {
                    Piece = c.DO_Piece,
                    Lat = ParseLatLng(c.LI_Latitude) ?? 0,
                    Lng = ParseLatLng(c.LI_Longitude) ?? 0,
                    Address = c.LI_Adresse,
                })
                .Where(s => s.Lat != 0 || s.Lng != 0)
                .ToList();

            // Récupère les noms client en bloc pour enrichir l'affichage
            var pieces = remaining.Select(s => s.Piece).ToList();
            var entetes = await _db.F_DOCENTETES.AsNoTracking()
                .Where(e => pieces.Contains(e.DO_Piece!))
                .ToDictionaryAsync(e => e.DO_Piece!, e => e.DO_Tiers ?? "", ct);

            // Nearest neighbor
            var currentLat = lat;
            var currentLng = lng;
            double cumulativeDistance = 0;
            int order = 1;

            while (remaining.Count > 0)
            {
                var nearest = remaining
                    .OrderBy(s => Haversine(currentLat, currentLng, s.Lat, s.Lng))
                    .First();

                var dist = Haversine(currentLat, currentLng, nearest.Lat, nearest.Lng);
                cumulativeDistance += dist;

                nearest.OrderIndex = order++;
                nearest.DistanceFromPreviousKm = Math.Round(dist, 2);
                nearest.CumulativeDistanceKm = Math.Round(cumulativeDistance, 2);
                nearest.CumulativeEtaMinutes = (int)Math.Round(cumulativeDistance / AvgUrbanSpeedKmh * 60);
                if (entetes.TryGetValue(nearest.Piece, out var tiers) && !string.IsNullOrWhiteSpace(tiers))
                {
                    nearest.ClientName = tiers;
                }

                stops.Add(nearest);
                currentLat = nearest.Lat;
                currentLng = nearest.Lng;
                remaining.Remove(nearest);
            }

            return Ok(new TourneeOptimizeResponseDto
            {
                Stops = stops,
                TotalDistanceKm = Math.Round(cumulativeDistance, 2),
                TotalEtaMinutes = (int)Math.Round(cumulativeDistance / AvgUrbanSpeedKmh * 60),
                StartLat = lat,
                StartLng = lng,
            });
        }

        // -------------------------------------------------------------------
        // Helpers
        // -------------------------------------------------------------------
        private async Task<ProfilUtilisateur?> GetCurrentProfileAsync(CancellationToken ct)
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(raw, out var userId)) return null;
            return await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);
        }

        private static double? ParseLatLng(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var s = raw.Replace(',', '.').Trim();
            return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : null;
        }

        private static double Haversine(double lat1, double lng1, double lat2, double lng2)
        {
            var dLat = ToRad(lat2 - lat1);
            var dLng = ToRad(lng2 - lng1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                  + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                  * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return EarthRadiusKm * c;
        }

        private static double ToRad(double deg) => deg * Math.PI / 180.0;
    }
}
