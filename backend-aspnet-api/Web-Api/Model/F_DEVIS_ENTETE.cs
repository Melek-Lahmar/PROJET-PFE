using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DEVIS_ENTETE")]
    public class F_DEVIS_ENTETE
    {
        public const string STATUS_BROUILLON = "BROUILLON";
        public const string STATUS_SOUMIS = "SOUMIS";
        public const string STATUS_EN_ETUDE = "EN_ETUDE";
        public const string STATUS_INFO_MANQUANTE = "INFO_MANQUANTE";
        public const string STATUS_REPONSE_CLIENT = "REPONSE_CLIENT";
        public const string STATUS_MODIFIE = "MODIFIE";
        public const string STATUS_VALIDE = "VALIDE";
        public const string STATUS_ENVOYE_CLIENT = "ENVOYE_CLIENT";
        public const string STATUS_ACCEPTE_CLIENT = "ACCEPTE_CLIENT";
        public const string STATUS_REFUSE_CLIENT = "REFUSE_CLIENT";
        public const string STATUS_EXPIRE = "EXPIRE";
        public const string STATUS_CONVERTI_BC = "CONVERTI_BC";
        public const string STATUS_ANNULE = "ANNULE";

        public int Id { get; set; }

        [StringLength(20)]
        public string DevisPiece { get; set; } = string.Empty;

        public Guid ClientUserId { get; set; }

        [StringLength(17)]
        public string? ClientCode { get; set; }

        [StringLength(10)]
        public string ClientType { get; set; } = "B2B";

        [StringLength(30)]
        public string StatusKey { get; set; } = STATUS_SOUMIS;

        [Column(TypeName = "decimal(24,13)")]
        public decimal TotalHT { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? DiscountPercentSnapshot { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal DiscountAmount { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal TotalHTNet { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal TotalTTC { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal NetAPayer { get; set; }

        public DateTime? ValidUntil { get; set; }

        public Guid? AssignedConfirmateurId { get; set; }

        [StringLength(13)]
        public string? BcPiece { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public Guid CreatedByUserId { get; set; }

        public int Version { get; set; } = 1;

        public List<F_DEVIS_LIGNE> Lignes { get; set; } = new();

        public List<F_DEVIS_EVENT> Events { get; set; } = new();
    }
}
