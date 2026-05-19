using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_LIVREUR_ZONE")]
    public class F_LIVREUR_ZONE
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid LivreurUserId { get; set; }
        [Required, StringLength(50)] public string Gouvernorat { get; set; } = string.Empty;
        [Required, StringLength(100)] public string Delegation { get; set; } = string.Empty;
        public Guid AssignedByUserId { get; set; }
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}
