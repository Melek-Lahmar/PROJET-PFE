using System.ComponentModel.DataAnnotations;
using Web_Api.DTO.Orders;

namespace Web_Api.DTO.Vendeur
{
    public class VendeurCreateBonCommandeRequestDto
    {
        [Required]
        [MaxLength(12)]
        public string CustomerMode { get; set; } = "EXISTING"; // EXISTING | PASSAGER

        public Guid? ClientUserId { get; set; }

        public VendeurPassagerClientDto? Passager { get; set; }

        // Conservé uniquement pour compatibilité temporaire avec le frontend actuel.
        // Ignoré côté backend vendeur : le dépôt est toujours résolu depuis ProfilUtilisateur.CodeDepot.
        public int? DepotNo { get; set; }

        // Conservé uniquement pour compatibilité temporaire.
        // Ignoré côté backend vendeur : la remise vendeur est toujours SUR_PLACE
        // et stockée en document standard sous la forme PICKUP.
        [MaxLength(10)]
        public string? DeliveryType { get; set; }

        // Requis côté vendeur. Les codes canoniques attendus sont :
        // SP01_ESPECES, SP02_CHEQUE, SP03_TPE, SP04_PASSCADEAU.
        // Quelques alias historiques sont tolérés et remappés côté backend.
        [Required]
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = string.Empty;

        // Champs conservés pour compatibilité temporaire avec le checkout vendeur existant.
        // Ils sont ignorés pour SUR_PLACE car l'adresse utilisée provient automatiquement du dépôt vendeur.
        [MaxLength(150)]
        public string? Address { get; set; }

        [MaxLength(35)]
        public string? City { get; set; }

        [MaxLength(20)]
        public string? PostalCode { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        public List<CreateBonCommandeLineRequestDto> Lines { get; set; } = new();
    }

    public class VendeurPassagerClientDto
    {
        [Required]
        [MaxLength(10)]
        public string TypeClient { get; set; } = "B2C"; // B2C | B2B

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