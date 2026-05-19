using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Middleware
{
    /// <summary>
    /// Section 1.2 — Idempotency middleware.
    /// Active sur POST /api/livreur/* et POST /api/client/*. Lit le header
    /// X-Client-Action-Id (UUID). Si présent dans F_LIVREUR_ACTION_LOG → renvoie
    /// la même réponse HTTP qu'avant (replay safe). Sinon : exécute le pipeline,
    /// puis log l'action avec PayloadHash SHA256.
    ///
    /// Sans header → mode legacy (le pipeline normal s'exécute sans loguer).
    /// </summary>
    public class IdempotencyMiddleware : IMiddleware
    {
        private readonly ILogger<IdempotencyMiddleware> _logger;

        public IdempotencyMiddleware(ILogger<IdempotencyMiddleware> logger)
        {
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, RequestDelegate next)
        {
            // Filtre : seulement POST/PUT/DELETE sur /api/livreur ou /api/client
            var path = context.Request.Path.Value ?? string.Empty;
            var method = context.Request.Method;
            var isTargetMethod = method == "POST" || method == "PUT" || method == "DELETE";
            var isTargetPath = path.StartsWith("/api/livreur", StringComparison.OrdinalIgnoreCase)
                            || path.StartsWith("/api/client", StringComparison.OrdinalIgnoreCase);

            if (!isTargetMethod || !isTargetPath)
            {
                await next(context);
                return;
            }

            var actionIdRaw = context.Request.Headers["X-Client-Action-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(actionIdRaw) || !Guid.TryParse(actionIdRaw, out var actionId))
            {
                // Pas d'idempotence demandée → mode legacy.
                await next(context);
                return;
            }

            var db = context.RequestServices.GetRequiredService<AppDbContext>();

            // Replay détection : si le ClientActionId a déjà été traité, on renvoie
            // la même réponse HTTP (le body n'est pas conservé pour limiter la taille,
            // mais on indique au client qu'il s'agit d'un replay).
            var existing = await db.F_LIVREUR_ACTION_LOGS
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ClientActionId == actionId);
            if (existing != null)
            {
                context.Response.StatusCode = existing.HttpResponse;
                context.Response.Headers["X-Idempotent-Replay"] = "true";
                if (existing.HttpResponse < 400)
                {
                    await context.Response.WriteAsync("{\"replayed\":true}");
                }
                else
                {
                    await context.Response.WriteAsync("{\"replayed\":true,\"failed\":true}");
                }
                return;
            }

            // Hash du payload pour audit (utile pour détecter les replays légèrement
            // modifiés — non bloquant, juste loggé).
            string payloadHash = "n/a";
            if (context.Request.ContentLength > 0)
            {
                context.Request.EnableBuffering();
                var ms = new MemoryStream();
                await context.Request.Body.CopyToAsync(ms);
                payloadHash = Convert.ToHexString(SHA256.HashData(ms.ToArray()));
                ms.Position = 0;
                context.Request.Body = ms;
            }

            // Capture le code HTTP de la réponse pour le persister
            await next(context);

            try
            {
                var userIdRaw = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                Guid.TryParse(userIdRaw, out var userId);

                db.F_LIVREUR_ACTION_LOGS.Add(new F_LIVREUR_ACTION_LOG
                {
                    ClientActionId = actionId,
                    LivreurUserId = userId,
                    Endpoint = path.Length > 255 ? path.Substring(0, 255) : path,
                    PayloadHash = payloadHash.Length > 64 ? payloadHash.Substring(0, 64) : payloadHash,
                    ProcessedAt = DateTime.UtcNow,
                    HttpResponse = context.Response.StatusCode,
                });
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Idempotency log failed for action {ActionId}", actionId);
            }
        }
    }
}
