using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Refonte;
using Web_Api.Model;

namespace Web_Api.Services.Refonte
{
    public interface IOrderTimelineService
    {
        Task<OrderTimelineDto?> GetOrderTimelineAsync(string commandeId, CancellationToken ct = default);
        Task<OrderItemsTransitSummaryDto?> GetItemsTransitSummaryAsync(string commandeId, CancellationToken ct = default);
    }

    public sealed class OrderTimelineService : IOrderTimelineService
    {
        private readonly AppDbContext _db;

        public OrderTimelineService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<OrderTimelineDto?> GetOrderTimelineAsync(string commandeId, CancellationToken ct = default)
        {
            var piece = (commandeId ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                return null;

            var order = await _db.F_DOCENTETES.AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece, ct);
            if (order == null)
                return null;

            var lines = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(x => x.DO_Piece == piece)
                .OrderBy(x => x.cbMarq)
                .ToListAsync(ct);

            var transfers = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.DoPiece == piece)
                .OrderBy(x => x.AffectedAt)
                .ToListAsync(ct);

            var livraison = await _db.F_LIVRAISONS.AsNoTracking()
                .Where(x => x.DO_Piece == piece)
                .OrderByDescending(x => x.cbMarq)
                .FirstOrDefaultAsync(ct);

            var depotNos = transfers
                .SelectMany(x => new[] { x.SourceDepotNo, x.DestinationDepotNo })
                .Concat(order.DE_No.HasValue ? new[] { order.DE_No.Value } : Array.Empty<int>())
                .Distinct()
                .ToArray();

            var depots = await _db.F_DEPOTS.AsNoTracking()
                .Where(x => depotNos.Contains(x.DE_No))
                .ToDictionaryAsync(x => x.DE_No, ct);

            var currentStatus = ResolveCurrentStatus(order, livraison, transfers);
            var destinationDepotNo = ResolveDestinationDepotNo(order, transfers);
            depots.TryGetValue(destinationDepotNo ?? 0, out var destinationDepot);

            var items = BuildItems(lines, transfers, depots);
            var dto = new OrderTimelineDto
            {
                CommandeId = piece,
                CurrentStatus = currentStatus,
                DeliveryMode = order.DO_ModeLivraison ?? string.Empty,
                DestinationDepotNo = destinationDepotNo,
                DestinationDepotName = DepotName(destinationDepot, destinationDepotNo),
                TransitTotalCount = transfers.Count,
                TransitReceivedCount = transfers.Count(x => TransitStatuses.IsReceived(x.Status)),
                Items = items
            };
            dto.Steps = BuildSteps(order, livraison, transfers, currentStatus);
            return dto;
        }

        public async Task<OrderItemsTransitSummaryDto?> GetItemsTransitSummaryAsync(string commandeId, CancellationToken ct = default)
        {
            var timeline = await GetOrderTimelineAsync(commandeId, ct);
            if (timeline == null)
                return null;

            return new OrderItemsTransitSummaryDto
            {
                CommandeId = timeline.CommandeId,
                TotalTransitItems = timeline.TransitTotalCount,
                ReceivedTransitItems = timeline.TransitReceivedCount,
                IsTransitRequired = timeline.TransitTotalCount > 0,
                IsTransitComplete = timeline.TransitTotalCount == 0 || timeline.TransitReceivedCount == timeline.TransitTotalCount,
                Items = timeline.Items
            };
        }

        private static string ResolveCurrentStatus(
            F_DOCENTETE order,
            F_LIVRAISON? livraison,
            IReadOnlyList<F_TRANSFERT> transfers)
        {
            if (order.DO_Valide == F_DOCENTETE.STATUS_REFUSE)
                return "REFUSE";

            if (transfers.Count > 0)
            {
                if (transfers.Any(x => x.Status == TransitStatuses.EnAttenteAffectationTransit))
                    return TransitStatuses.EnAttenteAffectationTransit;
                if (transfers.Any(x => TransitStatuses.IsInTransit(x.Status)))
                    return TransitStatuses.EnCoursTransit;
                if (transfers.Any(x => TransitStatuses.IsWaiting(x.Status)))
                    return TransitStatuses.EnAttenteTransit;
                if (transfers.All(x => TransitStatuses.IsReceived(x.Status)))
                    return TransitStatuses.TransitTermine;
            }

            if (livraison != null)
                return livraison.LI_Statut switch
                {
                    DeliveryStatusCodes.EnLivraison => "EN_LIVRAISON",
                    DeliveryStatusCodes.Livre => "LIVRE",
                    DeliveryStatusCodes.Retour => "RETOUR",
                    DeliveryStatusCodes.Depot => "DEPOT",
                    DeliveryStatusCodes.Reporte => "REPORTE",
                    DeliveryStatusCodes.DepotEnCoursDePreparation => "DEPOT_EN_COURS_DE_PREPARATION",
                    DeliveryStatusCodes.DepotPret => "DEPOT_PRET",
                    _ => "CONFIRME"
                };

            return order.DO_Valide switch
            {
                F_DOCENTETE.STATUS_CONFIRME => "CONFIRME",
                F_DOCENTETE.STATUS_TENTATIVE => "TENTATIVE",
                F_DOCENTETE.STATUS_REFUSE => "REFUSE",
                _ => "EN_ATTENTE"
            };
        }

        private static int? ResolveDestinationDepotNo(F_DOCENTETE order, IReadOnlyList<F_TRANSFERT> transfers)
        {
            var destinationFromTransit = transfers
                .Select(x => (int?)x.DestinationDepotNo)
                .FirstOrDefault(x => x.HasValue);
            return destinationFromTransit ?? order.DE_No ?? order.PickupDepotNo;
        }

        private static List<OrderItemTransitStatusDto> BuildItems(
            IReadOnlyList<F_DOCLIGNE> lines,
            IReadOnlyList<F_TRANSFERT> transfers,
            IReadOnlyDictionary<int, F_DEPOT> depots)
        {
            var result = new List<OrderItemTransitStatusDto>();
            foreach (var line in lines)
            {
                var arRef = line.AR_Ref ?? string.Empty;
                var matchingTransfers = transfers
                    .Where(x => string.Equals(x.ArRef, arRef, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (matchingTransfers.Count == 0)
                {
                    result.Add(new OrderItemTransitStatusDto
                    {
                        ArticleRef = arRef,
                        ArticleName = line.DL_Design ?? arRef,
                        Quantity = line.DL_Qte ?? 0m,
                        Status = "AUCUN_TRANSIT",
                        CurrentMessage = "Article disponible dans le dépôt destination ou non suivi en stock."
                    });
                    continue;
                }

                foreach (var transfert in matchingTransfers)
                {
                    depots.TryGetValue(transfert.SourceDepotNo, out var sourceDepot);
                    depots.TryGetValue(transfert.DestinationDepotNo, out var destinationDepot);
                    result.Add(new OrderItemTransitStatusDto
                    {
                        ArticleRef = arRef,
                        ArticleName = line.DL_Design ?? arRef,
                        Quantity = transfert.Quantite,
                        Status = TransitStatuses.ToTimelineStatus(transfert.Status),
                        SourceDepotName = DepotName(sourceDepot, transfert.SourceDepotNo),
                        DestinationDepotName = DepotName(destinationDepot, transfert.DestinationDepotNo),
                        CurrentMessage = BuildItemMessage(transfert, sourceDepot, destinationDepot)
                    });
                }
            }

            return result;
        }

        private static List<OrderTimelineStepDto> BuildSteps(
            F_DOCENTETE order,
            F_LIVRAISON? livraison,
            IReadOnlyList<F_TRANSFERT> transfers,
            string currentStatus)
        {
            var steps = new List<OrderTimelineStepDto>
            {
                Step("CREATED", "Commande en cours de traitement", order.DO_Date != null ? "DONE" : "PENDING", order.DO_Date, "Commande enregistrée."),
                Step("TENTATIVE", "Tentative de confirmation", order.DO_Valide is F_DOCENTETE.STATUS_CONFIRME or F_DOCENTETE.STATUS_TENTATIVE or F_DOCENTETE.STATUS_REFUSE ? "DONE" : "ACTIVE", order.cbModification, "Contrôle et confirmation de la commande."),
                Step("CONFIRMED", "Commande confirmée", order.DO_Valide == F_DOCENTETE.STATUS_REFUSE ? "ERROR" : order.DO_Valide == F_DOCENTETE.STATUS_CONFIRME || livraison != null ? "DONE" : "PENDING", order.DO_Valide == F_DOCENTETE.STATUS_CONFIRME ? order.cbModification : null, null)
            };

            if (order.DO_Valide == F_DOCENTETE.STATUS_REFUSE)
            {
                steps.Add(Step("REFUSED", "Commande refusée", "ERROR", order.cbModification, "La commande ne continue pas."));
                return steps;
            }

            if (transfers.Count > 0)
            {
                var receivedCount = transfers.Count(x => TransitStatuses.IsReceived(x.Status));
                var inTransit = transfers.Any(x => TransitStatuses.IsInTransit(x.Status));
                var waiting = transfers.Any(x => TransitStatuses.IsWaiting(x.Status));
                var allReceived = receivedCount == transfers.Count;

                steps.Add(Step("TRANSIT_REQUIRED", "Transit requis", "DONE", transfers.Min(x => x.AffectedAt), $"{transfers.Count} article(s) nécessitent un transit inter-dépôts."));
                steps.Add(Step("WAITING_TRANSIT", "En attente de transit", waiting && !inTransit && !allReceived ? "ACTIVE" : "DONE", transfers.Min(x => x.AffectedAt), null));
                steps.Add(Step("IN_TRANSIT", "En cours de transit", inTransit ? "ACTIVE" : allReceived ? "DONE" : "PENDING", MinDate(transfers.Select(x => x.PickedUpAt)), $"{receivedCount} / {transfers.Count} article(s) reçus au dépôt destiné."));
                steps.Add(Step("RECEIVED_DESTINATION", "Reçu au dépôt destiné", allReceived ? "DONE" : "PENDING", MaxDate(transfers.Select(x => x.DeliveredAt)), null));
            }

            var isPickup = string.Equals(order.DO_ModeLivraison, "PICKUP", StringComparison.OrdinalIgnoreCase);
            var transitComplete = transfers.Count == 0 || transfers.All(x => TransitStatuses.IsReceived(x.Status));
            if (isPickup)
            {
                steps.Add(Step("PICKUP_READY", "Prête au retrait", transitComplete && order.DO_Valide == F_DOCENTETE.STATUS_CONFIRME ? "ACTIVE" : "PENDING", null, "Commande disponible au dépôt de retrait dès réception complète."));
                return steps;
            }

            steps.Add(Step("ASSIGN_DELIVERY", "Affectation livreur", livraison != null || order.AssignedLivreurId != null ? "DONE" : transitComplete ? "ACTIVE" : "PENDING", livraison?.LI_DateCreation, null));
            steps.Add(Step("IN_DELIVERY", "En cours de livraison", livraison?.LI_Statut == DeliveryStatusCodes.EnLivraison ? "ACTIVE" : livraison?.LI_Statut == DeliveryStatusCodes.Livre ? "DONE" : "PENDING", livraison?.LI_DateCreation, null));
            steps.Add(Step("DELIVERED", "Livrée", livraison?.LI_Statut == DeliveryStatusCodes.Livre ? "DONE" : "PENDING", livraison?.LI_DateLivree, null));

            if (currentStatus is "REPORTE" or "RETOUR" or "DEPOT")
            {
                steps.Add(Step(currentStatus, currentStatus == "REPORTE" ? "Reportée" : currentStatus == "RETOUR" ? "Retournée" : "Déposée au dépôt", "ERROR", livraison?.LI_DateReplanification ?? livraison?.LI_DateCreation, livraison?.LI_Commentaire));
            }

            return steps;
        }

        private static OrderTimelineStepDto Step(string code, string label, string status, DateTime? date, string? description) => new()
        {
            Code = code,
            Label = label,
            Status = status,
            Date = date,
            Description = description
        };

        private static string BuildItemMessage(F_TRANSFERT transfert, F_DEPOT? sourceDepot, F_DEPOT? destinationDepot)
        {
            var source = DepotName(sourceDepot, transfert.SourceDepotNo);
            var destination = DepotName(destinationDepot, transfert.DestinationDepotNo);
            return TransitStatuses.ToTimelineStatus(transfert.Status) switch
            {
                TransitStatuses.EnAttenteTransit => $"En attente de transit depuis {source} vers {destination}.",
                TransitStatuses.EnCoursTransit => $"En cours de transit depuis {source} vers {destination}.",
                TransitStatuses.RecuDepotDestine => $"Reçu au dépôt destiné {destination}.",
                _ => $"Statut transit: {transfert.Status}."
            };
        }

        private static string? DepotName(F_DEPOT? depot, int? fallbackNo)
        {
            if (depot == null)
                return fallbackNo.HasValue ? $"Dépôt {fallbackNo.Value}" : null;
            return depot.DE_Intitule ?? depot.DE_Code ?? $"Dépôt {depot.DE_No}";
        }

        private static DateTime? MinDate(IEnumerable<DateTime?> dates) =>
            dates.Where(x => x.HasValue).DefaultIfEmpty().Min();

        private static DateTime? MaxDate(IEnumerable<DateTime?> dates) =>
            dates.Where(x => x.HasValue).DefaultIfEmpty().Max();
    }
}
