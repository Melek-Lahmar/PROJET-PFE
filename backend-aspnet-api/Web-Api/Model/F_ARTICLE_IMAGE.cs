using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_ARTICLE_IMAGE")]
    public class F_ARTICLE_IMAGE
    {
        [Key]
        public int? Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string AR_Ref { get; set; } = null!;

        [MaxLength(500)]
        public string? Url { get; set; }

        [MaxLength(255)]
        public string? CloudinaryPublicId { get; set; }

        public bool? IsMain { get; set; }

        public int? SortOrder { get; set; }

        public DateTime? CreatedAt { get; set; }
    }
}