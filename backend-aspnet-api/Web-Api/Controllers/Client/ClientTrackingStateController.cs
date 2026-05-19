using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Constants;
using Web_Api.data;

namespace Web_Api.Controllers.Client
{
    /// <summary>
    /// Section 1.4 — endpoint qui retourne l'état UI à afficher côté client
    /// pour une commande donnée. Centralise la logique métier "tracking-state"
    /// (AT_DEPOT / IN_DELIVERY_QUEUE / HEADING_TO_YOU / TERMINAL).
    /// </summary>
    [ApiController]
    [Route("api/client/orders")]
    [Authorize(Roles = AppRoles.CLIENT + "," + AppRoles.ADMIN)]
    public class ClientTrackingStateController : ControllerBase
    {
        private const double EarthRadiusKm = 6371.0;
        private const double AvgUrbanSpeedKmh = 40.0;

        private readonly AppDbContext _db;

        public ClientTrackingStateController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("{piece}/tracking-state")]
        public async Task<IActionResult> Get(string piece, CancellationToken ct)
        {
            var entete = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(e => e.DO_Piece == piece, ct);
            if (entete == null)
                return NotFound(new { message = "Commande introuvable." });

            // Vérifier que c'est bien la commande du client connecté (sauf admin)
            var userId = CurrentUserId();
            if (!User.IsInRole(AppRoles.ADMIN) && entete.DO_ClientUserId != userId)
                return Forbid();

            var liv = await _db.F_LIVRAISONS.AsNoTracking()
                .FirstOrDefaultAsync(l => l.DO_Piece == piece, ct);

            // Cas terminal
            if (liv?.LI_Statut == DeliveryStatusCodes.Livre
                || liv?.LI_Statut == DeliveryStatusCodes.Retour
                || entete.DO_Valide == 3) // REFUSE
            {
                var label = liv?.LI_Statut switch
                {
                    DeliveryStatusCodes.Livre => "Commande livrée",
                    DeliveryStatusCodes.Retour => "Commande retournée",
                    _ => "Commande refusée",
                };
                return Ok(new
                {
                    state = "TERMINAL",
                    message = label,
                    showMap = false,
                });
            }

            // Cas dépôt (jamais sortie ou attendu reprogrammation)
            if (liv?.LI_Statut == DeliveryStatusCodes.Depot || liv?.LI_Statut == DeliveryStatusCodes.Reporte)
            {
                return Ok(new
                {
                    state = "AT_DEPOT",
                    message = liv.LI_Statut == DeliveryStatusCodes.Reporte
                        ? "Votre commande sera relancée bientôt"
                        : "Votre commande est au dépôt",
                    sub = "Elle sera livrée prochainement",
                    showMap = false,
                    depotPassageNumber = liv.DepotPassageNumber,
                });
            }

            // EN_LIVRAISON ?
            if (liv?.LI_Statut == DeliveryStatusCodes.EnLivraison)
            {
                if (!entete.IsActiveDelivery)
                {
                    return Ok(new
                    {
                        state = "IN_DELIVERY_QUEUE",
                        message = "Votre commande est en cours de livraison",
                        sub = "Le livreur arrivera bientôt",
                        showMap = false,
                    });
                }

                // HEADING_TO_YOU
                string? livreurNom = null;
                string? livreurTel = null;
                decimal? curLat = null, curLng = null;
                DateTime? lastPing = null;

                if (entete.AssignedLivreurId.HasValue)
                {
                    var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.UtilisateurId == entete.AssignedLivreurId.Value, ct);
                    livreurNom = profile?.NomComplet?.Trim();
                    livreurTel = profile?.Telephone;

                    var pos = await _db.F_LIVREUR_POSITIONS.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.LivreurUserId == entete.AssignedLivreurId.Value, ct);
                    if (pos != null)
                    {
                        curLat = pos.Lat;
                        curLng = pos.Lng;
                        lastPing = pos.UpdatedAt;
                    }
                }

                int etaMin = 0;
                double distKm = 0;
                if (curLat.HasValue && curLng.HasValue)
                {
                    var clientLat = ParseDecimal(liv.LI_Latitude ?? entete.DO_LatitudeLivraison);
                    var clientLng = ParseDecimal(liv.LI_Longitude ?? entete.DO_LongitudeLivraison);
                    if (clientLat.HasValue && clientLng.HasValue)
                    {
                        distKm = Haversine(
                            (double)curLat.Value, (double)curLng.Value,
                            (double)clientLat.Value, (double)clientLng.Value);
                        etaMin = (int)System.Math.Round(distKm / AvgUrbanSpeedKmh * 60.0);
                    }
                }

                int? freshness = lastPing.HasValue
                    ? (int)System.Math.Round((DateTime.UtcNow - lastPing.Value).TotalSeconds)
                    : null;

                return Ok(new
                {
                    state = "HEADING_TO_YOU",
                    message = "Votre livreur arrive !",
                    showMap = true,
                    livreurNom,
                    livreurTel,
                    lat = curLat,
                    lng = curLng,
                    etaMinutes = etaMin,
                    etaDistanceKm = System.Math.Round(distKm, 2),
                    freshness,
                });
            }

            // Default = en attente confirmation
            return Ok(new
            {
                state = "AWAITING_CONFIRMATION",
                message = "Votre commande est en attente de confirmation",
                showMap = false,
            });
        }

        private static decimal? ParseDecimal(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            return decimal.TryParse(s.Replace(',', '.'),
                NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : null;
        }

        private static double Haversine(double lat1, double lng1, double lat2, double lng2)
        {
            var dLat = ToRad(lat2 - lat1);
            var dLng = ToRad(lng2 - lng1);
            var a = System.Math.Sin(dLat / 2) * System.Math.Sin(dLat / 2)
                  + System.Math.Cos(ToRad(lat1)) * System.Math.Cos(ToRad(lat2))
                  * System.Math.Sin(dLng / 2) * System.Math.Sin(dLng / 2);
            var c = 2 * System.Math.Atan2(System.Math.Sqrt(a), System.Math.Sqrt(1 - a));
            return EarthRadiusKm * c;
        }

        private static double ToRad(double deg) => deg * System.Math.PI / 180.0;

        private Guid? CurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var g) ? g : null;
        }
    }
}
