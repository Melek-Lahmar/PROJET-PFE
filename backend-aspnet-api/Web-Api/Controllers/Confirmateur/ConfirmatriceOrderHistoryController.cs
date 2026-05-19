using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Livreur;
using Web_Api.Model;

namespace Web_Api.Controllers.Confirmateur
{
    /// <summary>
    /// Historique chronologique d'une commande pour l'écran confirmatrice.
    /// Reproduit la logique de LivreurController.GetOrderDetails (bloc history)
    /// mais accessible par la confirmatrice (et l'admin) sans contrainte
    /// d'assignation livreur.
    ///
    /// Reuse <see cref="LivreurOrderHistoryDto"/> car la structure de transport
    /// est identique (At, StatusCode, StatusLabel, UpdatedBy, Motif, Note).
    /// </summary>
    [ApiController]
    [Route("api/confirmatrice/orders")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR + "," + AppRoles.ADMIN)]
    public class ConfirmatriceOrderHistoryController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ConfirmatriceOrderHistoryController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("{piece}/history")]
        public async Task<IActionResult> Get(string piece, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(piece))
                return BadRequest(new { message = "Pièce obligatoire." });

            var entete = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(e => e.DO_Piece == piece, ct);
            if (entete == null)
                return NotFound(new { message = "Commande introuvable." });

            F_LIVRAISON? li = null;
            if (entete.DO_Type == 1)
            {
                li = await _db.F_LIVRAISONS.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.DO_Piece == piece, ct);
            }

            var history = BuildHistory(entete, li);

            // Tri chronologique ascendant — le client tri lui-même desc si besoin.
            return Ok(history.OrderBy(h => h.At).ToList());
        }

        /// <summary>
        /// Construit la liste d'événements à partir de l'entête + la livraison.
        /// Aligné sur la logique de <see cref="LivreurController.GetOrderDetails"/>
        /// pour garantir la cohérence des timelines visibles côté livreur et
        /// côté confirmatrice.
        /// </summary>
        private static List<LivreurOrderHistoryDto> BuildHistory(
            F_DOCENTETE entete, F_LIVRAISON? li)
        {
            var history = new List<LivreurOrderHistoryDto>();

            if (entete.cbCreation.HasValue)
            {
                history.Add(new LivreurOrderHistoryDto
                {
                    At = entete.cbCreation.Value,
                    StatusCode = (short)(entete.DO_Type == 0 ? 0 : DeliveryStatusCodes.Confirme),
                    StatusLabel = entete.DO_Type == 0
                        ? "Commande créée"
                        : "Bon de livraison créé"
                });
            }

            if (li != null)
            {
                history.Add(new LivreurOrderHistoryDto
                {
                    At = li.LI_DateCreation,
                    StatusCode = DeliveryStatusCodes.EnLivraison,
                    StatusLabel = "Attribuée au livreur"
                });

                if (li.LI_DateReplanification.HasValue
                    && li.LI_Statut == DeliveryStatusCodes.Reporte)
                {
                    history.Add(new LivreurOrderHistoryDto
                    {
                        At = li.LI_DateReplanification.Value,
                        StatusCode = DeliveryStatusCodes.Reporte,
                        StatusLabel = "Reportée",
                        Motif = li.LI_Commentaire
                    });
                }

                if (li.LI_DateLivree.HasValue)
                {
                    history.Add(new LivreurOrderHistoryDto
                    {
                        At = li.LI_DateLivree.Value,
                        StatusCode = DeliveryStatusCodes.Livre,
                        StatusLabel = "Livrée"
                    });
                }
                else if (li.LI_Statut != DeliveryStatusCodes.EnLivraison
                         && li.LI_Statut != DeliveryStatusCodes.Confirme)
                {
                    history.Add(new LivreurOrderHistoryDto
                    {
                        At = li.LI_DateCreation,
                        StatusCode = li.LI_Statut,
                        StatusLabel = MapLivraisonCodeToLabel(li.LI_Statut),
                        Note = li.LI_Commentaire
                    });
                }
            }

            return history;
        }

        private static string MapLivraisonCodeToLabel(short? code)
        {
            return code switch
            {
                var s when s == DeliveryStatusCodes.Confirme => "Confirmée",
                var s when s == DeliveryStatusCodes.EnLivraison => "En livraison",
                var s when s == DeliveryStatusCodes.Livre => "Livrée",
                var s when s == DeliveryStatusCodes.Retour => "Retournée",
                var s when s == DeliveryStatusCodes.Depot => "Au dépôt",
                var s when s == DeliveryStatusCodes.DepotEnCoursDePreparation
                    => "Dépôt — en préparation",
                var s when s == DeliveryStatusCodes.DepotPret => "Dépôt — prête",
                var s when s == DeliveryStatusCodes.Reporte => "Reportée",
                _ => "—"
            };
        }
    }
}
