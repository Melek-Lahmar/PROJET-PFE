using System.ComponentModel.DataAnnotations;
using Web_Api.Geo;

namespace Web_Api.Auth.DTO
{
    public class UpdateProfileRequestDto
    {
        [Required(ErrorMessage = "Le gouvernorat est obligatoire.")]
        public GouvernoratTunisie Gouvernorat { get; set; }

        [Required(ErrorMessage = "La délégation est obligatoire.")]
        [MaxLength(100)]
        public string Delegation { get; set; } = "";

        // ✅ NOUVEAU : Adresse texte (obligatoire)
        [Required(ErrorMessage = "L'adresse est obligatoire.")]
        [MaxLength(300)]
        public string Adresse { get; set; } = "";

        // ✅ NOUVEAU : Complément d’adresse (optionnel)
        [MaxLength(300)]
        public string? AdresseComplementaire { get; set; }

        // ✅ NOUVEAU : Code postal
        [MaxLength(20)]
        public string? CodePostal { get; set; }

        // ✅ NOUVEAU : Pays
        [MaxLength(100)]
        public string? Pays { get; set; }

        [MaxLength(150)]
        public string? NomComplet { get; set; }

        [MaxLength(30)]
        public string? Telephone { get; set; }

        [MaxLength(20)]
        public string? CIN { get; set; }

        [DataType(DataType.Date)]
        public DateTime? DateNaissance { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        [MaxLength(200)]
        public string? NomSociete { get; set; }

        [MaxLength(50)]
        public string? MatriculeFiscal { get; set; }
    }
}