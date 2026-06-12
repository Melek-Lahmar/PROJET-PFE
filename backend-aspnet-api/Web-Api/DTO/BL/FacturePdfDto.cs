namespace Web_Api.DTO.BL
{
    public class FacturePdfDto
    {
        public string Piece { get; set; } = "";
        public DateTime? Date { get; set; }

        // Client
        public string ClientCode { get; set; } = "";
        public string? ClientName { get; set; }
        public string? ClientPhone { get; set; }
        public string? ClientAddress { get; set; }
        public string? ClientCity { get; set; }
        public string? ClientPostalCode { get; set; }
        public string? ClientMatriculeFiscal { get; set; }
        public string? ClientRegistreCommerce { get; set; }

        // Vendeur / dépôt
        public string? VendeurName { get; set; }
        public int DepotNo { get; set; }
        public string? DepotIntitule { get; set; }
        public string? PaymentMethod { get; set; }

        // Montants
        public decimal TotalHT { get; set; }
        public decimal TotalTTC { get; set; }
        public decimal TimbreFiscal { get; set; }
        public decimal FraisLivraison { get; set; }
        public decimal NetAPayer { get; set; }

        public List<FactureLineDto> Lines { get; set; } = new();
    }

    public class FactureLineDto
    {
        public string ArticleRef { get; set; } = "";
        public string? Designation { get; set; }
        public decimal Qty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal AmountHT { get; set; }
        public decimal AmountTTC { get; set; }
    }
}
