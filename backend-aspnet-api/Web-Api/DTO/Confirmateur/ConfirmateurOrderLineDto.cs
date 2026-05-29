using System.Text.Json.Serialization;

namespace Web_Api.DTO.Confirmateur
{
    public class ConfirmateurOrderLineDto
    {
        // ✅ Force "ar_Ref" (sinon ASP.NET renvoie "aR_Ref")
        [JsonPropertyName("ar_Ref")]
        public string? AR_Ref { get; set; }

        [JsonPropertyName("dL_Design")]
        public string? DL_Design { get; set; }

        [JsonPropertyName("dL_Qte")]
        public decimal? DL_Qte { get; set; }

        [JsonPropertyName("dL_PrixUnitaire")]
        public decimal? DL_PrixUnitaire { get; set; }

        [JsonPropertyName("dL_MontantHT")]
        public decimal? DL_MontantHT { get; set; }

        [JsonPropertyName("dL_MontantTTC")]
        public decimal? DL_MontantTTC { get; set; }

        // B.1 — Image principale de l'article (Cloudinary), peuplée depuis
        // F_ARTICLE_IMAGE pour le rendu cart "style Converty".
        [JsonPropertyName("imageUrl")]
        public string? ImageUrl { get; set; }
    }
}
