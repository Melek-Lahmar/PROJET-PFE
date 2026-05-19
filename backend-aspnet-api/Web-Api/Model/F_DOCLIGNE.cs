using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DOCLIGNE")]
    public class F_DOCLIGNE
    {
        [Key]
        public int cbMarq { get; set; }

        public short? DO_Domaine { get; set; }
        public short? DO_Type { get; set; }

        [StringLength(13)]
        public string? DO_Piece { get; set; }

        public DateTime? DO_Date { get; set; }

        [StringLength(17)]
        public string? CT_Num { get; set; }

        [StringLength(19)]
        public string? AR_Ref { get; set; }

        [StringLength(69)]
        public string? DL_Design { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DL_Qte { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DL_PrixUnitaire { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DL_MontantHT { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DL_MontantTTC { get; set; }

        public DateTime? cbCreation { get; set; }
        public DateTime? cbModification { get; set; }

        /// <summary>
        /// Pour les commandes d'échange : STANDARD (commande normale), RETOUR (article à récupérer),
        /// LIVRAISON (article à livrer en remplacement).
        /// </summary>
        [StringLength(20)]
        public string LigneType { get; set; } = "STANDARD";
    }

    public static class LigneTypes
    {
        public const string STANDARD = "STANDARD";
        public const string RETOUR = "RETOUR";
        public const string LIVRAISON = "LIVRAISON";
    }
}
