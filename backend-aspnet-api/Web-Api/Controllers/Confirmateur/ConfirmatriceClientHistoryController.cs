using System;
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
using Web_Api.Model;

namespace Web_Api.Controllers.Confirmateur
{
    /// <summary>
    /// B.4 — Historique des commandes d'un client pour le BottomSheet
    /// "icône 3 barres" sur le détail commande/réclamation/demande.
    /// </summary>
    [ApiController]
    [Route("api/confirmatrice/clients")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR + "," + AppRoles.ADMIN)]
    public class ConfirmatriceClientHistoryController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ConfirmatriceClientHistoryController(AppDbContext db)
        {
            _db = db;
        }

        public sealed class ClientSearchItemDto
        {
            public Guid? UtilisateurId { get; set; }
            public string? NomComplet { get; set; }
            public string? NomSociete { get; set; }
            public string? Telephone { get; set; }
            public string? CodeClientSage { get; set; }
            public string? TypeClient { get; set; }
        }

        /// <summary>
        /// Lot E — Recherche d'un client par téléphone, nom, raison sociale ou code tiers,
        /// pour l'onglet « Suivi » de l'espace confirmatrice.
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<List<ClientSearchItemDto>>> Search(
            [FromQuery] string? q,
            [FromQuery] int limit = 20,
            CancellationToken ct = default)
        {
            q = (q ?? string.Empty).Trim();
            if (q.Length < 2)
                return Ok(new List<ClientSearchItemDto>());

            limit = Math.Clamp(limit, 1, 50);
            var ql = q.ToLower();

            var rows = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.UtilisateurId != null && p.TypeClient != null && (
                    (p.Telephone != null && p.Telephone.ToLower().Contains(ql)) ||
                    (p.NomComplet != null && p.NomComplet.ToLower().Contains(ql)) ||
                    (p.NomSociete != null && p.NomSociete.ToLower().Contains(ql)) ||
                    (p.CodeClientSage != null && p.CodeClientSage.ToLower().Contains(ql))))
                .OrderBy(p => p.NomComplet)
                .Take(limit)
                .ToListAsync(ct);

            var result = rows.Select(p => new ClientSearchItemDto
            {
                UtilisateurId = p.UtilisateurId,
                NomComplet = p.NomComplet,
                NomSociete = p.NomSociete,
                Telephone = p.Telephone,
                CodeClientSage = p.CodeClientSage,
                TypeClient = p.TypeClient?.ToString(),
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{clientId:guid}/orders-history")]
        public async Task<IActionResult> Get(
            Guid clientId,
            [FromQuery] int limit = 50,
            CancellationToken ct = default)
        {
            limit = Math.Clamp(limit, 1, 200);

            var client = await _db.ProfilsUtilisateurs.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == clientId, ct);
            if (client == null)
            {
                return NotFound(new { message = "Client introuvable." });
            }

            var codeSage = (client.CodeClientSage ?? "").Trim();
            if (codeSage.Length == 0)
            {
                return Ok(new
                {
                    client = new
                    {
                        id = clientId,
                        nom = client.NomComplet,
                        tel = client.Telephone,
                        totalCommandes = 0,
                    },
                    stats = new
                    {
                        total = 0,
                        livrees = 0,
                        retours = 0,
                        refus = 0,
                        reportees = 0,
                        enCours = 0,
                        tauxLivraison = 0,
                        montantTotalLivre = 0m,
                    },
                    orders = Array.Empty<object>(),
                });
            }

            // Toutes les commandes (BC + BL) de ce client.
            var entetes = await _db.F_DOCENTETES.AsNoTracking()
                .Where(e => e.DO_Domaine == 0 && e.DO_Tiers == codeSage)
                .OrderByDescending(e => e.DO_Date)
                .Take(limit)
                .ToListAsync(ct);

            if (entetes.Count == 0)
            {
                return Ok(new
                {
                    client = new
                    {
                        id = clientId,
                        nom = client.NomComplet,
                        tel = client.Telephone,
                        totalCommandes = 0,
                    },
                    stats = new
                    {
                        total = 0,
                        livrees = 0,
                        retours = 0,
                        refus = 0,
                        reportees = 0,
                        enCours = 0,
                        tauxLivraison = 0,
                        montantTotalLivre = 0m,
                    },
                    orders = Array.Empty<object>(),
                });
            }

            var pieces = entetes.Select(e => e.DO_Piece!).Where(p => p != null).ToList();
            var livraisons = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(l => pieces.Contains(l.DO_Piece))
                .ToDictionaryAsync(l => l.DO_Piece, ct);

            // Désignation principale par pièce (première ligne pour exemple).
            var firstLines = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => pieces.Contains(l.DO_Piece!))
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);
            var produitsByPiece = firstLines
                .GroupBy(l => l.DO_Piece!)
                .ToDictionary(
                    g => g.Key,
                    g => string.Join(", ", g.Take(2).Select(x => x.DL_Design).Where(x => !string.IsNullOrWhiteSpace(x))));

            var orders = new List<object>();
            int livrees = 0, retours = 0, refus = 0, reportees = 0, enCours = 0;
            decimal montantTotalLivre = 0;

            foreach (var e in entetes)
            {
                F_LIVRAISON? li = null;
                if (e.DO_Piece != null) livraisons.TryGetValue(e.DO_Piece, out li);

                string statut = ResolveDisplayStatus(e, li);
                switch (statut)
                {
                    case "LIVRE":
                        livrees++;
                        if (e.DO_NetAPayer.HasValue) montantTotalLivre += e.DO_NetAPayer.Value;
                        break;
                    case "RETOUR":
                        retours++;
                        break;
                    case "REFUSE":
                        refus++;
                        break;
                    case "REPORTE":
                        reportees++;
                        break;
                    case "EN_LIVRAISON":
                    case "DEPOT":
                    case "CONFIRME":
                    case "EN_ATTENTE":
                    case "TENTATIVE":
                        enCours++;
                        break;
                }

                orders.Add(new
                {
                    piece = e.DO_Piece,
                    date = e.DO_Date,
                    statut,
                    montant = e.DO_NetAPayer ?? 0,
                    produits = produitsByPiece.TryGetValue(e.DO_Piece ?? string.Empty, out var p) ? p : null,
                });
            }

            var total = entetes.Count;
            var tauxLivraison = total == 0 ? 0 : (int)Math.Round((livrees / (double)total) * 100);

            return Ok(new
            {
                client = new
                {
                    id = clientId,
                    nom = client.NomComplet,
                    tel = client.Telephone,
                    totalCommandes = total,
                },
                stats = new
                {
                    total,
                    livrees,
                    retours,
                    refus,
                    reportees,
                    enCours,
                    tauxLivraison,
                    montantTotalLivre = decimal.Round(montantTotalLivre, 2),
                },
                orders,
            });
        }

        private static string ResolveDisplayStatus(F_DOCENTETE e, F_LIVRAISON? li)
        {
            if (li != null)
            {
                return li.LI_Statut switch
                {
                    DeliveryStatusCodes.Confirme => "CONFIRME",
                    DeliveryStatusCodes.EnLivraison => "EN_LIVRAISON",
                    DeliveryStatusCodes.Livre => "LIVRE",
                    DeliveryStatusCodes.Retour => "RETOUR",
                    DeliveryStatusCodes.Depot => "DEPOT",
                    DeliveryStatusCodes.Reporte => "REPORTE",
                    _ => "EN_ATTENTE",
                };
            }
            return e.DO_Valide switch
            {
                0 => "EN_ATTENTE",
                1 => "CONFIRME",
                2 => "TENTATIVE",
                3 => "REFUSE",
                _ => "EN_ATTENTE",
            };
        }
    }
}
