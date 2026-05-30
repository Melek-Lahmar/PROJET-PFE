using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_ARTICLE")]
    public class F_ARTICLE
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // ← Important
        public int cbMarq { get; set; }

        public string AR_Ref { get; set; } = null!;
        public string AR_Design { get; set; } = null!;
        public string? AR_Description { get; set; }
        public string FA_CodeFamille { get; set; } = null!;
        public short AR_UniteVen { get; set; }
        public decimal AR_PrixVen { get; set; }
        public short AR_PrixTTC { get; set; }
        public short AR_SuiviStock { get; set; }
        public short AR_Sommeil { get; set; }

        [NotMapped] // Si vous voulez gérer séparément en mémoire
        public List<string>? ImageArt { get; set; } = new List<string>();

        public string AR_CodeBarre { get; set; } = null!;
        public short AR_Publie { get; set; }
        public int CL_No1 { get; set; }
        public int CL_No2 { get; set; }
        public int CL_No3 { get; set; }
        public int CL_No4 { get; set; }
        public short AR_Type { get; set; }
    }
}
