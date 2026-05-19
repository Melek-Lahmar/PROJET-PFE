using System.Text.Json.Serialization;

namespace Web_Api.DTO
{
    public class DepotSageDto
    {
        [JsonPropertyName("dE_No")]
        public int DE_No { get; set; }

        [JsonPropertyName("dE_Code")]
        public string DE_Code { get; set; } = null!;

        [JsonPropertyName("dE_Intitule")]
        public string DE_Intitule { get; set; } = null!;

        [JsonPropertyName("dE_Adresse")]
        public string DE_Adresse { get; set; } = null!;

        [JsonPropertyName("dE_Complement")]
        public string DE_Complement { get; set; } = null!;

        [JsonPropertyName("dE_CodePostal")]
        public string DE_CodePostal { get; set; } = null!;

        [JsonPropertyName("dE_Ville")]
        public string DE_Ville { get; set; } = null!;

        [JsonPropertyName("dE_Pays")]
        public string DE_Pays { get; set; } = null!;

        [JsonPropertyName("dE_Principal")]
        public short DE_Principal { get; set; }

        [JsonPropertyName("dE_Type")]
        public string DE_Type { get; set; } = null!;

        [JsonPropertyName("dE_CodeSociete")]
        public string DE_CodeSociete { get; set; } = null!;

        [JsonPropertyName("dE_Banque")]
        public string DE_Banque { get; set; } = null!;
    }
}