using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 3.4.3 — dernière position connue d'un livreur (1 ligne par livreur,
    /// écrasée à chaque ping pour éviter le surstockage). PK = LivreurUserId.
    /// </summary>
    [Table("F_LIVREUR_POSITION")]
    public class F_LIVREUR_POSITION
    {
        [Key]
        public Guid LivreurUserId { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal Lat { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal Lng { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal? Accuracy { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsBroadcasting { get; set; }
    }
}
