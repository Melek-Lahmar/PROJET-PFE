using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MODELS_CREATEUR.MODELS_SAGE
{
    [Table("F_TAXE")]
    public class F_TAXE
    {
        [Key]
        public int cbMarq { get; set; }

        public int TX_CODE { get; set; }

        public string TX_LIBELLE { get; set; } = null!;

        public decimal TX_TAUX { get; set; }

        public short TX_Type { get; set; }

        public string TX_Compte { get; set; } = null!;
    }
}
