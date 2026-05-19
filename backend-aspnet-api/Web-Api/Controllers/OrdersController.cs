using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using System.Security.Claims;
using Web_Api.Auth.Constants;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.Model;
using Web_Api.Services;
using Web_Api.Services.Refonte;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/orders")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly BonCommandeService _bonCommandeService;
        private readonly IOrderTimelineService _timeline;

        public OrdersController(
            AppDbContext db,
            BonCommandeService bonCommandeService,
            IOrderTimelineService timeline)
        {
            _db = db;
            _bonCommandeService = bonCommandeService;
            _timeline = timeline;
        }

        [HttpPost]
        public async Task<ActionResult<BonCommandeResponseDto>> Create([FromBody] CreateBonCommandeRequestDto req, CancellationToken ct)
        {
            try
            {
                var email = User.FindFirstValue(ClaimTypes.Email);
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);

                if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(userIdStr))
                    return Unauthorized();

                if (!Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                var result = await _bonCommandeService.CreateForAuthenticatedClientAsync(userId, email, req, ct);
                return Ok(MapToResponse(result.Entete, result.Lignes.ToList(), null));
            }
            catch (BonCommandeService.BonCommandeValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur serveur.", detail = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("guest")]
        public async Task<ActionResult<BonCommandeResponseDto>> CreateGuest([FromBody] CreateGuestBonCommandeRequestDto req, CancellationToken ct)
        {
            try
            {
                var result = await _bonCommandeService.CreateForGuestAsync(req, ct);
                return Ok(MapToResponse(result.Entete, result.Lignes.ToList(), null));
            }
            catch (BonCommandeService.BonCommandeValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur serveur.", detail = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<List<BonCommandeResponseDto>>> GetMine(CancellationToken ct)
        {
            var email = User.FindFirstValue(ClaimTypes.Email);
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(userIdStr))
                return Unauthorized();

            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var clientCode = await _bonCommandeService.ResolveClientCodeAsync(userId, email, ct);

            var entetes = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(e => (e.DO_ClientUserId == userId) || (e.DO_ClientUserId == null && e.DO_Tiers == clientCode))
                .OrderByDescending(e => e.DO_Date)
                .ThenByDescending(e => e.cbMarq)
                .ToListAsync(ct);

            if (entetes.Count == 0)
                return Ok(new List<BonCommandeResponseDto>());

            var pieces = entetes
                .Select(e => e.DO_Piece)
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Distinct()
                .Cast<string>()
                .ToList();

            var lignes = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(l => pieces.Contains(l.DO_Piece!))
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            var livraisonMap = await BuildLatestLivraisonMapAsync(pieces, ct);
            var grouped = lignes
                .GroupBy(l => l.DO_Piece ?? string.Empty)
                .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

            var result = new List<BonCommandeResponseDto>();
            foreach (var e in entetes)
            {
                var piece = e.DO_Piece ?? string.Empty;
                grouped.TryGetValue(piece, out var ls);
                livraisonMap.TryGetValue(piece, out var livraison);
                result.Add(MapToResponse(e, ls ?? new List<F_DOCLIGNE>(), livraison));
            }

            return Ok(result);
        }

        [HttpGet("{piece}")]
        public async Task<ActionResult<BonCommandeResponseDto>> GetMineByPiece(string piece, CancellationToken ct)
        {
            piece = (piece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                return BadRequest(new { message = "Piece invalide." });

            var email = User.FindFirstValue(ClaimTypes.Email);
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(userIdStr))
                return Unauthorized();

            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var clientCode = await _bonCommandeService.ResolveClientCodeAsync(userId, email, ct);

            var entete = await _db.F_DOCENTETES
                .AsNoTracking()
                .FirstOrDefaultAsync(e =>
                    e.DO_Piece == piece &&
                    ((e.DO_ClientUserId == userId) || (e.DO_ClientUserId == null && e.DO_Tiers == clientCode)), ct);

            if (entete == null)
                return NotFound(new { message = "Commande introuvable." });

            var lignes = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(l => l.DO_Piece == piece)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            var livraison = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Where(x => x.DO_Piece == piece)
                .OrderByDescending(x => x.cbMarq)
                .FirstOrDefaultAsync(ct);

            return Ok(MapToResponse(entete, lignes, livraison));
        }

        [HttpGet("{piece}/timeline")]
        public async Task<IActionResult> GetTimeline(string piece, CancellationToken ct)
        {
            piece = (piece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                return BadRequest(new { message = "Piece invalide." });

            if (!await CanReadOrderAsync(piece, ct))
                return NotFound(new { message = "Commande introuvable." });

            var timeline = await _timeline.GetOrderTimelineAsync(piece, ct);
            if (timeline == null)
                return NotFound(new { message = "Commande introuvable." });

            return Ok(timeline);
        }

        [HttpGet("{piece}/transit-summary")]
        public async Task<IActionResult> GetTransitSummary(string piece, CancellationToken ct)
        {
            piece = (piece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                return BadRequest(new { message = "Piece invalide." });

            if (!await CanReadOrderAsync(piece, ct))
                return NotFound(new { message = "Commande introuvable." });

            var summary = await _timeline.GetItemsTransitSummaryAsync(piece, ct);
            if (summary == null)
                return NotFound(new { message = "Commande introuvable." });

            return Ok(summary);
        }

        private async Task<Dictionary<string, F_LIVRAISON>> BuildLatestLivraisonMapAsync(List<string> pieces, CancellationToken ct)
        {
            var livraisons = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Where(x => pieces.Contains(x.DO_Piece))
                .OrderByDescending(x => x.cbMarq)
                .ToListAsync(ct);

            return livraisons
                .GroupBy(x => x.DO_Piece, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        }

        private static BonCommandeResponseDto MapToResponse(F_DOCENTETE e, List<F_DOCLIGNE> lignes, F_LIVRAISON? livraison)
        {
            return new BonCommandeResponseDto
            {
                Piece = e.DO_Piece ?? string.Empty,
                Date = e.DO_Date,
                ClientCode = e.DO_Tiers ?? string.Empty,
                DepotNo = e.DE_No ?? 0,
                Status = ResolveClientStatus(e, livraison),
                StatusCode = ResolveClientStatusCode(e, livraison),
                TimelineStage = ResolveClientTimelineStage(e, livraison),
                StatusSource = livraison != null ? "F_LIVRAISON" : "F_DOCENTETE",
                AssignedAt = livraison?.LI_DateCreation,
                DeliveredAt = livraison?.LI_DateLivree,
                ReplannedAt = livraison?.LI_DateReplanification,
                DriverNote = livraison?.LI_Commentaire,
                TotalHT = e.DO_TotalHT ?? 0m,
                TotalTTC = e.DO_TotalTTC ?? 0m,
                FraisLivraison = e.DO_FraisLivraison ?? 0m,
                TimbreFiscal = e.DO_TimbreFiscal ?? 0m,
                NetAPayer = e.DO_NetAPayer ?? 0m,
                DeliveryType = e.DO_ModeLivraison,
                PaymentMethod = e.DO_ModePaiement,
                Address = e.DO_AdresseLivraison,
                City = e.DO_VilleLivraison,
                PostalCode = e.DO_CodePostalLivraison,
                Latitude = e.DO_LatitudeLivraison,
                Longitude = e.DO_LongitudeLivraison,
                Lines = lignes.Select(l => new BonCommandeLineResponseDto
                {
                    ArticleRef = l.AR_Ref ?? string.Empty,
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountHT = l.DL_MontantHT ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList()
            };
        }

        private static string ResolveClientStatus(F_DOCENTETE entete, F_LIVRAISON? livraison)
        {
            if (livraison != null)
                return MapLivraisonCodeToStatus(livraison.LI_Statut);

            return entete.DocumentStatus;
        }

        private static short ResolveClientStatusCode(F_DOCENTETE entete, F_LIVRAISON? livraison)
        {
            if (livraison == null)
                return entete.DO_Valide ?? 0;

            return livraison.LI_Statut switch
            {
                DeliveryStatusCodes.Confirme => 1,
                DeliveryStatusCodes.EnLivraison => 4,
                DeliveryStatusCodes.Livre => 5,
                DeliveryStatusCodes.Reporte => 6,
                DeliveryStatusCodes.Retour => 7,
                DeliveryStatusCodes.Depot => 8,
                _ => entete.DO_Valide ?? 0
            };
        }

        private static string ResolveClientTimelineStage(F_DOCENTETE entete, F_LIVRAISON? livraison)
        {
            var status = ResolveClientStatus(entete, livraison);
            return status switch
            {
                var s when s == DeliveryStatuses.Confirme => "CONFIRMED",
                var s when s == DeliveryStatuses.EnLivraison => "IN_TRANSIT",
                var s when s == DeliveryStatuses.Livre => "DELIVERED",
                var s when s == DeliveryStatuses.Reporte => "RESCHEDULED",
                var s when s == DeliveryStatuses.Retour => "RETURNED",
                var s when s == DeliveryStatuses.Depot => "AT_DEPOT",
                var s when s == DeliveryStatuses.Tentative => "ATTEMPTED",
                var s when s == DeliveryStatuses.Refuse => "REFUSED",
                _ => "PENDING"
            };
        }

        private static string MapLivraisonCodeToStatus(short code)
        {
            return code switch
            {
                DeliveryStatusCodes.Confirme => DeliveryStatuses.Confirme,
                DeliveryStatusCodes.EnLivraison => DeliveryStatuses.EnLivraison,
                DeliveryStatusCodes.Livre => DeliveryStatuses.Livre,
                DeliveryStatusCodes.Retour => DeliveryStatuses.Retour,
                DeliveryStatusCodes.Depot => DeliveryStatuses.Depot,
                DeliveryStatusCodes.Reporte => DeliveryStatuses.Reporte,
                _ => DeliveryStatuses.EnAttente
            };
        }

        private async Task<bool> CanReadOrderAsync(string piece, CancellationToken ct)
        {
            if (User.IsInRole(AppRoles.ADMIN)
                || User.IsInRole(AppRoles.SUPERVISEUR)
                || User.IsInRole(AppRoles.CONFIRMATEUR)
                || User.IsInRole(AppRoles.LIVREUR))
            {
                return await _db.F_DOCENTETES.AsNoTracking().AnyAsync(e => e.DO_Piece == piece, ct);
            }

            var email = User.FindFirstValue(ClaimTypes.Email);
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(userIdStr))
                return false;

            if (!Guid.TryParse(userIdStr, out var userId))
                return false;

            var clientCode = await _bonCommandeService.ResolveClientCodeAsync(userId, email, ct);
            return await _db.F_DOCENTETES.AsNoTracking()
                .AnyAsync(e => e.DO_Piece == piece
                    && ((e.DO_ClientUserId == userId) || (e.DO_ClientUserId == null && e.DO_Tiers == clientCode)), ct);
        }
    }
}
