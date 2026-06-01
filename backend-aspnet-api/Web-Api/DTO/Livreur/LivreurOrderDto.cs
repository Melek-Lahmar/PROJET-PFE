using System;

namespace Web_Api.DTO.Livreur
{
    public class LivreurOrderDto
    {
        public string Piece { get; set; } = "";
        public string? Status { get; set; }

        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }

        public string? ClientCode { get; set; }
        public string? ClientDisplay { get; set; }
        public string? ClientPhone { get; set; }

        public string? PaymentMethod { get; set; }
        public string? DeliveryType { get; set; }

        public decimal NetAPayer { get; set; }

        public DateTime? AssignedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? ReplannedAt { get; set; }
        // Report partiel (même journée) : instant à partir duquel la commande
        // sort de la section « bloquée » et redevient livrable.
        public DateTime? HeureSouhaitee { get; set; }
        public string? Note { get; set; }

        // Section 1.1 / 2.4 — numéro de passage dépôt (filtres chips livreur)
        public int? DepotPassageNumber { get; set; }
        public bool IsActiveDelivery { get; set; }
    }
}