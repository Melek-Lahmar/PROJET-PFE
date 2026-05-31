using System.Text.Json.Serialization;

namespace Web_Api.DTO.Confirmateur
{
    public class ConfirmateurOrderDto
    {
        [JsonPropertyName("dO_Piece")]
        public string? DO_Piece { get; set; }

        [JsonPropertyName("dO_Tiers")]
        public string? DO_Tiers { get; set; }

        [JsonPropertyName("dO_Date")]
        public DateTime? DO_Date { get; set; }

        [JsonPropertyName("dO_TotalHT")]
        public decimal? DO_TotalHT { get; set; }

        [JsonPropertyName("dO_TotalTTC")]
        public decimal? DO_TotalTTC { get; set; }

        [JsonPropertyName("dO_NetAPayer")]
        public decimal? DO_NetAPayer { get; set; }

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

        // Champs livraison (passager / commande invitée)
        [JsonPropertyName("dO_PassagerGouvernorat")]
        public string? DO_PassagerGouvernorat { get; set; }

        [JsonPropertyName("dO_PassagerDelegation")]
        public string? DO_PassagerDelegation { get; set; }

        [JsonPropertyName("dO_LatitudeLivraison")]
        public string? DO_LatitudeLivraison { get; set; }

        [JsonPropertyName("dO_LongitudeLivraison")]
        public string? DO_LongitudeLivraison { get; set; }

        [JsonPropertyName("dO_ModeLivraison")]
        public string? DO_ModeLivraison { get; set; }

        [JsonPropertyName("dO_AdresseLivraison")]
        public string? DO_AdresseLivraison { get; set; }

        [JsonPropertyName("dO_VilleLivraison")]
        public string? DO_VilleLivraison { get; set; }

        [JsonPropertyName("dO_CodePostalLivraison")]
        public string? DO_CodePostalLivraison { get; set; }

        [JsonPropertyName("dO_TelephoneLivraison")]
        public string? DO_TelephoneLivraison { get; set; }
    }
}