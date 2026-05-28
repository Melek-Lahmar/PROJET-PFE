using Web_Api.DTO.Orders;

namespace Web_Api.DTO.Vendeur
{
    public class VendeurOrderCustomerDto
    {
        public string CustomerMode { get; set; } = "EXISTING";
        public Guid? ClientUserId { get; set; }
        public string? ClientCode { get; set; }
        public string? TypeClient { get; set; }
        public string? DisplayName { get; set; }
        public string? Email { get; set; }
        public string? NomComplet { get; set; }
        public string? Telephone { get; set; }
        public string? Cin { get; set; }
        public string? NomSociete { get; set; }
        public string? MatriculeFiscal { get; set; }
        public string? RegistreCommerce { get; set; }
        public string? NumeroTVA { get; set; }
        public string? Gouvernorat { get; set; }
        public string? Delegation { get; set; }
        public string? Adresse { get; set; }
        public string? AdresseComplementaire { get; set; }
        public string? CodePostal { get; set; }
    }

    public class VendeurOrderResponseDto
    {
        public string Piece { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public string ClientCode { get; set; } = string.Empty;
        public Guid? VendeurUserId { get; set; }
        public string? VendeurDisplayName { get; set; }
        public int DepotNo { get; set; }
        public string? DepotCode { get; set; }
        public string? DepotIntitule { get; set; }
        public string? DepotAddress { get; set; }
        public string? DepotCity { get; set; }
        public string? DepotPostalCode { get; set; }
        public string ModeRemise { get; set; } = "SUR_PLACE";
        public string? Status { get; set; }
        public short? StatusCode { get; set; }
        public string? TimelineStage { get; set; }
        public decimal TotalHT { get; set; }
        public decimal TotalTTC { get; set; }
        public decimal FraisLivraison { get; set; }
        public decimal TimbreFiscal { get; set; }
        public decimal TotalBeforeDiscount { get; set; }
        public decimal? B2BDiscountRate { get; set; }
        public decimal B2BDiscountAmount { get; set; }
        public string? DiscountSource { get; set; }
        public decimal NetAPayer { get; set; }
        public string? DeliveryType { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        public VendeurOrderCustomerDto? Customer { get; set; }
        public List<BonCommandeLineResponseDto> Lines { get; set; } = new();
    }
}
