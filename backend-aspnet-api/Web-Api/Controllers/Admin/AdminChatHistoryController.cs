using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Web_Api.Auth.Constants;
using Web_Api.data;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Module 12 (Master Prompt) — Lecture seule des sessions/messages/insights
    /// chatbot pour l'UI admin (JWT auth, pas de clé API). Et endpoint sandbox
    /// qui agit comme passe-plat vers le chatbot existant sans persister de
    /// session (utilisé pour la page "Sandbox" admin).
    ///
    /// Voir CHATBOT_API_AUDIT.md pour la justification.
    /// </summary>
    [ApiController]
    [Route("api/admin/chatbot")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminChatHistoryController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly Web_Api.Services.Admin.AdminChatOrchestratorService _orchestrator;

        public AdminChatHistoryController(
            AppDbContext db,
            Web_Api.Services.Admin.AdminChatOrchestratorService orchestrator)
        {
            _db = db;
            _orchestrator = orchestrator;
        }

        // GET /api/admin/chatbot/sessions
        [HttpGet("sessions")]
        public async Task<IActionResult> ListSessions([FromQuery] int limit = 50, CancellationToken ct = default)
        {
            limit = Math.Clamp(limit, 1, 200);

            var sessions = await _db.F_CHATBOT_SESSIONS.AsNoTracking()
                .OrderByDescending(s => s.LastActivityAt)
                .Take(limit)
                .ToListAsync(ct);

            var sessionIds = sessions.Select(s => s.Id).ToList();
            var counts = await _db.F_CHATBOT_MESSAGES.AsNoTracking()
                .Where(m => sessionIds.Contains(m.SessionId))
                .GroupBy(m => m.SessionId)
                .Select(g => new { SessionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SessionId, x => x.Count, ct);

            return Ok(sessions.Select(s => new
            {
                id = s.Id,
                userId = s.UserId,
                language = s.Language,
                startedAt = s.StartedAt,
                lastActivityAt = s.LastActivityAt,
                messageCount = counts.TryGetValue(s.Id, out var c) ? c : 0,
            }));
        }

        // GET /api/admin/chatbot/sessions/{id}/messages
        [HttpGet("sessions/{id:guid}/messages")]
        public async Task<IActionResult> GetSessionMessages(Guid id, CancellationToken ct)
        {
            var msgs = await _db.F_CHATBOT_MESSAGES.AsNoTracking()
                .Where(m => m.SessionId == id)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync(ct);
            return Ok(msgs);
        }

        // GET /api/admin/chatbot/insights
        [HttpGet("insights")]
        public async Task<IActionResult> ListInsights([FromQuery] int limit = 100, CancellationToken ct = default)
        {
            limit = Math.Clamp(limit, 1, 500);
            var rows = await _db.F_CHATBOT_INSIGHTS.AsNoTracking()
                .OrderByDescending(i => i.CreatedAt)
                .Take(limit)
                .ToListAsync(ct);
            return Ok(rows);
        }

        // GET /api/admin/chatbot/stats
        [HttpGet("stats")]
        public async Task<IActionResult> Stats(CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var ago24h = now.AddHours(-24);

            var totalSessions = await _db.F_CHATBOT_SESSIONS.AsNoTracking().CountAsync(ct);
            var totalMessages = await _db.F_CHATBOT_MESSAGES.AsNoTracking().CountAsync(ct);
            var sessions24h = await _db.F_CHATBOT_SESSIONS.AsNoTracking().CountAsync(s => s.LastActivityAt >= ago24h, ct);
            var feedbackUp = await _db.F_CHATBOT_MESSAGES.AsNoTracking().CountAsync(m => m.Feedback == "up", ct);
            var feedbackDown = await _db.F_CHATBOT_MESSAGES.AsNoTracking().CountAsync(m => m.Feedback == "down", ct);

            var byAction = await _db.F_CHATBOT_MESSAGES.AsNoTracking()
                .Where(m => m.Action != null)
                .GroupBy(m => m.Action!)
                .Select(g => new { Action = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            return Ok(new
            {
                totalSessions,
                totalMessages,
                sessions24h,
                feedbackUp,
                feedbackDown,
                byAction,
            });
        }

        // POST /api/admin/chatbot/sandbox
        [HttpPost("sandbox")]
        public async Task<IActionResult> Sandbox([FromBody] SandboxDto dto, CancellationToken ct)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest(new { message = "Message requis." });

            // On délègue à l'orchestrator existant. Le résultat retourne `action` + `content`
            // ce qui sert de "debug panel" côté React (équivalent intent/confidence du master prompt).
            try
            {
                Guid? userId = null;
                if (Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var g)) userId = g;

                // sessionId=null → orchestrateur ne persiste pas la session si userId est null,
                // sinon il en crée une nouvelle. La langue est détectée auto par le service.
                var result = await _orchestrator.AskAsync(
                    question: dto.Message,
                    sessionId: null,
                    userId: userId,
                    ct: ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        public class SandboxDto
        {
            public string Message { get; set; } = string.Empty;
            public string? Language { get; set; }
        }
    }
}
