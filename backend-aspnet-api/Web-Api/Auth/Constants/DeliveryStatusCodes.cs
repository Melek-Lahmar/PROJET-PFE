namespace Web_Api.Constants
{
    public static class DeliveryStatusCodes
    {
        public const short Confirme = 0;
        public const short EnLivraison = 1;
        public const short Livre = 2;
        public const short Retour = 3;
        public const short Depot = 4;
        public const short Reporte = 5;

        // Sous-statuts dépôt visibles UNIQUEMENT par le livreur. Le client
        // les voit tous comme "AU DÉPÔT" (mapping côté UI). Le livreur
        // distingue les colis en préparation au dépôt (qu'il vient de
        // prendre) et ceux marqués prêts à partir.
        public const short DepotEnCoursDePreparation = 6;
        public const short DepotPret = 7;
    }
}