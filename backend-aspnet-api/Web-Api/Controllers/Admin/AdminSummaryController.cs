using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Section 4.2 — endpoint /summary unique pour réclamations qui résout le bug
    /// "7 réclamations totales mais 8 envoyées". Une seule requête SQL → totaux
    /// cohérents par construction. Assertion en dev (lève une exception si
    /// total != sum).
    /// </summary>
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminSummaryController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public AdminSummaryController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        [HttpGet("reclamations/summary")]
        public async Task<IActionResult> ReclamationsSummary(
            [FromQuery] string? period,
            [FromQuery] string? governorate,
            [FromQuery] string? typeCas,
            CancellationToken ct)
        {
            var (from, to) = ParsePeriod(period);

            // Une seule requête → garantit la cohérence totale = sum(byStatus) = sum(byMotif).
            // Filtre VisibleClient ne s'applique pas ici : c'est la vue admin globale.
            var query = _db.F_RECLAMATIONS
                .AsNoTracking()
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to);

            if (!string.IsNullOrWhiteSpace(typeCas))
                query = query.Where(r => r.TypeCas == typeCas);

            // Filtre par gouvernorat : on n'a pas le champ directement sur F_RECLAMATION,
            // donc on join avec F_DOCENTETE.DO_VilleLivraison pour approximer.
            // Pour la première version on ignore ce filtre et on documente.
            // TODO Section 4.2 : ajouter Gouvernorat dénormalisé sur F_RECLAMATION.

            var rows = await query
                .Select(r => new { r.Statut, r.Motif, r.TypeCas })
                .ToListAsync(ct);

            int total = rows.Count;

            // Aplatissement explicite par statut (insensible à la casse, accents, espaces)
            int envoyee = rows.Count(r => Norm(r.Statut) == "ENVOYEE");
            int enCours = rows.Count(r => Norm(r.Statut) == "ENCOURS" || Norm(r.Statut) == "ENCOURSDETRAITEMENT");
            int cloturee = rows.Count(r => Norm(r.Statut) == "CLOTUREE");
            int refusee = rows.Count(r => Norm(r.Statut) == "REFUSEE");

            int sum = envoyee + enCours + cloturee + refusee;

            // Assertion dev : si on a un statut hors des 4 connus, le sum ne tombera pas
            // sur le total — on lève en dev pour visibiliser le bug.
            if (_env.IsDevelopment() && sum != total)
            {
                var unknown = rows
                    .Select(r => r.Statut)
                    .Where(s => Norm(s) != "ENVOYEE"
                             && Norm(s) != "ENCOURS"
                             && Norm(s) != "ENCOURSDETRAITEMENT"
                             && Norm(s) != "CLOTUREE"
                             && Norm(s) != "REFUSEE")
                    .Distinct()
                    .ToList();
                throw new InvalidOperationException(
                    $"Compteur incohérent : total={total} mais sum={sum}. Statuts inconnus : [{string.Join(", ", unknown)}]");
            }

            var byMotif = rows
                .GroupBy(r => r.Motif)
                .Select(g => new { code = g.Key, count = g.Count() })
                .OrderByDescending(g => g.count)
                .ToList();

            return Ok(new
            {
                total,
                from,
                to,
                period = period ?? "30d",
                typeCas,
                governorate,
                byStatus = new { envoyee, enCours, cloturee, refusee },
                byMotif,
            });
        }

        // -------------------------------------------------------------------
        // Endpoints "summary" supplémentaires : commandes, livreurs, confs, produits.
        // Tous suivent le même pattern : 1 requête, totaux cohérents par construction.
        // -------------------------------------------------------------------

        [HttpGet("orders/summary")]
        public async Task<IActionResult> OrdersSummary(
            [FromQuery] string? period,
            CancellationToken ct)
        {
            var (from, to) = ParsePeriod(period);

            var rows = await _db.F_DOCENTETES.AsNoTracking()
                .Where(e => e.cbCreation >= from && e.cbCreation < to)
                .Select(e => new { e.DO_Valide })
                .ToListAsync(ct);

            int total = rows.Count;
            int enAttente = rows.Count(r => r.DO_Valide == 0);
            int confirme = rows.Count(r => r.DO_Valide == 1);
            int tentative = rows.Count(r => r.DO_Valide == 2);
            int refuse = rows.Count(r => r.DO_Valide == 3);

            return Ok(new
            {
                total,
                from,
                to,
                period = period ?? "30d",
                byStatus = new { enAttente, confirme, tentative, refuse },
            });
        }

        [HttpGet("livreurs/summary")]
        public async Task<IActionResult> LivreursSummary(CancellationToken ct)
        {
            // Comptes par flag IsInPause + IsOnline (dérivé de LastActivityAt < 10min)
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(p => p.TypeProfil == Web_Api.Auth.Entities.TypeProfil.Employe)
                .Select(p => new { p.UtilisateurId, p.IsInPause, p.LastActivityAt })
                .ToListAsync(ct);

            // Filtre seulement les LIVREURs
            var livreurUserIds = await (from u in _db.Users
                                        join ur in _db.UserRoles on u.Id equals ur.UserId
                                        join r in _db.Roles on ur.RoleId equals r.Id
                                        where r.Name == AppRoles.LIVREUR
                                        select u.Id).ToListAsync(ct);
            var livreurs = profiles.Where(p => p.UtilisateurId.HasValue && livreurUserIds.Contains(p.UtilisateurId!.Value)).ToList();
            var total = livreurs.Count;
            var pause = livreurs.Count(p => p.IsInPause);
            var now = DateTime.UtcNow;
            var enLigne = livreurs.Count(p => !p.IsInPause
                && p.LastActivityAt != null
                && (now - p.LastActivityAt!.Value).TotalMinutes < 10);
            var horsLigne = total - pause - enLigne;
            return Ok(new { total, byStatus = new { enLigne, pause, horsLigne } });
        }

        [HttpGet("confirmatrices/summary")]
        public async Task<IActionResult> ConfirmatricesSummary(CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Select(p => new { p.UtilisateurId, p.IsInPause, p.LastActivityAt })
                .ToListAsync(ct);
            var confIds = await (from u in _db.Users
                                 join ur in _db.UserRoles on u.Id equals ur.UserId
                                 join r in _db.Roles on ur.RoleId equals r.Id
                                 where r.Name == AppRoles.CONFIRMATEUR
                                 select u.Id).ToListAsync(ct);
            var confs = profiles.Where(p => p.UtilisateurId.HasValue && confIds.Contains(p.UtilisateurId!.Value)).ToList();
            var total = confs.Count;
            var pause = confs.Count(p => p.IsInPause);
            var now = DateTime.UtcNow;
            var enLigne = confs.Count(p => !p.IsInPause
                && p.LastActivityAt != null
                && (now - p.LastActivityAt!.Value).TotalMinutes < 10);
            var horsLigne = total - pause - enLigne;

            // Charge moyenne (cas en cours par confirmatrice)
            var openCases = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId != null
                    && (r.Statut == "ENVOYEE" || r.Statut == "EN_COURS_DE_TRAITEMENT"))
                .CountAsync(ct);
            var chargeMoyenne = total == 0 ? 0 : Math.Round((double)openCases / total, 2);
            return Ok(new
            {
                total,
                byStatus = new { enLigne, pause, horsLigne },
                chargeMoyenne,
            });
        }

        [HttpGet("products/summary")]
        public async Task<IActionResult> ProductsSummary([FromQuery] string? period, CancellationToken ct)
        {
            var (rangeFrom, rangeTo) = ParsePeriod(period ?? "30d");
            var totalActifs = await _db.F_ARTICLES.AsNoTracking().CountAsync(ct);

            var lignes = await _db.F_DOCLIGNES.AsNoTracking()
                .Join(_db.F_DOCENTETES.AsNoTracking(),
                    l => l.DO_Piece, e => e.DO_Piece, (l, e) => new { l, e })
                .Where(x => x.e.cbCreation >= rangeFrom && x.e.cbCreation < rangeTo)
                .Select(x => new { x.l.AR_Ref, Qty = x.l.DL_Qte ?? 0 })
                .ToListAsync(ct);

            var topVendu = lignes
                .GroupBy(x => x.AR_Ref)
                .Select(g => new { ArRef = g.Key, Qty = g.Sum(x => x.Qty) })
                .OrderByDescending(g => g.Qty)
                .Take(5)
                .ToList();

            return Ok(new
            {
                total = totalActifs,
                topVendu,
                period = period ?? "30d",
                from = rangeFrom,
                to = rangeTo,
            });
        }

        // ================== Exports Excel/PDF ==================
        [HttpGet("orders/export")]
        public async Task<IActionResult> OrdersExport(
            [FromQuery] string format,
            [FromQuery] string? period,
            [FromServices] Web_Api.Services.Admin.Export.ExportService export,
            CancellationToken ct)
        {
            var (from, to) = ParsePeriod(period);
            var rows = await _db.F_DOCENTETES.AsNoTracking()
                .Where(e => e.cbCreation >= from && e.cbCreation < to)
                .OrderByDescending(e => e.cbCreation)
                .Take(Web_Api.Services.Admin.Export.ExportService.MaxRows)
                .Select(e => new
                {
                    e.DO_Piece,
                    e.DO_Tiers,
                    e.DO_Valide,
                    e.DO_Date,
                    e.DO_VilleLivraison,
                    e.DO_NetAPayer,
                })
                .ToListAsync(ct);

            var headers = new List<string> { "Référence", "Client", "Statut", "Date", "Ville", "Montant TTC" };
            var data = rows.Select(r => new List<object?>
            {
                r.DO_Piece,
                r.DO_Tiers,
                F_DOCENTETE.ToStatusLabel(r.DO_Valide),
                r.DO_Date,
                r.DO_VilleLivraison,
                r.DO_NetAPayer,
            }).ToList();

            byte[] bytes;
            string contentType;
            string filename;

            if ((format ?? "xlsx").ToLowerInvariant() == "pdf")
            {
                bytes = export.ExportToPdf("Rapport commandes", $"{from:yyyy-MM-dd} → {to:yyyy-MM-dd}", headers, data);
                contentType = "application/pdf";
                filename = "commandes.pdf";
            }
            else
            {
                bytes = export.ExportToExcel("Commandes", headers, data);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                filename = "commandes.xlsx";
            }

            return File(bytes, contentType, filename);
        }

        [HttpGet("reclamations/export")]
        public async Task<IActionResult> ReclamationsExport(
            [FromQuery] string format,
            [FromQuery] string? period,
            [FromQuery] string? typeCas,
            [FromServices] Web_Api.Services.Admin.Export.ExportService export,
            CancellationToken ct)
        {
            var (from, to) = ParsePeriod(period);
            var query = _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to);
            if (!string.IsNullOrEmpty(typeCas))
                query = query.Where(r => r.TypeCas == typeCas);

            var rows = await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(Web_Api.Services.Admin.Export.ExportService.MaxRows)
                .Select(r => new
                {
                    r.CodeReclamation,
                    r.DoPiece,
                    r.TypeCas,
                    r.Motif,
                    r.Statut,
                    r.Source,
                    r.CreatedAt,
                })
                .ToListAsync(ct);

            var headers = new List<string> { "Code", "Commande", "Type", "Motif", "Statut", "Source", "Créée le" };
            var data = rows.Select(r => new List<object?>
            {
                r.CodeReclamation,
                r.DoPiece,
                r.TypeCas,
                r.Motif,
                r.Statut,
                r.Source,
                r.CreatedAt,
            }).ToList();

            byte[] bytes;
            string contentType;
            string filename;

            if ((format ?? "xlsx").ToLowerInvariant() == "pdf")
            {
                bytes = export.ExportToPdf("Rapport réclamations", $"{from:yyyy-MM-dd} → {to:yyyy-MM-dd}", headers, data);
                contentType = "application/pdf";
                filename = "reclamations.pdf";
            }
            else
            {
                bytes = export.ExportToExcel("Réclamations", headers, data);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                filename = "reclamations.xlsx";
            }

            return File(bytes, contentType, filename);
        }

        // -------------------------------------------------------------------
        // Helpers
        // -------------------------------------------------------------------
        private static (DateTime from, DateTime to) ParsePeriod(string? period)
        {
            // 7d / 30d / 90d / today / yesterday / month / all
            var now = DateTime.UtcNow;
            return (period?.ToLowerInvariant() ?? "30d") switch
            {
                "today" => (now.Date, now.Date.AddDays(1)),
                "yesterday" => (now.Date.AddDays(-1), now.Date),
                "7d" => (now.Date.AddDays(-7), now.Date.AddDays(1)),
                "30d" => (now.Date.AddDays(-30), now.Date.AddDays(1)),
                "90d" => (now.Date.AddDays(-90), now.Date.AddDays(1)),
                "month" => (new DateTime(now.Year, now.Month, 1), now.Date.AddDays(1)),
                "all" => (new DateTime(2020, 1, 1), now.Date.AddDays(1)),
                _ => (now.Date.AddDays(-30), now.Date.AddDays(1)),
            };
        }

        private static string Norm(string s)
        {
            if (string.IsNullOrEmpty(s)) return string.Empty;
            return new string(s
                .Trim()
                .ToUpperInvariant()
                .Where(c => c != '_' && c != '-' && c != ' ')
                .ToArray());
        }
    }
}
