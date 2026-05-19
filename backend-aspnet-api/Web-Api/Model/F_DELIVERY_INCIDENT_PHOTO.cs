using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DELIVERY_INCIDENT_PHOTO")]
    public class F_DELIVERY_INCIDENT_PHOTO
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        [Required, StringLength(20)] public string DoPiece { get; set; } = string.Empty;
        public Guid LivreurUserId { get; set; }
        [Required, StringLength(500)] public string CloudinaryUrl { get; set; } = string.Empty;
        [Required, StringLength(200)] public string CloudinaryPublicId { get; set; } = string.Empty;
        public int PhotoOrder { get; set; }
        [StringLength(1000)] public string? Comment { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
