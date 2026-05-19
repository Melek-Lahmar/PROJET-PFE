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
    /// Section 3.10 — Programme fidélité Bronze/Argent/Or/Platine. Calcul à la volée
    /// depuis le compteur de livraisons réussies (LI_Statut == Livre).
    /// </summary>
    [ApiController]
    [Route("api/client/loyalty")]
    [Authorize(Roles = AppRoles.CLIENT + "," + AppRoles.ADMIN)]
    public class ClientLoyaltyController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ClientLoyaltyController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken ct)
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(raw, out var userId))
                return Forbid();

            var profile = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);
            if (profile == null) return NotFound();

            var sageCode = profile.CodeClientSage;
            int count = 0;
            if (!string.IsNullOrWhiteSpace(sageCode))
            {
                var pieces = await _db.F_DOCENTETES.AsNoTracking()
                    .Where(e => e.DO_Tiers == sageCode && e.DO_Piece != null)
                    .Select(e => e.DO_Piece!)
                    .ToListAsync(ct);

                count = await _db.F_LIVRAISONS.AsNoTracking()
                    .CountAsync(l => pieces.Contains(l.DO_Piece) && l.LI_Statut == DeliveryStatusCodes.Livre, ct);
            }

            var (tier, deliveryPrice, benefit, nextTier, until) = ComputeTier(count);

            return Ok(new
            {
                tier,
                deliveriesCount = count,
                nextTier,
                deliveriesUntilNextTier = until,
                currentBenefit = benefit,
                deliveryPriceTnd = deliveryPrice,
            });
        }

        /// Paliers fidélité PFE :
        ///   Bronze 1-9 livraisons   → frais livraison 8.00 TND
        ///   Argent 10-24 livraisons → frais livraison 7.20 TND
        ///   Or     25+   livraisons → frais livraison 6.00 TND
        private static (string tier, decimal deliveryPrice, string benefit, string? nextTier, int? until)
            ComputeTier(int count)
        {
            if (count >= 25)
                return ("Or", 6.00m, "Frais de livraison : 6.00 TND", null, null);
            if (count >= 10)
                return ("Argent", 7.20m, "Frais de livraison : 7.20 TND", "Or", 25 - count);
            return ("Bronze", 8.00m, "Frais de livraison : 8.00 TND", "Argent", 10 - count);
        }
    }
}
