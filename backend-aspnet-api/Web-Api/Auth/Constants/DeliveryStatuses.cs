namespace Web_Api.Constants
{
    public static class DeliveryStatuses
    {
        public const string EnAttente = "EN_ATTENTE";
        public const string Confirme = "CONFIRME";

        public const string EnLivraison = "EN_LIVRAISON";
        public const string Livre = "LIVRE";
        public const string Retour = "RETOUR";
        public const string Depot = "DEPOT";
        public const string Reporte = "REPORTE";

        public const string Tentative = "TENTATIVE";
        public const string Refuse = "REFUSE";

        // Sous-statuts dépôt côté livreur — voir DeliveryStatusCodes.
        public const string DepotEnCoursDePreparation = "DEPOT_EN_COURS_DE_PREPARATION";
        public const string DepotPret = "DEPOT_PRET";
    }
}