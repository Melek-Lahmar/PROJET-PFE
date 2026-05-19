using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    public class AdminConfirmatricesQueryDto
    {
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Search { get; set; }
    }

    public class AdminConfirmatriceListItemDto
    {
        public Guid UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Governorate { get; set; }
        public bool Online { get; set; }
        public bool InPause { get; set; }
        public DateTime? LastActivityAt { get; set; }
        public DateTime? LastAssignmentAt { get; set; }

        public int ClaimsTotal { get; set; }
        public int ClaimsInProgress { get; set; }
        public int ClaimsClosed { get; set; }
        public int ClaimsRefused { get; set; }

        public int RequestsTotal { get; set; }
        public int RequestsInProgress { get; set; }
        public int RequestsClosed { get; set; }
        public int RequestsRefused { get; set; }
    }

    public class AdminConfirmatricesPageDto
    {
        public DateTime GeneratedAt { get; set; }
        public List<AdminKpiDto> Kpis { get; set; } = new();
        public List<AdminConfirmatriceListItemDto> Items { get; set; } = new();
    }

    public class AdminConfirmatriceDetailDto
    {
        public Guid UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Governorate { get; set; }
        public bool Online { get; set; }
        public bool InPause { get; set; }
        public DateTime? LastActivityAt { get; set; }
        public DateTime? LastAssignmentAt { get; set; }
        public List<AdminKpiDto> Kpis { get; set; } = new();
        public List<AdminBreakdownItemDto> StatusBreakdown { get; set; } = new();
        public List<AdminConfirmatriceRecentCaseDto> RecentCases { get; set; } = new();
    }

    public class AdminConfirmatriceRecentCaseDto
    {
        public string Code { get; set; } = string.Empty;
        public string TypeCas { get; set; } = string.Empty;
        public string Statut { get; set; } = string.Empty;
        public string Motif { get; set; } = string.Empty;
        public string DoPiece { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
