using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Reclamations
{
    public class CreateReclamationRequestDto
    {
        [Required]
        [StringLength(13)]
        public string DoPiece { get; set; } = string.Empty;

        [StringLength(19)]
        public string? ArRef { get; set; }

        public bool IsGlobal { get; set; } = true;

        [Required]
        [StringLength(50)]
        public string Motif { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(30)]
        public string? TypeReclamation { get; set; }

        [StringLength(20)]
        public string? Priorite { get; set; }

        /// <summary>
        /// JSON serialisé contenant les corrections proposées par le client.
        /// Ex: {"phone":"+21622xxxxxx"} ou {"address":"...", "latitude":..., "longitude":...}
        /// </summary>
        [StringLength(2000)]
        public string? CorrectionProposee { get; set; }

        // Phase 7 — champs obligatoires uniquement quand Motif = REPROGRAMMATION.
        // Le serveur valide : date entre J+1 et J+14, créneau ∈ {MATIN, APRES_MIDI, SOIR}.
        public DateTime? ReprogrammationDate { get; set; }

        [StringLength(20)]
        public string? ReprogrammationCreneau { get; set; }
    }
}
