namespace Web_Api.DTO.Orders
{
    /// <summary>
    /// Phase 8 — DTO de tracking client organisé en 6 blocs :
    ///   1. En-tête : Piece, Status, StatusLabel, OrderDate
    ///   2. Destinataire : Phone, Address, City, PostalCode, Repere, InstructionsLivreur
    ///   3. Contenu colis : Items
    ///   4. Timeline livraison : Events (ordonnés)
    ///   5. Réclamation liée : LinkedReclamation (nullable)
    ///   6. Demande liée : LinkedDemande (nullable, avec indicateur rouge/vert/gris)
    /// Le front Flutter reconstitue visuellement les 6 blocs à partir de ces champs.
    /// Champs existants conservés pour compat.
    /// </summary>
    public class CustomerOrderTrackingDto
    {
        public string Piece { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string StatusLabel { get; set; } = string.Empty;
        public string? DeliveryType { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public decimal NetAPayer { get; set; }
        public DateTime? OrderDate { get; set; }
        public DateTime? AssignedAt { get; set; }
        public DateTime? ReplannedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public string? DriverNote { get; set; }
        public List<CustomerTrackingEventDto> Events { get; set; } = new();

        // Phase 8 — ajouts bloc Destinataire
        public string? Phone { get; set; }
        public string? Repere { get; set; }
        public string? InstructionsLivreur { get; set; }

        // Phase 8 — bloc Contenu colis
        public List<CustomerTrackingItemDto> Items { get; set; } = new();

        // Phase 8 — blocs 5 et 6 (réclamation / demande liées)
        public LinkedCaseDto? LinkedReclamation { get; set; }
        public LinkedCaseDto? LinkedDemande { get; set; }

        // Transit inter-dépôts
        public int TransitTotalCount { get; set; }
        public int TransitReceivedCount { get; set; }
        // Résumé global destiné au CLIENT (ex: "En transit de Sfax vers Sousse").
        public string? TransitSummary { get; set; }
        // Détail article par article — réservé au staff (vide côté client).
        public List<CustomerTrackingTransitItemDto> TransitItems { get; set; } = new();
    }

    public class CustomerTrackingTransitItemDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string ArticleName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        /// <summary>EN_ATTENTE_TRANSIT | EN_COURS_TRANSIT | RECU_DEPOT_DESTINE | TRANSIT_TERMINE</summary>
        public string Status { get; set; } = string.Empty;
        public string? SourceDepotName { get; set; }
        public string? DestinationDepotName { get; set; }
        public string CurrentMessage { get; set; } = string.Empty;
    }

    public class CustomerTrackingItemDto
    {
        public string? ArRef { get; set; }
        public string? Designation { get; set; }
        public decimal Quantite { get; set; }
        public decimal? PrixUnitaire { get; set; }
        public decimal? MontantTTC { get; set; }
    }

    /// <summary>
    /// Représente une Réclamation ou une Demande liée à la commande. Pour une Demande
    /// visible client (motif A), <see cref="ColorIndicator"/> vaut :
    ///   - "RED"   = à corriger côté client
    ///   - "GREEN" = corrigé, en attente validation
    ///   - "GREY"  = terminé (CLOTUREE / REFUSEE)
    /// Pour une Réclamation ou une Demande non visible, ColorIndicator vaut null.
    /// </summary>
    public class LinkedCaseDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Motif { get; set; } = string.Empty;
        public string Statut { get; set; } = string.Empty;
        public string TypeCas { get; set; } = string.Empty;
        public string? ColorIndicator { get; set; }
        public string? ColorLabel { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
