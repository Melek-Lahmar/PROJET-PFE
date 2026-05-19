namespace Web_Api.DTO.Reclamations
{
    /// <summary>
    /// Décision de la confirmatrice face à un colis endommagé signalé par
    /// le livreur (motif COLIS_ENDOMMAGE_DEPOT).
    ///
    /// Valeurs de Decision :
    /// - ECHANGE        : si du stock est disponible, on relance la commande
    ///                    (DO_Valide = Confirme) pour réémission au livreur.
    /// - RETOUR_APPEL   : pas de stock disponible, la commande est marquée
    ///                    en RETOUR et le client doit être rappelé.
    /// </summary>
    public class DecideDepotDamagedRequestDto
    {
        public string Decision { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    /// <summary>
    /// Réponse de l'endpoint stock-check pour COLIS_ENDOMMAGE_DEPOT :
    /// indique les articles manquants par référence + quantité.
    /// </summary>
    public class StockShortageDto
    {
        public string ArRef { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public decimal RequiredQty { get; set; }
        public decimal AvailableQty { get; set; }
    }

    public class StockAvailabilityCheckDto
    {
        public bool AllAvailable { get; set; }
        public List<StockShortageDto> Shortages { get; set; } = new();
    }
}
