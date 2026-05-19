using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_CATALOGUE")]
    public class F_CATALOGUE
    {
        [Key] // ← Ajouter cette annotation
        public int cbMarq { get; set; }

        public string CL_Intitule { get; set; } = null!;
        public string CL_Code { get; set; } = null!;
        public short CL_Stock { get; set; }
        public int CL_NoParent { get; set; }
        public short CL_Niveau { get; set; }
        public int CL_No { get; set; }
    }
}