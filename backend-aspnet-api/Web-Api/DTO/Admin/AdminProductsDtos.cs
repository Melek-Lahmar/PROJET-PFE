using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    public class AdminProductsQueryDto
    {
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Governorate { get; set; }
        public int? TopN { get; set; }
    }

    public class AdminProductsOverviewDto
    {
        public DateTime GeneratedAt { get; set; }
        public List<AdminKpiDto> Kpis { get; set; } = new();
        public List<AdminProductRowDto> TopByQuantity { get; set; } = new();
        public List<AdminProductRowDto> TopByRevenue { get; set; } = new();
        public List<AdminProductRowDto> TopByReturns { get; set; } = new();
        public List<AdminBreakdownItemDto> RevenueByGovernorate { get; set; } = new();
        public List<AdminBreakdownItemDto> ReturnsByGovernorate { get; set; } = new();
    }

    public class AdminProductRowDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public decimal Quantity { get; set; }
        public decimal Revenue { get; set; }
        public int OrdersCount { get; set; }
        public int ReturnsCount { get; set; }
    }
}
