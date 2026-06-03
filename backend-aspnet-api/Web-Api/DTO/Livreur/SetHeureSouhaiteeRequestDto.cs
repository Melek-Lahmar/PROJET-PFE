using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Livreur
{
    /// <summary>
    /// Requête PATCH pour poser/effacer un report partiel (même journée) sur
    /// une commande EN_LIVRAISON. <see cref="HeureSouhaitee"/> null = déblocage
    /// manuel, la commande redevient livrable immédiatement.
    /// </summary>
    public class SetHeureSouhaiteeRequestDto : IValidatableObject
    {
        public DateTime? HeureSouhaitee { get; set; }

        [MaxLength(250)]
        public string? Note { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (HeureSouhaitee.HasValue)
            {
                var local = HeureSouhaitee.Value.Kind == DateTimeKind.Utc
                    ? HeureSouhaitee.Value.ToLocalTime()
                    : HeureSouhaitee.Value;

                var now = DateTime.Now;

                if (local <= now)
                {
                    yield return new ValidationResult(
                        "L'heure souhaitée doit être dans le futur.",
                        new[] { nameof(HeureSouhaitee) });
                }

                if (local.Date != now.Date)
                {
                    yield return new ValidationResult(
                        "Le report partiel ne peut pas dépasser la journée courante. Utilisez « Reporter » pour les autres jours.",
                        new[] { nameof(HeureSouhaitee) });
                }
            }
        }
    }
}
