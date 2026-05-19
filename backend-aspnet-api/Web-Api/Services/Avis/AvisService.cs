using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.DTO.Avis;
using Web_Api.Model;

namespace Web_Api.Services.Avis
{
    public class AvisService
    {
        private readonly AppDbContext _db;
        private static readonly TimeSpan MinIntervalBetweenPrompts = TimeSpan.FromHours(24);
        private const int MaxPrompts = 3;

        public AvisService(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Déclenché par le livreur quand il bascule une commande à LIVRE.
        /// Crée l'état "avis en attente" pour cette commande si pas déjà fait.
        /// </summary>
        public async Task MarkCommandeDeliveredAsync(string commandePiece, Guid clientUserId, CancellationToken ct = default)
        {
            var piece = (commandePiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece) || clientUserId == Guid.Empty) return;

            // Si avis déjà soumis, ne rien faire
            var submitted = await _db.F_AVIS_COMMANDES.AsNoTracking()
                .AnyAsync(a => a.CommandePiece == piece, ct);
            if (submitted) return;

            var state = await _db.F_AVIS_PROMPT_STATES
                .FirstOrDefaultAsync(s => s.CommandePiece == piece, ct);
            if (state != null) return;

            var now = DateTime.UtcNow;
            _db.F_AVIS_PROMPT_STATES.Add(new F_AVIS_PROMPT_STATE
            {
                CommandePiece = piece,
                ClientUserId = clientUserId,
                PromptCount = 0,
                Dismissed = false,
                Submitted = false,
                CreatedAt = now,
                UpdatedAt = now
            });
            await _db.SaveChangesAsync(ct);
        }

        public async Task<List<AvisPendingDto>> GetPendingAsync(Guid clientUserId, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;

            var states = await _db.F_AVIS_PROMPT_STATES.AsNoTracking()
                .Where(s => s.ClientUserId == clientUserId
                    && !s.Submitted
                    && !s.Dismissed
                    && s.PromptCount < MaxPrompts)
                .ToListAsync(ct);

            var result = new List<AvisPendingDto>();
            foreach (var s in states)
            {
                var ready = s.LastPromptAt == null || (now - s.LastPromptAt.Value) >= MinIntervalBetweenPrompts;
                if (!ready) continue;

                var order = await _db.F_DOCENTETES.AsNoTracking()
                    .Where(o => o.DO_Piece == s.CommandePiece)
                    .OrderByDescending(o => o.DO_Date)
                    .FirstOrDefaultAsync(ct);

                result.Add(new AvisPendingDto
                {
                    CommandePiece = s.CommandePiece,
                    DeliveredAt = order?.DO_Date,
                    LastPromptAt = s.LastPromptAt,
                    PromptCount = s.PromptCount
                });
            }

            return result;
        }

        public async Task DismissAsync(string commandePiece, Guid clientUserId, CancellationToken ct = default)
        {
            var piece = (commandePiece ?? string.Empty).Trim();
            var state = await _db.F_AVIS_PROMPT_STATES
                .FirstOrDefaultAsync(s => s.CommandePiece == piece && s.ClientUserId == clientUserId, ct);
            if (state == null) return;

            state.PromptCount += 1;
            state.LastPromptAt = DateTime.UtcNow;
            state.UpdatedAt = DateTime.UtcNow;
            if (state.PromptCount >= MaxPrompts)
                state.Dismissed = true;
            await _db.SaveChangesAsync(ct);
        }

        public async Task<AvisDto> SubmitAsync(Guid clientUserId, SubmitAvisRequestDto request, CancellationToken ct = default)
        {
            var piece = (request.CommandePiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("La référence commande est obligatoire.");
            if (request.Note < 1 || request.Note > 5)
                throw new InvalidOperationException("La note doit être entre 1 et 5.");

            var existing = await _db.F_AVIS_COMMANDES.FirstOrDefaultAsync(a => a.CommandePiece == piece, ct);
            if (existing != null)
                throw new InvalidOperationException("Un avis a déjà été soumis pour cette commande.");

            var now = DateTime.UtcNow;
            var avis = new F_AVIS_COMMANDE
            {
                CommandePiece = piece,
                ClientUserId = clientUserId,
                Note = request.Note,
                Commentaire = string.IsNullOrWhiteSpace(request.Commentaire) ? null : request.Commentaire.Trim(),
                CreatedAt = now
            };
            _db.F_AVIS_COMMANDES.Add(avis);

            var state = await _db.F_AVIS_PROMPT_STATES
                .FirstOrDefaultAsync(s => s.CommandePiece == piece, ct);
            if (state != null)
            {
                state.Submitted = true;
                state.UpdatedAt = now;
            }

            await _db.SaveChangesAsync(ct);

            return new AvisDto
            {
                Id = avis.Id,
                CommandePiece = avis.CommandePiece,
                Note = avis.Note,
                Commentaire = avis.Commentaire,
                CreatedAt = avis.CreatedAt
            };
        }
    }
}
