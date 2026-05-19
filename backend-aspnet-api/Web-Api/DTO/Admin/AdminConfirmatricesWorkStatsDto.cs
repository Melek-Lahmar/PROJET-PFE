using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>A.2 — Réponse work-stats confirmatrices.</summary>
    public class AdminConfirmatricesWorkStatsDto
    {
        public AdminConfirmatricesWorkStatsPeriodDto Period { get; set; } = new();
        public List<AdminConfirmatriceWorkStatsItemDto> Confirmatrices { get; set; } = new();
    }

    public class AdminConfirmatricesWorkStatsPeriodDto
    {
        public DateTime From { get; set; }
        public DateTime To { get; set; }
    }

    public class AdminConfirmatriceWorkStatsItemDto
    {
        public Guid Id { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string? Telephone { get; set; }
        public string? Gouvernorat { get; set; }
        public bool IsOnline { get; set; }
        public int CurrentLoad { get; set; }
        public int CasCloturees { get; set; }
        public int WorkMinutes { get; set; }
        public int PauseMinutes { get; set; }
        public double PauseRatePercent { get; set; }
    }
}
