using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Reclamations
{
    /// <summary>
    /// Payload envoyé par l'app livreur quand il change le statut d'une commande
    /// vers un statut différé (autre que LIVRE/CONFIRME). Le backend l'enregistre
    /// comme une tentative du jour et crée/rattache la demande selon le motif.
    /// </summary>
    public class LivreurTentativeRequestDto
    {
        [Required]
        [StringLength(13)]
        public string DoPiece { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Motif { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }
    }
}
