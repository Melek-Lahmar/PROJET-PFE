using System.Text.Json.Serialization;

namespace Web_Api.DTO.Confirmateur
{
    public class ConfirmateurOrderDto
    {
        [JsonPropertyName("dO_Piece")]
        public string? DO_Piece { get; set; }

        [JsonPropertyName("dO_Tiers")]
        public string? DO_Tiers { get; set; }

        [JsonPropertyName("dO_Ref")]
        public string? DO_Ref { get; set; }

        [JsonPropertyName("dE_No")]
        public int? DE_No { get; set; }

        [JsonPropertyName("dO_Date")]
        public DateTime? DO_Date { get; set; }

        [JsonPropertyName("dO_TotalHT")]
        public decimal? DO_TotalHT { get; set; }

        [JsonPropertyName("dO_TotalTTC")]
        public decimal? DO_TotalTTC { get; set; }

        [JsonPropertyName("dO_NetAPayer")]
        public decimal? DO_NetAPayer { get; set; }

        [JsonPropertyName("totalBeforeDiscount")]
        public decimal? TotalBeforeDiscount { get; set; }

        [JsonPropertyName("b2BDiscountRate")]
        public decimal? B2BDiscountRate { get; set; }

        [JsonPropertyName("b2BDiscountAmount")]
        public decimal? B2BDiscountAmount { get; set; }

        [JsonPropertyName("discountSource")]
        public string? DiscountSource { get; set; }

        [JsonPropertyName("dO_Valide")]
        public short? DO_Valide { get; set; }

        [JsonPropertyName("statusLabel")]
        public string? StatusLabel { get; set; }

        // ✅ pour la liste (colonne Client)
        [JsonPropertyName("clientType")]
        public string? ClientType { get; set; }

        [JsonPropertyName("clientDisplay")]
        public string? ClientDisplay { get; set; }

        // ✅ détail
        [JsonPropertyName("client")]
        public ConfirmateurClientDto? Client { get; set; }

        [JsonPropertyName("lignes")]
        public List<ConfirmateurOrderLineDto> Lignes { get; set; } = new();
    }
}
