using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("PrintSettings")]
    public class PrintSettings
    {
        [Key]
        public int Id { get; set; }

        [MaxLength(200)]
        public string? CompanyName { get; set; }

        [MaxLength(500)]
        public string? CompanyAddress { get; set; }

        [MaxLength(30)]
        public string? CompanyPhone { get; set; }

        [MaxLength(100)]
        public string? CompanyEmail { get; set; }

        [MaxLength(50)]
        public string? MatriculeFiscal { get; set; }

        [MaxLength(50)]
        public string? RegistreCommerce { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        public string FieldsConfig { get; set; } = "{}";

        [MaxLength(500)]
        public string? FooterText { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Guid? UpdatedByUserId { get; set; }
    }

    public class PrintFieldsConfig
    {
        public bool ShowBlNumber { get; set; } = true;
        public bool ShowDate { get; set; } = true;
        public bool ShowSourceBc { get; set; } = true;
        public bool ShowDepot { get; set; } = false;
        public bool ShowClientCode { get; set; } = true;
        public bool ShowClientPhone { get; set; } = true;
        public bool ShowLivreur { get; set; } = true;
        public bool ShowUnitPriceHT { get; set; } = true;
        public bool ShowAmountHT { get; set; } = false;
        public bool ShowAmountTTC { get; set; } = true;
        public bool ShowTotalHT { get; set; } = false;
        public bool ShowTVA { get; set; } = true;
        public bool ShowFraisLivraison { get; set; } = true;
        public bool ShowTimbreFiscal { get; set; } = true;
        public bool ShowNetAPayer { get; set; } = true;
        public bool ShowSignatureClient { get; set; } = true;
        public bool ShowSignatureLivreur { get; set; } = true;
    }
}
