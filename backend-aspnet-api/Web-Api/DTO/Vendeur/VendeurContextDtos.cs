namespace Web_Api.DTO.Vendeur
{
    public class VendeurPaymentOptionDto
    {
        public string Code { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
    }

    public class VendeurDepotContextDto
    {
        public int DepotNo { get; set; }
        public string? DepotCode { get; set; }
        public string? DepotIntitule { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public string? Country { get; set; }
    }

    public class VendeurContextResponseDto
    {
        public Guid VendeurUserId { get; set; }
        public string? VendeurDisplayName { get; set; }
        public string? VendeurEmail { get; set; }
        public string ModeRemise { get; set; } = "SUR_PLACE";
        public string DeliveryTypeStored { get; set; } = "PICKUP";
        public decimal FraisLivraison { get; set; }
        public decimal TimbreFiscal { get; set; }
        public VendeurDepotContextDto Depot { get; set; } = new();
        public List<VendeurPaymentOptionDto> PaymentMethods { get; set; } = new();
    }
}