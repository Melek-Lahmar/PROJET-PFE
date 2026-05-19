using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>
    /// Requête universelle envoyée par n8n au chatbot. Le DSL est conçu pour que Groq
    /// transforme une question naturelle en JSON structuré, exécuté côté backend en
    /// LINQ paramétré sécurisé.
    /// </summary>
    public class ChatQueryRequestDto
    {
        /// <summary>orders | claims | demandes | products | governorates | drivers | confirmatrices</summary>
        public string Entity { get; set; } = "orders";

        /// <summary>count | sum | avg | list | top</summary>
        public string Metric { get; set; } = "count";

        public ChatQueryFiltersDto Filters { get; set; } = new();

        /// <summary>null | status | governorate | driver | confirmatrice | day | week | month | motif | typeCas | source</summary>
        public string? GroupBy { get; set; }

        /// <summary>Limite des items retournés en mode list / top (défaut 10, max 50).</summary>
        public int? Limit { get; set; }

        /// <summary>count_desc | amount_desc | date_desc | date_asc</summary>
        public string? OrderBy { get; set; }
    }

    /// <summary>
    /// Filtres optionnels — l'absence d'un filtre = "tous".
    /// Tous les filtres peuvent être combinés.
    /// </summary>
    public class ChatQueryFiltersDto
    {
        /// <summary>today | 7d | 30d | 3m | 12m (ignoré si From et To sont fournis)</summary>
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }

        public string? Governorate { get; set; }

        /// <summary>
        /// Pour orders : pending | confirmed | tentative | refused | inDelivery | delivered | returned | postponed.
        /// Pour claims/demandes : ENVOYEE | EN_COURS_DE_TRAITEMENT | CLOTUREE | REFUSEE | open | closed.
        /// </summary>
        public string? Status { get; set; }

        public string? Motif { get; set; }
        /// <summary>RECLAMATION | DEMANDE</summary>
        public string? TypeCas { get; set; }
        /// <summary>CLIENT | LIVREUR</summary>
        public string? Source { get; set; }

        public string? DriverId { get; set; }
        public string? ConfirmatriceId { get; set; }
        public string? ClientId { get; set; }
        public string? ProductRef { get; set; }

        public string? OrderNumber { get; set; }
        public string? Search { get; set; }
    }

    public class ChatQueryResponseDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal? Value { get; set; }
        public List<ChatQueryRowDto>? Rows { get; set; }
        public List<ChatQuerySeriesPointDto>? Series { get; set; }
        public ChatQueryAppliedDto Applied { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class ChatQueryRowDto
    {
        public string? Key { get; set; }
        public string? Label { get; set; }
        public decimal? Value { get; set; }
        public Dictionary<string, object?> Fields { get; set; } = new();
    }

    public class ChatQuerySeriesPointDto
    {
        public string Bucket { get; set; } = string.Empty;
        public decimal Value { get; set; }
    }

    public class ChatQueryAppliedDto
    {
        public string Entity { get; set; } = string.Empty;
        public string Metric { get; set; } = string.Empty;
        public ChatQueryFiltersDto Filters { get; set; } = new();
        public string? GroupBy { get; set; }
        public int? Limit { get; set; }
        public string? OrderBy { get; set; }
        public DateTime ResolvedFrom { get; set; }
        public DateTime ResolvedTo { get; set; }
    }
}
