using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_RECLAMATION")]
    public class F_RECLAMATION
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [StringLength(30)]
        public string CodeReclamation { get; set; } = string.Empty;

        [Required]
        [StringLength(13)]
        public string DoPiece { get; set; } = string.Empty;

        [StringLength(19)]
        public string? ArRef { get; set; }

        public bool IsGlobal { get; set; } = true;

        /// <summary>
        /// Demande livreur visible dans l'espace client (motifs A : adresse / numéro incorrect).
        /// False pour les Réclamations client et pour les Demandes livreur qui remontent
        /// directement à la confirmatrice (motifs B et C après 3 tentatives).
        /// </summary>
        public bool VisibleClient { get; set; } = false;

        public Guid ClientUserId { get; set; }

        public int? ClientProfileId { get; set; }

        public Guid? AssignedToUserId { get; set; }

        public Guid? CreatedByUserId { get; set; }

        [StringLength(30)]
        public string TypeReclamation { get; set; } = "LIVRAISON";

        [Required]
        [StringLength(50)]
        public string Motif { get; set; } = string.Empty;

        [Required]
        [StringLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [StringLength(30)]
        public string Statut { get; set; } = "ENVOYEE";

        [StringLength(20)]
        public string? Priorite { get; set; }

        [Required]
        [StringLength(20)]
        public string Source { get; set; } = "CLIENT";

        [Required]
        [StringLength(20)]
        public string TypeCas { get; set; } = "RECLAMATION";

        [StringLength(500)]
        public string? EchangeDemandeText { get; set; }

        public DateTime? LastClientReplyAt { get; set; }

        [StringLength(2000)]
        public string? CorrectionProposee { get; set; }

        public bool CorrectionAppliquee { get; set; }

        [StringLength(500)]
        public string? MotifRefus { get; set; }

        [StringLength(1000)]
        public string? NoteInterne { get; set; }

        public int TentativesCount { get; set; }

        public DateTime? FirstAttemptAt { get; set; }

        public DateTime? LastAttemptAt { get; set; }

        /// <summary>Phase 7 — Date de reprogrammation demandée par le client (motif REPROGRAMMATION). Contrainte J+1 à J+14.</summary>
        public DateTime? ReprogrammationDate { get; set; }

        /// <summary>Phase 7 — Créneau demandé : MATIN (9-13h) / APRES_MIDI (13-18h) / SOIR (18-20h).</summary>
        [StringLength(20)]
        public string? ReprogrammationCreneau { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ClosedAt { get; set; }

        public DateTime? ResolvedAt { get; set; }

        public ICollection<F_RECLAMATION_PHOTO> Photos { get; set; } = new List<F_RECLAMATION_PHOTO>();

        public ICollection<F_RECLAMATION_TENTATIVE> Tentatives { get; set; } = new List<F_RECLAMATION_TENTATIVE>();
    }
}
