using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Avis
{
    public class AvisPendingDto
    {
        public string CommandePiece { get; set; } = string.Empty;
        public DateTime? DeliveredAt { get; set; }
        public DateTime? LastPromptAt { get; set; }
        public int PromptCount { get; set; }
    }

    public class SubmitAvisRequestDto
    {
        [Required]
        [StringLength(13)]
        public string CommandePiece { get; set; } = string.Empty;

        [Required]
        [Range(1, 5)]
        public int Note { get; set; }

        [StringLength(500)]
        public string? Commentaire { get; set; }
    }

    public class AvisDto
    {
        public int Id { get; set; }
        public string CommandePiece { get; set; } = string.Empty;
        public int Note { get; set; }
        public string? Commentaire { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
