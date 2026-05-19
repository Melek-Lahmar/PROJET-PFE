using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_RECLAMATION_TENTATIVE")]
    public class F_RECLAMATION_TENTATIVE
    {
        [Key]
        public int Id { get; set; }

        public int? ReclamationId { get; set; }

        [Required]
        [StringLength(13)]
        public string CommandePiece { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "date")]
        public DateTime DateJour { get; set; }

        [Required]
        [StringLength(50)]
        public string Motif { get; set; } = string.Empty;

        public Guid LivreurUserId { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Longitude { get; set; }

        [StringLength(500)]
        public string? PhotoUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
