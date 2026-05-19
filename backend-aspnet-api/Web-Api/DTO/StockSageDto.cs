using System.Text.Json.Serialization;

namespace Web_Api.DTO
{
    public class StockSageDto
    {
        [JsonPropertyName("cbMarq")]
        public int cbMarq { get; set; }

        [JsonPropertyName("aR_Ref")]
        public string AR_Ref { get; set; } = null!;

        [JsonPropertyName("dE_No")]
        public int DE_No { get; set; }

        [JsonPropertyName("aS_QteSto")]
        public decimal AS_QteSto { get; set; }

        [JsonPropertyName("aS_QteRes")]
        public decimal AS_QteRes { get; set; }

        [JsonPropertyName("aS_QteMini")]
        public decimal? AS_QteMini { get; set; }

        [JsonPropertyName("aS_QteMaxi")]
        public decimal? AS_QteMaxi { get; set; }

        [JsonPropertyName("aS_Principal")]
        public short AS_Principal { get; set; }
    }
}