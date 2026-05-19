using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// A.2 — Trace les sessions actives (connexion SignalR) des confirmatrices
    /// pour pouvoir calculer le temps de travail vs temps de pause sur une
    /// période donnée. Une ligne par session : StartedAt à la connexion,
    /// EndedAt rempli à la déconnexion (null si toujours connectée).
    /// </summary>
    [Table("F_CONFIRMATRICE_SESSION")]
    public class F_CONFIRMATRICE_SESSION
    {
        [Key]
        public long Id { get; set; }

        [Required]
        public Guid ConfirmatriceId { get; set; }

        [Required]
        public DateTime StartedAt { get; set; }

        public DateTime? EndedAt { get; set; }

        /// <summary>
        /// "manual_pause" | "disconnected" | "logout"
        /// </summary>
        [StringLength(20)]
        public string? EndReason { get; set; }
    }
}
