using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("CMS_HOMEPAGE")]
    public class CMS_HOMEPAGE
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Scope { get; set; } = "DEFAULT";

        public string DraftJson { get; set; } = "{}";

        public string? PublishedJson { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public DateTime? PublishedAt { get; set; }

        public Guid? UpdatedByUserId { get; set; }

        public Guid? PublishedByUserId { get; set; }
    }
}