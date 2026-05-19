using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Dashboard
{
    public class DashboardQueryDto
    {
        public string? Period { get; set; }
        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
        public string? GroupBy { get; set; }
        public int? DepotNo { get; set; }
        public int? CatalogueNo { get; set; }
        public string? ClientType { get; set; }
        public int? TopN { get; set; }
    }

    public class DashboardAppliedFiltersDto
    {
        public string Period { get; set; } = "30d";
        public DateOnly From { get; set; }
        public DateOnly To { get; set; }
        public string GroupBy { get; set; } = "day";
        public int? DepotNo { get; set; }
        public int? CatalogueNo { get; set; }
        public string ClientType { get; set; } = "ALL";
        public int TopN { get; set; } = 5;
    }

    public class KpiCardDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string FormattedValue { get; set; } = string.Empty;
        public decimal? Delta { get; set; }
        public string? DeltaFormatted { get; set; }
        public string DeltaDirection { get; set; } = "flat";
        public string? Hint { get; set; }
    }

    public class TrendPointDto
    {
        public string Bucket { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public decimal? SecondaryValue { get; set; }
    }

    public class StatusBreakdownItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Percentage { get; set; }
    }

    public class TopItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? SecondaryLabel { get; set; }
        public decimal Value { get; set; }
        public string FormattedValue { get; set; } = string.Empty;
        public string? Meta { get; set; }
    }

    public class OperationalAlertDto
    {
        public string Severity { get; set; } = "info";
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int? Count { get; set; }
        public string? ActionHint { get; set; }
    }

    public abstract class DashboardResponseBaseDto
    {
        public DateTime GeneratedAt { get; set; }
        public DashboardAppliedFiltersDto AppliedFilters { get; set; } = new();
        public string? DataCompletenessNote { get; set; }
        public List<string> Warnings { get; set; } = new();
    }

    public class ConversionMetricDto
    {
        public bool IsAvailable { get; set; }
        public decimal? Value { get; set; }
        public string FormulaNote { get; set; } = string.Empty;
    }

    public class SyncHealthDto
    {
        public bool IsAvailable { get; set; }
        public string Status { get; set; } = "UNKNOWN";
        public DateTime? CheckedAt { get; set; }
        public string Note { get; set; } = string.Empty;
    }

    public class OverviewDashboardResponseDto : DashboardResponseBaseDto
    {
        public List<KpiCardDto> HeadlineKpis { get; set; } = new();
        public List<TrendPointDto> SalesTrend { get; set; } = new();
        public List<TrendPointDto> OrderTrend { get; set; } = new();
        public List<StatusBreakdownItemDto> DocumentFlow { get; set; } = new();
        public List<TopItemDto> TopProducts { get; set; } = new();
        public List<TopItemDto> TopCategories { get; set; } = new();
        public List<OperationalAlertDto> OperationalAlerts { get; set; } = new();
        public ConversionMetricDto Conversion { get; set; } = new();
    }

    public class SalesDashboardResponseDto : DashboardResponseBaseDto
    {
        public List<KpiCardDto> HeadlineKpis { get; set; } = new();
        public List<TrendPointDto> SalesTrend { get; set; } = new();
        public List<StatusBreakdownItemDto> ClientSplit { get; set; } = new();
        public List<StatusBreakdownItemDto> OrderStatusBreakdown { get; set; } = new();
        public List<StatusBreakdownItemDto> ConfirmationFunnel { get; set; } = new();
        public List<TopItemDto> TopClients { get; set; } = new();
        public List<TopItemDto> TopProducts { get; set; } = new();
        public List<TopItemDto> GeoPerformance { get; set; } = new();
        public List<TopItemDto> RepeatPurchaseInsights { get; set; } = new();
    }

    public class LogisticsDashboardResponseDto : DashboardResponseBaseDto
    {
        public List<KpiCardDto> HeadlineKpis { get; set; } = new();
        public List<TrendPointDto> BlTrend { get; set; } = new();
        public List<StatusBreakdownItemDto> DeliveryStatusBreakdown { get; set; } = new();
        public List<TopItemDto> CourierPerformance { get; set; } = new();
        public List<TopItemDto> DepotPerformance { get; set; } = new();
        public List<TopItemDto> CriticalStockItems { get; set; } = new();
        public List<TopItemDto> TopShippedItems { get; set; } = new();
        public List<OperationalAlertDto> IncidentAlerts { get; set; } = new();
        public List<StatusBreakdownItemDto> BcToBlFlow { get; set; } = new();
    }

    public class ConfirmateurDashboardResponseDto : DashboardResponseBaseDto
    {
        public List<KpiCardDto> HeadlineKpis { get; set; } = new();
        public List<StatusBreakdownItemDto> QueueStatus { get; set; } = new();
        public List<TrendPointDto> ProcessingTrend { get; set; } = new();
        public List<TrendPointDto> TransformationTrend { get; set; } = new();
        public List<TopItemDto> BlockedOrders { get; set; } = new();
        public List<TopItemDto> PriorityOrders { get; set; } = new();
        public List<OperationalAlertDto> OperationalAlerts { get; set; } = new();
    }

    public class AdminSyncDashboardResponseDto : DashboardResponseBaseDto
    {
        public List<KpiCardDto> HeadlineKpis { get; set; } = new();
        public List<StatusBreakdownItemDto> SyncModules { get; set; } = new();
        public List<OperationalAlertDto> DataIntegrityAlerts { get; set; } = new();
        public List<TopItemDto> CatalogHealth { get; set; } = new();
        public List<TopItemDto> StockHealth { get; set; } = new();
        public List<TopItemDto> CustomerDataQuality { get; set; } = new();
        public SyncHealthDto LatestSyncStatus { get; set; } = new();
    }

    public class StrategicInsightsDashboardResponseDto : DashboardResponseBaseDto
    {
        public List<KpiCardDto> HeadlineKpis { get; set; } = new();
        public List<TrendPointDto> SalesForecast { get; set; } = new();
        public List<TrendPointDto> LogisticsForecast { get; set; } = new();
        public List<TopItemDto> StockRiskItems { get; set; } = new();
        public List<TopItemDto> CustomerScoring { get; set; } = new();
        public List<OperationalAlertDto> AutoInsights { get; set; } = new();
        public List<TopItemDto> ComingSoonModules { get; set; } = new();
        public string MethodologyNote { get; set; } = string.Empty;
        public string ConfidenceNote { get; set; } = string.Empty;
    }
}