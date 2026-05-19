using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Dashboard
{
    public class ProDashboardFilterDto
    {
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public int? DepotNo { get; set; }
        public string? Governorate { get; set; }
        public string? Delegation { get; set; }
        public string? ClientType { get; set; }
        public string? OrderStatus { get; set; }
        public string? DeliveryStatus { get; set; }
        public int? Top { get; set; }
    }

    public class ProDashboardAppliedFiltersDto
    {
        public string Period { get; set; } = "30d";
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public int? DepotNo { get; set; }
        public string? Governorate { get; set; }
        public string? Delegation { get; set; }
        public string ClientType { get; set; } = "ALL";
        public string? OrderStatus { get; set; }
        public string? DeliveryStatus { get; set; }
        public int Top { get; set; } = 10;
    }

    public class ProKpiMetricDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string FormattedValue { get; set; } = string.Empty;
        public decimal? Delta { get; set; }
        public string? DeltaFormatted { get; set; }
        public string DeltaDirection { get; set; } = "flat";
        public string Format { get; set; } = "count";
        public string? Hint { get; set; }
        public string? Severity { get; set; }
    }

    public class ProChartPointDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public decimal? SecondaryValue { get; set; }
    }

    public class ProStatusDistributionItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Percentage { get; set; }
        public string? Severity { get; set; }
    }

    public class ProTopEntityItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? SecondaryLabel { get; set; }
        public decimal Value { get; set; }
        public string FormattedValue { get; set; } = string.Empty;
        public string? Meta { get; set; }
        public string? Severity { get; set; }
    }

    public class ProDashboardAlertDto
    {
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Severity { get; set; } = "info";
        public string? Module { get; set; }
        public string? Action { get; set; }
        public int? Count { get; set; }
    }

    public class ProDashboardInsightDto
    {
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Impact { get; set; }
        public string? Action { get; set; }
        public string Severity { get; set; } = "info";
    }

    public class ProDataTableColumnDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Align { get; set; } = "left";
    }

    public class ProDashboardTableDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<ProDataTableColumnDto> Columns { get; set; } = new();
        public List<Dictionary<string, object?>> Rows { get; set; } = new();
    }

    public class ProDashboardExecutiveSummaryDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "info";
        public List<string> Highlights { get; set; } = new();
    }

    public class ProDashboardPageResponseDto
    {
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public string Scope { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public ProDashboardAppliedFiltersDto AppliedFilters { get; set; } = new();
        public ProDashboardExecutiveSummaryDto? ExecutiveSummary { get; set; }
        public List<ProKpiMetricDto> Kpis { get; set; } = new();
        public List<ProChartPointDto> PrimaryTrend { get; set; } = new();
        public List<ProChartPointDto> SecondaryTrend { get; set; } = new();
        public List<ProStatusDistributionItemDto> StatusDistribution { get; set; } = new();
        public List<ProStatusDistributionItemDto> SecondaryDistribution { get; set; } = new();
        public List<ProTopEntityItemDto> TopEntities { get; set; } = new();
        public List<ProTopEntityItemDto> SecondaryTopEntities { get; set; } = new();
        public List<ProDashboardAlertDto> Alerts { get; set; } = new();
        public List<ProDashboardInsightDto> Insights { get; set; } = new();
        public ProDashboardTableDto Table { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public string? DataCompletenessNote { get; set; }
    }
}