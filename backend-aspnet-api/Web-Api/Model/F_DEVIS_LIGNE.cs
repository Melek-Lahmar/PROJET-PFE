using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DEVIS_LIGNE")]
    public class F_DEVIS_LIGNE
    {
        public int Id { get; set; }

        public int DevisId { get; set; }

        public F_DEVIS_ENTETE? Devis { get; set; }

        [StringLength(50)]
        public string ArticleRef { get; set; } = string.Empty;

        [StringLength(200)]
        public string? Designation { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal Qty { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal UnitPriceHT { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? DiscountLinePercent { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal AmountHT { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal AmountTTC { get; set; }

        public int SortOrder { get; set; }
    }
}
