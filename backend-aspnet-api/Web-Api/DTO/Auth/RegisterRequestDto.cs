using System;
using System.ComponentModel.DataAnnotations;
using Web_Api.Auth.Entities;
using Web_Api.Geo;

namespace Web_Api.Auth.DTO
{
    public class RegisterRequestDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = "";

        [Required, MinLength(6)]
        public string Password { get; set; } = "";

        [Required]
        public TypeProfil TypeProfil { get; set; } = TypeProfil.Client;

        public TypeClient? TypeClient { get; set; } = Web_Api.Auth.Entities.TypeClient.B2C;

        [Required(ErrorMessage = "Le gouvernorat est obligatoire.")]
        public GouvernoratTunisie Gouvernorat { get; set; }

        [Required(ErrorMessage = "La délégation est obligatoire.")]
        [MaxLength(100)]
        public string Delegation { get; set; } = "";

        [Required(ErrorMessage = "L'adresse est obligatoire.")]
        [MaxLength(300)]
        public string Adresse { get; set; } = "";

        [MaxLength(300)]
        public string? AdresseComplementaire { get; set; }

        [MaxLength(20)]
        public string? CodePostal { get; set; }

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