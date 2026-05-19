using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>
    /// Filtres communs envoyés par n8n aux endpoints chatbot.
    /// Tous optionnels — l'absence d'un filtre = "tous".
    /// </summary>
    public class ChatFiltersDto
    {
        /// <summary>"today" | "7d" | "30d" | "3m" | "12m"</summary>
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Governorate { get; set; }
        /// <summary>Voir AdminOrdersQueryDto.Status pour les valeurs.</summary>
        public string? Status { get; set; }
        public string? OrderNumber { get; set; }
        public string? ClientQuery { get; set; }
        public string? ProductQuery { get; set; }
    }

    public class ChatCountResponseDto
    {
        public int Count { get; set; }
        public string Label { get; set; } = string.Empty;
        public ChatFiltersDto Filters { get; set; } = new();
    }

    public class ChatListResponseDto<T>
    {
        public int Total { get; set; }
        public int Returned { get; set; }
        public string Label { get; set; } = string.Empty;
        public List<T> Items { get; set; } = new();
    }

    public class ChatTopProductRowDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public double Quantity { get; set; }
        public double Revenue { get; set; }
    }

    public class ChatGovernorateRowDto
    {
        public string Governorate { get; set; } = string.Empty;
        public int Orders { get; set; }
        public int Delivered { get; set; }
        public int Returned { get; set; }
        public decimal DeliveryRate { get; set; }
    }
}
