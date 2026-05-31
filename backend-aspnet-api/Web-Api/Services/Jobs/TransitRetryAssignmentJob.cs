using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.Services.Refonte;

namespace Web_Api.Services.Jobs
{
    /// <summary>
    /// T-10 — Job Hangfire (toutes les 5 minutes) qui tente de réaffecter
    /// un livreur transit à chaque transfert resté en attente
    /// (EN_ATTENTE_AFFECTATION_TRANSIT ou EN_ATTENTE_TRANSIT).
    /// Mirror du pattern <see cref="Web_Api.Services.Livreur.DepotIncrementJob"/>.
    /// </summary>
    public class TransitRetryAssignmentJob
    {
        public const string JobId = "transit-retry-assignment";

        private readonly AppDbContext _db;
        private readonly ITransitOrchestrationService _orchestration;
        private readonly ILogger<TransitRetryAssignmentJob> _logger;

        public TransitRetryAssignmentJob(
            AppDbContext db,
            ITransitOrchestrationService orchestration,
            ILogger<TransitRetryAssignmentJob> logger)
        {
            _db = db;
            _orchestration = orchestration;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var ct = CancellationToken.None;

            var pieces = await _db.F_TRANSFERTS
                .Where(t => t.Status == TransitStatuses.EnAttenteAffectationTransit
                         || t.Status == TransitStatuses.EnAttenteTransit)
                .Select(t => t.DoPiece)
                .Distinct()
                .ToListAsync(ct);

            if (pieces.Count == 0)
            {
                _logger.LogInformation("TransitRetryAssignmentJob : 0 transferts en attente");
                return;
            }

            int totalAssigned = 0;
            foreach (var piece in pieces)
            {
                if (string.IsNullOrWhiteSpace(piece))
                    continue;

                try
                {
                    totalAssigned += await _orchestration.RetryAssignmentAsync(piece, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "TransitRetryAssignmentJob : échec relance affectation pour {Piece}", piece);
                }
            }

            _logger.LogInformation(
                "TransitRetryAssignmentJob : {Pieces} pièces traitées, {Assigned} transferts affectés",
                pieces.Count, totalAssigned);
        }
    }
}
