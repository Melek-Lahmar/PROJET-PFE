using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
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

            var currentStatus = ResolveStatus(order, livraison, transfers);

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
                LinkedDemande = BuildLinkedDemande(reclamations)
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

        private static List<CustomerTrackingEventDto> BuildEvents(
            F_DOCENTETE order,
            MODELS_CREATEUR.MODELS_SAGE.F_LIVRAISON? livraison,
            List<F_RECLAMATION> reclamations,
            IReadOnlyList<F_TRANSFERT> transfers,
            string currentStatus)
        {
            var events = new List<CustomerTrackingEventDto>
            {
                new()
                {
                    Label = "Commande créée",
                    Status = "CREATED",
                    Date = order.DO_Date,
                    Description = "La commande a été enregistrée.",
                    IsDone = order.DO_Date != null
                },
                new()
                {
                    Label = "Commande confirmée",
                    Status = "CONFIRME",
                    Date = order.DO_Valide == F_DOCENTETE.STATUS_CONFIRME ? (order.cbModification ?? order.DO_Date) : null,
                    Description = "La commande a été validée.",
                    IsDone = order.DO_Valide == F_DOCENTETE.STATUS_CONFIRME || livraison != null
                },
            };

            if (transfers.Count > 0)
            {
                var receivedCount = transfers.Count(x => TransitStatuses.IsReceived(x.Status));
                events.Add(new CustomerTrackingEventDto
                {
                    Label = "Transit inter-dépôts requis",
                    Status = TransitStatuses.TransitRequis,
                    Date = transfers.Min(x => x.AffectedAt),
                    Description = $"{transfers.Count} article(s) doivent rejoindre le dépôt destination.",
                    IsDone = true
                });
                events.Add(new CustomerTrackingEventDto
                {
                    Label = "Transit en cours",
                    Status = TransitStatuses.EnCoursTransit,
                    Date = MinDate(transfers.Select(x => x.PickedUpAt)),
                    Description = $"{receivedCount} / {transfers.Count} article(s) reçus au dépôt destination.",
                    IsDone = receivedCount == transfers.Count
                });
                events.Add(new CustomerTrackingEventDto
                {
                    Label = "Articles reçus au dépôt destiné",
                    Status = TransitStatuses.RecuDepotDestine,
                    Date = MaxDate(transfers.Select(x => x.DeliveredAt)),
                    Description = "La commande peut continuer vers la livraison ou le retrait.",
                    IsDone = receivedCount == transfers.Count
                });
            }

            events.Add(new CustomerTrackingEventDto
            {
                Label = "Prise en charge livraison",
                Status = "ASSIGNED",
                Date = livraison?.LI_DateCreation,
                Description = "Un livreur a été affecté au colis.",
                IsDone = livraison != null
            });
            events.Add(new CustomerTrackingEventDto
            {
                Label = "Livraison replanifiée",
                Status = "REPORTE",
                Date = livraison?.LI_DateReplanification,
                Description = "La livraison a été reportée.",
                IsDone = livraison?.LI_DateReplanification != null
            });
            events.Add(new CustomerTrackingEventDto
            {
                Label = "Colis livré",
                Status = "LIVRE",
                Date = livraison?.LI_DateLivree,
                Description = "Le colis a été remis au client.",
                IsDone = livraison?.LI_DateLivree != null
            });

            foreach (var reclamation in reclamations)
            {
                events.Add(new CustomerTrackingEventDto
                {
                    Label = "Réclamation ouverte",
                    Status = ReclamationStatuses.ENVOYEE,
                    Date = reclamation.CreatedAt,
                    Description = $"Réclamation {reclamation.CodeReclamation} - {reclamation.Motif}",
                    IsDone = true
                });

                if (!string.IsNullOrWhiteSpace(reclamation.Statut) && reclamation.Statut != ReclamationStatuses.ENVOYEE)
                {
                    events.Add(new CustomerTrackingEventDto
                    {
                        Label = "Réclamation mise à jour",
                        Status = reclamation.Statut,
                        Date = reclamation.UpdatedAt,
                        Description = $"Statut SAV : {reclamation.Statut}",
                        IsDone = true
                    });
                }
            }

            return events
                .OrderBy(x => x.Date ?? DateTime.MaxValue)
                .ThenBy(x => x.Label)
                .ToList();
        }

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
