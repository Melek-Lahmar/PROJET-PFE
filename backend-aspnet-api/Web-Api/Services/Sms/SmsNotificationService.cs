using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Services.Sms
{
    /// <summary>
    /// Section 1.3 + 3.3 — service métier SMS pré-livraison.
    /// Appelé sur les transitions de statut commande :
    ///  - CONFIRME → DEPOT : "Votre commande sera livrée demain entre 9h et 18h."
    ///  - DEPOT → EN_LIVRAISON (avec IsActiveDelivery=true) : "Votre livreur est en route."
    ///  - EN_LIVRAISON → LIVRE : "Votre commande a été livrée. Merci !"
    ///
    /// Respecte ContactPreference (AppelOnly → ne pas envoyer).
    /// Logue F_SMS_LOG dans tous les cas (audit traçable côté admin/jury).
    /// </summary>
    public class SmsNotificationService
    {
        private readonly AppDbContext _db;
        private readonly ISmsGateway _gateway;
        private readonly ILogger<SmsNotificationService> _logger;

        public SmsNotificationService(
            AppDbContext db,
            ISmsGateway gateway,
            ILogger<SmsNotificationService> logger)
        {
            _db = db;
            _gateway = gateway;
            _logger = logger;
        }

        /// <summary>
        /// Hook appelé par les services qui changent un statut commande/livraison.
        /// </summary>
        public async Task NotifyAsync(SmsTrigger trigger, string doPiece, CancellationToken ct = default)
        {
            try
            {
                var entete = await _db.F_DOCENTETES.AsNoTracking()
                    .FirstOrDefaultAsync(e => e.DO_Piece == doPiece, ct);
                if (entete == null) return;

                // Téléphone : snapshot DO_TelephoneLivraison ou profil client Sage
                string? phone = entete.DO_TelephoneLivraison ?? entete.DO_PassagerTelephone;
                string? clientPreference = "Both";
                string? livreurNom = null;
                string? livreurTel = null;

                if (string.IsNullOrWhiteSpace(phone) && !string.IsNullOrWhiteSpace(entete.DO_Tiers))
                {
                    var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.CodeClientSage == entete.DO_Tiers, ct);
                    phone = profile?.Telephone;
                    clientPreference = profile?.ContactPreference ?? "Both";
                }

                if (string.IsNullOrWhiteSpace(phone))
                {
                    _logger.LogInformation("SMS skipped {Piece} : aucun téléphone", doPiece);
                    return;
                }

                // Respect des préférences contact
                if (clientPreference?.Equals("AppelOnly", StringComparison.OrdinalIgnoreCase) == true)
                {
                    _logger.LogInformation("SMS skipped {Piece} : ContactPreference=AppelOnly", doPiece);
                    return;
                }

                // Récupère les infos du livreur si nécessaire
                if (entete.AssignedLivreurId.HasValue)
                {
                    var livreur = await _db.ProfilsUtilisateurs.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.UtilisateurId == entete.AssignedLivreurId.Value, ct);
                    livreurNom = livreur?.NomComplet?.Trim();
                    livreurTel = livreur?.Telephone;
                }

                var message = BuildMessage(trigger, doPiece, livreurNom, livreurTel);
                if (string.IsNullOrWhiteSpace(message)) return;

                var result = await _gateway.SendAsync(phone, message);

                _db.F_SMS_LOGS.Add(new F_SMS_LOG
                {
                    DoPiece = doPiece,
                    Phone = phone,
                    Message = message,
                    Provider = _gateway.ProviderName,
                    Success = result.Success,
                    ErrorMessage = result.ErrorMessage,
                    SentAt = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SMS notification failed for {Piece} trigger={Trigger}", doPiece, trigger);
            }
        }

        private static string? BuildMessage(SmsTrigger trigger, string piece, string? livreurNom, string? livreurTel)
        {
            return trigger switch
            {
                SmsTrigger.ConfirmeToDepot =>
                    $"Votre commande {piece} sera livrée demain entre 9h et 18h. Soyez disponible.",
                SmsTrigger.ActiveDeliveryStarted =>
                    $"Votre livreur {livreurNom ?? string.Empty} est en route. Tel : {livreurTel ?? "-"}.",
                SmsTrigger.Livre =>
                    $"Votre commande {piece} a été livrée. Merci !",
                _ => null,
            };
        }
    }

    public enum SmsTrigger
    {
        ConfirmeToDepot,
        ActiveDeliveryStarted,
        Livre,
    }
}
