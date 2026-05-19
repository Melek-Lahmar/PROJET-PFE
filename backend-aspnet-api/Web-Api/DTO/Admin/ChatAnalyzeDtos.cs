using System;
using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>
    /// Couche B — Analyse statistique on-demand. Calculée à la volée depuis la DB.
    /// 5 opérations : trend, compare, anomaly, correlation, distribution.
    /// </summary>
    public class ChatAnalyzeRequestDto
    {
        /// <summary>trend | compare | anomaly | correlation | distribution</summary>
        public string Operation { get; set; } = "trend";

        public ChatAnalyzeSubjectDto Subject { get; set; } = new();

        public ChatAnalyzeOptionsDto Options { get; set; } = new();
    }

    public class ChatAnalyzeSubjectDto
    {
        /// <summary>orders | claims | demandes</summary>
        public string Entity { get; set; } = "orders";

        /// <summary>count | sum_amount | return_rate | delivery_rate | claim_rate</summary>
        public string Metric { get; set; } = "count";

        public ChatQueryFiltersDto Filters { get; set; } = new();
    }

    public class ChatAnalyzeOptionsDto
    {
        /// <summary>day | week | month — utilisé pour trend / anomaly</summary>
        public string? Granularity { get; set; }

        /// <summary>governorate | driver | confirmatrice | motif | status — utilisé pour compare</summary>
        public string? GroupBy { get; set; }

        /// <summary>Fenêtre baseline en jours pour anomaly (défaut 30).</summary>
        public int? BaselineWindow { get; set; }

        /// <summary>Métrique secondaire pour correlation.</summary>
        public string? SecondMetric { get; set; }

        /// <summary>Top N pour compare (défaut 10).</summary>
        public int? TopN { get; set; }
    }

    public class ChatAnalyzeResponseDto
    {
        public string Operation { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;

        // trend
        public ChatTrendResultDto? Trend { get; set; }

        // compare
        public List<ChatCompareGroupDto>? Compare { get; set; }

        // anomaly
        public List<ChatAnomalyDto>? Anomalies { get; set; }

        // correlation
        public ChatCorrelationDto? Correlation { get; set; }

        // distribution
        public ChatDistributionDto? Distribution { get; set; }

        public List<ChatQuerySeriesPointDto>? Series { get; set; }
        public List<string> Warnings { get; set; } = new();
    }

    public class ChatTrendResultDto
    {
        public decimal Slope { get; set; }
        public decimal Intercept { get; set; }
        public decimal R2 { get; set; }
        /// <summary>up | down | flat</summary>
        public string Direction { get; set; } = "flat";
        public decimal ChangePct { get; set; }
        public int Samples { get; set; }
    }

    public class ChatCompareGroupDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public decimal? Rate { get; set; }
        public int Samples { get; set; }
    }

    public class ChatAnomalyDto
    {
        public string Bucket { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public decimal Mean { get; set; }
        public decimal Std { get; set; }
        public decimal ZScore { get; set; }
        public string Severity { get; set; } = "low"; // low | medium | high
    }

    public class ChatCorrelationDto
    {
        public decimal Pearson { get; set; }
        public int Samples { get; set; }
        public string Strength { get; set; } = "none";  // none | weak | moderate | strong
        public string Direction { get; set; } = "flat"; // positive | negative | flat
    }

    public class ChatDistributionDto
    {
        public decimal Mean { get; set; }
        public decimal Std { get; set; }
        public decimal P25 { get; set; }
        public decimal P50 { get; set; }
        public decimal P75 { get; set; }
        public decimal P95 { get; set; }
        public int Samples { get; set; }
    }
}
