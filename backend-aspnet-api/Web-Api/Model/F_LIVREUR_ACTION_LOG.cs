using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 1.7.5 — Idempotence des actions livreur.
    /// Stocke chaque ClientActionId envoyé par l'app Flutter pour rejeter
    /// les replays après un retry depuis la queue offline (mode dégradé).
    /// </summary>
    [Table("F_LIVREUR_ACTION_LOG")]
    public class F_LIVREUR_ACTION_LOG
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ClientActionId { get; set; }

        public Guid LivreurUserId { get; set; }

        [Required]
        [StringLength(255)]
        public string Endpoint { get; set; } = string.Empty;

        [Required]
        [StringLength(64)]
        public string PayloadHash { get; set; } = string.Empty;

        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

        public int HttpResponse { get; set; }
    }
}
