using Microsoft.EntityFrameworkCore;
using Web_Api.data;

namespace Web_Api.Services.Confirmatrice
{
    /// <summary>
    /// Module 5 (Master Prompt) — Hosted service qui purge toutes les 60s les
    /// CommandeConfirmationLock dont LockedAt < (now - 15 min).
    /// Évite l'accumulation de verrous orphelins quand une confirmatrice ferme
    /// son onglet sans appeler /unlock (la libération existait déjà à la lecture
    /// suivante, ce service la rend proactive).
    /// </summary>
    public sealed class StaleLockCleanupHostedService : BackgroundService
    {
        private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(60);
        private readonly IServiceProvider _sp;
        private readonly ILogger<StaleLockCleanupHostedService> _logger;

        public StaleLockCleanupHostedService(IServiceProvider sp, ILogger<StaleLockCleanupHostedService> logger)
        {
            _sp = sp;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // petit délai au démarrage pour laisser l'app initialiser la DB
            try { await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken); } catch { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var cutoff = DateTime.UtcNow.Subtract(
                        TimeSpan.FromMinutes(CommandeConfirmationLockService.LockTimeoutMinutes));

                    using var scope = _sp.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var deleted = await db.CommandeConfirmationLocks
                        .Where(l => l.LockedAt < cutoff)
                        .ExecuteDeleteAsync(stoppingToken);

                    if (deleted > 0)
                        _logger.LogInformation("Lock cleanup: purgé {N} verrous stale", deleted);
                }
                catch (OperationCanceledException) { break; }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lock cleanup: échec d'un tick (on continue)");
                }

                try { await Task.Delay(TickInterval, stoppingToken); } catch { break; }
            }
        }
    }
}
