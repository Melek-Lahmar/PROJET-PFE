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

        [JsonPropertyName("tentativeCount")]
        public int TentativeCount { get; set; }

        // Journal des tentatives (qui/quand) — visible sur le détail commande.
        [JsonPropertyName("tentativeLog")]
        public List<ConfirmateurTentativeLogDto> TentativeLog { get; set; } = new();

        [JsonPropertyName("statusLabel")]
        public string? StatusLabel { get; set; }

        // ✅ pour la liste (colonne Client)
        [JsonPropertyName("clientType")]
        public string? ClientType { get; set; }

        [JsonPropertyName("clientDisplay")]
        public string? ClientDisplay { get; set; }

        // ✅ pour la recherche confirmateur (par téléphone)
        [JsonPropertyName("clientPhone")]
        public string? ClientPhone { get; set; }

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

        [JsonPropertyName("dO_ModePaiement")]
        public string? DO_ModePaiement { get; set; }

        [JsonPropertyName("dO_FraisLivraison")]
        public decimal? DO_FraisLivraison { get; set; }

        [JsonPropertyName("dO_TimbreFiscal")]
        public decimal? DO_TimbreFiscal { get; set; }

        [JsonPropertyName("dO_AdresseLivraison")]
        public string? DO_AdresseLivraison { get; set; }

        [JsonPropertyName("dO_VilleLivraison")]
        public string? DO_VilleLivraison { get; set; }

        [JsonPropertyName("dO_CodePostalLivraison")]
        public string? DO_CodePostalLivraison { get; set; }

        [JsonPropertyName("dO_TelephoneLivraison")]
        public string? DO_TelephoneLivraison { get; set; }
    }

    public class ConfirmateurTentativeLogDto
    {
        [JsonPropertyName("actorName")]
        public string? ActorName { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}
