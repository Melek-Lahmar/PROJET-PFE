using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    public class AdminDriversQueryDto
    {
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Governorate { get; set; }
        public string? Search { get; set; }
    }

    public class AdminDriverListItemDto
    {
        public Guid UserId { get; set; }
        public int? ProfileId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Governorate { get; set; }

        /// <summary>Livreur-transit (travaille sur F_TRANSFERTS, pas F_LIVRAISONS).</summary>
        public bool IsTransit { get; set; }

        public bool Online { get; set; }
        public bool InPause { get; set; }
        public DateTime? LastActivityAt { get; set; }

        public int OrdersTotal { get; set; }
        public int OrdersInProgress { get; set; }
        public int OrdersDelivered { get; set; }
        public int OrdersReturned { get; set; }
        public int OrdersPostponed { get; set; }
        public decimal DeliveryRate { get; set; }
        public decimal ReturnRate { get; set; }
        public int Claims { get; set; }
    }

    public class AdminDriversPageDto
    {
        public DateTime GeneratedAt { get; set; }
        public List<AdminKpiDto> Kpis { get; set; } = new();
        public List<AdminDriverListItemDto> Items { get; set; } = new();
    }

    public class AdminDriverDetailDto
    {
        public Guid UserId { get; set; }
        public int? ProfileId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? CIN { get; set; }
        public string? Governorate { get; set; }
        public string? Delegation { get; set; }
        public string? Adresse { get; set; }
        public bool IsTransit { get; set; }
        public bool Online { get; set; }
        public bool InPause { get; set; }
        public DateTime? LastActivityAt { get; set; }

        public List<AdminKpiDto> Kpis { get; set; } = new();
        public List<AdminTrendPointDto> ActivityTrend { get; set; } = new();

        /// <summary>Dernières livraisons (jusqu'à 20).</summary>
        public List<AdminDriverRecentDeliveryDto> RecentDeliveries { get; set; } = new();
    }

    public class AdminDriverRecentDeliveryDto
    {
        public string Piece { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Ville { get; set; }
        public string? ClientName { get; set; }
    }
}
