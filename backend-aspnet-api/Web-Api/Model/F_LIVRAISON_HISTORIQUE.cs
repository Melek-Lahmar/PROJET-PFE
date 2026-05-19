using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 1.3 — historique des passages d'une livraison.
    /// Tracé à chaque transition métier (Reporté, Retourné, Livré, Démarré,
    /// passage Dépôt N), exploité par :
    ///  - le bloc Tentatives confirmatrice (Section 2.5.2)
    ///  - le bloc Historique livreur (Section 1.3.2)
    ///  - le job DepotIncrementJob pour le backfill et la cohérence
    /// </summary>
    [Table("F_LIVRAISON_HISTORIQUE")]
    public class F_LIVRAISON_HISTORIQUE
    {
        [Key]
        public long Id { get; set; }

        [Required]
        [StringLength(13)]
        public string DoPiece { get; set; } = string.Empty;

        public Guid? LivreurUserId { get; set; }
        public int? LivreurProfileId { get; set; }

        [Required]
        [StringLength(30)]
        public string Type { get; set; } = string.Empty;
        // Type ∈ { ASSIGN, START_DELIVERY, ACTIVE_DELIVERY_START,
        //         ACTIVE_DELIVERY_STOP, REPORTE, LIVRE, RETOUR,
        //         DEPOT_INCREMENT, ENCAISSE, REMIS_DEPOT }

        [StringLength(50)]
        public string? Motif { get; set; }

        [StringLength(500)]
        public string? Note { get; set; }

        [StringLength(500)]
        public string? PhotoUrl { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Longitude { get; set; }

        public int? DepotPassageNumber { get; set; }

        [Column(TypeName = "decimal(18,3)")]
        public decimal? Montant { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
