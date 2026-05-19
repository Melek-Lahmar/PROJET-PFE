using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Livreur
{
    public class BatchUpdateLivraisonStatusRequestDto
    {
        [Required]
        [MinLength(1, ErrorMessage = "La liste des pièces ne peut pas être vide.")]
        public List<string> Pieces { get; set; } = new();

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "";

        [MaxLength(100)]
        public string? Motif { get; set; }

        [MaxLength(250)]
        public string? Note { get; set; }
    }

    public class BatchUpdateLivraisonStatusResultDto
    {
        public int Updated { get; set; }
        public List<string> UpdatedPieces { get; set; } = new();
        public List<string> SkippedPieces { get; set; } = new();
        public List<string> NotFoundPieces { get; set; } = new();
        public string Status { get; set; } = "";
    }
}
