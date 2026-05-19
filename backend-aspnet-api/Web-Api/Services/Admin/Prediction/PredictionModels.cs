using Microsoft.ML.Data;

namespace Web_Api.Services.Admin.Prediction
{
    // ====================================================================
    // RETURN RISK — Classification binaire (commande retournée ou non)
    // ====================================================================
    public class ReturnRiskInput
    {
        [LoadColumn(0)] public string Governorate { get; set; } = string.Empty;
        [LoadColumn(1)] public float Amount { get; set; }
        [LoadColumn(2)] public string PaymentMode { get; set; } = string.Empty;
        [LoadColumn(3)] public string ClientType { get; set; } = string.Empty;
        [LoadColumn(4)] public float DayOfWeek { get; set; }
        [LoadColumn(5)] public float PriorReturns { get; set; }
        [LoadColumn(6)] public bool WasReturned { get; set; }
    }

    public class ReturnRiskPrediction
    {
        [ColumnName("PredictedLabel")] public bool WillReturn { get; set; }
        public float Probability { get; set; }
        public float Score { get; set; }
    }

    // ====================================================================
    // DELIVERY FIRST ATTEMPT — livrée du premier coup ou pas
    // ====================================================================
    public class DeliveryFirstAttemptInput
    {
        [LoadColumn(0)] public string Governorate { get; set; } = string.Empty;
        [LoadColumn(1)] public float Amount { get; set; }
        [LoadColumn(2)] public string PaymentMode { get; set; } = string.Empty;
        [LoadColumn(3)] public string DeliveryMode { get; set; } = string.Empty;
        [LoadColumn(4)] public float DayOfWeek { get; set; }
        [LoadColumn(5)] public bool DeliveredFirstAttempt { get; set; }
    }

    public class DeliveryFirstAttemptPrediction
    {
        [ColumnName("PredictedLabel")] public bool WillSucceed { get; set; }
        public float Probability { get; set; }
        public float Score { get; set; }
    }

    // ====================================================================
    // VOLUME FORECAST — SSA time series (commandes par jour)
    // ====================================================================
    public class VolumeInput
    {
        public float Orders { get; set; }
    }

    public class VolumeForecast
    {
        public float[] ForecastedOrders { get; set; } = System.Array.Empty<float>();
        public float[] LowerBound { get; set; } = System.Array.Empty<float>();
        public float[] UpperBound { get; set; } = System.Array.Empty<float>();
    }
}
