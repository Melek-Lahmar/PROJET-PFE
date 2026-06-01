using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Livreur
{
    public class UpdateLivraisonStatusRequestDto : IValidatableObject
    {
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "";

        [MaxLength(100)]
        public string? Motif { get; set; }

        [MaxLength(250)]
        public string? Note { get; set; }

        public DateTime? ReplannedAt { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var status = (Status ?? "").Trim().ToUpperInvariant();
            var motif = (Motif ?? "").Trim();
            var note = (Note ?? "").Trim();

            var motifObligatoire =
                status == "REPORTE" ||
                status == "RETOUR" ||
                status == "RETOURNE" ||
                status == "DEPOT";

            if (motifObligatoire && string.IsNullOrWhiteSpace(motif))
            {
                yield return new ValidationResult(
                    "Le motif est obligatoire pour ce statut.",
                    new[] { nameof(Motif) });
            }

            if (status == "REPORTE" && !ReplannedAt.HasValue)
            {
                yield return new ValidationResult(
                    "La date de replanification est obligatoire pour le statut REPORTE.",
                    new[] { nameof(ReplannedAt) });
            }

            if (motif.Equals("AUTRE", StringComparison.OrdinalIgnoreCase) &&
                string.IsNullOrWhiteSpace(note))
            {
                yield return new ValidationResult(
                    "La note est obligatoire lorsque le motif est AUTRE.",
                    new[] { nameof(Note) });
            }
        }
    }
}