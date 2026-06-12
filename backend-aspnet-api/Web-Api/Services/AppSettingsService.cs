using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Globalization;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Services
{
    /// <summary>
    /// Module 10 (Master Prompt) — Service de paramètres applicatifs (clé/valeur JSON).
    /// Cache mémoire 5 minutes invalidé à chaque écriture.
    /// </summary>
    public sealed class AppSettingsService
    {
        public const string DeliveryFeeHomeKey = "checkout.deliveryFee.home";
        public const decimal DefaultDeliveryFeeHome = 8.000m;

        public static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
        private const string CACHE_KEY_ALL = "appsettings:all";
        private const string CACHE_KEY_PUBLIC = "appsettings:public";

        private readonly AppDbContext _db;
        private readonly IMemoryCache _cache;

        public AppSettingsService(AppDbContext db, IMemoryCache cache)
        {
            _db = db;
            _cache = cache;
        }

        public async Task<List<AppSetting>> ListAllAsync(CancellationToken ct = default)
        {
            if (_cache.TryGetValue(CACHE_KEY_ALL, out List<AppSetting>? cached) && cached != null)
                return cached;
            var rows = await _db.AppSettings.AsNoTracking().OrderBy(x => x.Key).ToListAsync(ct);
            _cache.Set(CACHE_KEY_ALL, rows, CacheTtl);
            return rows;
        }

        public async Task<Dictionary<string, string>> GetPublicAsync(CancellationToken ct = default)
        {
            if (_cache.TryGetValue(CACHE_KEY_PUBLIC, out Dictionary<string, string>? cached) && cached != null)
                return cached;
            var dict = await _db.AppSettings.AsNoTracking()
                .Where(s => s.IsPublic)
                .ToDictionaryAsync(s => s.Key, s => s.ValueJson, ct);
            _cache.Set(CACHE_KEY_PUBLIC, dict, CacheTtl);
            return dict;
        }

        public async Task<AppSetting?> GetAsync(string key, CancellationToken ct = default)
            => await _db.AppSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key, ct);

        public async Task<decimal> GetDecimalAsync(string key, decimal defaultValue, CancellationToken ct = default)
        {
            var row = await GetAsync(key, ct);
            if (row == null || string.IsNullOrWhiteSpace(row.ValueJson))
                return defaultValue;

            var raw = row.ValueJson.Trim().Trim('"');
            return decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var value)
                ? value
                : defaultValue;
        }

        public async Task<AppSetting> SetDecimalAsync(
            string key,
            decimal value,
            string? description,
            bool isPublic,
            Guid? adminId,
            CancellationToken ct = default)
        {
            var jsonNumber = value.ToString("0.000", CultureInfo.InvariantCulture);
            return await SetAsync(key, jsonNumber, description, isPublic, adminId, ct);
        }

        public async Task<AppSetting> SetAsync(string key, string valueJson, string? description, bool isPublic, Guid? adminId, CancellationToken ct = default)
        {
            var existing = await _db.AppSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
            if (existing == null)
            {
                existing = new AppSetting { Key = key };
                _db.AppSettings.Add(existing);
            }
            existing.ValueJson = valueJson ?? "null";
            existing.Description = description ?? existing.Description;
            existing.IsPublic = isPublic;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedByAdminId = adminId;
            await _db.SaveChangesAsync(ct);
            Invalidate();
            return existing;
        }

        public void Invalidate()
        {
            _cache.Remove(CACHE_KEY_ALL);
            _cache.Remove(CACHE_KEY_PUBLIC);
        }
    }
}
