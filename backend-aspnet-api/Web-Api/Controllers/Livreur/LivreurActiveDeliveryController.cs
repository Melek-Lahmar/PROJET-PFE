using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.Hubs;
using Web_Api.Model;
using Web_Api.Services.Sms;

namespace Web_Api.Controllers.Livreur
{
    /// <summary>
    /// Section 1.4 — Active Delivery + ping position GPS.
    ///  - POST /api/livreur/orders/{piece}/start-heading : marque cette commande
    ///    comme ACTIVE (1 seule à la fois pour ce livreur). Émet SignalR
    ///    DeliveryStarted vers le client.
    ///  - POST /api/livreur/orders/{piece}/stop-heading : démarque.
    ///  - POST /api/livreur/location/ping : UPSERT F_LIVREUR_POSITION + insert
    ///    F_LIVREUR_POSITION_HISTORY + push SignalR au client de la commande active.
    ///  - POST /api/livreur/location/ping-batch : flush de la queue offline GPS.
    /// </summary>
    [ApiController]
    [Route("api/livreur")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.ADMIN)]
    public class LivreurActiveDeliveryController : ControllerBase
    {
        private const double EarthRadiusKm = 6371.0;
        private const double AvgUrbanSpeedKmh = 40.0;

        private readonly AppDbContext _db;
        private readonly IHubContext<ReclamationHub> _hub;
        private readonly SmsNotificationService _sms;
        private readonly ILogger<LivreurActiveDeliveryController> _logger;

        public LivreurActiveDeliveryController(
            AppDbContext db,
            IHubContext<ReclamationHub> hub,
            SmsNotificationService sms,
            ILogger<LivreurActiveDeliveryController> logger)
        {
            _db = db;
            _hub = hub;
            _sms = sms;
            _logger = logger;
        }

        // ----- Active Delivery start / stop -----

        [HttpPost("orders/{piece}/start-heading")]
        public async Task<IActionResult> StartHeading(string piece, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            using var tx = await _db.Database.BeginTransactionAsync(ct);

            // Cible : la commande visée, EN_LIVRAISON et assignée à ce livreur
            var target = await _db.F_DOCENTETES.FirstOrDefaultAsync(
                e => e.DO_Piece == piece && e.AssignedLivreurId == userId.Value, ct);
            if (target == null)
                return NotFound(new { message = "Commande introuvable ou non assignée." });

            var liv = await _db.F_LIVRAISONS.FirstOrDefaultAsync(
                l => l.DO_Piece == piece, ct);
            if (liv == null || liv.LI_Statut != DeliveryStatusCodes.EnLivraison)
                return BadRequest(new { message = "La commande doit être EN_LIVRAISON pour démarrer la livraison active." });

            // Démarque toutes les autres commandes du livreur
            var others = await _db.F_DOCENTETES
                .Where(e => e.AssignedLivreurId == userId.Value
                         && e.IsActiveDelivery
                         && e.DO_Piece != piece)
                .ToListAsync(ct);
            foreach (var o in others)
            {
                o.IsActiveDelivery = false;
                o.cbModification = DateTime.UtcNow;
            }

            target.IsActiveDelivery = true;
            target.cbModification = DateTime.UtcNow;

            // UPSERT F_LIVREUR_POSITION.IsBroadcasting=true
            var pos = await _db.F_LIVREUR_POSITIONS.FirstOrDefaultAsync(
                p => p.LivreurUserId == userId.Value, ct);
            if (pos != null) pos.IsBroadcasting = true;

            _db.F_LIVRAISON_HISTORIQUES.Add(new F_LIVRAISON_HISTORIQUE
            {
                DoPiece = piece,
                LivreurUserId = userId.Value,
                Type = "ACTIVE_DELIVERY_START",
                CreatedAt = DateTime.UtcNow,
            });

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            // SignalR + SMS
            var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == userId.Value, ct);
            var livreurNom = profile?.NomComplet?.Trim();

            if (target.DO_ClientUserId.HasValue)
            {
                await _hub.Clients.User(target.DO_ClientUserId.Value.ToString()).SendAsync(
                    "DeliveryStarted",
                    new { piece, livreurNom, livreurTel = profile?.Telephone }, ct);
            }
            await _sms.NotifyAsync(SmsTrigger.ActiveDeliveryStarted, piece, ct);

            return Ok(new { piece, isActive = true });
        }

        [HttpPost("orders/{piece}/stop-heading")]
        public async Task<IActionResult> StopHeading(string piece, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();

            var target = await _db.F_DOCENTETES.FirstOrDefaultAsync(
                e => e.DO_Piece == piece && e.AssignedLivreurId == userId.Value, ct);
            if (target == null) return NotFound();

            target.IsActiveDelivery = false;
            target.cbModification = DateTime.UtcNow;

            // Si le livreur n'a plus aucune commande active, IsBroadcasting=false
            var stillActive = await _db.F_DOCENTETES.AsNoTracking()
                .AnyAsync(e => e.AssignedLivreurId == userId.Value && e.IsActiveDelivery, ct);
            if (!stillActive)
            {
                var pos = await _db.F_LIVREUR_POSITIONS
                    .FirstOrDefaultAsync(p => p.LivreurUserId == userId.Value, ct);
                if (pos != null) pos.IsBroadcasting = false;
            }

            _db.F_LIVRAISON_HISTORIQUES.Add(new F_LIVRAISON_HISTORIQUE
            {
                DoPiece = piece,
                LivreurUserId = userId.Value,
                Type = "ACTIVE_DELIVERY_STOP",
                CreatedAt = DateTime.UtcNow,
            });

            await _db.SaveChangesAsync(ct);

            if (target.DO_ClientUserId.HasValue)
            {
                await _hub.Clients.User(target.DO_ClientUserId.Value.ToString()).SendAsync(
                    "DeliveryStopped", new { piece }, ct);
            }

            return Ok(new { piece, isActive = false });
        }

        // ----- Ping position -----

        public class PingDto
        {
            public decimal Lat { get; set; }
            public decimal Lng { get; set; }
            public decimal? Accuracy { get; set; }
            public DateTime? CapturedAt { get; set; }
        }

        [HttpPost("location/ping")]
        public async Task<IActionResult> Ping([FromBody] PingDto body, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (body == null) return BadRequest();

            var captured = body.CapturedAt ?? DateTime.UtcNow;

            // UPSERT F_LIVREUR_POSITION
            var pos = await _db.F_LIVREUR_POSITIONS.FirstOrDefaultAsync(
                p => p.LivreurUserId == userId.Value, ct);
            if (pos == null)
            {
                pos = new F_LIVREUR_POSITION { LivreurUserId = userId.Value };
                _db.F_LIVREUR_POSITIONS.Add(pos);
            }
            pos.Lat = body.Lat;
            pos.Lng = body.Lng;
            pos.Accuracy = body.Accuracy;
            pos.UpdatedAt = DateTime.UtcNow;

            // Trouve la commande active du livreur (max 1 grâce à start-heading)
            var active = await _db.F_DOCENTETES.FirstOrDefaultAsync(
                e => e.AssignedLivreurId == userId.Value && e.IsActiveDelivery, ct);

            pos.IsBroadcasting = active != null;

            // Insert F_LIVREUR_POSITION_HISTORY (audit + replay batch)
            _db.F_LIVREUR_POSITION_HISTORIES.Add(new F_LIVREUR_POSITION_HISTORY
            {
                LivreurId = userId.Value,
                Lat = body.Lat,
                Lng = body.Lng,
                Accuracy = body.Accuracy,
                CapturedAt = captured,
                ReceivedAt = DateTime.UtcNow,
            });

            await _db.SaveChangesAsync(ct);

            // Push SignalR au client UNIQUEMENT si commande active
            if (active != null && active.DO_ClientUserId.HasValue)
            {
                var (etaMin, distKm) = await ComputeEtaAsync(active, body.Lat, body.Lng, ct);

                await _hub.Clients.User(active.DO_ClientUserId.Value.ToString()).SendAsync(
                    "LivreurPositionUpdate",
                    new
                    {
                        piece = active.DO_Piece,
                        lat = body.Lat,
                        lng = body.Lng,
                        etaMinutes = etaMin,
                        etaDistanceKm = distKm,
                    }, ct);

                // Anti-spam proximité
                if (distKm < 0.5 && !active.ProximityAlertSent)
                {
                    active.ProximityAlertSent = true;
                    await _db.SaveChangesAsync(ct);
                    var push = HttpContext.RequestServices
                        .GetService(typeof(Services.Push.PushNotificationService))
                        as Services.Push.PushNotificationService;
                    if (push != null)
                    {
                        await push.SendToUserAsync(
                            active.DO_ClientUserId.Value,
                            "Votre livreur arrive",
                            $"Préparez votre paiement de {(active.DO_NetAPayer ?? 0):N2} DT",
                            new { piece = active.DO_Piece, action = "open_tracking" });
                    }
                }
            }

            return Ok(new { ok = true });
        }

        public class PingBatchItem
        {
            public decimal Lat { get; set; }
            public decimal Lng { get; set; }
            public decimal? Accuracy { get; set; }
            public DateTime CapturedAt { get; set; }
            public Guid? ClientActionId { get; set; }
        }

        public class PingBatchDto
        {
            public List<PingBatchItem>? Positions { get; set; }
        }

        [HttpPost("location/ping-batch")]
        public async Task<IActionResult> PingBatch([FromBody] PingBatchDto body, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Forbid();
            if (body?.Positions == null || body.Positions.Count == 0) return BadRequest();

            var ordered = body.Positions.OrderBy(p => p.CapturedAt).ToList();

            // Filtre les ClientActionId déjà reçus pour idempotence
            var actionIds = ordered
                .Where(p => p.ClientActionId.HasValue)
                .Select(p => p.ClientActionId!.Value)
                .ToList();
            var alreadySeen = actionIds.Count == 0
                ? new HashSet<Guid>()
                : (await _db.F_LIVREUR_POSITION_HISTORIES.AsNoTracking()
                    .Where(h => h.ClientActionId != null && actionIds.Contains(h.ClientActionId.Value))
                    .Select(h => h.ClientActionId!.Value)
                    .ToListAsync(ct)).ToHashSet();

            var fresh = ordered.Where(p =>
                !p.ClientActionId.HasValue || !alreadySeen.Contains(p.ClientActionId.Value)).ToList();
            if (fresh.Count == 0) return Ok(new { inserted = 0, ok = true });

            foreach (var p in fresh)
            {
                _db.F_LIVREUR_POSITION_HISTORIES.Add(new F_LIVREUR_POSITION_HISTORY
                {
                    LivreurId = userId.Value,
                    Lat = p.Lat,
                    Lng = p.Lng,
                    Accuracy = p.Accuracy,
                    CapturedAt = p.CapturedAt,
                    ReceivedAt = DateTime.UtcNow,
                    ClientActionId = p.ClientActionId,
                });
            }

            // UPSERT F_LIVREUR_POSITION avec la dernière (la plus récente)
            var last = fresh.Last();
            var pos = await _db.F_LIVREUR_POSITIONS.FirstOrDefaultAsync(
                p => p.LivreurUserId == userId.Value, ct);
            if (pos == null)
            {
                pos = new F_LIVREUR_POSITION { LivreurUserId = userId.Value };
                _db.F_LIVREUR_POSITIONS.Add(pos);
            }
            pos.Lat = last.Lat;
            pos.Lng = last.Lng;
            pos.Accuracy = last.Accuracy;
            pos.UpdatedAt = DateTime.UtcNow;

            // Trouve la commande active
            var active = await _db.F_DOCENTETES.FirstOrDefaultAsync(
                e => e.AssignedLivreurId == userId.Value && e.IsActiveDelivery, ct);
            pos.IsBroadcasting = active != null;

            await _db.SaveChangesAsync(ct);

            // Pousse seulement la dernière position
            if (active != null && active.DO_ClientUserId.HasValue)
            {
                var (etaMin, distKm) = await ComputeEtaAsync(active, last.Lat, last.Lng, ct);
                await _hub.Clients.User(active.DO_ClientUserId.Value.ToString()).SendAsync(
                    "LivreurPositionUpdate",
                    new { piece = active.DO_Piece, lat = last.Lat, lng = last.Lng, etaMinutes = etaMin, etaDistanceKm = distKm }, ct);
            }

            return Ok(new { inserted = fresh.Count, ok = true });
        }

        // ----- Helpers -----

        private async Task<(int etaMin, double distKm)> ComputeEtaAsync(
            F_DOCENTETE active, decimal lat, decimal lng, CancellationToken ct)
        {
            // On essaie depuis le snapshot de livraison
            var liv = await _db.F_LIVRAISONS.AsNoTracking()
                .FirstOrDefaultAsync(l => l.DO_Piece == active.DO_Piece, ct);
            decimal? clientLat = ParseDecimal(liv?.LI_Latitude ?? active.DO_LatitudeLivraison);
            decimal? clientLng = ParseDecimal(liv?.LI_Longitude ?? active.DO_LongitudeLivraison);
            if (clientLat == null || clientLng == null) return (0, 0);

            var dist = Haversine(
                (double)lat, (double)lng,
                (double)clientLat.Value, (double)clientLng.Value);
            var eta = (int)System.Math.Round(dist / AvgUrbanSpeedKmh * 60.0);
            return (eta, System.Math.Round(dist, 2));
        }

        private static decimal? ParseDecimal(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            return decimal.TryParse(s.Replace(',', '.'),
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var v)
                ? v : null;
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
