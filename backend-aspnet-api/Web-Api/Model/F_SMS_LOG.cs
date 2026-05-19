using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 3.3.4 — journal des SMS pré-livraison envoyés. Permet la traçabilité
    /// pour le client (« on vous a envoyé un SMS le X »).
    /// </summary>
    [Table("F_SMS_LOG")]
    public class F_SMS_LOG
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(13)]
        public string DoPiece { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Message { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(20)]
        public string Provider { get; set; } = "Mock";

        public bool Success { get; set; }

        [StringLength(500)]
        public string? ErrorMessage { get; set; }
    }
}
