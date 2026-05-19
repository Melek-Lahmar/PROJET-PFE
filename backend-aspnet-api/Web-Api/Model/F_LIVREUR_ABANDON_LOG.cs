using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_LIVREUR_ABANDON_LOG")]
    public class F_LIVREUR_ABANDON_LOG
    {
        [Key]
        public int Id { get; set; }

        public Guid LivreurUserId { get; set; }

        [Required]
        [StringLength(13)]
        public string CommandePiece { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
