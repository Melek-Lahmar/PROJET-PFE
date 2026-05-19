using System.Text.Json.Serialization;

namespace Web_Api.DTO
{
    public class ArticleSageDto
    {


        [JsonPropertyName("aR_Ref")]
        public string AR_Ref { get; set; } = null!;

        [JsonPropertyName("aR_Design")]
        public string AR_Design { get; set; } = null!;

        [JsonPropertyName("fA_CodeFamille")]
        public string FA_CodeFamille { get; set; } = null!;

        [JsonPropertyName("aR_UniteVen")]
        public short AR_UniteVen { get; set; }

        [JsonPropertyName("aR_PrixVen")]
        public decimal AR_PrixVen { get; set; }

        [JsonPropertyName("aR_PrixTTC")]
        public short AR_PrixTTC { get; set; }

        [JsonPropertyName("aR_SuiviStock")]
        public short AR_SuiviStock { get; set; }

        [JsonPropertyName("aR_Sommeil")]
        public short AR_Sommeil { get; set; }

        [JsonPropertyName("aR_CodeBarre")]
        public string AR_CodeBarre { get; set; } = null!;

        [JsonPropertyName("aR_Publie")]
        public short AR_Publie { get; set; }

        [JsonPropertyName("cL_No1")]
        public int CL_No1 { get; set; }

        [JsonPropertyName("cL_No2")]
        public int CL_No2 { get; set; }

        [JsonPropertyName("cL_No3")]
        public int CL_No3 { get; set; }

        [JsonPropertyName("cL_No4")]
        public int CL_No4 { get; set; }

        [JsonPropertyName("aR_Type")]
        public short AR_Type { get; set; }
    }
}