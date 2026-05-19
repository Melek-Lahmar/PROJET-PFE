namespace Web_Api.DTO.Confirmatrice
{
    /// <summary>
    /// État de disponibilité d'une confirmatrice (phase 3A).
    /// Retourné par GET /api/confirmateur/status/me et par les endpoints pause/resume.
    /// </summary>
    public class ConfirmatriceStatusDto
    {
        public Guid UserId { get; set; }

        /// <summary>Pause volontaire (manuelle). Exclut de la distribution auto.</summary>
        public bool IsInPause { get; set; }

        /// <summary>Dernière activité API détectée.</summary>
        public DateTime? LastActivityAt { get; set; }

        /// <summary>Dernière attribution de cas reçue.</summary>
        public DateTime? LastAssignmentAt { get; set; }

        /// <summary>Dérivé : "en ligne" = LastActivityAt &gt; now - OnlineThresholdMinutes.</summary>
        public bool IsOnline { get; set; }

        /// <summary>Dérivé : "éligible" = en ligne ET non en pause.</summary>
        public bool IsEligible { get; set; }

        /// <summary>Seuil (minutes) utilisé pour IsOnline.</summary>
        public int OnlineThresholdMinutes { get; set; }
    }
}
