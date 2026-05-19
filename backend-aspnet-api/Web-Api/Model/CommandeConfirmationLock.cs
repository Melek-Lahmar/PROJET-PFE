using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Phase 4 — Verrou visuel 15 min pour le mécanisme A (pool FIFO des commandes à confirmer).
    /// Une ligne = une commande ouverte par une confirmatrice. La clé primaire est DoPiece
    /// (un verrou unique par commande à un instant donné). Les autres confirmatrices voient
    /// la commande "grisée / en cours de traitement" tant que le verrou est valide.
    /// Expiration figée : 15 minutes. Libéré explicitement via /unlock ou transform-to-bl,
    /// ou implicitement au prochain appel qui le détecte stale.
    /// </summary>
    [Table("CommandeConfirmationLocks")]
    public class CommandeConfirmationLock
    {
        [Key]
        [MaxLength(13)]
        public string DoPiece { get; set; } = string.Empty;

        public Guid LockedByUserId { get; set; }

        public DateTime LockedAt { get; set; }
    }
}
