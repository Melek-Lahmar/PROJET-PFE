using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_TRANSFERT")]
    public class F_TRANSFERT
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        [Required, StringLength(20)] public string DoPiece { get; set; } = string.Empty;
        [Required, StringLength(50)] public string ArRef { get; set; } = string.Empty;
        [Column(TypeName = "decimal(18,4)")] public decimal Quantite { get; set; }
        public int SourceDepotNo { get; set; }
        public int DestinationDepotNo { get; set; }
        public Guid? TransitLivreurUserId { get; set; }
        [Required, StringLength(30)] public string Status { get; set; } = TransitStatuses.EnAttenteTransit;
        public DateTime AffectedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PickedUpAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? EscalatedAt { get; set; }
        [Column(TypeName = "decimal(9,6)")] public decimal? PickupGpsLatitude { get; set; }
        [Column(TypeName = "decimal(9,6)")] public decimal? PickupGpsLongitude { get; set; }
        [Column(TypeName = "decimal(9,6)")] public decimal? DeliveryGpsLatitude { get; set; }
        [Column(TypeName = "decimal(9,6)")] public decimal? DeliveryGpsLongitude { get; set; }
        [StringLength(500)] public string? AlgoReasoning { get; set; }
        public int Version { get; set; } = 1;
    }

    public static class TransitStatuses
    {
        public const string TransitRequis = "TRANSIT_REQUIS";
        public const string EnAttenteTransit = "EN_ATTENTE_TRANSIT";
        public const string EnTransit = "EN_TRANSIT";
        public const string EnCoursTransit = "EN_COURS_TRANSIT";
        public const string RecuAuDepot = "RECU_AU_DEPOT";
        public const string RecuDepotDestine = "RECU_DEPOT_DESTINE";
        public const string TransitPartiellementRecu = "TRANSIT_PARTIELLEMENT_RECU";
        public const string TransitTermine = "TRANSIT_TERMINE";
        public const string EnAttenteAffectationTransit = "EN_ATTENTE_AFFECTATION_TRANSIT";
        public const string Annule = "ANNULE";

        public static bool IsWaiting(string? status) =>
            string.Equals(status, EnAttenteTransit, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(status, EnAttenteAffectationTransit, StringComparison.OrdinalIgnoreCase);

        public static bool IsInTransit(string? status) =>
            string.Equals(status, EnTransit, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(status, EnCoursTransit, StringComparison.OrdinalIgnoreCase);

        public static bool IsReceived(string? status) =>
            string.Equals(status, RecuAuDepot, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(status, RecuDepotDestine, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(status, TransitTermine, StringComparison.OrdinalIgnoreCase);

        public static string ToTimelineStatus(string? status)
        {
            if (IsWaiting(status)) return EnAttenteTransit;
            if (IsInTransit(status)) return EnCoursTransit;
            if (IsReceived(status)) return RecuDepotDestine;
            return status ?? string.Empty;
        }
    }
}
