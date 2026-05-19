namespace Web_Api.DTO.Reclamations
{
    public class ReclamationOrderLineDto
    {
        public string ArRef { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public decimal Qty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal AmountTTC { get; set; }
    }
}
