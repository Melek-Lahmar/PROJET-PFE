using System.ComponentModel.DataAnnotations;
using Web_Api.Geo;

namespace Web_Api.DTO.Admin
{
    public class UpdateUserProfileDto
    {
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(150)]
        public string? NomComplet { get; set; }

        [MaxLength(30)]
        public string? Telephone { get; set; }

        [MaxLength(20)]
        public string? CIN { get; set; }

        /// <summary>
        /// Nullable pour permettre des PATCH partiels : si null, on garde la
        /// valeur existante (sinon les payloads partiels effaçaient
        /// silencieusement le gouvernorat en le ramenant à 0).
        /// </summary>
        public GouvernoratTunisie? Gouvernorat { get; set; }

        [MaxLength(100)]
        public string? Delegation { get; set; }

        // --- Champs staff (VENDEUR / LIVREUR / CONFIRMATEUR / ADMIN) ---
        // Optionnels : seulement appliqués si non null.
        [MaxLength(50)]
        public string? CodeEmploye { get; set; }

        [MaxLength(100)]
        public string? Departement { get; set; }

        [MaxLength(100)]
        public string? Poste { get; set; }

        [MaxLength(50)]
        public string? CodeDepot { get; set; }

        [MaxLength(100)]
        public string? ZoneLivraison { get; set; }
    }
}
