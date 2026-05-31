using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.data;
using Web_Api.Hubs;
using Web_Api.Model;

namespace Web_Api.Services.Jobs
{
    /// <summary>
    /// T-03 — Job Hangfire (toutes les heures) qui escalade les transferts
    /// restés en EN_ATTENTE_AFFECTATION_TRANSIT depuis plus de 24h.
    /// Crée une alerte superviseur CRITICAL et pousse SignalR vers le
    /// groupe "superviseurs".
    /// </summary>
    public class TransitEscalation24hJob
    {
        public const string JobId = "transit-escalation-24h";
        public const string AlertType = "TRANSIT_BLOCKED_24H";

        private readonly AppDbContext _db;
        private readonly IHubContext<ReclamationHub> _hub;
        private readonly ILogger<TransitEscalation24hJob> _logger;

        public TransitEscalation24hJob(
            AppDbContext db,
            IHubContext<ReclamationHub> hub,
            ILogger<TransitEscalation24hJob> logger)
        {
            _db = db;
            _hub = hub;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var ct = CancellationToken.None;
            var now = DateTime.UtcNow;
            var cutoff = now - TimeSpan.FromHours(24);

            // F_TRANSFERT.AffectedAt est posée à la création (DateTime.UtcNow par défaut).
            // On l'utilise comme "CreatedAt" puisque aucun autre champ ne le matérialise.
            var candidates = await _db.F_TRANSFERTS
                .Where(t => t.Status == TransitStatuses.EnAttenteAffectationTransit
                         && t.AffectedAt < cutoff
                         && t.EscalatedAt == null)
                .ToListAsync(ct);

            if (candidates.Count == 0)
            {
                _logger.LogInformation("TransitEscalation24hJob : aucun transfert à escalader");
                return;
            }

            // Détecte les transferts déjà escaladés (alerte existante de ce type)
            // afin de ne pas redoubler les alertes même si EscalatedAt a été réinitialisé.
            var candidateIds = candidates.Select(t => t.Id).ToArray();
            var alreadyAlerted = await _db.F_SUPERVISOR_ALERTS
                .Where(a => a.AlertType == AlertType
                         && a.RelatedTransfertId != null
                         && candidateIds.Contains(a.RelatedTransfertId!.Value))
                .Select(a => a.RelatedTransfertId!.Value)
                .ToListAsync(ct);
            var alertedSet = alreadyAlerted.ToHashSet();

            var newAlerts = new System.Collections.Generic.List<F_SUPERVISOR_ALERT>();
            foreach (var transfert in candidates)
            {
                if (alertedSet.Contains(transfert.Id))
                {
                    // Une alerte existe déjà — on aligne juste EscalatedAt si besoin.
                    transfert.EscalatedAt ??= now;
                    continue;
                }

                transfert.EscalatedAt = now;
                var alert = new F_SUPERVISOR_ALERT
                {
                    Severity = "CRITICAL",
                    AlertType = AlertType,
                    RelatedTransfertId = transfert.Id,
                    Message = $"Transfert {transfert.DoPiece} bloqué depuis 24h sans livreur. Action requise.",
                    CreatedAt = now
                };
                _db.F_SUPERVISOR_ALERTS.Add(alert);
                newAlerts.Add(alert);
            }

            await _db.SaveChangesAsync(ct);

            foreach (var alert in newAlerts)
            {
                try
                {
                    await _hub.Clients.Group(ReclamationEvents.GroupSuperviseurs).SendAsync(
                        ReclamationEvents.NouvelleAlerte,
                        new
                        {
                            id = alert.Id,
                            severity = alert.Severity,
                            alertType = alert.AlertType,
                            message = alert.Message,
                            relatedTransfertId = alert.RelatedTransfertId
                        }, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "TransitEscalation24hJob : push SignalR échoué pour alerte {AlertId}", alert.Id);
                }
            }

            _logger.LogInformation(
                "TransitEscalation24hJob : {Count} transferts escaladés ({New} nouvelles alertes)",
                candidates.Count, newAlerts.Count);
        }
    }
}
