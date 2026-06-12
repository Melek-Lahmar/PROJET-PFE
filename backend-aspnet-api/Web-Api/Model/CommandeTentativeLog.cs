using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Journal des tentatives de confirmation d'un bon de commande.
    /// Chaque incrément du compteur de tentatives (bouton « Tentative » / « +1 »)
    /// crée une ligne : QUI (confirmatrice) et QUAND. Permet aux autres
    /// confirmatrices de voir qu'une tentative a déjà été faite, par qui et à quel moment.
    /// Partagé entre web (React) et mobile (Flutter).
    /// </summary>
    [Table("CommandeTentativeLogs")]
    public class CommandeTentativeLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(13)]
        public string DoPiece { get; set; } = string.Empty;

        public Guid? ActorUserId { get; set; }

        [MaxLength(150)]
        public string? ActorName { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
