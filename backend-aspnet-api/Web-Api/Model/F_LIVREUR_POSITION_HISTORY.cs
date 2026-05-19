using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 1.4 — historique des positions GPS des livreurs.
    /// Une ligne par ping, asynchrone (le livreur peut être hors ligne et
    /// envoyer un batch après reconnexion). ClientActionId UNIQUE permet
    /// l'idempotence du flush.
    /// </summary>
    [Table("F_LIVREUR_POSITION_HISTORY")]
    public class F_LIVREUR_POSITION_HISTORY
    {
        [Key]
        public long Id { get; set; }

        public Guid LivreurId { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal Lat { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal Lng { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal? Accuracy { get; set; }

        public DateTime CapturedAt { get; set; }
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        public Guid? ClientActionId { get; set; }
    }
}
