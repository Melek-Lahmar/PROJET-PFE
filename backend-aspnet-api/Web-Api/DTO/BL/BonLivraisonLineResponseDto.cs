namespace Web_Api.DTO.BL
{
    public class BonLivraisonLineResponseDto
    {
        public string ArticleRef { get; set; } = "";
        public string? Designation { get; set; }
        public decimal Qty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal AmountHT { get; set; }
        public decimal AmountTTC { get; set; }
    }
}