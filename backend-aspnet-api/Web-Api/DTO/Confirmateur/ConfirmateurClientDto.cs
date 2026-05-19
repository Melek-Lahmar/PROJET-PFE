using System.Text.Json.Serialization;

namespace Web_Api.DTO.Confirmateur
{
    public class ConfirmateurClientDto
    {
        [JsonPropertyName("typeClient")]
        public string? TypeClient { get; set; } // "B2C" | "B2B"

        [JsonPropertyName("utilisateurId")]
        public string? UtilisateurId { get; set; }

        [JsonPropertyName("telephone")]
        public string? Telephone { get; set; }

        // ✅ B2C
        [JsonPropertyName("nomComplet")]
        public string? NomComplet { get; set; }

        [JsonPropertyName("cin")]
        public string? Cin { get; set; }

        // ✅ B2B
        [JsonPropertyName("nomSociete")]
        public string? NomSociete { get; set; }

        [JsonPropertyName("matriculeFiscal")]
        public string? MatriculeFiscal { get; set; }

        // ✅ Localisation
        [JsonPropertyName("gouvernorat")]
        public string? Gouvernorat { get; set; }

        [JsonPropertyName("delegation")]
        public string? Delegation { get; set; }

        [JsonPropertyName("codePostal")]
        public string? CodePostal { get; set; }

        [JsonPropertyName("adresse")]
        public string? Adresse { get; set; }

        [JsonPropertyName("adresseComplementaire")]
        public string? AdresseComplementaire { get; set; }

        // ✅ B2B extra
        [JsonPropertyName("numeroTVA")]
        public string? NumeroTVA { get; set; }

        [JsonPropertyName("remise")]
        public int? Remise { get; set; }

        [JsonPropertyName("plafondCredit")]
        public decimal? PlafondCredit { get; set; }
    }
}