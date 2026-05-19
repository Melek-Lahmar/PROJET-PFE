namespace Web_Api.DTO.Reclamations
{
    /// <summary>
    /// Vue livreur : état d'escalade d'une commande côté support.
    /// Utilisé par l'app livreur pour afficher le bandeau persistant
    /// "Cas remonté au support" après 3 tentatives.
    /// </summary>
    public class OrderEscalationStatusDto
    {
        public string DoPiece { get; set; } = string.Empty;

        /// <summary>Nombre de jours distincts avec une tentative différée pour ce livreur sur cette commande.</summary>
        public int TentativesCount { get; set; }

        /// <summary>Seuil de déclenchement (= 3 en V1).</summary>
        public int Threshold { get; set; }

        /// <summary>True si <c>TentativesCount &gt;= Threshold</c> ET une Demande ouverte existe.</summary>
        public bool IsEscalated { get; set; }

        /// <summary>ID de la Demande ouverte liée à cette escalade (null si aucune).</summary>
        public int? OpenDemandeId { get; set; }

        /// <summary>Statut de la Demande ouverte (si elle existe).</summary>
        public string? OpenDemandeStatut { get; set; }

        /// <summary>Motif de la Demande ouverte (si elle existe).</summary>
        public string? OpenDemandeMotif { get; set; }
    }
}
