using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Constants;
using Web_Api.data;

namespace Web_Api.Controllers
{
    /// <summary>
    /// Section 3.7 — Suivi public sans authentification.
    /// Le client donne son numéro de commande + 4 derniers chiffres du téléphone
    /// pour vérifier que c'est bien le destinataire. Réponse limitée
    /// (pas d'infos sensibles : adresse complète, articles, prix masqués).
    /// </summary>
    [ApiController]
    [Route("api/public")]
    public class PublicTrackingController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PublicTrackingController(AppDbContext db)
        {
            _db = db;
        }

        [HttpPost("track")]
        public async Task<IActionResult> Track([FromBody] PublicTrackRequestDto req, CancellationToken ct)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Piece) || string.IsNullOrWhiteSpace(req.PhoneLast4))
                return BadRequest(new { message = "Numéro de commande et 4 derniers chiffres requis." });

            var piece = req.Piece.Trim();
            var last4 = req.PhoneLast4.Trim();

            if (last4.Length != 4 || !last4.All(char.IsDigit))
                return BadRequest(new { message = "Les 4 derniers chiffres doivent être numériques." });

            var entete = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(e => e.DO_Piece == piece, ct);
            if (entete == null)
                return NotFound(new { message = "Commande introuvable." });

            // Récupère le téléphone : snapshot DO_TelephoneLivraison ou profil client
            string? phone = entete.DO_TelephoneLivraison ?? entete.DO_PassagerTelephone;
            if (string.IsNullOrWhiteSpace(phone) && !string.IsNullOrWhiteSpace(entete.DO_Tiers))
            {
                var clientProfile = await _db.ProfilsUtilisateurs.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.CodeClientSage == entete.DO_Tiers, ct);
                phone = clientProfile?.Telephone;
            }

            if (string.IsNullOrWhiteSpace(phone))
                return NotFound(new { message = "Vérification impossible." });

            var phoneNormalized = new string(phone.Where(char.IsDigit).ToArray());
            if (phoneNormalized.Length < 4 || !phoneNormalized.EndsWith(last4))
                return BadRequest(new { message = "Numéro non vérifié." });

            var livraison = await _db.F_LIVRAISONS.AsNoTracking()
                .FirstOrDefaultAsync(l => l.DO_Piece == piece, ct);

            string statut = livraison != null
                ? StatusCodeToLabel(livraison.LI_Statut)
                : (entete.DO_Valide == 1 ? "CONFIRME" : "EN_ATTENTE");

            // Pas d'adresse complète, pas d'articles, pas de prix
            return Ok(new
            {
                piece,
                statut,
                createdAt = entete.DO_Date,
                deliveredAt = livraison?.LI_DateLivree,
                ville = entete.DO_VilleLivraison,
                modeLivraison = entete.DO_ModeLivraison,
                etaMinutes = (int?)null,
                livreurFirstName = (string?)null,
            });
        }

        private static string StatusCodeToLabel(short code) => code switch
        {
            DeliveryStatusCodes.Confirme => "CONFIRME",
            DeliveryStatusCodes.EnLivraison => "EN_LIVRAISON",
            DeliveryStatusCodes.Livre => "LIVRE",
            DeliveryStatusCodes.Retour => "RETOUR",
            DeliveryStatusCodes.Depot => "DEPOT",
            DeliveryStatusCodes.Reporte => "REPORTE",
            _ => "INCONNU",
        };

        public class PublicTrackRequestDto
        {
            public string? Piece { get; set; }
            public string? PhoneLast4 { get; set; }
        }
    }
}
