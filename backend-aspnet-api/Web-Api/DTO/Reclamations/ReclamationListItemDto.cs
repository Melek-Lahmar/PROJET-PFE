namespace Web_Api.DTO.Reclamations
{
    public class ReclamationListItemDto
    {
        public int Id { get; set; }
        public string CodeReclamation { get; set; } = string.Empty;
        public string DoPiece { get; set; } = string.Empty;
        public string? ArRef { get; set; }
        public string? ArDesignation { get; set; }
        public bool IsGlobal { get; set; }
        public bool VisibleClient { get; set; }
        public string Motif { get; set; } = string.Empty;
        public string DescriptionPreview { get; set; } = string.Empty;
        public string Statut { get; set; } = string.Empty;
        public string Source { get; set; } = "CLIENT";
        public string? TypeCas { get; set; }
        public string? TypeReclamation { get; set; }
        public string? Priorite { get; set; }
        public string? ClientDisplay { get; set; }
        public string? ClientPhone { get; set; }
        public string? ClientGouvernorat { get; set; }
        public string? AssignedToDisplay { get; set; }
        public int TentativesCount { get; set; }
        public int PhotosCount { get; set; }
        public bool HasCorrectionProposee { get; set; }
        public bool HasAddressChange { get; set; }
        public bool HasPhoneChange { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
    }
}
