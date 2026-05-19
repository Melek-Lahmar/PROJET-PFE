using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_SUPERVISOR_ALERT")]
    public class F_SUPERVISOR_ALERT
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        [Required, StringLength(10)] public string Severity { get; set; } = "INFO";
        [Required, StringLength(50)] public string AlertType { get; set; } = string.Empty;
        public Guid? RelatedTransfertId { get; set; }
        [Required, StringLength(500)] public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Guid? AcknowledgedByUserId { get; set; }
        public DateTime? AcknowledgedAt { get; set; }
    }
}
