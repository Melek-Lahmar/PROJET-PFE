using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>
    /// Filtres reçus depuis l'espace admin Flutter pour l'overview cockpit.
    /// </summary>
    public class AdminDashboardQueryDto
    {
        /// <summary>Code période ("today", "7d", "30d", "3m", "12m"). Optionnel si From/To fournis.</summary>
        public string? Period { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        /// <summary>Nom du gouvernorat (ex : "Sfax"). null = tous.</summary>
        public string? Governorate { get; set; }
        public int? TopN { get; set; }
    }

    public class AdminDashboardAppliedFiltersDto
    {
        public string Period { get; set; } = "30d";
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public string? Governorate { get; set; }
        public int TopN { get; set; } = 5;
    }

    /// <summary>
    /// Carte KPI premium : valeur courante + valeur période précédente +
    /// delta calculé (signe et %) prêt à afficher côté Flutter.
    /// </summary>
    public class AdminKpiDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string FormattedValue { get; set; } = string.Empty;
        public decimal? PreviousValue { get; set; }
        public decimal? DeltaPercent { get; set; }
        /// <summary>up | down | flat</summary>
        public string DeltaDirection { get; set; } = "flat";
        /// <summary>"count" | "currency" | "percent"</summary>
        public string Format { get; set; } = "count";
    }

    public class AdminTrendPointDto
    {
        public string Bucket { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Primary { get; set; }
        public decimal? Secondary { get; set; }
    }

    public class AdminBreakdownItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Réponse complète du Dashboard global admin.
    /// Tout est servi en un seul appel pour limiter les allers-retours réseau.
    /// </summary>
    public class AdminDashboardOverviewDto
    {
        public DateTime GeneratedAt { get; set; }
        public AdminDashboardAppliedFiltersDto AppliedFilters { get; set; } = new();
        public List<AdminKpiDto> Kpis { get; set; } = new();
        /// <summary>Time series livrées (Primary) vs retournées (Secondary) par bucket.</summary>
        public List<AdminTrendPointDto> DeliveriesVsReturns { get; set; } = new();
        /// <summary>Time series volume commandes par bucket.</summary>
        public List<AdminTrendPointDto> VolumeTrend { get; set; } = new();
        /// <summary>Répartition des commandes par statut (donut).</summary>
        public List<AdminBreakdownItemDto> StatusBreakdown { get; set; } = new();
        /// <summary>Top gouvernorats par volume (bar).</summary>
        public List<AdminBreakdownItemDto> GovernorateBreakdown { get; set; } = new();
    }
}
