using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Statistics
{
    public class DashboardResponseDto
    {
        public List<KpiItemDto> Kpis { get; set; } = new();
        public List<TimePointDto> DeliveriesTrend { get; set; } = new();
        public List<DriverMetricDto> LateByDriver { get; set; } = new();
        public List<StatusSliceDto> StatusBreakdown { get; set; } = new();
    }

    public class KpiItemDto
    {
        public string Title { get; set; } = "";
        public string Value { get; set; } = "";
        public string? Subtitle { get; set; }
        public double? DeltaPercent { get; set; }
        public bool PositiveIsGood { get; set; } = true;
    }

    public class TimePointDto
    {
        public DateTime T { get; set; }
        public double Y { get; set; }
    }

    public class DriverMetricDto
    {
        public string DriverName { get; set; } = "";
        public double LateCount { get; set; }
    }

    public class StatusSliceDto
    {
        public string Label { get; set; } = "";
        public double Value { get; set; }
    }
}