using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_RECLAMATION_PHOTO")]
    public class F_RECLAMATION_PHOTO
    {
        [Key]
        public int Id { get; set; }

        public int ReclamationId { get; set; }

        [Required]
        [StringLength(500)]
        public string Url { get; set; } = string.Empty;

        [StringLength(255)]
        public string? FileName { get; set; }

        [StringLength(100)]
        public string? ContentType { get; set; }

        public long? Size { get; set; }

        public Guid? UploadedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
