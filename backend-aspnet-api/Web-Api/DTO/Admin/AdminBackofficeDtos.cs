using Web_Api.Auth.Entities;

namespace Web_Api.DTO.Admin
{
    public class AdminPersonnelItemDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public List<string> Roles { get; set; } = new();
        public string? PrimaryRole { get; set; }
        public string? NomComplet { get; set; }
        public string? Telephone { get; set; }
        public string? Departement { get; set; }
        public string? Poste { get; set; }
        public string? CodeEmploye { get; set; }
        public string? CodeDepot { get; set; }
        public string? ZoneLivraison { get; set; }
        public bool IsActive { get; set; }
        public DateTime? DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
    }

    public class AdminClientListItemDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? TypeClient { get; set; }
        public string? DisplayName { get; set; }
        public string? NomComplet { get; set; }
        public string? NomSociete { get; set; }
        public string? Telephone { get; set; }
        public string? Adresse { get; set; }
        public string? Ville { get; set; }
        public string? Gouvernorat { get; set; }
        public string? CodePostal { get; set; }
        public int OrderCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime? DateCreation { get; set; }
    }

    public class AdminClientDetailDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public List<string> Roles { get; set; } = new();
        public bool IsActive { get; set; }

        public TypeProfil? TypeProfil { get; set; }
        public string? TypeClient { get; set; }

        public string? NomComplet { get; set; }
        public string? Telephone { get; set; }
        public string? Cin { get; set; }
        public DateTime? DateNaissance { get; set; }

        public string? NomSociete { get; set; }
        public string? MatriculeFiscal { get; set; }
        public string? RegistreCommerce { get; set; }
        public string? NumeroTVA { get; set; }
        public int? Remise { get; set; }
        public decimal? PlafondCredit { get; set; }

        public string? Adresse { get; set; }
        public string? AdresseComplementaire { get; set; }
        public string? Delegation { get; set; }
        public string? Gouvernorat { get; set; }
        public string? CodePostal { get; set; }
        public string? Pays { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        public string? CodeClientSage { get; set; }
        public bool? EstSynchroniseAvecSage { get; set; }
        public DateTime? DateDerniereSynchronisation { get; set; }

        public DateTime? DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
    }

    public class AdminOrderSummaryDto
    {
        public string Piece { get; set; } = string.Empty;
        public string DocumentKind { get; set; } = string.Empty;
        public string? Bucket { get; set; }
        public DateTime? Date { get; set; }

        public string? ClientCode { get; set; }
        public Guid? ClientUserId { get; set; }
        public string? ClientDisplay { get; set; }
        public string? ClientType { get; set; }

        public string? Status { get; set; }
        public short? StatusCode { get; set; }

        public decimal TotalTTC { get; set; }
        public decimal NetAPayer { get; set; }
        public string? DeliveryType { get; set; }
        public string? PaymentMethod { get; set; }
        public DateTime? CbCreation { get; set; }
        public DateTime? CbModification { get; set; }
        public int LineCount { get; set; }
    }

    public class AdminOrderDetailDto
    {
        public string Piece { get; set; } = string.Empty;
        public string DocumentKind { get; set; } = string.Empty;
        public string? Bucket { get; set; }
        public DateTime? Date { get; set; }

        public string? ClientCode { get; set; }
        public Guid? ClientUserId { get; set; }
        public string? ClientDisplay { get; set; }
        public string? ClientType { get; set; }
        public string? Status { get; set; }
        public short? StatusCode { get; set; }

        public decimal TotalHT { get; set; }
        public decimal TotalTTC { get; set; }
        public decimal FraisLivraison { get; set; }
        public decimal TimbreFiscal { get; set; }
        public decimal NetAPayer { get; set; }

        public int? DepotNo { get; set; }
        public string? DeliveryType { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }

        public DateTime? CbCreation { get; set; }
        public DateTime? CbModification { get; set; }

        public AdminClientDetailDto? Client { get; set; }
        public List<AdminOrderLineDto> Lines { get; set; } = new();
    }

    public class AdminOrderLineDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public decimal Qty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal AmountHT { get; set; }
        public decimal AmountTTC { get; set; }
    }
}