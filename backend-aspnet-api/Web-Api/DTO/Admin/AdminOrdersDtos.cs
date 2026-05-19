using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>
    /// Filtres reçus depuis l'onglet Commandes/Colis du cockpit admin Flutter.
    /// </summary>
    public class AdminOrdersQueryDto
    {
        // --- Période ---
        /// <summary>Code période ("today", "7d", "30d", "3m", "12m"). Optionnel si From/To fournis.</summary>
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }

        // --- Filtres métier ---
        /// <summary>Nom du gouvernorat (ex : "Sfax"). null = tous.</summary>
        public string? Governorate { get; set; }

        /// <summary>
        /// pending | confirmed | tentative | refused
        /// | inDelivery | delivered | returned | postponed
        /// | all (défaut).
        /// </summary>
        public string? Status { get; set; }

        /// <summary>Numéro pièce / tiers / nom client / ville. LIKE insensible.</summary>
        public string? Search { get; set; }

        // --- Tri / pagination ---
        /// <summary>date_desc (défaut) | date_asc | amount_desc</summary>
        public string? Sort { get; set; }

        public int? Page { get; set; }
        public int? PageSize { get; set; }
    }

    public class AdminOrdersAppliedFiltersDto
    {
        public string Period { get; set; } = "30d";
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public string? Governorate { get; set; }
        public string Status { get; set; } = "all";
        public string? Search { get; set; }
        public string Sort { get; set; } = "date_desc";
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 25;
    }

    public class AdminOrderListItemDto
    {
        public string Piece { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public string? Tiers { get; set; }
        public string? ClientName { get; set; }
        public string? Telephone { get; set; }
        public string? Ville { get; set; }
        public string? Governorate { get; set; }

        /// <summary>EN_ATTENTE | CONFIRME | TENTATIVE | REFUSE</summary>
        public string OrderStatus { get; set; } = "INCONNU";

        /// <summary>CONFIRME | EN_LIVRAISON | LIVRE | RETOUR | DEPOT | REPORTE | null si pas de livraison.</summary>
        public string? DeliveryStatus { get; set; }

        public decimal? Amount { get; set; }
        public string? LivreurName { get; set; }
        public bool HasClaim { get; set; }
    }

    public class AdminOrdersPageDto
    {
        public DateTime GeneratedAt { get; set; }
        public AdminOrdersAppliedFiltersDto AppliedFilters { get; set; } = new();

        public int Page { get; set; }
        public int PageSize { get; set; }
        public int Total { get; set; }
        public int TotalPages { get; set; }

        /// <summary>KPI calculés sur la période + gouvernorat (avant filtre statut/search).</summary>
        public List<AdminKpiDto> Kpis { get; set; } = new();

        public List<AdminOrderListItemDto> Items { get; set; } = new();
    }

    // ========================================================================
    // Détail commande (drawer)
    // ========================================================================
    public class AdminOrdersLineDto
    {
        public string? ArticleRef { get; set; }
        public string? Designation { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? TotalTtc { get; set; }
        public string LineType { get; set; } = "STANDARD";
    }

    public class AdminOrdersDeliveryDto
    {
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? RescheduledAt { get; set; }
        public string? Address { get; set; }
        public string? Comment { get; set; }
        public string? LivreurName { get; set; }
        public string? LivreurPhone { get; set; }
    }

    public class AdminOrdersDetailDto
    {
        public string Piece { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public string OrderStatus { get; set; } = "INCONNU";
        public string TypeCommande { get; set; } = "NORMALE";

        public string? Tiers { get; set; }
        public string? ClientName { get; set; }
        public string? ClientPhone { get; set; }
        public string? Address { get; set; }
        public string? Ville { get; set; }
        public string? Governorate { get; set; }

        public decimal? AmountHt { get; set; }
        public decimal? AmountTtc { get; set; }
        public decimal? FraisLivraison { get; set; }
        public string? ModePaiement { get; set; }
        public string? ModeLivraison { get; set; }

        public List<AdminOrdersLineDto> Lines { get; set; } = new();
        public AdminOrdersDeliveryDto? Delivery { get; set; }

        /// <summary>Réclamations + Demandes liées à la commande (1 commande → N cas).</summary>
        public List<AdminOrdersReclamationLinkDto> Reclamations { get; set; } = new();
    }

    public class AdminOrdersReclamationLinkDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        /// <summary>RECLAMATION (créée par client) | DEMANDE (créée par livreur).</summary>
        public string TypeCas { get; set; } = "RECLAMATION";
        /// <summary>CLIENT | LIVREUR</summary>
        public string Source { get; set; } = "CLIENT";
        public string Motif { get; set; } = string.Empty;
        /// <summary>ENVOYEE | EN_COURS_DE_TRAITEMENT | CLOTUREE | REFUSEE</summary>
        public string Statut { get; set; } = "ENVOYEE";
        public DateTime CreatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        /// <summary>Demande livreur invisible côté client (motifs B et C après 3 tentatives).</summary>
        public bool VisibleClient { get; set; }
    }
}
