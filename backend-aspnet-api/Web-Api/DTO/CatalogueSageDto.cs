using System.Text.Json.Serialization;

namespace Web_Api.DTO
{
    public class CatalogueSageDto
    {
        [JsonPropertyName("cL_Intitule")]
        public string CL_Intitule { get; set; } = null!;

        [JsonPropertyName("cL_Code")]
        public string CL_Code { get; set; } = null!;

        [JsonPropertyName("cL_Stock")]
        public short CL_Stock { get; set; }

        [JsonPropertyName("cL_NoParent")]
        public int CL_NoParent { get; set; }

        [JsonPropertyName("cL_Niveau")]
        public short CL_Niveau { get; set; }

        [JsonPropertyName("cL_No")]
        public int CL_No { get; set; }
    }
}