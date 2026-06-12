namespace Web_Api.DTO.BL
{
    public class TransitManifestDto
    {
        public string? SourceDepotIntitule { get; set; }
        public string? SourceGouvernorat { get; set; }
        public int BlocId { get; set; }
        public DateTime PrintedAt { get; set; }
        public List<TransitGroupDto> Groups { get; set; } = new();
        public decimal TotalAmount => Groups.Sum(g => g.GroupTotal);
        public int TotalBLs => Groups.Sum(g => g.Items.Count);
    }

    public class TransitGroupDto
    {
        public string DestinationGouvernorat { get; set; } = "";
        public string? DestinationDepotName { get; set; }
        public decimal GroupTotal { get; set; }
        public List<BonLivraisonResponseDto> Items { get; set; } = new();
    }
}
