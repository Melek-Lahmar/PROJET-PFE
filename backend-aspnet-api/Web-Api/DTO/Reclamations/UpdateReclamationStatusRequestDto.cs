using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Reclamations
{
    public class UpdateReclamationStatusRequestDto
    {
        [Required]
        [StringLength(30)]
        public string Statut { get; set; } = string.Empty;

        [StringLength(500)]
        public string? MotifRefus { get; set; }
    }

    public class ApplyCorrectionRequestDto
    {
        [StringLength(300)]
        public string? NewAddress { get; set; }

        public decimal? NewLatitude { get; set; }

        public decimal? NewLongitude { get; set; }

        [StringLength(30)]
        public string? NewPhone { get; set; }

        // Phase 6 — spécificité Tunisie, adresses imprécises.
        [StringLength(200)]
        public string? Repere { get; set; }

        [StringLength(500)]
        public string? InstructionsLivreur { get; set; }
    }

    public class ChangeCommandeStatusFromDemandeRequestDto
    {
        [Required]
        public short NewStatus { get; set; }

        [StringLength(500)]
        public string? Note { get; set; }
    }

    public class UpdateReclamationNoteRequestDto
    {
        [StringLength(1000)]
        public string? NoteInterne { get; set; }
    }

    public class EchangeLigneDto
    {
        [Required]
        [StringLength(20)]
        public string Type { get; set; } = "RETOUR"; // RETOUR ou LIVRAISON

        [Required]
        [StringLength(19)]
        public string ArRef { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Designation { get; set; }

        public decimal Quantite { get; set; } = 1m;

        public decimal? PrixUnitaire { get; set; }
    }

    public class CreateEchangeV2RequestDto
    {
        [Required]
        [MinLength(1)]
        public List<EchangeLigneDto> Lignes { get; set; } = new();

        [StringLength(500)]
        public string? Note { get; set; }
    }
}

