using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Livreur;

namespace Web_Api.Controllers.Livreur
{
    /// <summary>
    /// Section 1.2 — endpoint stats consolidé du livreur (vue Aujourd'hui /
    /// Hier / Semaine / Mois / Plage perso) + remise de la caisse au dépôt.
    ///
    /// Note de design : on attache les commandes au livreur via F_LIVRAISON.LivreurId
    /// (clé numérique cbMarq du profil), comme le reste du module livreur. Le scope
    /// temporel est calculé sur LI_DateCreation pour le total commandes du jour
    /// et LI_DateLivree pour le cash encaissé (il faut être livré pour encaisser).
    /// </summary>
    [ApiController]
    [Route("api/livreur")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.ADMIN)]
    public class LivreurStatsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public LivreurStatsController(AppDbContext db)
        {
            _db = db;
        }

        // -------------------------------------------------------------------
        // GET /api/livreur/stats
        // -------------------------------------------------------------------
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats(
            [FromQuery] string? date,
            [FromQuery] string? period,
            [FromQuery] string? from,
            [FromQuery] string? to,
            CancellationToken ct)
        {
            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var (rangeFrom, rangeTo, label) = ResolveRange(date, period, from, to);

            var livraisons = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Where(x => x.LivreurId == profile.cbMarq
                         && x.LI_DateCreation >= rangeFrom
                         && x.LI_DateCreation < rangeTo)
                .ToListAsync(ct);

            var totalCommandes = livraisons.Count;
            var livrees = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Livre);
            var enLivraison = livraisons.Count(l =>
                l.LI_Statut == DeliveryStatusCodes.EnLivraison ||
                l.LI_Statut == DeliveryStatusCodes.Depot);
            var reportees = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Reporte);
            var retournees = livraisons.Count(l => l.LI_Statut == DeliveryStatusCodes.Retour);

            // Cashbox COD
            var cashLignes = livraisons
                .Where(l => l.Encaisse && l.EncaisseAt != null
                            && l.EncaisseAt >= rangeFrom && l.EncaisseAt < rangeTo
                            && !l.RemisAuDepot)
                .ToList();

            var totalCash = cashLignes.Sum(l => l.MontantEncaisse ?? 0m);
            var cashCount = cashLignes.Count;

            // Une caisse "remise" est en réalité l'ensemble des lignes du jour avec RemisAuDepot=true
            // → on prend la dernière RemisAuDepotAt comme timestamp affichable
            var remises = livraisons.Where(l => l.RemisAuDepot && l.RemisAuDepotAt != null
                                                 && l.RemisAuDepotAt >= rangeFrom && l.RemisAuDepotAt < rangeTo)
                                    .ToList();
            var remisAuDepot = totalCash == 0 && remises.Any();
            var remisAt = remises.Any() ? remises.Max(l => l.RemisAuDepotAt) : (DateTime?)null;

            // Top zones (par ville de livraison)
            var topZones = livraisons
                .Where(l => l.LI_Statut == DeliveryStatusCodes.Livre)
                .GroupBy(l => string.IsNullOrWhiteSpace(l.LI_Ville) ? "Inconnue" : l.LI_Ville)
                .Select(g => new LivreurStatsTopZoneDto { Ville = g.Key, Count = g.Count() })
                .OrderByDescending(z => z.Count)
                .Take(5)
                .ToList();

            // Performance vs jour précédent
            var totalTermine = livrees + retournees;
            var tauxLivraison = totalTermine > 0 ? (double)livrees / totalTermine * 100.0 : 0.0;
            var tauxRetour = totalTermine > 0 ? (double)retournees / totalTermine * 100.0 : 0.0;

            var prevFrom = rangeFrom.AddDays(-(rangeTo - rangeFrom).TotalDays);
            var prevTo = rangeFrom;
            var prevLivrees = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(x => x.LivreurId == profile.cbMarq
                         && x.LI_Statut == DeliveryStatusCodes.Livre
                         && x.LI_DateLivree != null
                         && x.LI_DateLivree >= prevFrom && x.LI_DateLivree < prevTo)
                .CountAsync(ct);
            var deltaLivraison = prevLivrees == 0
                ? 0.0
                : Math.Round(((double)livrees - prevLivrees) / prevLivrees * 100.0, 1);

            // Sparkline 7 derniers jours (même livreur)
            var sparkFrom = DateTime.Today.AddDays(-6);
            var spark = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(x => x.LivreurId == profile.cbMarq
                         && x.LI_Statut == DeliveryStatusCodes.Livre
                         && x.LI_DateLivree != null
                         && x.LI_DateLivree >= sparkFrom)
                .Select(x => x.LI_DateLivree!.Value.Date)
                .ToListAsync(ct);

            var sparkline = Enumerable.Range(0, 7)
                .Select(i => spark.Count(d => d == sparkFrom.AddDays(i)))
                .ToList();

            return Ok(new LivreurStatsDto
            {
                ScopeLabel = label,
                TotalCommandes = totalCommandes,
                Livrees = livrees,
                EnLivraison = enLivraison,
                Reportees = reportees,
                Retournees = retournees,
                CashCod = new LivreurCashboxDto
                {
                    TotalTnd = totalCash,
                    NombrePaiements = cashCount,
                    RemisAuDepot = remisAuDepot,
                    RemisAt = remisAt,
                },
                TopZones = topZones,
                Performance = new LivreurPerformanceDto
                {
                    TauxLivraison = Math.Round(tauxLivraison, 1),
                    TauxRetour = Math.Round(tauxRetour, 1),
                    DeltaLivraisonVsJourPrecedent = deltaLivraison,
                },
                Sparkline7Jours = sparkline,
            });
        }

        // -------------------------------------------------------------------
        // POST /api/livreur/orders/{piece}/encaisser
        // (note : route séparée pour ne pas casser /orders/{piece}/status existant)
        // -------------------------------------------------------------------
        [HttpPost("orders/{piece}/encaisser")]
        public async Task<IActionResult> Encaisser(
            string piece,
            [FromBody] EncaisserRequestDto req,
            CancellationToken ct)
        {
            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var li = await _db.F_LIVRAISONS.FirstOrDefaultAsync(
                x => x.DO_Piece == piece && x.LivreurId == profile.cbMarq, ct);
            if (li == null)
                return NotFound(new { message = "Livraison introuvable." });

            if (li.LI_Statut != DeliveryStatusCodes.Livre)
                return BadRequest(new { message = "L'encaissement n'est possible que sur une livraison marquée Livré." });

            li.Encaisse = true;
            li.EncaisseAt = DateTime.UtcNow;
            li.MontantEncaisse = req.Montant;

            await _db.SaveChangesAsync(ct);

            return Ok(new { piece, encaisse = true, montant = req.Montant, encaisseAt = li.EncaisseAt });
        }

        // -------------------------------------------------------------------
        // POST /api/livreur/cashbox/remettre
        // -------------------------------------------------------------------
        [HttpPost("cashbox/remettre")]
        public async Task<IActionResult> RemettreCaisse(
            [FromBody] CashboxRemettreRequestDto? req,
            CancellationToken ct)
        {
            var profile = await GetCurrentProfileAsync(ct);
            if (profile == null)
                return StatusCode(403, new { message = "Profil livreur introuvable." });

            var (from, to, _) = ResolveRange(req?.Date, null, null, null);

            var pendings = await _db.F_LIVRAISONS
                .Where(x => x.LivreurId == profile.cbMarq
                         && x.Encaisse
                         && !x.RemisAuDepot
                         && x.EncaisseAt != null
                         && x.EncaisseAt >= from && x.EncaisseAt < to)
                .ToListAsync(ct);

            if (pendings.Count == 0)
                return BadRequest(new { message = "Aucun encaissement à remettre pour cette journée." });

            var now = DateTime.UtcNow;
            foreach (var li in pendings)
            {
                li.RemisAuDepot = true;
                li.RemisAuDepotAt = now;
            }
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                message = "Caisse remise au dépôt.",
                count = pendings.Count,
                total = pendings.Sum(l => l.MontantEncaisse ?? 0m),
                remisAt = now,
            });
        }

        // -------------------------------------------------------------------
        // Helpers
        // -------------------------------------------------------------------
        private async Task<ProfilUtilisateur?> GetCurrentProfileAsync(CancellationToken ct)
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(raw, out var userId)) return null;
            return await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);
        }

        private static (DateTime From, DateTime To, string Label) ResolveRange(
            string? date, string? period, string? from, string? to)
        {
            // Africa/Tunis = UTC+1 (sans DST). Pour rester compatible avec les
            // dates stockées en UTC, on définit le "jour" comme [00h-24h] locales
            // converties en UTC. Approximation acceptable pour la démo PFE.
            var today = DateTime.Today;

            if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var d))
            {
                return (d.Date, d.Date.AddDays(1), $"{FormatHumanDate(d)}");
            }

            if (!string.IsNullOrWhiteSpace(period))
            {
                switch (period.ToLowerInvariant())
                {
                    case "today":
                        return (today, today.AddDays(1), $"Aujourd'hui · {FormatHumanDate(today)}");
                    case "yesterday":
                        return (today.AddDays(-1), today, $"Hier · {FormatHumanDate(today.AddDays(-1))}");
                    case "week":
                        var monday = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
                        return (monday, monday.AddDays(7), $"Semaine du {FormatHumanDate(monday)}");
                    case "month":
                        var first = new DateTime(today.Year, today.Month, 1);
                        return (first, first.AddMonths(1), $"Mois de {first:MMMM yyyy}");
                }
            }

            if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var f))
            {
                var t = (!string.IsNullOrWhiteSpace(to) && DateTime.TryParse(to, out var tx))
                    ? tx.Date.AddDays(1)
                    : f.Date.AddDays(1);
                return (f.Date, t, $"Du {FormatHumanDate(f)} au {FormatHumanDate(t.AddDays(-1))}");
            }

            return (today, today.AddDays(1), $"Aujourd'hui · {FormatHumanDate(today)}");
        }

        private static string FormatHumanDate(DateTime d)
        {
            // 9 mai 2026
            return d.ToString("d MMMM yyyy", new System.Globalization.CultureInfo("fr-FR"));
        }
    }

    public class EncaisserRequestDto
    {
        public decimal Montant { get; set; }
    }
}
