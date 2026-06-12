using System;
using System.Collections.Generic;

namespace Web_Api.DTO.BL
{
    public class BonLivraisonResponseDto
    {
        public string Piece { get; set; } = "";
        public DateTime? Date { get; set; }

        public string? SourceBcPiece { get; set; }

        public string ClientCode { get; set; } = "";
        public int DepotNo { get; set; }

        public string? Status { get; set; }

        public decimal TotalHT { get; set; }
        public decimal TotalTTC { get; set; }
        public decimal FraisLivraison { get; set; }
        public decimal TimbreFiscal { get; set; }
        public decimal NetAPayer { get; set; }

        public string? DeliveryType { get; set; }
        public string? PaymentMethod { get; set; }

        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public string? ClientPhone { get; set; }
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }

        // Manifeste vendeur
        public bool Printed { get; set; }                  // déjà inclus dans un bloc manifeste imprimé
        public string? RouteType { get; set; }             // "DOMICILE" | "TRANSIT"
        public string? DestinationGouvernorat { get; set; } // ex: "Tunis"
        public string? DestinationDepotName { get; set; }   // ex: "Dépôt Tunis"
        public string? ClientName { get; set; }             // nom affiché (passager ou profil)

        public List<BonLivraisonLineResponseDto> Lines { get; set; } = new();
    }
}