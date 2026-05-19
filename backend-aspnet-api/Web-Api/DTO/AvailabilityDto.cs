namespace Web_Api.DTOs
{
    public sealed class AvailabilityDto
    {
        public int dE_No { get; set; }
        public string dE_Code { get; set; } = string.Empty;
        public string dE_Intitule { get; set; } = string.Empty;

        public decimal aS_QteSto { get; set; }
        public decimal aS_QteRes { get; set; }

        // quantité réellement dispo
        public decimal dispo => aS_QteSto - aS_QteRes;

        // statut calculé
        public string statut { get; set; } = "Commande 48h";
    }
}


