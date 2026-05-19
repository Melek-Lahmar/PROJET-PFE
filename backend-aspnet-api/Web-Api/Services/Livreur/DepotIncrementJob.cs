using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.Hubs;
using Web_Api.Model;

namespace Web_Api.Services.Livreur
{
    /// <summary>
    /// Section 1.1 — Job Hangfire qui s'exécute à 00:00 Africa/Tunis.
    /// Pour chaque livraison qui était REPORTE la veille, incrémente
    /// DepotPassageNumber (passage en DEPOT le lendemain) avec un garde-fou
    /// à 10 (limite anti-boucle).
    ///
    /// Logique :
    ///  - Cible toutes les livraisons REPORTE dont LI_DateReplanification
    ///    est ≤ now (la replanification est arrivée).
    ///  - Passe le statut à DEPOT, incrémente DepotPassageNumber, log
    ///    F_LIVRAISON_HISTORIQUE.
    ///  - Émet SignalR DepotIncremented vers le livreur assigné.
    /// </summary>
    public class DepotIncrementJob
    {
        public const string JobId = "depot-increment-job";
        public const int MaxDepotPassage = 10;

        private readonly AppDbContext _db;
        private readonly IHubContext<ReclamationHub> _hub;
        private readonly ILogger<DepotIncrementJob> _logger;

        public DepotIncrementJob(
            AppDbContext db,
            IHubContext<ReclamationHub> hub,
            ILogger<DepotIncrementJob> logger)
        {
            _db = db;
            _hub = hub;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var now = DateTime.UtcNow;

            // Cible : livraisons REPORTE qui ont vu leur date de replanification arriver
            var candidates = await _db.F_LIVRAISONS
                .Where(l => l.LI_Statut == DeliveryStatusCodes.Reporte
                         && l.LI_DateReplanification != null
                         && l.LI_DateReplanification <= now)
                .ToListAsync();

            if (candidates.Count == 0)
            {
                _logger.LogInformation("DepotIncrementJob : 0 livraisons à incrémenter");
                return;
            }

            int incremented = 0;
            int blocked = 0;

            foreach (var li in candidates)
            {
                var newNum = li.DepotPassageNumber + 1;
                if (newNum > MaxDepotPassage)
                {
                    _logger.LogWarning(
                        "DepotIncrementJob : commande {Piece} bloquée à {Max} passages (livreur {LivreurId})",
                        li.DO_Piece, MaxDepotPassage, li.LivreurId);
                    blocked++;
                    continue;
                }

                li.LI_Statut = DeliveryStatusCodes.Depot;
                li.DepotPassageNumber = newNum;
                li.LI_DateReplanification = null;

                _db.F_LIVRAISON_HISTORIQUES.Add(new F_LIVRAISON_HISTORIQUE
                {
                    DoPiece = li.DO_Piece,
                    LivreurProfileId = li.LivreurId,
                    Type = "DEPOT_INCREMENT",
                    DepotPassageNumber = newNum,
                    Note = $"Auto-passage Dépôt {newNum} après REPORTE.",
                    CreatedAt = now,
                });

                incremented++;
            }

            await _db.SaveChangesAsync();

            // Push SignalR aux livreurs concernés (groupe livreurs ; les apps filtrent
            // par DO_Piece reçue dans le payload).
            foreach (var li in candidates.Where(l => l.LI_Statut == DeliveryStatusCodes.Depot))
            {
                await _hub.Clients.Group(ReclamationEvents.GroupLivreurs).SendAsync(
                    "DepotIncremented",
                    new
                    {
                        piece = li.DO_Piece,
                        depotPassageNumber = li.DepotPassageNumber,
                        livreurId = li.LivreurId,
                    });
            }

            _logger.LogInformation(
                "DepotIncrementJob : {Inc} livraisons incrémentées, {Blocked} bloquées (max passage)",
                incremented, blocked);
        }
    }
}
