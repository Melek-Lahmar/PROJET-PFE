using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_AVIS_COMMANDE")]
    public class F_AVIS_COMMANDE
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(13)]
        public string CommandePiece { get; set; } = string.Empty;

        public Guid ClientUserId { get; set; }

        [Range(1, 5)]
        public int Note { get; set; }

        [StringLength(500)]
        public string? Commentaire { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("F_AVIS_PROMPT_STATE")]
    public class F_AVIS_PROMPT_STATE
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(13)]
        public string CommandePiece { get; set; } = string.Empty;

        public Guid ClientUserId { get; set; }

        public int PromptCount { get; set; }

        public DateTime? LastPromptAt { get; set; }

        public bool Dismissed { get; set; }

        public bool Submitted { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
