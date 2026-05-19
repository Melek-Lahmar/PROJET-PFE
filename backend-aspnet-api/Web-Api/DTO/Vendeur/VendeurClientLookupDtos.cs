namespace Web_Api.DTO.Vendeur
{
    public class VendeurClientLookupItemDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? TypeClient { get; set; }
        public string? NomComplet { get; set; }
        public string? NomSociete { get; set; }
        public string? Telephone { get; set; }
        public string? Cin { get; set; }
        public string? MatriculeFiscal { get; set; }
        public string? CodeClientSage { get; set; }
        public string? Adresse { get; set; }
        public string? AdresseComplementaire { get; set; }
        public string? Gouvernorat { get; set; }
        public string? Delegation { get; set; }
        public string? CodePostal { get; set; }
    }
}