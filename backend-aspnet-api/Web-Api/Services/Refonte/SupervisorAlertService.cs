using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Services.Refonte
{
    public interface ISupervisorAlertService
    {
        Task<F_SUPERVISOR_ALERT> CreateAsync(string severity, string alertType, string message, Guid? relatedTransfertId = null, CancellationToken ct = default);
        Task<IReadOnlyList<F_SUPERVISOR_ALERT>> ListAsync(bool includeRead = false, CancellationToken ct = default);
        Task AcknowledgeAsync(Guid id, Guid userId, CancellationToken ct = default);
    }

    public sealed class SupervisorAlertService : ISupervisorAlertService
    {
        private readonly AppDbContext _db;
        public SupervisorAlertService(AppDbContext db) => _db = db;

        public async Task<F_SUPERVISOR_ALERT> CreateAsync(string severity, string alertType, string message, Guid? relatedTransfertId = null, CancellationToken ct = default)
        {
            var entity = new F_SUPERVISOR_ALERT
            {
                Severity = severity,
                AlertType = alertType,
                Message = message,
                RelatedTransfertId = relatedTransfertId,
                CreatedAt = DateTime.UtcNow
            };
            _db.F_SUPERVISOR_ALERTS.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity;
        }

        public async Task<IReadOnlyList<F_SUPERVISOR_ALERT>> ListAsync(bool includeRead = false, CancellationToken ct = default)
        {
            var query = _db.F_SUPERVISOR_ALERTS.AsNoTracking();
            if (!includeRead) query = query.Where(x => x.AcknowledgedAt == null);
            return await query.OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync(ct);
        }

        public async Task AcknowledgeAsync(Guid id, Guid userId, CancellationToken ct = default)
        {
            var alert = await _db.F_SUPERVISOR_ALERTS.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (alert == null) return;
            alert.AcknowledgedByUserId = userId;
            alert.AcknowledgedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }
}
