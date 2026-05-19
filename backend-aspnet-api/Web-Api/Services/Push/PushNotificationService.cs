using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Services.Push
{
    /// <summary>
    /// Section 3.11 — Push notifications FCM (Firebase Cloud Messaging).
    /// Lit FCM:ServerKey depuis appsettings. Si la clé n'est pas configurée
    /// (cas démo PFE sans Firebase actif), retourne en logguant simplement —
    /// ne casse pas le flow métier.
    /// </summary>
    public class PushNotificationService
    {
        private readonly AppDbContext _db;
        private readonly IHttpClientFactory _httpFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<PushNotificationService> _logger;

        public PushNotificationService(
            AppDbContext db,
            IHttpClientFactory httpFactory,
            IConfiguration config,
            ILogger<PushNotificationService> logger)
        {
            _db = db;
            _httpFactory = httpFactory;
            _config = config;
            _logger = logger;
        }

        public async Task<int> SendToUserAsync(Guid userId, string title, string body,
            object? data = null)
        {
            var serverKey = _config["Fcm:ServerKey"];
            var tokens = await _db.F_CLIENT_DEVICE_TOKENS.AsNoTracking()
                .Where(t => t.UserId == userId)
                .Select(t => t.Token)
                .ToListAsync();

            if (tokens.Count == 0)
            {
                _logger.LogInformation("Push skipped : aucun device token pour user {UserId}", userId);
                return 0;
            }

            if (string.IsNullOrWhiteSpace(serverKey))
            {
                _logger.LogInformation(
                    "[FCM-Stub] Pas de Fcm:ServerKey configurée. Title={Title} Body={Body} Tokens={Tokens}",
                    title, body, tokens.Count);
                return tokens.Count;
            }

            var http = _httpFactory.CreateClient("FCM");
            http.BaseAddress = new Uri("https://fcm.googleapis.com/");
            // FCM legacy : "Authorization: key=<server_key>" (sans espace après "key")
            http.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"key={serverKey}");

            int sent = 0;
            foreach (var token in tokens)
            {
                try
                {
                    var resp = await http.PostAsJsonAsync("fcm/send", new
                    {
                        to = token,
                        notification = new { title, body },
                        data,
                    });
                    if (resp.IsSuccessStatusCode) sent++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "FCM push failed for token {Token}", token[..10]);
                }
            }
            return sent;
        }

        public async Task<F_CLIENT_DEVICE_TOKEN> RegisterTokenAsync(Guid userId, string token, string platform)
        {
            var existing = await _db.F_CLIENT_DEVICE_TOKENS
                .FirstOrDefaultAsync(t => t.Token == token);
            if (existing != null)
            {
                existing.UserId = userId;
                existing.LastSeenAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return existing;
            }

            var entity = new F_CLIENT_DEVICE_TOKEN
            {
                UserId = userId,
                Token = token,
                Platform = string.IsNullOrWhiteSpace(platform) ? "android" : platform,
                CreatedAt = DateTime.UtcNow,
                LastSeenAt = DateTime.UtcNow,
            };
            _db.F_CLIENT_DEVICE_TOKENS.Add(entity);
            await _db.SaveChangesAsync();
            return entity;
        }
    }
}
