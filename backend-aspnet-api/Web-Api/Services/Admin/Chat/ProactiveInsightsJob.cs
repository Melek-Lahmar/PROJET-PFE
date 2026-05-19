using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.Hubs;
using Web_Api.Model;

namespace Web_Api.Services.Admin.Chat
{
    /// <summary>
    /// Section 5.4 — Job Hangfire toutes les 30 min qui détecte des anomalies
    /// métier et insère des F_CHATBOT_INSIGHT que l'admin verra dans le bandeau
    /// au-dessus de son chatbot. Il déclenche aussi un signal SignalR vers le
    /// groupe ADMIN pour notifier les sessions en cours.
    /// </summary>
    public class ProactiveInsightsJob
    {
        public const string JobId = "proactive-insights-job";

        private readonly AppDbContext _db;
        private readonly IHubContext<ReclamationHub> _hub;
        private readonly ILogger<ProactiveInsightsJob> _logger;

        public ProactiveInsightsJob(
            AppDbContext db,
            IHubContext<ReclamationHub> hub,
            ILogger<ProactiveInsightsJob> logger)
        {
            _db = db;
            _hub = hub;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var now = DateTime.UtcNow;
            var insights = new List<F_CHATBOT_INSIGHT>();

            // Anomalie 1 : taux de retour > +20% vs moyenne 30j sur un gouvernorat
            insights.AddRange(await DetectReturnRateAnomaliesAsync(now));

            // Anomalie 2 : confirmatrice avec charge > 2× la moyenne
            insights.AddRange(await DetectConfirmatriceOverloadAsync(now));

            // Anomalie 3 : produit avec taux de réclamation > 30%
            insights.AddRange(await DetectProductIssuesAsync(now));

            if (insights.Count == 0)
            {
                _logger.LogInformation("ProactiveInsightsJob : aucune anomalie détectée");
                return;
            }

            // Évite les doublons : ne pas re-créer un insight identique non encore dismissé
            var keys = insights.Select(i => i.Title).ToHashSet();
            var existing = await _db.F_CHATBOT_INSIGHTS
                .Where(i => i.DismissedAt == null && keys.Contains(i.Title))
                .Select(i => i.Title)
                .ToListAsync();

            var fresh = insights.Where(i => !existing.Contains(i.Title)).ToList();
            if (fresh.Count == 0) return;

            _db.F_CHATBOT_INSIGHTS.AddRange(fresh);
            await _db.SaveChangesAsync();

            await _hub.Clients.Group(ReclamationEvents.GroupConfirmateurs).SendAsync(
                "InsightsRefreshed",
                new { count = fresh.Count, ts = now });

            _logger.LogInformation("ProactiveInsightsJob : {Count} nouvelles anomalies", fresh.Count);
        }

        private async Task<List<F_CHATBOT_INSIGHT>> DetectReturnRateAnomaliesAsync(DateTime now)
        {
            var weekStart = now.AddDays(-7);
            var monthStart = now.AddDays(-30);

            // Comparer le taux de retour (RETOUR / total terminé) sur 7j vs 30j par ville
            var rows = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(l => l.LI_DateCreation >= monthStart
                         && (l.LI_Statut == DeliveryStatusCodes.Livre
                          || l.LI_Statut == DeliveryStatusCodes.Retour))
                .Select(l => new { l.LI_Ville, l.LI_Statut, l.LI_DateCreation })
                .ToListAsync();

            var byVille = rows.GroupBy(r => string.IsNullOrWhiteSpace(r.LI_Ville) ? "Inconnu" : r.LI_Ville);
            var insights = new List<F_CHATBOT_INSIGHT>();

            foreach (var g in byVille)
            {
                var month = g.ToList();
                var week = month.Where(m => m.LI_DateCreation >= weekStart).ToList();
                if (month.Count < 10 || week.Count < 5) continue;

                var monthRate = (double)month.Count(m => m.LI_Statut == DeliveryStatusCodes.Retour) / month.Count;
                var weekRate = (double)week.Count(m => m.LI_Statut == DeliveryStatusCodes.Retour) / week.Count;

                if (monthRate <= 0.0001) continue;
                var deltaPct = (weekRate - monthRate) / monthRate * 100.0;
                if (deltaPct < 20.0) continue;

                insights.Add(new F_CHATBOT_INSIGHT
                {
                    Type = "return_anomaly",
                    Severity = deltaPct >= 50.0 ? "critical" : "warning",
                    Title = $"Retours +{deltaPct:F0}% à {g.Key}",
                    Message = $"Cette semaine {weekRate:P0} de retour à {g.Key} vs {monthRate:P0} en moyenne 30j.",
                    PayloadJson = JsonSerializer.Serialize(new
                    {
                        scope = g.Key,
                        weekRate,
                        monthRate,
                        deltaPct,
                    }),
                });
            }

            return insights;
        }

        private async Task<List<F_CHATBOT_INSIGHT>> DetectConfirmatriceOverloadAsync(DateTime now)
        {
            var openByConf = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.AssignedToUserId != null
                         && (r.Statut == "ENVOYEE" || r.Statut == "EN_COURS_DE_TRAITEMENT"))
                .GroupBy(r => r.AssignedToUserId!.Value)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToListAsync();

            if (openByConf.Count < 2) return new List<F_CHATBOT_INSIGHT>();

            var avg = openByConf.Average(x => x.Count);
            var insights = new List<F_CHATBOT_INSIGHT>();

            foreach (var c in openByConf.Where(c => c.Count > avg * 2))
            {
                var profile = await _db.ProfilsUtilisateurs.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UtilisateurId == c.UserId);
                var name = profile?.NomComplet?.Trim() ?? "Confirmatrice";
                insights.Add(new F_CHATBOT_INSIGHT
                {
                    Type = "overload",
                    Severity = "info",
                    Title = $"{name} surchargée ({c.Count} cas)",
                    Message = $"{name} a {c.Count} cas ouverts vs {avg:F0} en moyenne.",
                    PayloadJson = JsonSerializer.Serialize(new { userId = c.UserId, openCases = c.Count, avg }),
                });
            }
            return insights;
        }

        private async Task<List<F_CHATBOT_INSIGHT>> DetectProductIssuesAsync(DateTime now)
        {
            var since = now.AddDays(-30);

            var rows = await _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.CreatedAt >= since && r.ArRef != null)
                .GroupBy(r => r.ArRef!)
                .Select(g => new { ArRef = g.Key, Count = g.Count() })
                .ToListAsync();

            var insights = new List<F_CHATBOT_INSIGHT>();
            foreach (var r in rows.Where(x => x.Count >= 5))
            {
                insights.Add(new F_CHATBOT_INSIGHT
                {
                    Type = "product_issue",
                    Severity = r.Count >= 10 ? "critical" : "warning",
                    Title = $"Produit {r.ArRef} — {r.Count} réclamations 30j",
                    Message = $"Le produit {r.ArRef} a {r.Count} réclamations sur 30 jours, à investiguer.",
                    PayloadJson = JsonSerializer.Serialize(new { arRef = r.ArRef, count = r.Count }),
                });
            }
            return insights;
        }
    }
}
