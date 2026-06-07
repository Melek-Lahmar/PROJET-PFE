using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>
    /// Couche C — Endpoint de prédiction ML.NET.
    /// Le payload `input` change selon `task`.
    /// </summary>
    public class ChatPredictRequestDto
    {
        /// <summary>return_risk | delivery_first_attempt | volume_forecast | revenue_forecast | claims_forecast</summary>
        public string Task { get; set; } = "return_risk";

        public ChatPredictInputDto Input { get; set; } = new();
    }

    public class ChatPredictInputDto
    {
        // return_risk / delivery_first_attempt
        public string? DoPiece { get; set; }
        public string? Governorate { get; set; }
        public decimal? Amount { get; set; }
        public string? PaymentMode { get; set; }
        public string? DeliveryMode { get; set; }
        public string? ClientType { get; set; }     // B2C | B2B
        public string? DayOfWeek { get; set; }       // Monday..Sunday
        public int? PriorReturns { get; set; }

        // volume_forecast / revenue_forecast / claims_forecast
        public int? HorizonDays { get; set; }
        /// <summary>orders | bl — cible de la prévision de volume.</summary>
        public string? TargetEntity { get; set; }
        /// <summary>next_week | next_month | next_year — période demandée en langage naturel.</summary>
        public string? Period { get; set; }
    }

    public class ChatPredictResponseDto
    {
        public string Task { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;

        /// <summary>Score brut de la prédiction (probabilité 0..1, ou valeur prévue).</summary>
        public double? Prediction { get; set; }
        public double? Confidence { get; set; }

        public string? Explanation { get; set; }
        public List<ChatPredictFactorDto>? Factors { get; set; }

        /// <summary>Pour volume_forecast : série prédite jour par jour.</summary>
        public List<ChatPredictForecastPointDto>? Forecast { get; set; }

        public ChatPredictMetaDto Meta { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class ChatPredictFactorDto
    {
        public string Name { get; set; } = string.Empty;
        public double Weight { get; set; }
        public string? Value { get; set; }
    }

    public class ChatPredictForecastPointDto
    {
        public string Date { get; set; } = string.Empty;
        public double Value { get; set; }
        public double LowerBound { get; set; }
        public double UpperBound { get; set; }
    }

    public class ChatPredictMetaDto
    {
        public string ModelType { get; set; } = string.Empty;
        public string TrainedFrom { get; set; } = string.Empty; // "real_data" | "synthetic"
        public int TrainSamples { get; set; }
        public double TrainAccuracy { get; set; }
    }
}
