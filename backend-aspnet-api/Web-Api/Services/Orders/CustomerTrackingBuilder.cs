using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Constants;
using Web_Api.DTO.Orders;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Services.Orders
{
    public class CustomerTrackingBuilder
    {
        private readonly AppDbContext _db;

        public CustomerTrackingBuilder(AppDbContext db)
        {
            _db = db;
        }

        public async Task<CustomerOrderTrackingDto?> BuildAsync(string piece, CancellationToken ct = default)
        {
            var order = await _db.F_DOCENTETES
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.DO_Domaine == 0 && x.DO_Type == 0, ct);

            if (order == null)
                return null;

            var livraison = await _db.F_LIVRAISONS
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DO_Piece == piece, ct);

            var reclamations = await _db.Set<F_RECLAMATION>()
                .AsNoTracking()
                .Where(x => x.DoPiece == piece)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(ct);

            // Phase 8 — bloc Contenu colis (lignes de commande).
            var lines = await _db.F_DOCLIGNES.AsNoTracking()
                .Where(l => l.DO_Piece == piece && l.DO_Domaine == 0 && l.DO_Type == 0)
                .OrderBy(l => l.cbMarq)
                .ToListAsync(ct);

            var transfers = await _db.F_TRANSFERTS.AsNoTracking()
                .Where(x => x.DoPiece == piece)
                .OrderBy(x => x.AffectedAt)
                .ToListAsync(ct);

            var depotNos = transfers
                .SelectMany(x => new[] { x.SourceDepotNo, x.DestinationDepotNo })
                .Distinct()
                .ToArray();
            var depots = depotNos.Length > 0
                ? await _db.F_DEPOTS.AsNoTracking()
                    .Where(x => depotNos.Contains(x.DE_No))
                    .ToDictionaryAsync(x => x.DE_No, ct)
                : new Dictionary<int, F_DEPOT>();

            var currentStatus = ResolveStatus(order, livraison, transfers);
            var receivedCount = transfers.Count(x => TransitStatuses.IsReceived(x.Status));

            var dto = new CustomerOrderTrackingDto
            {
                Piece = order.DO_Piece ?? string.Empty,
                Status = currentStatus,
                StatusLabel = ToClientLabel(currentStatus),
                DeliveryType = order.DO_ModeLivraison,
                PaymentMethod = order.DO_ModePaiement,
                Address = order.DO_AdresseLivraison,
                City = order.DO_VilleLivraison,
                PostalCode = order.DO_CodePostalLivraison,
                NetAPayer = order.DO_NetAPayer ?? 0m,
                OrderDate = order.DO_Date,
                AssignedAt = livraison?.LI_DateCreation,
                ReplannedAt = livraison?.LI_DateReplanification,
                DeliveredAt = livraison?.LI_DateLivree,
                DriverNote = livraison?.LI_Commentaire,
                Events = BuildEvents(order, livraison, reclamations, transfers, currentStatus),

                // Phase 8 — bloc Destinataire enrichi
                Phone = order.DO_TelephoneLivraison,
                Repere = order.DO_RepereLivraison,
                InstructionsLivreur = order.DO_InstructionsLivraison,

                // Phase 8 — bloc Contenu colis
                Items = lines.Select(l => new CustomerTrackingItemDto
                {
                    ArRef = l.AR_Ref,
                    Designation = l.DL_Design,
                    Quantite = l.DL_Qte ?? 0m,
                    PrixUnitaire = l.DL_PrixUnitaire,
                    MontantTTC = l.DL_MontantTTC
                }).ToList(),

                // Phase 8 — blocs 5 et 6 (Réclamation / Demande liées)
                LinkedReclamation = BuildLinkedReclamation(reclamations),
                LinkedDemande = BuildLinkedDemande(reclamations),

                // Transit par article
                TransitTotalCount = transfers.Count,
                TransitReceivedCount = receivedCount,
                TransitItems = BuildTransitItems(lines, transfers, depots)
            };

            return dto;
        }

        /// <summary>
        /// Phase 8 — Dernière Réclamation (TypeCas = RECLAMATION) non refusée. Null si aucune.
        /// </summary>
        private static LinkedCaseDto? BuildLinkedReclamation(List<F_RECLAMATION> reclamations)
        {
            var rec = reclamations
                .Where(r => r.TypeCas == Auth.Constants.TypeCas.RECLAMATION
                    && r.Statut != ReclamationStatuses.REFUSEE)
                .OrderByDescending(r => r.UpdatedAt)
                .FirstOrDefault();
            if (rec == null) return null;
            return new LinkedCaseDto
            {
                Id = rec.Id,
                Code = rec.CodeReclamation,
                Motif = rec.Motif,
                Statut = rec.Statut,
                TypeCas = rec.TypeCas.ToString(),
                ColorIndicator = null,
                ColorLabel = null,
                CreatedAt = rec.CreatedAt,
                UpdatedAt = rec.UpdatedAt
            };
        }

        /// <summary>
        /// Phase 8 — Dernière Demande visible client (motif A). Calcule l'indicateur
        /// rouge/vert/gris selon le statut et la présence d'une correction.
        /// </summary>
        private static LinkedCaseDto? BuildLinkedDemande(List<F_RECLAMATION> reclamations)
        {
            var dem = reclamations
                .Where(r => r.TypeCas == Auth.Constants.TypeCas.DEMANDE && r.VisibleClient)
                .OrderByDescending(r => r.UpdatedAt)
                .FirstOrDefault();
            if (dem == null) return null;

            string? color = null;
            string? colorLabel = null;
            if (ReclamationStatuses.IsClosed(dem.Statut))
            {
                color = "GREY";
                colorLabel = "Terminé";
            }
            else if (!string.IsNullOrWhiteSpace(dem.CorrectionProposee))
            {
                color = "GREEN";
                colorLabel = "Corrigé, en attente validation";
            }
            else
            {
                color = "RED";
                colorLabel = "À corriger";
            }

            return new LinkedCaseDto
            {
                Id = dem.Id,
                Code = dem.CodeReclamation,
                Motif = dem.Motif,
                Statut = dem.Statut,
                TypeCas = dem.TypeCas.ToString(),
                ColorIndicator = color,
                ColorLabel = colorLabel,
                CreatedAt = dem.CreatedAt,
                UpdatedAt = dem.UpdatedAt
            };
        }

        private static string ResolveStatus(
            F_DOCENTETE order,
            MODELS_CREATEUR.MODELS_SAGE.F_LIVRAISON? livraison,
            IReadOnlyList<F_TRANSFERT> transfers)
        {
            if (livraison?.LI_DateLivree != null)
                return "LIVRE";

            if (livraison?.LI_DateReplanification != null)
                return "REPORTE";

            if (livraison != null)
                return "EN_LIVRAISON";

            if (transfers.Count > 0)
            {
                if (transfers.Any(x => TransitStatuses.IsInTransit(x.Status)))
                    return TransitStatuses.EnCoursTransit;
                if (transfers.Any(x => TransitStatuses.IsWaiting(x.Status)))
                    return TransitStatuses.EnAttenteTransit;
                if (transfers.All(x => TransitStatuses.IsReceived(x.Status)))
                    return TransitStatuses.TransitTermine;
            }

            if (order.DO_Valide == F_DOCENTETE.STATUS_CONFIRME)
                return "CONFIRME";

            if (order.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE)
                return "TENTATIVE";

            if (order.DO_Valide == F_DOCENTETE.STATUS_REFUSE)
                return "REFUSE";

            return "EN_ATTENTE";
        }

        private static List<CustomerTrackingTransitItemDto> BuildTransitItems(
            IReadOnlyList<F_DOCLIGNE> lines,
            IReadOnlyList<F_TRANSFERT> transfers,
            IReadOnlyDictionary<int, F_DEPOT> depots)
        {
            var result = new List<CustomerTrackingTransitItemDto>();
            foreach (var line in lines)
            {
                var arRef = line.AR_Ref ?? string.Empty;
                var matching = transfers
                    .Where(x => string.Equals(x.ArRef, arRef, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                foreach (var t in matching)
                {
                    depots.TryGetValue(t.SourceDepotNo, out var src);
                    depots.TryGetValue(t.DestinationDepotNo, out var dst);
                    var srcName = !string.IsNullOrEmpty(src?.DE_Intitule) ? src!.DE_Intitule
                        : !string.IsNullOrEmpty(src?.DE_Code) ? src!.DE_Code : $"Dépôt {t.SourceDepotNo}";
                    var dstName = !string.IsNullOrEmpty(dst?.DE_Intitule) ? dst!.DE_Intitule
                        : !string.IsNullOrEmpty(dst?.DE_Code) ? dst!.DE_Code : $"Dépôt {t.DestinationDepotNo}";
                    var timelineStatus = TransitStatuses.ToTimelineStatus(t.Status);
                    var message = timelineStatus switch
                    {
                        var s when TransitStatuses.IsWaiting(s) => $"En attente de départ depuis {srcName}.",
                        TransitStatuses.EnCoursTransit => $"En transit de {srcName} vers {dstName}.",
                        var s when TransitStatuses.IsReceived(s) => $"Arrivé au dépôt {dstName}.",
                        _ => $"Statut : {t.Status}"
                    };
                    result.Add(new CustomerTrackingTransitItemDto
                    {
                        ArticleRef = arRef,
                        ArticleName = line.DL_Design ?? arRef,
                        Quantity = t.Quantite,
                        Status = timelineStatus,
                        SourceDepotName = srcName,
                        DestinationDepotName = dstName,
                        CurrentMessage = message
                    });
                }
            }
            return result;
        }

        private static List<CustomerTrackingEventDto> BuildEvents(
            F_DOCENTETE order,
            F_LIVRAISON? livraison,
            List<F_RECLAMATION> reclamations,
            IReadOnlyList<F_TRANSFERT> transfers,
            string currentStatus)
        {
            var isRefused = order.DO_Valide == F_DOCENTETE.STATUS_REFUSE;
            var isConfirmed = order.DO_Valide == F_DOCENTETE.STATUS_CONFIRME || livraison != null;
            var isTentative = order.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE;
            var isPickup = string.Equals(order.DO_ModeLivraison, "PICKUP", StringComparison.OrdinalIgnoreCase);
            var receivedCount = transfers.Count(x => TransitStatuses.IsReceived(x.Status));
            var inTransit = transfers.Any(x => TransitStatuses.IsInTransit(x.Status));
            var allReceived = transfers.Count > 0 && receivedCount == transfers.Count;
            var transitComplete = transfers.Count == 0 || allReceived;

            var events = new List<CustomerTrackingEventDto>
            {
                Ev("Commande créée", "CREATED", order.DO_Date, "La commande a été enregistrée.",
                    isDone: order.DO_Date != null, state: order.DO_Date != null ? "DONE" : "ACTIVE"),

                Ev("Commande confirmée", "CONFIRME",
                    isConfirmed ? (order.cbModification ?? order.DO_Date) : null,
                    isRefused ? "La commande a été refusée." : "Validation commerciale terminée.",
                    isDone: isConfirmed,
                    state: isRefused ? "ERROR" : isConfirmed ? "DONE" : isTentative ? "ACTIVE" : "PENDING"),
            };

            // Commande refusée : on s'arrête ici, pas d'étapes suivantes
            if (isRefused)
            {
                events.Add(Ev("Commande refusée", "REFUSE", order.cbModification,
                    "La commande ne sera pas traitée.", isDone: true, state: "ERROR"));
                return events.OrderBy(x => x.Date ?? DateTime.MaxValue).ThenBy(x => x.Label).ToList();
            }

            if (transfers.Count > 0)
            {
                events.Add(Ev("Transit inter-dépôts requis", TransitStatuses.TransitRequis,
                    transfers.Min(x => x.AffectedAt),
                    $"{transfers.Count} transfert(s) planifié(s) pour cette commande.",
                    isDone: true, state: "DONE"));

                events.Add(Ev("Transit en cours", TransitStatuses.EnCoursTransit,
                    MinDate(transfers.Select(x => x.PickedUpAt)),
                    $"{receivedCount} / {transfers.Count} article(s) arrivés au dépôt destination.",
                    isDone: allReceived,
                    state: allReceived ? "DONE" : inTransit ? "ACTIVE" : "PENDING"));

                events.Add(Ev("Tous les articles reçus", TransitStatuses.RecuDepotDestine,
                    MaxDate(transfers.Select(x => x.DeliveredAt)),
                    "La commande peut maintenant continuer.",
                    isDone: allReceived,
                    state: allReceived ? "DONE" : "PENDING"));
            }

            if (isPickup)
            {
                // Mode PICKUP — pas de livreur, le client retire au dépôt
                var pickupReady = transitComplete && isConfirmed;
                events.Add(Ev("Disponible au retrait", "PICKUP_READY", null,
                    "Votre commande est prête à être récupérée au dépôt.",
                    isDone: pickupReady,
                    state: pickupReady ? "ACTIVE" : "PENDING"));
            }
            else
            {
                // Mode HOME — livreur affecté puis livraison
                var assignActive = transitComplete && isConfirmed && livraison == null;
                events.Add(Ev("Prise en charge livreur", "ASSIGNED",
                    livraison?.LI_DateCreation,
                    livraison != null ? "Un livreur a été affecté au colis." : "En attente d'affectation.",
                    isDone: livraison != null,
                    state: livraison != null ? "DONE" : assignActive ? "ACTIVE" : "PENDING"));

                if (livraison?.LI_DateReplanification != null)
                    events.Add(Ev("Livraison reportée", "REPORTE",
                        livraison.LI_DateReplanification,
                        livraison.LI_Commentaire ?? "La livraison a été reportée.",
                        isDone: true, state: "ERROR"));

                if (livraison?.LI_Statut == DeliveryStatusCodes.Retour)
                    events.Add(Ev("Colis retourné au dépôt", "RETOUR",
                        livraison.LI_DateReplanification ?? livraison.LI_DateLivree,
                        livraison.LI_Commentaire ?? "Le colis est revenu au dépôt.",
                        isDone: true, state: "ERROR"));

                events.Add(Ev("Colis livré", "LIVRE",
                    livraison?.LI_DateLivree,
                    "Le colis a été remis au client.",
                    isDone: livraison?.LI_DateLivree != null,
                    state: livraison?.LI_DateLivree != null ? "DONE" : "PENDING"));
            }

            foreach (var reclamation in reclamations)
            {
                events.Add(Ev("Réclamation ouverte", ReclamationStatuses.ENVOYEE,
                    reclamation.CreatedAt,
                    $"{reclamation.CodeReclamation} — {reclamation.Motif}",
                    isDone: true, state: "DONE"));

                if (!string.IsNullOrWhiteSpace(reclamation.Statut) && reclamation.Statut != ReclamationStatuses.ENVOYEE)
                    events.Add(Ev("Réclamation mise à jour", reclamation.Statut,
                        reclamation.UpdatedAt,
                        $"Statut SAV : {reclamation.Statut}",
                        isDone: true, state: "DONE"));
            }

            return events
                .OrderBy(x => x.Date ?? DateTime.MaxValue)
                .ThenBy(x => x.Label)
                .ToList();
        }

        private static CustomerTrackingEventDto Ev(
            string label, string status, DateTime? date, string? description,
            bool isDone, string state) => new()
        {
            Label = label,
            Status = status,
            Date = date,
            Description = description,
            IsDone = isDone,
            State = state,
        };

        private static string ToClientLabel(string status)
        {
            return status switch
            {
                "CONFIRME" => "Confirmée",
                TransitStatuses.EnAttenteTransit => "En attente de transit",
                TransitStatuses.EnCoursTransit => "En cours de transit",
                TransitStatuses.TransitTermine => "Transit terminé",
                "EN_LIVRAISON" => "En livraison",
                "LIVRE" => "Livrée",
                "REPORTE" => "Reportée",
                "TENTATIVE" => "Tentative",
                "REFUSE" => "Refusée",
                _ => "En attente"
            };
        }

        private static DateTime? MinDate(IEnumerable<DateTime?> dates) =>
            dates.Where(x => x.HasValue).DefaultIfEmpty().Min();

        private static DateTime? MaxDate(IEnumerable<DateTime?> dates) =>
            dates.Where(x => x.HasValue).DefaultIfEmpty().Max();
    }
}
