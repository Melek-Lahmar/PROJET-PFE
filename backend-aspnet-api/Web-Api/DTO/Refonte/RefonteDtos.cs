namespace Web_Api.DTO.Refonte
{
    public sealed class DepotZoneDto
    {
        public Guid Id { get; set; }
        public int DepotNo { get; set; }
        public string DepotName { get; set; } = string.Empty;
        public string Gouvernorat { get; set; } = string.Empty;
        public string Delegation { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }

    public sealed class UpsertDepotZoneRequest
    {
        public int DepotNo { get; set; }
        public string Gouvernorat { get; set; } = string.Empty;
        public string Delegation { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }

    public sealed class PickupDepotOptionDto
    {
        public int DepotNo { get; set; }
        public string Name { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public double DistanceKm { get; set; }
        public bool IsRecommended { get; set; }
    }

    public sealed class PickupOptionsDto
    {
        public bool IsCovered { get; set; }
        public int? PrimaryDepotNo { get; set; }
        public IReadOnlyList<PickupDepotOptionDto> NearestDepots { get; set; } = Array.Empty<PickupDepotOptionDto>();
    }

    public sealed class ReplaceAddressRequest
    {
        public string? Label { get; set; }
        public string? Adresse { get; set; }
        public string? Gouvernorat { get; set; }
        public string? Delegation { get; set; }
        public string? Ville { get; set; }
        public string? CodePostal { get; set; }
        public string? Landmark { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public bool IsDefault { get; set; }
    }

    public sealed class PreviewAddressRequest
    {
        public string Gouvernorat { get; set; } = string.Empty;
        public string Delegation { get; set; } = string.Empty;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public string DeliveryMode { get; set; } = "HOME_DELIVERY";
    }

    public sealed class TransitScanRequest
    {
        public string CodeBarre { get; set; } = string.Empty;
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string? ClientActionId { get; set; }
    }

    public sealed class TransitScanRequestDto
    {
        public Guid? TransitMissionId { get; set; }
        public Guid? TransfertId { get; set; }
        public string ScannedBarcode { get; set; } = string.Empty;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public string? ClientActionId { get; set; }
    }

    public sealed class TransitScanResultDto
    {
        public bool Success { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? NextStatus { get; set; }
        public string? ErrorCode { get; set; }
        public Guid? TransfertId { get; set; }
        public string? CommandeId { get; set; }
        public OrderTimelineDto? UpdatedTimeline { get; set; }
    }

    public sealed class ChangeTransitStatusDto
    {
        public Guid? TransitMissionId { get; set; }
        public Guid? TransfertId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Justification { get; set; }
        public int? Version { get; set; }
    }

    public sealed class ManualTransitAssignmentDto
    {
        public Guid? TransitLivreurUserId { get; set; }
        public int? SourceDepotNo { get; set; }
        public int? Version { get; set; }
        public string? Motif { get; set; }
    }

    public sealed class TransitOrderLineInput
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string? ArticleName { get; set; }
        public decimal Quantity { get; set; }
        public bool TrackStock { get; set; }
    }

    public sealed class TransitPreparationResult
    {
        public int DestinationDepotNo { get; set; }
        public List<TransitTransferDraftDto> Transfers { get; set; } = new();
        public List<TransitBlockedItemDto> BlockedItems { get; set; } = new();
        public bool RequiresTransit => Transfers.Count > 0 || BlockedItems.Count > 0;
    }

    public sealed class TransitTransferDraftDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string? ArticleName { get; set; }
        public decimal Quantity { get; set; }
        public int SourceDepotNo { get; set; }
        public int DestinationDepotNo { get; set; }
        public Guid? TransitLivreurUserId { get; set; }
        public string? TransitLivreurName { get; set; }
        public string? Reason { get; set; }
    }

    public sealed class TransitBlockedItemDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string? ArticleName { get; set; }
        public decimal RequestedQuantity { get; set; }
        public decimal AvailableAtDestination { get; set; }
        public decimal AvailableInOtherDepots { get; set; }
        public string IssueType { get; set; } = "QUANTITE_INSUFFISANTE";
        public string Message { get; set; } = string.Empty;
    }

    public sealed class OrderTimelineDto
    {
        public string CommandeId { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = string.Empty;
        public string DeliveryMode { get; set; } = string.Empty;
        public int? DestinationDepotNo { get; set; }
        public string? DestinationDepotName { get; set; }
        public int TransitReceivedCount { get; set; }
        public int TransitTotalCount { get; set; }
        public List<OrderTimelineStepDto> Steps { get; set; } = new();
        public List<OrderItemTransitStatusDto> Items { get; set; } = new();
    }

    public sealed class OrderTimelineStepDto
    {
        public string Code { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public string? Description { get; set; }
    }

    public sealed class OrderItemTransitStatusDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string ArticleName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? SourceDepotName { get; set; }
        public string? DestinationDepotName { get; set; }
        public string? CurrentMessage { get; set; }
    }

    public sealed class OrderItemsTransitSummaryDto
    {
        public string CommandeId { get; set; } = string.Empty;
        public int TotalTransitItems { get; set; }
        public int ReceivedTransitItems { get; set; }
        public bool IsTransitRequired { get; set; }
        public bool IsTransitComplete { get; set; }
        public List<OrderItemTransitStatusDto> Items { get; set; } = new();
    }

    public sealed class ReassignTransfertRequest
    {
        public int SourceDepotNo { get; set; }
        public Guid? TransitLivreurUserId { get; set; }
        public int Version { get; set; }
        public string Motif { get; set; } = string.Empty;
    }

    public sealed class AssignLivreurZonesRequest
    {
        public List<LivreurZoneInput> Zones { get; set; } = new();
    }

    public sealed class LivreurZoneInput
    {
        public string Gouvernorat { get; set; } = string.Empty;
        public string Delegation { get; set; } = string.Empty;
    }

    public sealed class SupervisorCreateLivreurRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = "12345678";
        public string? NomComplet { get; set; }
        public string? Telephone { get; set; }
        public int Gouvernorat { get; set; } = 22;
        public string Delegation { get; set; } = string.Empty;
        public bool IsTransit { get; set; }
        public int? DepotRattacheNo { get; set; }
        public List<LivreurZoneInput> Zones { get; set; } = new();
    }

    public sealed class SupervisorUpdateLivreurRequest
    {
        public string? NomComplet { get; set; }
        public string? Telephone { get; set; }
        public int? Gouvernorat { get; set; }
        public string? Delegation { get; set; }
        public bool? IsTransit { get; set; }
        public int? DepotRattacheNo { get; set; }
        public List<LivreurZoneInput>? Zones { get; set; }
    }

}
