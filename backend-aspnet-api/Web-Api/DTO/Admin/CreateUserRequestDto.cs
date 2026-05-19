using System.ComponentModel.DataAnnotations;
using Web_Api.Auth.Entities;
using Web_Api.Geo;

namespace Web_Api.DTO.Admin
{
    public class CreateUserRequestDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = "";

        [Required, MinLength(6)]
        public string Password { get; set; } = "";

        [Required]
        public string Role { get; set; } = "";

        // ✅ utiliser les enums exacts
        public TypeProfil TypeProfil { get; set; } = TypeProfil.Client;

        public Web_Api.Auth.Entities.TypeClient? TypeClient { get; set; } = Web_Api.Auth.Entities.TypeClient.B2C;

        [MaxLength(150)]
        public string? NomComplet { get; set; }

        [MaxLength(30)]
        public string? Telephone { get; set; }

        [MaxLength(20)]
        public string? CIN { get; set; }

        public DateTime? DateNaissance { get; set; }

        [Required]
        public GouvernoratTunisie Gouvernorat { get; set; }

        [Required, MaxLength(100)]
        public string Delegation { get; set; } = "";

        [MaxLength(200)]
        public string? NomSociete { get; set; }

        [MaxLength(50)]
        public string? MatriculeFiscal { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }
}
