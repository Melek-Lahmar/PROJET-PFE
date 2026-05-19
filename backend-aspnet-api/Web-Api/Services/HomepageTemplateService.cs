using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Services
{
    /// <summary>
    /// Module 7 (Master Prompt) — Logique des templates Homepage Builder.
    /// Garantit max 5 templates et 1 seul actif (transaction).
    /// </summary>
    public sealed class HomepageTemplateService
    {
        public const int MaxTemplates = 5;
        private readonly AppDbContext _db;

        public HomepageTemplateService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<HomepageTemplate>> ListAsync(CancellationToken ct = default)
            => await _db.HomepageTemplates.AsNoTracking()
                .OrderByDescending(t => t.IsActive)
                .ThenByDescending(t => t.UpdatedAt)
                .ToListAsync(ct);

        public async Task<HomepageTemplate?> GetActiveAsync(CancellationToken ct = default)
            => await _db.HomepageTemplates.AsNoTracking()
                .FirstOrDefaultAsync(t => t.IsActive, ct);

        public async Task<HomepageTemplate?> GetAsync(Guid id, CancellationToken ct = default)
            => await _db.HomepageTemplates.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id, ct);

        public async Task<(HomepageTemplate? Created, string? Error)> CreateAsync(string name, string blocksJson, Guid? createdBy, CancellationToken ct = default)
        {
            var count = await _db.HomepageTemplates.CountAsync(ct);
            if (count >= MaxTemplates)
                return (null, $"Maximum {MaxTemplates} templates.");

            var entity = new HomepageTemplate
            {
                Name = name.Trim(),
                BlocksJson = string.IsNullOrWhiteSpace(blocksJson) ? "[]" : blocksJson,
                CreatedByAdminId = createdBy,
                IsActive = count == 0, // 1er template = actif
            };
            _db.HomepageTemplates.Add(entity);
            await _db.SaveChangesAsync(ct);
            return (entity, null);
        }

        public async Task<(HomepageTemplate? Updated, string? Error)> UpdateAsync(Guid id, string? name, string? blocksJson, CancellationToken ct = default)
        {
            var entity = await _db.HomepageTemplates.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (entity == null) return (null, "Template introuvable.");

            if (!string.IsNullOrWhiteSpace(name)) entity.Name = name.Trim();
            if (blocksJson != null) entity.BlocksJson = blocksJson;
            entity.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return (entity, null);
        }

        public async Task<string?> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _db.HomepageTemplates.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (entity == null) return "Template introuvable.";
            if (entity.IsActive) return "Impossible de supprimer le template actif.";
            _db.HomepageTemplates.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return null;
        }

        public async Task<(HomepageTemplate? Activated, string? Error)> ActivateAsync(Guid id, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var target = await _db.HomepageTemplates.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (target == null) return (null, "Template introuvable.");

            await _db.HomepageTemplates
                .Where(t => t.IsActive && t.Id != id)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsActive, false), ct);

            target.IsActive = true;
            target.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return (target, null);
        }
    }
}
