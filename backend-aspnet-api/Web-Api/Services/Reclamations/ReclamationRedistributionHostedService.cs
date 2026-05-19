using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Web_Api.Services.Reclamations
{
    /// <summary>
    /// Phase 3C — Scan périodique qui :
    ///   1. libère les cas en cours dont UpdatedAt est antérieur à 30 minutes
    ///      et les redistribue via les 3 critères (en excluant la conf. précédente) ;
    ///   2. tente de redistribuer les cas non attribués (créés quand aucune conf. n'était
    ///      éligible) à toute confirmatrice désormais disponible.
    ///
    /// Fréquence figée par l'utilisateur : 5 minutes.
    /// Seuil d'inactivité figé : 30 minutes.
    /// Seul <see cref="ReclamationsService"/> écrit en base — ce service se contente
    /// d'orchestrer les appels.
    /// </summary>
    public class ReclamationRedistributionHostedService : BackgroundService
    {
        private static readonly TimeSpan ScanInterval = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan InactivityThreshold = TimeSpan.FromMinutes(30);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ReclamationRedistributionHostedService> _logger;

        public ReclamationRedistributionHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<ReclamationRedistributionHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "3C: redistribution service démarré — scan toutes les {Interval}, seuil inactivité {Threshold}",
                ScanInterval, InactivityThreshold);

            // Attente initiale : on laisse l'app finir de démarrer avant le premier tick.
            try
            {
                await Task.Delay(ScanInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "3C: erreur pendant le scan de redistribution");
                }

                try
                {
                    await Task.Delay(ScanInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("3C: redistribution service arrêté.");
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            // Scope dédié : AppDbContext et ReclamationsService sont scoped.
            using var scope = _scopeFactory.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<ReclamationsService>();

            // Les IDs libérés par ReleaseStaleCasesAsync sont explicitement sautés par
            // RedistributeUnassignedCasesAsync pour ne pas annuler l'exclusion dans le même tick.
            var releasedIds = await service.ReleaseStaleCasesAsync(InactivityThreshold, ct);
            var orphansReassigned = await service.RedistributeUnassignedCasesAsync(releasedIds, ct);

            if (releasedIds.Count > 0 || orphansReassigned > 0)
            {
                _logger.LogInformation(
                    "3C: scan terminé — libérés={Stale} réattribués_orphelins={Orphans}",
                    releasedIds.Count, orphansReassigned);
            }
        }
    }
}
