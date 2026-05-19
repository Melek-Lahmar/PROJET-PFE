namespace Web_Api.DTO.Orders
{
    public class BonCommandeResponseDto
    {
        public string Piece { get; set; } = default!;
        public DateTime? Date { get; set; }

        public string ClientCode { get; set; } = default!;
        public int DepotNo { get; set; }

        public string? Status { get; set; }
        public short? StatusCode { get; set; }
        public string? TimelineStage { get; set; }
        public string? StatusSource { get; set; }

        public DateTime? AssignedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? ReplannedAt { get; set; }
        public string? DriverNote { get; set; }

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
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }

        public List<BonCommandeLineResponseDto> Lines { get; set; } = new();
    }

    public class BonCommandeLineResponseDto
    {
        public string ArticleRef { get; set; } = default!;
        public string? Designation { get; set; }
        public decimal Qty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal AmountHT { get; set; }
        public decimal AmountTTC { get; set; }
    }
}
