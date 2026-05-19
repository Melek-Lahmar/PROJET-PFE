using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    public class AdminClaimsQueryDto
    {
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Governorate { get; set; }
    }

    public class AdminClaimsOverviewDto
    {
        public DateTime GeneratedAt { get; set; }
        public List<AdminKpiDto> Kpis { get; set; } = new();
        public List<AdminBreakdownItemDto> ClaimsStatusBreakdown { get; set; } = new();
        public List<AdminBreakdownItemDto> RequestsStatusBreakdown { get; set; } = new();
        public List<AdminBreakdownItemDto> GovernorateBreakdown { get; set; } = new();
        public List<AdminBreakdownItemDto> TopClaimMotifs { get; set; } = new();
        public List<AdminBreakdownItemDto> TopRequestMotifs { get; set; } = new();
        public List<AdminTrendPointDto> Trend { get; set; } = new();
        public List<AdminClaimRowDto> UnhandledCases { get; set; } = new();
    }

    public class AdminClaimRowDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string TypeCas { get; set; } = string.Empty;
        public string Statut { get; set; } = string.Empty;
        public string Motif { get; set; } = string.Empty;
        public string DoPiece { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? Governorate { get; set; }
        public int HoursOpen { get; set; }
    }
}
