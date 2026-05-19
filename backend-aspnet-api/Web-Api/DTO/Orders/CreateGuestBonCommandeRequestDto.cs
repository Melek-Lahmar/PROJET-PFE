using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Orders
{
    public class CreateGuestBonCommandeRequestDto
    {
        public int? DepotNo { get; set; }

        [MaxLength(10)]
        public string? DeliveryType { get; set; }

        [MaxLength(20)]
        public string? PaymentMethod { get; set; }

        [MaxLength(150)]
        public string? Address { get; set; }

        [MaxLength(35)]
        public string? City { get; set; }

        [MaxLength(20)]
        public string? PostalCode { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        [Required]
        public GuestBonCommandeCustomerDto? Customer { get; set; }

        public List<CreateBonCommandeLineRequestDto> Lines { get; set; } = new();
    }

    public class GuestBonCommandeCustomerDto
    {
        [Required]
        [MaxLength(10)]
        public string TypeClient { get; set; } = "B2C";

        [MaxLength(150)]
        public string? NomComplet { get; set; }

        [MaxLength(30)]
        public string? Telephone { get; set; }

        [MaxLength(20)]
        public string? Cin { get; set; }

        [MaxLength(200)]
        public string? NomSociete { get; set; }

        [MaxLength(50)]
        public string? MatriculeFiscal { get; set; }

        [MaxLength(50)]
        public string? RegistreCommerce { get; set; }

        [MaxLength(50)]
        public string? NumeroTVA { get; set; }

        [MaxLength(50)]
        public string? Gouvernorat { get; set; }

        [MaxLength(100)]
        public string? Delegation { get; set; }

        [MaxLength(300)]
        public string? Adresse { get; set; }

        [MaxLength(300)]
        public string? AdresseComplementaire { get; set; }

        [MaxLength(20)]
        public string? CodePostal { get; set; }
    }
}