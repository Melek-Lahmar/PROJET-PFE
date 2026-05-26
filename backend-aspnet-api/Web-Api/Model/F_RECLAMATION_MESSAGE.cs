using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_RECLAMATION_MESSAGE")]
    public class F_RECLAMATION_MESSAGE
    {
        [Key]
        public int Id { get; set; }

        public int ReclamationId { get; set; }

        public Guid SenderUserId { get; set; }

        public int? SenderProfileId { get; set; }

        [MaxLength(30)]
        public string SenderRole { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string MessageText { get; set; } = string.Empty;

        [MaxLength(30)]
        public string MessageType { get; set; } = "TEXT";

        [MaxLength(500)]
        public string? MediaUrl { get; set; }

        [MaxLength(255)]
        public string? MediaFileName { get; set; }

        [MaxLength(100)]
        public string? MediaContentType { get; set; }

        public long? MediaSize { get; set; }

        public bool IsInternal { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ReadAt { get; set; }

        [ForeignKey(nameof(ReclamationId))]
        public F_RECLAMATION? Reclamation { get; set; }
    }
}
