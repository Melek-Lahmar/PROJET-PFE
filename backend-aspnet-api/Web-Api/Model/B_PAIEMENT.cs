using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MODELS_CREATEUR.MODELS_SAGE
{
    [Table("B_PAIEMENT")]
    public class B_PAIEMENT
    {
        public const short MODE_ONLINE = 1;

        public const short STATUS_INITIE = 0;
        public const short STATUS_EN_ATTENTE = 1;
        public const short STATUS_SUCCES = 2;
        public const short STATUS_ECHEC = 3;
        public const short STATUS_ANNULE = 4;
        public const short STATUS_EXPIRE = 5;

        public const string TYPE_ONLINE = "ONLINE";
        public const string FOURNISSEUR_KONNECT = "KONNECT";
        public const string FOURNISSEUR_MOCK = "MOCK";
        public const string FOURNISSEUR_VIRTUAL = "VIRTUAL";

        [Key]
        public int cbMarq { get; set; }

        [Required]
        [StringLength(13)]
        public string DO_Piece { get; set; } = null!;

        public short PA_Mode { get; set; }

        [Required]
        [StringLength(20)]
        public string PA_Type { get; set; } = null!;

        public short PA_Statut { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal PA_Montant { get; set; }

        public DateTime? PA_Date { get; set; }

        [StringLength(50)]
        public string? PA_Reference { get; set; }

        [StringLength(20)]
        public string? PA_Fournisseur { get; set; }

        [StringLength(50)]
        public string? PA_ProviderPaymentId { get; set; }

        [StringLength(30)]
        public string? PA_StatutExterne { get; set; }

        public bool PA_IsSandbox { get; set; }

        public DateTime cbCreation { get; set; }
        public DateTime? cbModification { get; set; }

        [NotMapped]
        public bool IsTerminalStatus =>
            PA_Statut == STATUS_SUCCES ||
            PA_Statut == STATUS_ECHEC ||
            PA_Statut == STATUS_ANNULE ||
            PA_Statut == STATUS_EXPIRE;

        [NotMapped]
        public string LocalStatusLabel => PA_Statut switch
        {
            STATUS_INITIE => "INITIE",
            STATUS_EN_ATTENTE => "EN_ATTENTE",
            STATUS_SUCCES => "SUCCES",
            STATUS_ECHEC => "ECHEC",
            STATUS_ANNULE => "ANNULE",
            STATUS_EXPIRE => "EXPIRE",
            _ => "INCONNU"
        };
    }
}
