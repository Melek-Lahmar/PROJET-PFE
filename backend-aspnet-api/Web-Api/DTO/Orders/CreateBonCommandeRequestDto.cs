namespace Web_Api.DTO.Orders
{
    public class CreateBonCommandeRequestDto
    {
        // ✅ HOME: null / PICKUP: obligatoire
        public int? DepotNo { get; set; }

        // HOME | PICKUP
        public string? DeliveryType { get; set; }

        public string? PaymentMethod { get; set; }

        // HOME uniquement
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        public List<CreateBonCommandeLineRequestDto> Lines { get; set; } = new();
    }

    public class CreateBonCommandeLineRequestDto
    {
        public string? ArticleRef { get; set; }
        public decimal Qty { get; set; }
    }
}