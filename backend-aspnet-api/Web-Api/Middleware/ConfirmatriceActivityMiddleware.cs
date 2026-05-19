using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;

namespace Web_Api.Middleware
{
    /// <summary>
    /// Phase 3A — Met à jour ProfilUtilisateur.LastActivityAt quand une confirmatrice
    /// authentifiée fait un call API. Throttle en mémoire pour éviter d'écrire en base
    /// à chaque requête (max 1 UPDATE toutes les 60 s par utilisateur).
    /// </summary>
    public class ConfirmatriceActivityMiddleware
    {
        private static readonly TimeSpan ThrottleWindow = TimeSpan.FromSeconds(60);

        // Dernier timestamp écrit en base pour chaque user, en mémoire.
        // Volatilité acceptée : en cas de redémarrage, le prochain call écrira à nouveau.
        private static readonly ConcurrentDictionary<Guid, DateTime> _lastWrites = new();

        private readonly RequestDelegate _next;
        private readonly ILogger<ConfirmatriceActivityMiddleware> _logger;

        public ConfirmatriceActivityMiddleware(
            RequestDelegate next,
            ILogger<ConfirmatriceActivityMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, AppDbContext db)
        {
            // Laisse passer la requête d'abord : on ne bloque jamais la réponse.
            await _next(context);

            try
            {
                if (context.User.Identity?.IsAuthenticated != true) return;
                if (!context.User.IsInRole(AppRoles.CONFIRMATEUR)
                    && !context.User.IsInRole(AppRoles.ADMIN))
                    return;

                var raw = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!Guid.TryParse(raw, out var userId)) return;

                var now = DateTime.UtcNow;

                // Throttle : retourne `now` si on vient de mettre à jour la valeur,
                // sinon retourne la valeur existante (on skip l'UPDATE).
                var resolved = _lastWrites.AddOrUpdate(
                    userId,
                    now,
                    (_, previous) => (now - previous) >= ThrottleWindow ? now : previous);

                if (resolved != now) return; // skip DB write, throttled

                await db.ProfilsUtilisateurs
                    .Where(p => p.UtilisateurId == userId)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.LastActivityAt, now));
            }
            catch (Exception ex)
            {
                // Ne JAMAIS faire échouer la requête à cause du tracking d'activité.
                _logger.LogWarning(ex, "ConfirmatriceActivityMiddleware: écriture LastActivityAt échouée.");
            }
        }
    }
}
