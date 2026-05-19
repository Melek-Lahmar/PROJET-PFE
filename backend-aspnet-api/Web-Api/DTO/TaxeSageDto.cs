using System.Text.Json.Serialization;

namespace Web_Api.DTO
{
    public class TaxeSageDto
    {
        [JsonPropertyName("cbMarq")]
        public int cbMarq { get; set; }

        [JsonPropertyName("tX_CODE")]
        public int TX_CODE { get; set; }

        [JsonPropertyName("tX_LIBELLE")]
        public string TX_LIBELLE { get; set; } = null!;

        [JsonPropertyName("tX_TAUX")]
        public decimal TX_TAUX { get; set; }

        [JsonPropertyName("tX_Type")]
        public short TX_Type { get; set; }

        [JsonPropertyName("tX_Compte")]
        public string TX_Compte { get; set; } = null!;
    }
}