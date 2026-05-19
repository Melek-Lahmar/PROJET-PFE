using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DEPOT_ZONE")]
    public class F_DEPOT_ZONE
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public int DepotNo { get; set; }
        [Required, StringLength(50)] public string Gouvernorat { get; set; } = string.Empty;
        [Required, StringLength(100)] public string Delegation { get; set; } = string.Empty;
        public bool IsPrimary { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
