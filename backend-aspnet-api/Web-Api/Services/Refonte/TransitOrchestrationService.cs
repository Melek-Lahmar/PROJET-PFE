using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.DTO.Refonte;
using Web_Api.Model;

namespace Web_Api.Services.Refonte
{
    public interface ITransitOrchestrationService
    {
        Task<TransitPreparationResult> PlanForOrderAsync(
            IReadOnlyList<TransitOrderLineInput> lines,
            int destinationDepotNo,
            CancellationToken ct = default);

        Task<IReadOnlyList<F_TRANSFERT>> CreateForOrderAsync(
            string doPiece,
            TransitPreparationResult plan,
            CancellationToken ct = default);

        Task<int> RetryAssignmentAsync(string doPiece, CancellationToken ct = default);

        Task<F_TRANSFERT> ChangeStatusManuallyAsync(
            Guid transfertId,
            ChangeTransitStatusDto request,
            Guid actorUserId,
            CancellationToken ct = default);
    }

    public sealed class TransitOrchestrationService : ITransitOrchestrationService
    {
        private static readonly string[] ActiveTransitStatuses =
        {
            TransitStatuses.EnAttenteTransit,
            TransitStatuses.EnAttenteAffectationTransit,
            TransitStatuses.EnTransit,
            TransitStatuses.EnCoursTransit
        };

        private readonly AppDbContext _db;
        private readonly ITransitAccountProvisioningService _provisioning;

        public TransitOrchestrationService(
            AppDbContext db,
            ITransitAccountProvisioningService provisioning)
        {
            _db = db;
            _provisioning = provisioning;
        }

        public async Task<TransitPreparationResult> PlanForOrderAsync(
            IReadOnlyList<TransitOrderLineInput> lines,
            int destinationDepotNo,
            CancellationToken ct = default)
        {
            var result = new TransitPreparationResult { DestinationDepotNo = destinationDepotNo };
            var trackedLines = lines
                .Where(x => x.TrackStock)
                .GroupBy(x => x.ArticleRef, StringComparer.OrdinalIgnoreCase)
                .Select(g => new TransitOrderLineInput
                {
                    ArticleRef = g.Key,
                    ArticleName = g.Select(x => x.ArticleName).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)),
                    Quantity = g.Sum(x => x.Quantity),
                    TrackStock = true
                })
                .Where(x => !string.IsNullOrWhiteSpace(x.ArticleRef) && x.Quantity > 0)
                .ToList();

            if (trackedLines.Count == 0)
                return result;

            var refs = trackedLines.Select(x => x.ArticleRef).ToArray();
            var stocks = await _db.F_ARTSTOCKS.AsNoTracking()
                .Where(x => refs.Contains(x.AR_Ref))
                .ToListAsync(ct);

            var depots = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);
            var depotByNo = depots.ToDictionary(x => x.DE_No);
            depotByNo.TryGetValue(destinationDepotNo, out var destinationDepot);

            var sourceDepotNos = stocks
                .Where(x => x.DE_No != destinationDepotNo)
                .Select(x => x.DE_No)
                .Distinct()
                .ToArray();

            var transitLivreurs = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(x => x.UtilisateurId != null
                    && x.IsTransit
                    && x.DepotRattacheNo != null
                    && sourceDepotNos.Contains(x.DepotRattacheNo.Value))
                .ToListAsync(ct);

            var activeTransfers = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => ActiveTransitStatuses.Contains(x.Status))
                .ToListAsync(ct);

            foreach (var line in trackedLines)
            {
                var articleStocks = stocks
                    .Where(x => string.Equals(x.AR_Ref, line.ArticleRef, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                var destinationStock = articleStocks.FirstOrDefault(x => x.DE_No == destinationDepotNo);
                var destinationAvailable = Available(destinationStock);
                var deficit = line.Quantity - destinationAvailable;
                if (deficit <= 0)
                    continue;

                var sources = articleStocks
                    .Where(x => x.DE_No != destinationDepotNo && Available(x) > 0)
                    .Select(x => new
                    {
                        Stock = x,
                        Available = Available(x),
                        WaitingSameAxis = activeTransfers
                            .Where(t => t.SourceDepotNo == x.DE_No && t.DestinationDepotNo == destinationDepotNo)
                            .Sum(t => t.Quantite),
                        DistanceKm = DistanceKm(depotByNo.TryGetValue(x.DE_No, out var srcDepot) ? srcDepot : null, destinationDepot)
                    })
                    .OrderByDescending(x => x.WaitingSameAxis)
                    .ThenBy(x => x.DistanceKm)
                    .ThenByDescending(x => x.Available)
                    .ToList();

                foreach (var source in sources)
                {
                    if (deficit <= 0)
                        break;

                    var quantity = Math.Min(deficit, source.Available);

                    // Lot C : si ce dépôt source n'a aucun livreur transit, on
                    // provisionne automatiquement les comptes du gouvernorat
                    // (transit + caisse, mdp 123456) puis on recharge.
                    var candidates = transitLivreurs
                        .Where(x => x.DepotRattacheNo == source.Stock.DE_No)
                        .ToList();
                    if (candidates.Count == 0)
                    {
                        await _provisioning.EnsureDepotStaffAsync(source.Stock.DE_No, ct);
                        candidates = await _db.ProfilsUtilisateurs.AsNoTracking()
                            .Where(x => x.UtilisateurId != null
                                && x.IsTransit
                                && x.DepotRattacheNo == source.Stock.DE_No)
                            .ToListAsync(ct);
                        // Étend la liste globale pour les itérations suivantes.
                        transitLivreurs = transitLivreurs
                            .Concat(candidates.Where(a =>
                                transitLivreurs.All(t => t.UtilisateurId != a.UtilisateurId)))
                            .ToList();
                    }

                    var selectedLivreur = SelectTransitLivreur(
                        candidates,
                        activeTransfers,
                        source.Stock.DE_No,
                        destinationDepotNo,
                        source.DistanceKm);

                    result.Transfers.Add(new TransitTransferDraftDto
                    {
                        ArticleRef = line.ArticleRef,
                        ArticleName = line.ArticleName,
                        Quantity = quantity,
                        SourceDepotNo = source.Stock.DE_No,
                        DestinationDepotNo = destinationDepotNo,
                        TransitLivreurUserId = selectedLivreur?.UtilisateurId,
                        TransitLivreurName = selectedLivreur?.NomComplet,
                        Reason = $"Déficit dépôt destination: {deficit:0.####}. Source sélectionnée: {source.Stock.DE_No}."
                    });

                    deficit -= quantity;
                }

                if (deficit > 0)
                {
                    result.BlockedItems.Add(new TransitBlockedItemDto
                    {
                        ArticleRef = line.ArticleRef,
                        ArticleName = line.ArticleName,
                        RequestedQuantity = line.Quantity,
                        AvailableAtDestination = Math.Max(destinationAvailable, 0),
                        AvailableInOtherDepots = sources.Sum(x => x.Available),
                        IssueType = "QUANTITE_INSUFFISANTE",
                        Message = $"Quantité insuffisante pour {line.ArticleRef}. Demandé={line.Quantity:0.####}, dépôt destination={Math.Max(destinationAvailable, 0):0.####}, autres dépôts={sources.Sum(x => x.Available):0.####}."
                    });
                }
            }

            return result;
        }

        public async Task<IReadOnlyList<F_TRANSFERT>> CreateForOrderAsync(
            string doPiece,
            TransitPreparationResult plan,
            CancellationToken ct = default)
        {
            var piece = (doPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("Référence commande obligatoire pour créer le transit.");

            var created = new List<F_TRANSFERT>();
            foreach (var draft in plan.Transfers)
            {
                var transfert = new F_TRANSFERT
                {
                    DoPiece = piece,
                    ArRef = draft.ArticleRef,
                    Quantite = draft.Quantity,
                    SourceDepotNo = draft.SourceDepotNo,
                    DestinationDepotNo = draft.DestinationDepotNo,
                    TransitLivreurUserId = draft.TransitLivreurUserId,
                    Status = draft.TransitLivreurUserId == null
                        ? TransitStatuses.EnAttenteAffectationTransit
                        : TransitStatuses.EnAttenteTransit,
                    AffectedAt = DateTime.UtcNow,
                    AlgoReasoning = draft.Reason
                };

                _db.F_TRANSFERTS.Add(transfert);
                _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
                {
                    TransfertId = transfert.Id,
                    ActionType = "AUTO_CREATE",
                    SnapshotAfter = System.Text.Json.JsonSerializer.Serialize(draft),
                    Motif = "Création automatique transit inter-dépôts.",
                    OccurredAt = DateTime.UtcNow
                });

                if (draft.TransitLivreurUserId == null)
                {
                    _db.F_SUPERVISOR_ALERTS.Add(new F_SUPERVISOR_ALERT
                    {
                        Severity = "HIGH",
                        AlertType = "AUCUN_LIVREUR_TRANSIT_DISPONIBLE",
                        RelatedTransfertId = transfert.Id,
                        Message = $"Aucun livreur de transit disponible pour la commande {piece}, article {draft.ArticleRef}, dépôt source {draft.SourceDepotNo}.",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                created.Add(transfert);
            }

            foreach (var blocked in plan.BlockedItems)
            {
                _db.F_SUPERVISOR_ALERTS.Add(new F_SUPERVISOR_ALERT
                {
                    Severity = "HIGH",
                    AlertType = blocked.IssueType,
                    Message = $"Commande {piece} bloquée: {blocked.Message}",
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (created.Count > 0 || plan.BlockedItems.Count > 0)
                await _db.SaveChangesAsync(ct);

            return created;
        }

        public async Task<int> RetryAssignmentAsync(string doPiece, CancellationToken ct = default)
        {
            var piece = (doPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("Commande obligatoire.");

            var transfers = await _db.F_TRANSFERTS
                .Where(x => x.DoPiece == piece
                    && x.TransitLivreurUserId == null
                    && ActiveTransitStatuses.Contains(x.Status))
                .ToListAsync(ct);

            if (transfers.Count == 0)
                return 0;

            var sourceDepotNos = transfers.Select(x => x.SourceDepotNo).Distinct().ToArray();
            var transitLivreurs = await _db.ProfilsUtilisateurs.AsNoTracking()
                .Where(x => x.UtilisateurId != null
                    && x.IsTransit
                    && x.DepotRattacheNo != null
                    && sourceDepotNos.Contains(x.DepotRattacheNo.Value))
                .ToListAsync(ct);

            // Lot C : provisionne les comptes manquants des dépôts source avant relance.
            var missingDepots = sourceDepotNos
                .Where(no => transitLivreurs.All(x => x.DepotRattacheNo != no))
                .ToList();
            if (missingDepots.Count > 0)
            {
                foreach (var no in missingDepots)
                    await _provisioning.EnsureDepotStaffAsync(no, ct);

                transitLivreurs = await _db.ProfilsUtilisateurs.AsNoTracking()
                    .Where(x => x.UtilisateurId != null
                        && x.IsTransit
                        && x.DepotRattacheNo != null
                        && sourceDepotNos.Contains(x.DepotRattacheNo.Value))
                    .ToListAsync(ct);
            }

            var activeTransfers = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => ActiveTransitStatuses.Contains(x.Status))
                .ToListAsync(ct);

            var depots = await _db.F_DEPOTS.AsNoTracking().ToDictionaryAsync(x => x.DE_No, ct);
            var assigned = 0;
            foreach (var transfert in transfers)
            {
                depots.TryGetValue(transfert.SourceDepotNo, out var sourceDepot);
                depots.TryGetValue(transfert.DestinationDepotNo, out var destinationDepot);
                var selected = SelectTransitLivreur(
                    transitLivreurs.Where(x => x.DepotRattacheNo == transfert.SourceDepotNo).ToList(),
                    activeTransfers,
                    transfert.SourceDepotNo,
                    transfert.DestinationDepotNo,
                    DistanceKm(sourceDepot, destinationDepot));

                if (selected?.UtilisateurId == null)
                    continue;

                transfert.TransitLivreurUserId = selected.UtilisateurId.Value;
                transfert.Status = TransitStatuses.EnAttenteTransit;
                transfert.AffectedAt = DateTime.UtcNow;
                transfert.Version++;

                _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
                {
                    TransfertId = transfert.Id,
                    ActionType = "AUTO_REASSIGN",
                    ActorUserId = selected.UtilisateurId.Value,
                    Motif = "Relance affectation automatique superviseur.",
                    OccurredAt = DateTime.UtcNow
                });
                assigned++;
            }

            if (assigned > 0)
                await _db.SaveChangesAsync(ct);

            return assigned;
        }

        public async Task<F_TRANSFERT> ChangeStatusManuallyAsync(
            Guid transfertId,
            ChangeTransitStatusDto request,
            Guid actorUserId,
            CancellationToken ct = default)
        {
            var transfert = await _db.F_TRANSFERTS.FirstOrDefaultAsync(x => x.Id == transfertId, ct)
                ?? throw new KeyNotFoundException("Transfert introuvable.");

            if (request.Version.HasValue && transfert.Version != request.Version.Value)
                throw new InvalidOperationException("Le transfert a déjà été modifié. Rechargez les données.");

            var target = NormalizeManualStatus(request.Status);
            var justification = (request.Justification ?? string.Empty).Trim();
            if (RequiresJustification(transfert.Status, target) && string.IsNullOrWhiteSpace(justification))
                throw new InvalidOperationException("Justification superviseur obligatoire pour cette transition.");

            var before = System.Text.Json.JsonSerializer.Serialize(transfert);
            transfert.Status = target;
            transfert.Version++;
            if (TransitStatuses.IsInTransit(target))
                transfert.PickedUpAt ??= DateTime.UtcNow;
            if (TransitStatuses.IsReceived(target))
                transfert.DeliveredAt ??= DateTime.UtcNow;

            _db.F_TRANSFERT_AUDIT_LOGS.Add(new F_TRANSFERT_AUDIT_LOG
            {
                TransfertId = transfert.Id,
                ActionType = "MANUAL_STATUS",
                ActorUserId = actorUserId,
                SnapshotBefore = before,
                SnapshotAfter = System.Text.Json.JsonSerializer.Serialize(transfert),
                Motif = justification,
                OccurredAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync(ct);
            return transfert;
        }

        private static decimal Available(F_ARTSTOCK? stock)
        {
            if (stock == null)
                return 0m;
            return (stock.AS_QteSto) - (stock.AS_QteRes);
        }

        private static Auth.Entities.ProfilUtilisateur? SelectTransitLivreur(
            IReadOnlyList<Auth.Entities.ProfilUtilisateur> candidates,
            IReadOnlyList<F_TRANSFERT> activeTransfers,
            int sourceDepotNo,
            int destinationDepotNo,
            double distanceKm)
        {
            return candidates
                .Where(x => x.UtilisateurId != null)
                .Select(x =>
                {
                    var activeForLivreur = activeTransfers
                        .Where(t => t.TransitLivreurUserId == x.UtilisateurId)
                        .ToList();
                    var groupableQuantity = activeForLivreur
                        .Where(t => t.SourceDepotNo == sourceDepotNo && t.DestinationDepotNo == destinationDepotNo)
                        .Sum(t => t.Quantite);
                    var score = (groupableQuantity * 100m) - (decimal)distanceKm - (activeForLivreur.Count * 10m) + 25m;
                    return new { Profile = x, Score = score };
                })
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Profile.NomComplet)
                .Select(x => x.Profile)
                .FirstOrDefault();
        }

        private static string NormalizeManualStatus(string? status)
        {
            var normalized = (status ?? string.Empty).Trim().ToUpperInvariant();
            return normalized switch
            {
                TransitStatuses.EnAttenteTransit => TransitStatuses.EnAttenteTransit,
                TransitStatuses.EnAttenteAffectationTransit => TransitStatuses.EnAttenteAffectationTransit,
                TransitStatuses.EnTransit => TransitStatuses.EnTransit,
                TransitStatuses.EnCoursTransit => TransitStatuses.EnTransit,
                TransitStatuses.RecuAuDepot => TransitStatuses.RecuAuDepot,
                TransitStatuses.RecuDepotDestine => TransitStatuses.RecuAuDepot,
                TransitStatuses.Annule => TransitStatuses.Annule,
                _ => throw new InvalidOperationException($"Statut transit inconnu: {status}.")
            };
        }

        private static bool RequiresJustification(string current, string target)
        {
            if (TransitStatuses.IsReceived(current) && !TransitStatuses.IsReceived(target))
                return true;
            if (TransitStatuses.IsInTransit(current) && TransitStatuses.IsWaiting(target))
                return true;
            if (TransitStatuses.IsWaiting(current) && TransitStatuses.IsReceived(target))
                return true;
            return string.Equals(target, TransitStatuses.Annule, StringComparison.OrdinalIgnoreCase);
        }

        private static double DistanceKm(F_DEPOT? source, F_DEPOT? destination)
        {
            var s = DepotCenter(source);
            var d = DepotCenter(destination);
            return HaversineKm(s.Lat, s.Lng, d.Lat, d.Lng);
        }

        private static (double Lat, double Lng) DepotCenter(F_DEPOT? depot)
        {
            var city = (depot?.DE_Ville ?? depot?.DE_Intitule ?? string.Empty).ToUpperInvariant();
            if (city.Contains("SFAX")) return (34.7406, 10.7603);
            if (city.Contains("SOUSSE")) return (35.8245, 10.6346);
            if (city.Contains("GABES") || city.Contains("GABÈS")) return (33.8869, 10.0982);
            return (36.8065, 10.1815);
        }

        private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
        {
            const double r = 6371.0;
            double ToRad(double deg) => deg * Math.PI / 180.0;
            var dLat = ToRad(lat2 - lat1);
            var dLon = ToRad(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return 2 * r * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }
    }
}
