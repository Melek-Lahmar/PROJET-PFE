using System.Text.Json.Serialization;

namespace Web_Api.DTO.Livreur
{
    /// <summary>
    /// 2.A — Détail enrichi d'une commande livreur, pour l'écran refondu
    /// "style Converty" (hero + client + cart + historique).
    /// </summary>
    public class LivreurOrderDetailsDto
    {
        [JsonPropertyName("doPiece")]
        public string? DoPiece { get; set; }

        [JsonPropertyName("doTiers")]
        public string? DoTiers { get; set; }

        [JsonPropertyName("doDate")]
        public DateTime? DoDate { get; set; }

        [JsonPropertyName("doType")]
        public short DoType { get; set; }

        [JsonPropertyName("statusCode")]
        public short? StatusCode { get; set; }

        [JsonPropertyName("statusLabel")]
        public string? StatusLabel { get; set; }

        [JsonPropertyName("netAPayer")]
        public decimal? NetAPayer { get; set; }

        [JsonPropertyName("totalTTC")]
        public decimal? TotalTTC { get; set; }

        [JsonPropertyName("totalHT")]
        public decimal? TotalHT { get; set; }

        [JsonPropertyName("fraisLivraison")]
        public decimal? FraisLivraison { get; set; }

        [JsonPropertyName("timbreFiscal")]
        public decimal? TimbreFiscal { get; set; }

        [JsonPropertyName("modePaiement")]
        public string? ModePaiement { get; set; }

        [JsonPropertyName("modeLivraison")]
        public string? ModeLivraison { get; set; }

        [JsonPropertyName("adresse")]
        public string? Adresse { get; set; }

        [JsonPropertyName("ville")]
        public string? Ville { get; set; }

        [JsonPropertyName("codePostal")]
        public string? CodePostal { get; set; }

        [JsonPropertyName("noteClient")]
        public string? NoteClient { get; set; }

        // Report partiel (même journée). Quand non null, la commande est
        // « en attente » dans l'UI livreur jusqu'à cet instant.
        [JsonPropertyName("heureSouhaitee")]
        public DateTime? HeureSouhaitee { get; set; }

        [JsonPropertyName("client")]
        public LivreurOrderClientDto? Client { get; set; }

        [JsonPropertyName("lignes")]
        public List<LivreurOrderLineDto> Lignes { get; set; } = new();

        [JsonPropertyName("history")]
        public List<LivreurOrderHistoryDto> History { get; set; } = new();
    }

    public class LivreurOrderClientDto
    {
        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("displayNameArabe")]
        public string? DisplayNameArabe { get; set; }

        [JsonPropertyName("telephone")]
        public string? Telephone { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("adresse")]
        public string? Adresse { get; set; }

        [JsonPropertyName("ville")]
        public string? Ville { get; set; }

        [JsonPropertyName("gouvernorat")]
        public string? Gouvernorat { get; set; }

        [JsonPropertyName("delegation")]
        public string? Delegation { get; set; }
    }

    public class LivreurOrderLineDto
    {
        [JsonPropertyName("arRef")]
        public string? ArRef { get; set; }

        [JsonPropertyName("designation")]
        public string? Designation { get; set; }

        [JsonPropertyName("quantite")]
        public decimal? Quantite { get; set; }

        [JsonPropertyName("prixUnitaire")]
        public decimal? PrixUnitaire { get; set; }

        [JsonPropertyName("montantTTC")]
        public decimal? MontantTTC { get; set; }

        [JsonPropertyName("imageUrl")]
        public string? ImageUrl { get; set; }
    }

    public class LivreurOrderHistoryDto
    {
        [JsonPropertyName("at")]
        public DateTime At { get; set; }

        [JsonPropertyName("statusCode")]
        public short StatusCode { get; set; }

        [JsonPropertyName("statusLabel")]
        public string? StatusLabel { get; set; }

        [JsonPropertyName("updatedBy")]
        public string? UpdatedBy { get; set; }

        [JsonPropertyName("motif")]
        public string? Motif { get; set; }

        [JsonPropertyName("note")]
        public string? Note { get; set; }
    }
}
