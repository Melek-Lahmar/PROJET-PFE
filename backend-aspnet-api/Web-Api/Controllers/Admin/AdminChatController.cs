using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Services.Admin;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Endpoints exposés à n8n pour le chatbot métier.
    /// Authentification simple par header X-Chat-Api-Key (configurée via Chatbot:ApiKey).
    /// Cette couche traduit les intentions parsées par Groq en données métier.
    /// </summary>
    [ApiController]
    [Route("api/admin/chat")]
    public class AdminChatController : ControllerBase
    {
        private readonly AdminOrdersService _orders;
        private readonly AdminClaimsService _claims;
        private readonly AdminProductsService _products;
        private readonly AdminDashboardService _dashboard;
        private readonly AdminChatQueryService _query;
        private readonly AdminChatAnalyzeService _analyze;
        private readonly Web_Api.Services.Admin.Prediction.PredictionService _predict;
        private readonly AdminChatOrchestratorService _orchestrator;
        private readonly IConfiguration _config;
        private readonly AppDbContext _db;

        public AdminChatController(
            AdminOrdersService orders,
            AdminClaimsService claims,
            AdminProductsService products,
            AdminDashboardService dashboard,
            AdminChatQueryService query,
            AdminChatAnalyzeService analyze,
            Web_Api.Services.Admin.Prediction.PredictionService predict,
            AdminChatOrchestratorService orchestrator,
            IConfiguration config,
            AppDbContext db)
        {
            _orders = orders;
            _claims = claims;
            _products = products;
            _dashboard = dashboard;
            _query = query;
            _analyze = analyze;
            _predict = predict;
            _orchestrator = orchestrator;
            _config = config;
            _db = db;
        }

        // ====================================================================
        // Helpers
        // ====================================================================
        private bool ValidateApiKey()
        {
            var expected = _config["Chatbot:ApiKey"];
            if (string.IsNullOrWhiteSpace(expected)) return false;
            var got = Request.Headers["X-Chat-Api-Key"].ToString();
            return string.Equals(expected, got, StringComparison.Ordinal);
        }

        private IActionResult? DenyIfNoKey()
        {
            if (!ValidateApiKey())
                return Unauthorized(new { message = "Clé API chatbot invalide." });
            return null;
        }

        // ====================================================================
        // /count — Nombre de commandes correspondant aux filtres
        // ====================================================================
        [HttpGet("orders/count")]
        public async Task<IActionResult> OrdersCount(
            [FromQuery] ChatFiltersDto filters, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;

            var page = await _orders.GetPageAsync(new AdminOrdersQueryDto
            {
                Period = filters.Period,
                From = filters.From,
                To = filters.To,
                Governorate = filters.Governorate,
                Status = filters.Status,
                Search = filters.OrderNumber ?? filters.ClientQuery,
                PageSize = 1,
            }, ct);

            return Ok(new ChatCountResponseDto
            {
                Count = page.Total,
                Label = LabelForOrdersCount(filters),
                Filters = filters,
            });
        }

        // ====================================================================
        // /list — 20 premières commandes correspondant aux filtres
        // ====================================================================
        [HttpGet("orders/list")]
        public async Task<IActionResult> OrdersList(
            [FromQuery] ChatFiltersDto filters, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            var page = await _orders.GetPageAsync(new AdminOrdersQueryDto
            {
                Period = filters.Period,
                From = filters.From,
                To = filters.To,
                Governorate = filters.Governorate,
                Status = filters.Status,
                Search = filters.OrderNumber ?? filters.ClientQuery,
                PageSize = 20,
            }, ct);

            return Ok(new ChatListResponseDto<AdminOrderListItemDto>
            {
                Total = page.Total,
                Returned = page.Items.Count,
                Label = $"{page.Items.Count} commande(s) (sur {page.Total})",
                Items = page.Items
            });
        }

        // ====================================================================
        // /orders/{piece} — Détail commande
        // ====================================================================
        [HttpGet("orders/{piece}")]
        public async Task<IActionResult> OrderDetail(string piece, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            var detail = await _orders.GetDetailAsync(piece, ct);
            if (detail == null) return NotFound(new { message = "Commande introuvable." });
            return Ok(detail);
        }

        // ====================================================================
        // /claims/count + /claims/list
        // ====================================================================
        [HttpGet("claims/count")]
        public async Task<IActionResult> ClaimsCount(
            [FromQuery] ChatFiltersDto filters, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            var ov = await _claims.GetOverviewAsync(new AdminClaimsQueryDto
            {
                Period = filters.Period,
                From = filters.From,
                To = filters.To,
                Governorate = filters.Governorate,
            }, ct);

            int count;
            string label;
            if (string.Equals(filters.Status, "unhandled", StringComparison.OrdinalIgnoreCase))
            {
                count = ov.UnhandledCases.Count;
                label = $"{count} cas non traité(s)";
            }
            else
            {
                count = ov.Kpis.FirstOrDefault(k => k.Key == "totalClaims")?.Value is decimal v
                    ? (int)v : 0;
                label = $"{count} réclamation(s)";
            }
            return Ok(new ChatCountResponseDto
            {
                Count = count,
                Label = label,
                Filters = filters,
            });
        }

        [HttpGet("claims/list")]
        public async Task<IActionResult> ClaimsList(
            [FromQuery] ChatFiltersDto filters, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            var ov = await _claims.GetOverviewAsync(new AdminClaimsQueryDto
            {
                Period = filters.Period,
                From = filters.From,
                To = filters.To,
                Governorate = filters.Governorate,
            }, ct);
            return Ok(new ChatListResponseDto<AdminClaimRowDto>
            {
                Total = ov.UnhandledCases.Count,
                Returned = ov.UnhandledCases.Count,
                Label = $"{ov.UnhandledCases.Count} cas non traité(s)",
                Items = ov.UnhandledCases,
            });
        }

        // ====================================================================
        // /products/top — Top produits
        // ====================================================================
        [HttpGet("products/top")]
        public async Task<IActionResult> ProductsTop(
            [FromQuery] ChatFiltersDto filters, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            var ov = await _products.GetOverviewAsync(new AdminProductsQueryDto
            {
                Period = filters.Period,
                From = filters.From,
                To = filters.To,
                Governorate = filters.Governorate,
                TopN = 5,
            }, ct);

            var items = ov.TopByQuantity.Select(p => new ChatTopProductRowDto
            {
                ArticleRef = p.ArticleRef,
                Designation = p.Designation,
                Quantity = (double)p.Quantity,
                Revenue = (double)p.Revenue,
            }).ToList();

            return Ok(new ChatListResponseDto<ChatTopProductRowDto>
            {
                Total = items.Count,
                Returned = items.Count,
                Label = "Top 5 produits par quantité",
                Items = items,
            });
        }

        // ====================================================================
        // /governorates/stats — Stats par gouvernorat
        // ====================================================================
        [HttpGet("governorates/stats")]
        public async Task<IActionResult> GovernoratesStats(
            [FromQuery] ChatFiltersDto filters, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            var ov = await _dashboard.GetOverviewAsync(new AdminDashboardQueryDto
            {
                Period = filters.Period,
                From = filters.From,
                To = filters.To,
                TopN = 24,
            }, ct);

            var items = ov.GovernorateBreakdown.Select(g => new ChatGovernorateRowDto
            {
                Governorate = g.Label,
                Orders = g.Count,
                Delivered = 0,
                Returned = 0,
                DeliveryRate = 0,
            }).ToList();

            return Ok(new ChatListResponseDto<ChatGovernorateRowDto>
            {
                Total = items.Count,
                Returned = items.Count,
                Label = "Volume commandes par gouvernorat",
                Items = items,
            });
        }

        // ====================================================================
        // /query — DSL universel (couche A) — exécute n'importe quelle question
        // chiffrée dans le périmètre projet. Body :
        //   { entity, metric, filters, groupBy, limit, orderBy }
        // ====================================================================
        [HttpPost("query")]
        public async Task<IActionResult> Query(
            [FromBody] ChatQueryRequestDto request, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            if (request == null)
                return BadRequest(new { message = "Payload requis." });

            var result = await _query.ExecuteAsync(request, ct);
            return Ok(result);
        }

        // ====================================================================
        // /analyze — Analyse statistique (couche B) — tendance / comparaison /
        // anomalie / corrélation / distribution. Body :
        //   { operation, subject: { entity, metric, filters }, options }
        // ====================================================================
        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze(
            [FromBody] ChatAnalyzeRequestDto request, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            if (request == null)
                return BadRequest(new { message = "Payload requis." });

            var result = await _analyze.ExecuteAsync(request, ct);
            return Ok(result);
        }

        // ====================================================================
        // /predict — Prédiction ML.NET (couche C) — return_risk /
        // delivery_first_attempt / volume_forecast. Body :
        //   { task, input: { ... } }
        // ====================================================================
        [HttpPost("predict")]
        public async Task<IActionResult> Predict(
            [FromBody] ChatPredictRequestDto request, CancellationToken ct)
        {
            if (DenyIfNoKey() is { } deny) return deny;
            if (request == null)
                return BadRequest(new { message = "Payload requis." });

            var result = await _predict.PredictAsync(request, ct);
            return Ok(result);
        }

        // ====================================================================
        // /ask — Endpoint unique appelé par Flutter directement (sans n8n).
        // Pipeline interne : Groq router → exécution (kb/query/analyze/predict)
        // → Groq formatter → réponse JSON {success, message, action, data, rows, chart}.
        // ====================================================================
        [HttpPost("ask")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<ActionResult<ChatAskResponseDto>> Ask(
            [FromBody] ChatAskRequestDto request, CancellationToken ct)
        {
            if (request == null)
                return BadRequest(new { message = "Payload requis." });

            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? userId = Guid.TryParse(raw, out var uid) ? uid : null;
            var result = await _orchestrator.AskAsync(request.Question, request.SessionId, userId, ct);
            return Ok(result);
        }

        // Section 5.7 — Streaming SSE (Server-Sent Events) pour la réponse chatbot.
        // Phases : routing → data → chunks → done. Le pipeline interne reste celui
        // de AskAsync ; le streaming est sur la dernière phase (formatter) côté client.
        [HttpPost("ask-stream")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task AskStream(
            [FromBody] ChatAskRequestDto request, CancellationToken ct)
        {
            Response.Headers["Content-Type"] = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";

            if (request == null || string.IsNullOrWhiteSpace(request.Question))
            {
                await SseEvent(ct, "error", new { message = "Payload requis." });
                await SseEvent(ct, "done", new { });
                return;
            }

            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? userId = Guid.TryParse(raw, out var uid) ? uid : null;

            await SseEvent(ct, "routing", new { phase = "started" });

            // Pour rester simple et robuste, on exécute AskAsync (qui contient toute
            // la logique : router, exécution, formatter, mémoire, langue, suggestions)
            // puis on streame la réponse mot-par-mot.
            var resp = await _orchestrator.AskAsync(request.Question, request.SessionId, userId, ct);

            await SseEvent(ct, "data", new { resp.Action, resp.Data, resp.Rows, resp.Chart, resp.Suggestions });

            // Stream du message en chunks de mots (effet UX streaming sans modifier
            // l'orchestrateur Groq qui n'expose pas encore de stream low-level)
            var words = (resp.Message ?? string.Empty).Split(' ');
            var buf = new System.Text.StringBuilder();
            foreach (var w in words)
            {
                if (ct.IsCancellationRequested) break;
                buf.Append(w).Append(' ');
                await SseEvent(ct, "chunk", new { text = w + ' ' });
                await Task.Delay(40, ct);
            }
            await SseEvent(ct, "done", new { sessionId = resp.SessionId, language = resp.Language });
        }

        private async Task SseEvent(CancellationToken ct, string evt, object data)
        {
            if (ct.IsCancellationRequested) return;
            var json = System.Text.Json.JsonSerializer.Serialize(data);
            await Response.WriteAsync($"event: {evt}\n", ct);
            await Response.WriteAsync($"data: {json}\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }

        // Section 5.4 — insights pour bandeau cliquable
        [HttpGet("insights/pending")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> GetPendingInsights(CancellationToken ct)
        {
            var rows = await _db.F_CHATBOT_INSIGHTS.AsNoTracking()
                .Where(i => i.DismissedAt == null)
                .OrderByDescending(i => i.CreatedAt)
                .Take(20)
                .ToListAsync(ct);
            return Ok(rows);
        }

        [HttpPost("insights/{id:long}/feedback")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> InsightFeedback(
            long id,
            [FromBody] InsightFeedbackDto dto,
            CancellationToken ct)
        {
            var row = await _db.F_CHATBOT_INSIGHTS.FirstOrDefaultAsync(i => i.Id == id, ct);
            if (row == null) return NotFound();
            if (!string.IsNullOrEmpty(dto?.Feedback))
                row.AdminFeedback = dto.Feedback!.Length > 15 ? dto.Feedback.Substring(0, 15) : dto.Feedback;
            if (dto?.Dismiss == true)
                row.DismissedAt = DateTime.UtcNow;
            else
                row.ShownToAdminAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return Ok();
        }

        public class InsightFeedbackDto
        {
            public string? Feedback { get; set; }
            public bool Dismiss { get; set; }
        }

        // Section 1.5 — Refresh KB
        [HttpPost("kb/refresh")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<IActionResult> RefreshKb([FromServices] Web_Api.Services.Admin.Chat.KbGeneratorService gen, CancellationToken ct)
        {
            await gen.GenerateAsync(ct);
            return Ok(new { ok = true, regeneratedAt = DateTime.UtcNow });
        }

        // ====================================================================
        // /ping — sanity check pour n8n
        // ====================================================================
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            if (DenyIfNoKey() is { } deny) return deny;
            return Ok(new { ok = true, at = DateTime.UtcNow });
        }

        private static string LabelForOrdersCount(ChatFiltersDto f)
        {
            var parts = new System.Collections.Generic.List<string>();
            switch ((f.Status ?? "all").ToLowerInvariant())
            {
                case "delivered": parts.Add("livrée(s)"); break;
                case "returned": parts.Add("retournée(s)"); break;
                case "postponed": parts.Add("reportée(s)"); break;
                case "indelivery": parts.Add("en livraison"); break;
                case "pending": parts.Add("en attente"); break;
                default: parts.Add("commande(s)"); break;
            }
            if (!string.IsNullOrWhiteSpace(f.Governorate)) parts.Add($"({f.Governorate})");
            if (!string.IsNullOrWhiteSpace(f.Period)) parts.Add($"sur {f.Period}");
            return string.Join(" ", parts);
        }
    }
}
