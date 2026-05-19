using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.DTO.Refonte;
using Web_Api.Model;

namespace Web_Api.Services.Refonte
{
    public interface IStockTransferService
    {
        Task<IReadOnlyList<F_TRANSFERT>> PendingAsync(Guid livreurId, CancellationToken ct = default);
        Task<IReadOnlyList<F_TRANSFERT>> InProgressAsync(Guid livreurId, CancellationToken ct = default);
        Task<IReadOnlyList<F_TRANSFERT>> MissionsForLivreurAsync(Guid livreurId, CancellationToken ct = default);
        Task<F_TRANSFERT?> GetMissionForActorAsync(Guid transfertId, Guid actorId, bool canAccessAll, CancellationToken ct = default);
        Task<F_TRANSFERT> ScanPickupAsync(Guid livreurId, TransitScanRequest request, CancellationToken ct = default);
        Task<F_TRANSFERT> ScanDeliveryAsync(Guid livreurId, TransitScanRequest request, CancellationToken ct = default);
        Task<TransitScanResultDto> ScanTransitBarcodeAsync(Guid actorId, bool canAccessAll, TransitScanRequestDto request, CancellationToken ct = default);
    }

    public sealed class StockTransferService : IStockTransferService
    {
        private static readonly string[] WaitingStatuses =
        {
            TransitStatuses.EnAttenteTransit,
            TransitStatuses.EnAttenteAffectationTransit
        };

        private static readonly string[] InTransitStatuses =
        {
            TransitStatuses.EnTransit,
            TransitStatuses.EnCoursTransit
        };

        private readonly AppDbContext _db;
        private readonly IOrderTimelineService? _timeline;

        public StockTransferService(AppDbContext db, IOrderTimelineService? timeline = null)
        {
            _db = db;
            _timeline = timeline;
        }

        public async Task<IReadOnlyList<F_TRANSFERT>> PendingAsync(Guid livreurId, CancellationToken ct = default) =>
            await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.TransitLivreurUserId == livreurId && WaitingStatuses.Contains(x.Status))
                .OrderBy(x => x.AffectedAt)
                .ToListAsync(ct);

        public async Task<IReadOnlyList<F_TRANSFERT>> InProgressAsync(Guid livreurId, CancellationToken ct = default) =>
            await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.TransitLivreurUserId == livreurId && InTransitStatuses.Contains(x.Status))
                .OrderBy(x => x.PickedUpAt)
                .ToListAsync(ct);

        public async Task<IReadOnlyList<F_TRANSFERT>> MissionsForLivreurAsync(Guid livreurId, CancellationToken ct = default) =>
            await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.TransitLivreurUserId == livreurId)
                .OrderByDescending(x => x.AffectedAt)
                .Take(300)
                .ToListAsync(ct);

        public async Task<F_TRANSFERT?> GetMissionForActorAsync(Guid transfertId, Guid actorId, bool canAccessAll, CancellationToken ct = default)
        {
            var query = _db.F_TRANSFERTS.AsNoTracking().Where(x => x.Id == transfertId);
            if (!canAccessAll)
                query = query.Where(x => x.TransitLivreurUserId == actorId);
            return await query.FirstOrDefaultAsync(ct);
        }

        public async Task<F_TRANSFERT> ScanPickupAsync(Guid livreurId, TransitScanRequest request, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            var barcode = (request.CodeBarre ?? string.Empty).Trim();
            var article = await _db.F_ARTICLES.AsNoTracking().FirstOrDefaultAsync(x => x.AR_CodeBarre == barcode, ct)
                ?? throw new KeyNotFoundException("Code-barres inconnu.");

            var transfert = await _db.F_TRANSFERTS.FirstOrDefaultAsync(x =>
                x.ArRef == article.AR_Ref
                && x.TransitLivreurUserId == livreurId
                && WaitingStatuses.Contains(x.Status), ct)
                ?? throw new KeyNotFoundException("Article non affecté à ce livreur-transit.");

            ApplyPickup(transfert, livreurId, request.Latitude, request.Longitude);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return transfert;
        }

        public async Task<F_TRANSFERT> ScanDeliveryAsync(Guid livreurId, TransitScanRequest request, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            var barcode = (request.CodeBarre ?? string.Empty).Trim();
            var article = await _db.F_ARTICLES.AsNoTracking().FirstOrDefaultAsync(x => x.AR_CodeBarre == barcode, ct)
                ?? throw new KeyNotFoundException("Code-barres inconnu.");

            var transfert = await _db.F_TRANSFERTS.FirstOrDefaultAsync(x =>
                x.ArRef == article.AR_Ref && x.TransitLivreurUserId == livreurId, ct)
                ?? throw new KeyNotFoundException("Article non affecté à ce livreur-transit.");

            if (TransitStatuses.IsReceived(transfert.Status))
                throw new InvalidOperationException("Ce transfert est déjà réceptionné au dépôt.");
            if (!TransitStatuses.IsInTransit(transfert.Status))
                throw new InvalidOperationException("Le scan d'arrivée est impossible avant le scan de prise en charge.");

            await ApplyDeliveryAsync(transfert, livreurId, request.Latitude, request.Longitude, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return transfert;
        }

        public async Task<TransitScanResultDto> ScanTransitBarcodeAsync(
            Guid actorId,
            bool canAccessAll,
            TransitScanRequestDto request,
            CancellationToken ct = default)
        {
            var barcode = (request.ScannedBarcode ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(barcode))
                return Fail("BARCODE_REQUIRED", "Code-barres obligatoire.");

            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            var article = await _db.F_ARTICLES.AsNoTracking().FirstOrDefaultAsync(x => x.AR_CodeBarre == barcode, ct);
            if (article == null)
            {
                await tx.CommitAsync(ct);
                return Fail("BARCODE_NOT_FOUND", "Code-barres introuvable.");
            }

            var transfert = await ResolveTransfertForScanAsync(actorId, canAccessAll, request, article.AR_Ref, ct);
            if (transfert == null)
            {
                await tx.CommitAsync(ct);
                return Fail("WRONG_ORDER", "Ce code-barres n'est rattaché à aucune mission accessible.");
            }

            if (!string.Equals(transfert.ArRef, article.AR_Ref, StringComparison.OrdinalIgnoreCase))
            {
                AddScanErrorLog(transfert, actorId, "WRONG_ARTICLE", "Code-barres différent de l'article attendu.");
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return Fail("WRONG_ARTICLE", "Impossible de scanner cet article. Ce code-barres ne correspond pas à l'article concerné.", transfert);
            }

            if (!canAccessAll && transfert.TransitLivreurUserId != actorId)
            {
                AddScanErrorLog(transfert, actorId, "FORBIDDEN_TRANSIT_MISSION", "Mission affectée à un autre livreur transit.");
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return Fail("FORBIDDEN_TRANSIT_MISSION", "Cette mission n'est pas affectée à ce livreur transit.", transfert);
            }

            if (TransitStatuses.IsReceived(transfert.Status))
            {
                AddScanErrorLog(transfert, actorId, "ALREADY_RECEIVED", "Article déjà reçu.");
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return Fail("ALREADY_RECEIVED", "Cet article est déjà reçu au dépôt destiné.", transfert);
            }

            if (TransitStatuses.IsWaiting(transfert.Status))
            {
                ApplyPickup(transfert, actorId, request.Latitude ?? 0m, request.Longitude ?? 0m);
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return await SuccessAsync(transfert, "Article pris en charge. Transit démarré.", TransitStatuses.RecuDepotDestine, ct);
            }

            if (TransitStatuses.IsInTransit(transfert.Status))
            {
                await ApplyDeliveryAsync(transfert, actorId, request.Latitude ?? 0m, request.Longitude ?? 0m, ct);
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return await SuccessAsync(transfert, "Article reçu au dépôt destiné.", null, ct);
            }

            AddScanErrorLog(transfert, actorId, "INVALID_STATUS", $"Statut non scannable: {transfert.Status}.");
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Fail("INVALID_STATUS", "Le statut actuel de la mission n'autorise pas ce scan.", transfert);
        }

        private async Task<F_TRANSFERT?> ResolveTransfertForScanAsync(
            Guid actorId,
            bool canAccessAll,
            TransitScanRequestDto request,
            string articleRef,
            CancellationToken ct)
        {
            var requestedId = request.TransfertId ?? request.TransitMissionId;
            if (requestedId.HasValue)
                return await _db.F_TRANSFERTS.FirstOrDefaultAsync(x => x.Id == requestedId.Value, ct);

            var query = _db.F_TRANSFERTS
                .Where(x => x.ArRef == articleRef);

            if (!canAccessAll)
                query = query.Where(x => x.TransitLivreurUserId == actorId);

            return await query
                .OrderBy(x => WaitingStatuses.Contains(x.Status) ? 0 : InTransitStatuses.Contains(x.Status) ? 1 : 2)
                .ThenBy(x => x.AffectedAt)
                .FirstOrDefaultAsync(ct);
        }

        private void ApplyPickup(F_TRANSFERT transfert, Guid actorId, decimal latitude, decimal longitude)
        {
            var before = System.Text.Json.JsonSerializer.Serialize(transfert);
            transfert.Status = TransitStatuses.EnTransit;
            transfert.PickedUpAt = DateTime.UtcNow;
            transfert.PickupGpsLatitude = latitude;
            transfert.PickupGpsLongitude = longitude;
            transfert.Version++;

            _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
            {
                TransfertId = transfert.Id,
                ActionType = "SCAN_PICKUP",
                ActorUserId = actorId,
                SnapshotBefore = before,
                SnapshotAfter = System.Text.Json.JsonSerializer.Serialize(transfert),
                OccurredAt = DateTime.UtcNow
            });
        }

        private async Task ApplyDeliveryAsync(F_TRANSFERT transfert, Guid actorId, decimal latitude, decimal longitude, CancellationToken ct)
        {
            var before = System.Text.Json.JsonSerializer.Serialize(transfert);
            var source = await _db.F_ARTSTOCKS.FirstOrDefaultAsync(x => x.AR_Ref == transfert.ArRef && x.DE_No == transfert.SourceDepotNo, ct)
                ?? throw new InvalidOperationException("Stock source introuvable.");
            var dest = await _db.F_ARTSTOCKS.FirstOrDefaultAsync(x => x.AR_Ref == transfert.ArRef && x.DE_No == transfert.DestinationDepotNo, ct);

            if (source.AS_QteSto < transfert.Quantite)
                throw new InvalidOperationException("Stock source insuffisant : risque de stock négatif.");

            if (dest == null)
            {
                dest = new F_ARTSTOCK
                {
                    AR_Ref = transfert.ArRef,
                    DE_No = transfert.DestinationDepotNo,
                    AS_QteSto = 0,
                    AS_QteRes = 0,
                    AS_Principal = 0
                };
                _db.F_ARTSTOCKS.Add(dest);
            }

            source.AS_QteSto -= transfert.Quantite;
            dest.AS_QteSto += transfert.Quantite;
            transfert.Status = TransitStatuses.RecuAuDepot;
            transfert.DeliveredAt = DateTime.UtcNow;
            transfert.DeliveryGpsLatitude = latitude;
            transfert.DeliveryGpsLongitude = longitude;
            transfert.Version++;

            _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
            {
                TransfertId = transfert.Id,
                ActionType = "SCAN_DELIVERY",
                ActorUserId = actorId,
                SnapshotBefore = before,
                SnapshotAfter = System.Text.Json.JsonSerializer.Serialize(transfert),
                OccurredAt = DateTime.UtcNow
            });
        }

        private void AddScanErrorLog(F_TRANSFERT transfert, Guid actorId, string errorCode, string message)
        {
            _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
            {
                TransfertId = transfert.Id,
                ActionType = "SCAN_ERROR",
                ActorUserId = actorId,
                Motif = $"{errorCode}: {message}",
                OccurredAt = DateTime.UtcNow
            });
        }

        private static TransitScanResultDto Fail(string errorCode, string message, F_TRANSFERT? transfert = null) => new()
        {
            Success = false,
            ErrorCode = errorCode,
            Message = message,
            Status = transfert == null ? string.Empty : TransitStatuses.ToTimelineStatus(transfert.Status),
            TransfertId = transfert?.Id,
            CommandeId = transfert?.DoPiece
        };

        private async Task<TransitScanResultDto> SuccessAsync(F_TRANSFERT transfert, string message, string? nextStatus, CancellationToken ct)
        {
            return new TransitScanResultDto
            {
                Success = true,
                Status = TransitStatuses.ToTimelineStatus(transfert.Status),
                Message = message,
                NextStatus = nextStatus,
                TransfertId = transfert.Id,
                CommandeId = transfert.DoPiece,
                UpdatedTimeline = _timeline == null ? null : await _timeline.GetOrderTimelineAsync(transfert.DoPiece, ct)
            };
        }
    }
}
