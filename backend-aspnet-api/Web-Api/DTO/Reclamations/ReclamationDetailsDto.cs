namespace Web_Api.DTO.Reclamations
{
    public class ReclamationDetailsDto
    {
        public int Id { get; set; }
        public string CodeReclamation { get; set; } = string.Empty;
        public string DoPiece { get; set; } = string.Empty;
        public string? ArRef { get; set; }
        public string? ArDesignation { get; set; }
        public bool IsGlobal { get; set; }
        public bool VisibleClient { get; set; }
        public string Motif { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Statut { get; set; } = string.Empty;
        public string Source { get; set; } = "CLIENT";
        public string? TypeReclamation { get; set; }
        public string? Priorite { get; set; }
        public string? CorrectionProposee { get; set; }
        public bool CorrectionAppliquee { get; set; }
        public string? MotifRefus { get; set; }
        public string? NoteInterne { get; set; }

        public int TentativesCount { get; set; }
        public DateTime? FirstAttemptAt { get; set; }
        public DateTime? LastAttemptAt { get; set; }

        // Bloc client
        public string? ClientDisplay { get; set; }
        public string? ClientPhone { get; set; }
        public string? ClientEmail { get; set; }
        public string? ClientAddress { get; set; }
        public string? ClientGouvernorat { get; set; }
        public string? ClientDelegation { get; set; }
        public string? ClientCodeSage { get; set; }
        public int ClientCommandesCount { get; set; }
        public int ClientReclamationsCount { get; set; }
        // B.4 — Guid utilisateur (pour l'historique client BottomSheet)
        public Guid? ClientUserId { get; set; }

        // Bloc livreur (si Source=LIVREUR)
        public string? LivreurDisplay { get; set; }
        public string? LivreurPhone { get; set; }
        public Guid? LivreurUserId { get; set; }

        // Bloc assignée
        public string? AssignedToDisplay { get; set; }

        // Bloc commande
        public string? OrderStatut { get; set; }
        public DateTime? OrderDate { get; set; }
        public decimal? OrderNetAPayer { get; set; }
        public string? OrderPaymentMethod { get; set; }
        public string? OrderDeliveryMode { get; set; }
        public List<ReclamationOrderLineDto> OrderLines { get; set; } = new();

        // Tentatives (pour affichage chronologique côté confirmatrice)
        public List<ReclamationTentativeDto> Tentatives { get; set; } = new();

        // Photos
        public List<ReclamationPhotoDto> Photos { get; set; } = new();

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }

    public class ReclamationTentativeDto
    {
        public int Id { get; set; }
        public string CommandePiece { get; set; } = string.Empty;
        public DateTime DateJour { get; set; }
        public string Motif { get; set; } = string.Empty;
        public Guid LivreurUserId { get; set; }
        public string? LivreurDisplay { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public string? PhotoUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ReclamationPhotoDto
    {
        public int Id { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public long? Size { get; set; }
        public Guid? UploadedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
