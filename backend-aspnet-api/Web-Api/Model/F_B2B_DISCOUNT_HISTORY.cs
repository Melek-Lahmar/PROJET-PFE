using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Module 4 (Master Prompt) — Historique des changements de remise B2B
    /// d'un client. Chaque PATCH /api/admin/clients/{id}/discount produit une ligne.
    /// </summary>
    [Table("F_B2B_DISCOUNT_HISTORY")]
    public class F_B2B_DISCOUNT_HISTORY
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ClientUserId { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? OldValue { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? NewValue { get; set; }

        public Guid ChangedByAdminId { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(300)]
        public string? Reason { get; set; }
    }
}
