using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DEPOT")]
    public class F_DEPOT
    {
        [Key]
        public int cbMarq { get; set; }

        [Required]
        public int DE_No { get; set; }

        [StringLength(9)]
        public string? DE_Code { get; set; }

        [StringLength(35)]
        public string? DE_Intitule { get; set; }

        [StringLength(35)]
        public string? DE_Adresse { get; set; }

        [StringLength(35)]
        public string? DE_Complement { get; set; }

        [StringLength(9)]
        public string? DE_CodePostal { get; set; }

        [StringLength(35)]
        public string? DE_Ville { get; set; }

        [StringLength(3)]
        public string? DE_Pays { get; set; }

        public short? DE_Principal { get; set; }

        [StringLength(10)]
        public string? DE_CodeSociete { get; set; }

        [StringLength(20)]
        public string? DE_Banque { get; set; }
    }
}