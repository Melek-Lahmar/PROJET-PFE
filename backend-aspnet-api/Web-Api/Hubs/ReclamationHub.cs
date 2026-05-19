using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.Services.Reclamations;

namespace Web_Api.Hubs
{
    /// <summary>
    /// Phase 5 — Backbone événements (10 events). Le hub ajoute automatiquement
    /// les clients authentifiés aux groupes "confirmateurs" et "livreurs" selon
    /// leur rôle. Les pushs user-to-user continuent d'utiliser <c>Clients.User()</c>.
    ///
    /// Section 2.2.2 (refonte 2026-05-09) — OnDisconnectedAsync libère désormais
    /// les cas de la confirmatrice avec un **délai de grâce de 5 secondes** pour
    /// absorber les transitions Wi-Fi rapides. Si elle se reconnecte avant la
    /// fin du délai, on annule la libération.
    ///
    /// Règle : événement = signal, API = vérité. Le client doit recharger via REST
    /// à la reconnexion et ne pas se baser uniquement sur le flux SignalR.
    /// </summary>
    [Authorize]
    public class ReclamationHub : Hub
    {
        // Délai de grâce avant de libérer les cas d'une confirmatrice qui vient
        // de perdre la connexion. Permet d'absorber les transitions Wi-Fi/4G.
        public static readonly TimeSpan GracePeriod = TimeSpan.FromSeconds(5);

        // Connexions actives par utilisateur (multi-tab support). Décrémenté à chaque
        // OnDisconnected ; quand la dernière disparaît on déclenche le timer de grâce.
        private static readonly ConcurrentDictionary<Guid, int> _activeConnections = new();

        private readonly IServiceProvider _services;
        private readonly ILogger<ReclamationHub> _logger;

        public ReclamationHub(IServiceProvider services, ILogger<ReclamationHub> logger)
        {
            _services = services;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userIdRaw = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            var isConfirmateur = Context.User?.IsInRole(AppRoles.CONFIRMATEUR) == true;

            if (Guid.TryParse(userIdRaw, out var userId))
            {
                var first = !_activeConnections.ContainsKey(userId);
                _activeConnections.AddOrUpdate(userId, 1, (_, n) => n + 1);

                // A.2 — Ouvre une session F_CONFIRMATRICE_SESSION uniquement
                // à la PREMIÈRE connexion (multi-tab → on garde la session
                // ouverte tant qu'il reste au moins une connexion).
                if (isConfirmateur && first)
                {
                    try
                    {
                        using var scope = _services.CreateScope();
                        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        db.F_CONFIRMATRICE_SESSIONS.Add(new F_CONFIRMATRICE_SESSION
                        {
                            ConfirmatriceId = userId,
                            StartedAt = DateTime.UtcNow,
                        });
                        await db.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex,
                            "OnConnected user={UserId} : impossible d'ouvrir une session F_CONFIRMATRICE_SESSION",
                            userId);
                    }
                }
            }

            if (isConfirmateur || Context.User?.IsInRole(AppRoles.ADMIN) == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, ReclamationEvents.GroupConfirmateurs);
            }

            if (Context.User?.IsInRole(AppRoles.LIVREUR) == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, ReclamationEvents.GroupLivreurs);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userIdRaw = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            var isConfirmateur = Context.User?.IsInRole(AppRoles.CONFIRMATEUR) == true;
            var isAdmin = Context.User?.IsInRole(AppRoles.ADMIN) == true;
            var isLivreur = Context.User?.IsInRole(AppRoles.LIVREUR) == true;

            if (isConfirmateur || isAdmin)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, ReclamationEvents.GroupConfirmateurs);
            }

            if (isLivreur)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, ReclamationEvents.GroupLivreurs);
            }

            // Section 2.2.2 — délai de grâce 5s avant libération des cas
            if (Guid.TryParse(userIdRaw, out var userId) && isConfirmateur)
            {
                var remaining = _activeConnections.AddOrUpdate(userId, 0, (_, n) => Math.Max(0, n - 1));
                if (remaining == 0)
                {
                    // A.2 — Ferme la session active dans F_CONFIRMATRICE_SESSION.
                    try
                    {
                        using var scope = _services.CreateScope();
                        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        var openSession = await db.F_CONFIRMATRICE_SESSIONS
                            .Where(s => s.ConfirmatriceId == userId && s.EndedAt == null)
                            .OrderByDescending(s => s.StartedAt)
                            .FirstOrDefaultAsync();
                        if (openSession != null)
                        {
                            openSession.EndedAt = DateTime.UtcNow;
                            openSession.EndReason = "disconnected";
                            await db.SaveChangesAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex,
                            "OnDisconnected user={UserId} : impossible de fermer la session F_CONFIRMATRICE_SESSION",
                            userId);
                    }

                    // Fire and forget : ne bloque pas le pipeline SignalR
                    _ = ScheduleCaseReleaseAsync(userId);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        private async Task ScheduleCaseReleaseAsync(Guid userId)
        {
            try
            {
                await Task.Delay(GracePeriod);

                // Si la confirmatrice s'est reconnectée pendant les 5s on annule.
                if (_activeConnections.TryGetValue(userId, out var n) && n > 0)
                {
                    _logger.LogDebug(
                        "OnDisconnected user={UserId} : reconnexion détectée pendant la grâce, libération annulée",
                        userId);
                    return;
                }

                using var scope = _services.CreateScope();
                var reclamations = scope.ServiceProvider.GetRequiredService<ReclamationsService>();
                var released = await reclamations.ReleaseActiveCasesForUserAsync(
                    userId, reason: "disconnected", default);

                if (released > 0)
                {
                    _logger.LogInformation(
                        "OnDisconnected user={UserId} : {Count} cas libérés après grâce {Seconds}s",
                        userId, released, GracePeriod.TotalSeconds);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "OnDisconnected user={UserId} : échec libération cas — sera rattrapé par le scan",
                    userId);
            }
        }
    }
}
