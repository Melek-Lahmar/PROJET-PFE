using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Web_Api.Middleware
{
    /// <summary>
    /// Filet de sécurité global : capture toute exception non gérée par les
    /// contrôleurs et la transforme en réponse JSON propre.
    ///
    /// - Pas de StackTrace exposée au client.
    /// - Statut HTTP cohérent selon le type d'exception (500 par défaut).
    /// - Message en français lisible côté Flutter (champ "message").
    /// - Log côté serveur avec corrélation TraceIdentifier.
    ///
    /// Refonte 2026-05-11 — toutes apps Flutter consomment "message" sans
    /// crasher sur 500/timeouts/erreurs DB.
    /// </summary>
    public class GlobalExceptionMiddleware : IMiddleware
    {
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IWebHostEnvironment _env;

        public GlobalExceptionMiddleware(
            ILogger<GlobalExceptionMiddleware> logger,
            IWebHostEnvironment env)
        {
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context, RequestDelegate next)
        {
            try
            {
                await next(context);
            }
            catch (UnauthorizedAccessException ex)
            {
                await WriteAsync(context, HttpStatusCode.Unauthorized,
                    "Non autorisé.", ex);
            }
            catch (KeyNotFoundException ex)
            {
                await WriteAsync(context, HttpStatusCode.NotFound,
                    "Ressource introuvable.", ex);
            }
            catch (ArgumentException ex)
            {
                await WriteAsync(context, HttpStatusCode.BadRequest,
                    ex.Message, ex);
            }
            catch (InvalidOperationException ex)
            {
                await WriteAsync(context, HttpStatusCode.Conflict,
                    ex.Message, ex);
            }
            catch (DbUpdateException ex)
            {
                await WriteAsync(context, HttpStatusCode.Conflict,
                    "Conflit base de données. Réessayez.", ex);
            }
            catch (TaskCanceledException ex) when (context.RequestAborted.IsCancellationRequested)
            {
                // Client a annulé : pas la peine de logger en error
                _logger.LogDebug("Client cancellation : {Path}", context.Request.Path);
                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = 499; // nginx-style "Client Closed Request"
                }
                _ = ex; // évite warning unused
            }
            catch (TimeoutException ex)
            {
                await WriteAsync(context, HttpStatusCode.GatewayTimeout,
                    "Délai d'attente dépassé. Réessayez.", ex);
            }
            catch (Exception ex)
            {
                await WriteAsync(context, HttpStatusCode.InternalServerError,
                    "Une erreur interne est survenue. L'équipe a été notifiée.", ex);
            }
        }

        private async Task WriteAsync(
            HttpContext context, HttpStatusCode status, string message, Exception ex)
        {
            _logger.LogError(ex,
                "Unhandled {Status} on {Method} {Path} (trace {Trace}) : {Message}",
                (int)status, context.Request.Method, context.Request.Path,
                context.TraceIdentifier, ex.Message);

            if (context.Response.HasStarted)
            {
                // SignalR / SSE ont déjà commencé à streamer — on ne peut plus
                // écrire un body JSON, on log et on continue.
                return;
            }

            context.Response.Clear();
            context.Response.StatusCode = (int)status;
            context.Response.ContentType = "application/json; charset=utf-8";

            var payload = new
            {
                errorCode = ResolveErrorCode(status, ex),
                errorMessage = message,
                // Compatibilité avec les écrans Flutter/React existants.
                message,
                details = _env.IsDevelopment() ? new { exceptionType = ex.GetType().Name } : null,
                httpStatus = (int)status,
                timestamp = DateTimeOffset.UtcNow,
                traceId = context.TraceIdentifier
            };

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(payload),
                context.RequestAborted);
        }

        private static string ResolveErrorCode(HttpStatusCode status, Exception ex)
        {
            var typeName = ex.GetType().Name;

            if (typeName.Contains("Validation", StringComparison.OrdinalIgnoreCase))
                return "VALIDATION_ERROR";

            if (typeName.Contains("Forbidden", StringComparison.OrdinalIgnoreCase))
                return "FORBIDDEN";

            if (typeName.Contains("NotFound", StringComparison.OrdinalIgnoreCase))
                return "NOT_FOUND";

            if (typeName.Contains("Conflict", StringComparison.OrdinalIgnoreCase))
                return "CONFLICT";

            if (typeName.Contains("Image", StringComparison.OrdinalIgnoreCase))
                return "IMAGE_UPLOAD_ERROR";

            return status switch
            {
                HttpStatusCode.BadRequest => "BAD_REQUEST",
                HttpStatusCode.Unauthorized => "UNAUTHORIZED",
                HttpStatusCode.Forbidden => "FORBIDDEN",
                HttpStatusCode.NotFound => "NOT_FOUND",
                HttpStatusCode.Conflict => "CONFLICT",
                HttpStatusCode.RequestTimeout => "REQUEST_TIMEOUT",
                HttpStatusCode.GatewayTimeout => "GATEWAY_TIMEOUT",
                HttpStatusCode.InternalServerError => "INTERNAL_SERVER_ERROR",
                _ => $"HTTP_{(int)status}"
            };
        }
    }
}
