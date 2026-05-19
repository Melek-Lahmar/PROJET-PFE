using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_TRANSFERT_AUDIT_LOG")]
    public class F_TRANSFERT_AUDIT_LOG
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TransfertId { get; set; }
        [Required, StringLength(50)] public string ActionType { get; set; } = string.Empty;
        public Guid? ActorUserId { get; set; }
        public string? SnapshotBefore { get; set; }
        public string? SnapshotAfter { get; set; }
        [StringLength(500)] public string? Motif { get; set; }
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    }
}
