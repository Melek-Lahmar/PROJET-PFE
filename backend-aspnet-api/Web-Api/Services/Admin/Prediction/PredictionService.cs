using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.ML;
using Microsoft.ML.Data;
using Microsoft.ML.Transforms.TimeSeries;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Model;

namespace Web_Api.Services.Admin.Prediction
{
    /// <summary>
    /// Couche C — Service de prédiction ML.NET. Cinq tâches :
    ///   - return_risk           : probabilité qu'une commande soit retournée
    ///   - delivery_first_attempt : probabilité qu'une livraison réussisse au 1er essai
    ///   - volume_forecast        : prévision de volume sur N jours (SSA time series)
    ///   - revenue_forecast       : prévision du chiffre d'affaires sur N jours
    ///   - claims_forecast        : prévision du volume de réclamations sur N jours
    ///
    /// Les modèles sont entraînés une fois au premier appel (lazy) et mis en cache
    /// en mémoire. Si les données réelles sont insuffisantes (commandes < 50, ou
    /// série temporelle &lt; 30 jours), un dataset synthétique est généré pour
    /// permettre à la démo PFE de fonctionner.
    /// </summary>
    public class PredictionService
    {
        private const int MinRealReturnSamples = 50;
        private const int MinRealVolumeDays = 30;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PredictionService> _logger;
        private readonly MLContext _ml;

        // Caches des modèles entraînés (une seule fois par process).
        private ITransformer? _returnRiskModel;
        private DataViewSchema? _returnRiskSchema;
        private string _returnRiskTrainedFrom = "synthetic";
        private int _returnRiskSamples;
        private double _returnRiskAccuracy;

        private ITransformer? _deliveryModel;
        private DataViewSchema? _deliverySchema;
        private string _deliveryTrainedFrom = "synthetic";
        private int _deliverySamples;
        private double _deliveryAccuracy;

        private readonly object _trainLock = new();

        public PredictionService(IServiceScopeFactory scopeFactory, ILogger<PredictionService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _ml = new MLContext(seed: 42);
        }

        // ====================================================================
        // Entrée principale
        // ====================================================================
        public async Task<ChatPredictResponseDto> PredictAsync(
            ChatPredictRequestDto req, CancellationToken ct)
        {
            req ??= new ChatPredictRequestDto();
            req.Input ??= new ChatPredictInputDto();
            var task = (req.Task ?? "return_risk").Trim().ToLowerInvariant();

            return task switch
            {
                "return_risk" => await PredictReturnRiskAsync(req, ct),
                "delivery_first_attempt" => await PredictDeliveryFirstAsync(req, ct),
                "volume_forecast" => await PredictVolumeForecastAsync(req, ct),
                "revenue_forecast" => await PredictRevenueForecastAsync(req, ct),
                "claims_forecast" => await PredictClaimsForecastAsync(req, ct),
                _ => Unsupported($"Tâche inconnue : {task}")
            };
        }

        // ====================================================================
        // RETURN RISK
        // ====================================================================
        private async Task<ChatPredictResponseDto> PredictReturnRiskAsync(
            ChatPredictRequestDto req, CancellationToken ct)
        {
            await EnsureReturnRiskModelAsync(ct);
            if (_returnRiskModel == null || _returnRiskSchema == null)
                return Unsupported("Modèle return_risk indisponible.");

            var input = await ResolveReturnRiskInputAsync(req.Input, ct);
            var engine = _ml.Model.CreatePredictionEngine<ReturnRiskInput, ReturnRiskPrediction>(
                _returnRiskModel, _returnRiskSchema);
            var p = engine.Predict(input);

            var prob = (double)Sigmoid(p.Score);
            var factors = BuildReturnRiskFactors(input, prob);
            var confidence = ConfidenceFromProb(prob);

            return new ChatPredictResponseDto
            {
                Task = "return_risk",
                Label = $"Risque de retour estimé : {Math.Round(prob * 100, 1)}%",
                Prediction = Math.Round(prob, 3),
                Confidence = Math.Round(confidence, 2),
                Explanation = ExplainReturnRisk(input, prob),
                Factors = factors,
                Meta = new ChatPredictMetaDto
                {
                    ModelType = "BinaryClassification (SDCA Logistic Regression)",
                    TrainedFrom = _returnRiskTrainedFrom,
                    TrainSamples = _returnRiskSamples,
                    TrainAccuracy = Math.Round(_returnRiskAccuracy, 3)
                }
            };
        }

        private async Task EnsureReturnRiskModelAsync(CancellationToken ct)
        {
            if (_returnRiskModel != null) return;

            // Charge des données réelles si possible, sinon synthétiques.
            var realData = await LoadRealReturnRiskAsync(ct);
            List<ReturnRiskInput> data;
            string trainedFrom;
            if (realData.Count >= MinRealReturnSamples)
            {
                data = realData;
                trainedFrom = "real_data";
            }
            else
            {
                data = SyntheticDataGenerator.GenerateReturnRiskDataset(500);
                trainedFrom = "synthetic";
                _logger.LogInformation(
                    "PredictionService: real return_risk samples={count} < {min}, fallback synthetic.",
                    realData.Count, MinRealReturnSamples);
            }

            lock (_trainLock)
            {
                if (_returnRiskModel != null) return; // double-check

                var dataView = _ml.Data.LoadFromEnumerable(data);
                var split = _ml.Data.TrainTestSplit(dataView, testFraction: 0.2);

                var pipeline = _ml.Transforms.Categorical.OneHotEncoding(new[]
                    {
                        new InputOutputColumnPair("GovEnc", nameof(ReturnRiskInput.Governorate)),
                        new InputOutputColumnPair("PayEnc", nameof(ReturnRiskInput.PaymentMode)),
                        new InputOutputColumnPair("CliEnc", nameof(ReturnRiskInput.ClientType))
                    })
                    .Append(_ml.Transforms.Concatenate("Features",
                        "GovEnc", "PayEnc", "CliEnc",
                        nameof(ReturnRiskInput.Amount),
                        nameof(ReturnRiskInput.DayOfWeek),
                        nameof(ReturnRiskInput.PriorReturns)))
                    .Append(_ml.Transforms.NormalizeMinMax("Features"))
                    .Append(_ml.BinaryClassification.Trainers.SdcaLogisticRegression(
                        labelColumnName: nameof(ReturnRiskInput.WasReturned),
                        featureColumnName: "Features"));

                var model = pipeline.Fit(split.TrainSet);
                var preds = model.Transform(split.TestSet);
                var metrics = _ml.BinaryClassification.Evaluate(preds,
                    labelColumnName: nameof(ReturnRiskInput.WasReturned));

                _returnRiskModel = model;
                _returnRiskSchema = dataView.Schema;
                _returnRiskTrainedFrom = trainedFrom;
                _returnRiskSamples = data.Count;
                _returnRiskAccuracy = metrics.Accuracy;

                _logger.LogInformation(
                    "PredictionService: return_risk trained ({samples} samples, accuracy={acc:0.000}, source={src}).",
                    data.Count, metrics.Accuracy, trainedFrom);
            }
        }

        private async Task<List<ReturnRiskInput>> LoadRealReturnRiskAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // On considère "retournée" = la livraison existe avec LI_Statut = Retour.
            var orders = await db.F_DOCENTETES.AsNoTracking()
                .Where(o => o.DO_Domaine == 0 && o.DO_Type == 0)
                .Select(o => new
                {
                    o.DO_Piece, o.DO_Tiers, o.DO_Date,
                    o.DO_TotalTTC, o.DO_NetAPayer,
                    o.DO_ModePaiement
                })
                .ToListAsync(ct);

            if (orders.Count == 0) return new List<ReturnRiskInput>();

            var pieces = orders.Select(o => o.DO_Piece).Where(p => !string.IsNullOrWhiteSpace(p)).Cast<string>().ToHashSet();
            var livraisons = await db.F_LIVRAISONS.AsNoTracking()
                .Where(l => pieces.Contains(l.DO_Piece))
                .Select(l => new { l.DO_Piece, l.LI_Statut })
                .ToListAsync(ct);
            var statByPiece = livraisons.GroupBy(l => l.DO_Piece)
                .ToDictionary(g => g.Key, g => g.First().LI_Statut, StringComparer.OrdinalIgnoreCase);

            var profiles = await db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var profByTier = profiles
                .Where(p => !string.IsNullOrWhiteSpace(p.CodeClientSage))
                .GroupBy(p => p.CodeClientSage!.ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.First());

            // Compteur de retours antérieurs par tiers (cumulatif chronologique).
            var sortedOrders = orders.Where(o => !string.IsNullOrWhiteSpace(o.DO_Tiers))
                .OrderBy(o => o.DO_Date).ToList();
            var priorByTier = new Dictionary<string, int>();
            var result = new List<ReturnRiskInput>();

            foreach (var o in sortedOrders)
            {
                if (string.IsNullOrWhiteSpace(o.DO_Piece)) continue;
                var tier = o.DO_Tiers!.ToUpperInvariant();
                priorByTier.TryGetValue(tier, out var prior);

                var wasReturned = statByPiece.TryGetValue(o.DO_Piece!, out var s)
                    && s == DeliveryStatusCodes.Retour;

                var amount = (float)(o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m);
                var profile = profByTier.TryGetValue(tier, out var p) ? p : null;
                var gov = profile?.Gouvernorat?.ToString() ?? "Tunis";
                var clientType = profile?.TypeClient?.ToString() ?? "B2C";
                var dow = (float)((int)(o.DO_Date?.DayOfWeek ?? DayOfWeek.Monday));

                result.Add(new ReturnRiskInput
                {
                    Governorate = gov,
                    Amount = amount,
                    PaymentMode = string.IsNullOrWhiteSpace(o.DO_ModePaiement) ? "CASH" : o.DO_ModePaiement!,
                    ClientType = clientType,
                    DayOfWeek = dow,
                    PriorReturns = prior,
                    WasReturned = wasReturned
                });

                if (wasReturned) priorByTier[tier] = prior + 1;
            }

            return result;
        }

        private async Task<ReturnRiskInput> ResolveReturnRiskInputAsync(
            ChatPredictInputDto input, CancellationToken ct)
        {
            // Si DoPiece fourni, on essaie de résoudre les features depuis la DB.
            if (!string.IsNullOrWhiteSpace(input.DoPiece))
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var piece = input.DoPiece!.Trim();
                var order = await db.F_DOCENTETES.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.DO_Piece == piece, ct);
                if (order != null)
                {
                    var profile = !string.IsNullOrWhiteSpace(order.DO_Tiers)
                        ? await db.ProfilsUtilisateurs.AsNoTracking()
                            .FirstOrDefaultAsync(p => p.CodeClientSage == order.DO_Tiers, ct)
                        : null;

                    return new ReturnRiskInput
                    {
                        Governorate = input.Governorate
                            ?? profile?.Gouvernorat?.ToString()
                            ?? "Tunis",
                        Amount = (float)(input.Amount ?? order.DO_TotalTTC ?? order.DO_NetAPayer ?? 0m),
                        PaymentMode = input.PaymentMode ?? order.DO_ModePaiement ?? "CASH",
                        ClientType = input.ClientType ?? profile?.TypeClient?.ToString() ?? "B2C",
                        DayOfWeek = ResolveDayOfWeek(input.DayOfWeek, order.DO_Date),
                        PriorReturns = input.PriorReturns ?? 0
                    };
                }
            }

            // Sinon on lit directement depuis l'input.
            return new ReturnRiskInput
            {
                Governorate = input.Governorate ?? "Tunis",
                Amount = (float)(input.Amount ?? 100m),
                PaymentMode = input.PaymentMode ?? "CASH",
                ClientType = input.ClientType ?? "B2C",
                DayOfWeek = ResolveDayOfWeek(input.DayOfWeek, null),
                PriorReturns = input.PriorReturns ?? 0
            };
        }

        // ====================================================================
        // DELIVERY FIRST ATTEMPT
        // ====================================================================
        private async Task<ChatPredictResponseDto> PredictDeliveryFirstAsync(
            ChatPredictRequestDto req, CancellationToken ct)
        {
            await EnsureDeliveryModelAsync(ct);
            if (_deliveryModel == null || _deliverySchema == null)
                return Unsupported("Modèle delivery_first_attempt indisponible.");

            var input = new DeliveryFirstAttemptInput
            {
                Governorate = req.Input.Governorate ?? "Tunis",
                Amount = (float)(req.Input.Amount ?? 100m),
                PaymentMode = req.Input.PaymentMode ?? "CASH",
                DeliveryMode = req.Input.DeliveryMode ?? "HOME",
                DayOfWeek = ResolveDayOfWeek(req.Input.DayOfWeek, null)
            };

            var engine = _ml.Model.CreatePredictionEngine<DeliveryFirstAttemptInput, DeliveryFirstAttemptPrediction>(
                _deliveryModel, _deliverySchema);
            var p = engine.Predict(input);
            var prob = (double)Sigmoid(p.Score);

            return new ChatPredictResponseDto
            {
                Task = "delivery_first_attempt",
                Label = $"Probabilité de livraison au 1er essai : {Math.Round(prob * 100, 1)}%",
                Prediction = Math.Round(prob, 3),
                Confidence = Math.Round(ConfidenceFromProb(prob), 2),
                Explanation = ExplainDelivery(input, prob),
                Meta = new ChatPredictMetaDto
                {
                    ModelType = "BinaryClassification (SDCA Logistic Regression)",
                    TrainedFrom = _deliveryTrainedFrom,
                    TrainSamples = _deliverySamples,
                    TrainAccuracy = Math.Round(_deliveryAccuracy, 3)
                }
            };
        }

        private async Task EnsureDeliveryModelAsync(CancellationToken ct)
        {
            if (_deliveryModel != null) return;

            // Pour V1 PFE, toujours synthétique (les données réelles ne distinguent
            // pas facilement "1er essai" vs "réessai" sans plus de logique).
            var data = SyntheticDataGenerator.GenerateDeliveryDataset(500);

            lock (_trainLock)
            {
                if (_deliveryModel != null) return;

                var dataView = _ml.Data.LoadFromEnumerable(data);
                var split = _ml.Data.TrainTestSplit(dataView, testFraction: 0.2);

                var pipeline = _ml.Transforms.Categorical.OneHotEncoding(new[]
                    {
                        new InputOutputColumnPair("GovEnc", nameof(DeliveryFirstAttemptInput.Governorate)),
                        new InputOutputColumnPair("PayEnc", nameof(DeliveryFirstAttemptInput.PaymentMode)),
                        new InputOutputColumnPair("DelEnc", nameof(DeliveryFirstAttemptInput.DeliveryMode))
                    })
                    .Append(_ml.Transforms.Concatenate("Features",
                        "GovEnc", "PayEnc", "DelEnc",
                        nameof(DeliveryFirstAttemptInput.Amount),
                        nameof(DeliveryFirstAttemptInput.DayOfWeek)))
                    .Append(_ml.Transforms.NormalizeMinMax("Features"))
                    .Append(_ml.BinaryClassification.Trainers.SdcaLogisticRegression(
                        labelColumnName: nameof(DeliveryFirstAttemptInput.DeliveredFirstAttempt),
                        featureColumnName: "Features"));

                var model = pipeline.Fit(split.TrainSet);
                var preds = model.Transform(split.TestSet);
                var metrics = _ml.BinaryClassification.Evaluate(preds,
                    labelColumnName: nameof(DeliveryFirstAttemptInput.DeliveredFirstAttempt));

                _deliveryModel = model;
                _deliverySchema = dataView.Schema;
                _deliveryTrainedFrom = "synthetic";
                _deliverySamples = data.Count;
                _deliveryAccuracy = metrics.Accuracy;

                _logger.LogInformation(
                    "PredictionService: delivery_first trained ({samples} samples, accuracy={acc:0.000}).",
                    data.Count, metrics.Accuracy);
            }

            await Task.CompletedTask;
        }

        // ====================================================================
        // VOLUME FORECAST — SSA time series
        // ====================================================================
        private async Task<ChatPredictResponseDto> PredictVolumeForecastAsync(
            ChatPredictRequestDto req, CancellationToken ct)
        {
            var targetEntity = NormalizeVolumeTarget(req.Input.TargetEntity);
            var targetLabel = targetEntity == "bl" ? "BL" : "commandes";
            var period = NormalizeForecastPeriod(req.Input.Period);
            var requestedHorizon = ResolveVolumeHorizon(req.Input.HorizonDays, period);
            var modelHorizon = period == "next_year" || requestedHorizon > 90
                ? 30
                : Math.Min(requestedHorizon, 90);

            var (series, trainedFrom, trueDates) = await BuildVolumeSeriesAsync(targetEntity, ct);

            if (series.Count < 14)
            {
                return new ChatPredictResponseDto
                {
                    Task = "volume_forecast",
                    Label = $"Données insuffisantes pour prévoir le volume de {targetLabel}.",
                    Warnings = new List<string>
                    {
                        $"Minimum 14 jours requis (actuel : {series.Count})."
                    },
                    Meta = new ChatPredictMetaDto
                    {
                        ModelType = "SSA Time Series",
                        TrainedFrom = trainedFrom,
                        TrainSamples = series.Count
                    }
                };
            }

            var dataView = _ml.Data.LoadFromEnumerable(series);
            var pipeline = _ml.Forecasting.ForecastBySsa(
                outputColumnName: nameof(VolumeForecast.ForecastedOrders),
                inputColumnName: nameof(VolumeInput.Orders),
                windowSize: 7,
                seriesLength: Math.Min(series.Count, 90),
                trainSize: series.Count,
                horizon: modelHorizon,
                confidenceLevel: 0.95f,
                confidenceLowerBoundColumn: nameof(VolumeForecast.LowerBound),
                confidenceUpperBoundColumn: nameof(VolumeForecast.UpperBound));

            var model = pipeline.Fit(dataView);
            var engine = model.CreateTimeSeriesEngine<VolumeInput, VolumeForecast>(_ml);
            var forecast = engine.Predict();

            var startDate = trueDates.Count > 0 ? trueDates.Max().AddDays(1) : DateTime.UtcNow.Date.AddDays(1);
            var points = new List<ChatPredictForecastPointDto>();
            for (var i = 0; i < forecast.ForecastedOrders.Length; i++)
            {
                points.Add(new ChatPredictForecastPointDto
                {
                    Date = startDate.AddDays(i).ToString("yyyy-MM-dd"),
                    Value = Math.Round(Math.Max(0, forecast.ForecastedOrders[i]), 1),
                    LowerBound = Math.Round(Math.Max(0, forecast.LowerBound[i]), 1),
                    UpperBound = Math.Round(Math.Max(0, forecast.UpperBound[i]), 1)
                });
            }

            if (period == "next_year" || requestedHorizon > 90)
            {
                return BuildAnnualVolumeForecast(points, series, trainedFrom, targetLabel);
            }

            var totalForecast = forecast.ForecastedOrders.Sum();
            return new ChatPredictResponseDto
            {
                Task = "volume_forecast",
                Label = $"Volume prévu sur {modelHorizon} jour(s) : ~{Math.Round(totalForecast, 0)} {targetLabel}",
                Prediction = Math.Round(totalForecast, 1),
                Confidence = trainedFrom == "real_sparse" ? 0.70 : 0.95,
                Explanation = $"Modèle SSA entraîné sur {series.Count} jours d'historique " +
                              $"(cible : {targetLabel}, source : {trainedFrom}, fenêtre 7j, horizon {modelHorizon}j, IC 95%).",
                Forecast = points,
                Meta = new ChatPredictMetaDto
                {
                    ModelType = "SSA Time Series Forecasting",
                    TrainedFrom = trainedFrom,
                    TrainSamples = series.Count
                }
            };
        }

        private async Task<(List<VolumeInput> series, string trainedFrom, List<DateTime> dates)>
            BuildVolumeSeriesAsync(string targetEntity, CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var orders = targetEntity == "bl"
                ? await db.F_DOCENTETES.AsNoTracking()
                    .Where(o => o.DO_Domaine == 0
                        && o.DO_Type == 1
                        && o.DO_Date.HasValue
                        && o.DO_Piece != null
                        && o.DO_Piece.StartsWith("BL"))
                    .Select(o => o.DO_Date!.Value.Date)
                    .ToListAsync(ct)
                : await db.F_DOCENTETES.AsNoTracking()
                    .Where(o => o.DO_Domaine == 0 && o.DO_Type == 0 && o.DO_Date.HasValue)
                    .Select(o => o.DO_Date!.Value.Date)
                    .ToListAsync(ct);

            if (targetEntity == "bl" && orders.Count < MinRealVolumeDays)
            {
                var livraisonDates = await db.F_LIVRAISONS.AsNoTracking()
                    .Where(l => l.DO_Piece != null && l.DO_Piece.StartsWith("BL"))
                    .Select(l => l.LI_DateCreation.Date)
                    .ToListAsync(ct);
                if (livraisonDates.Count > orders.Count)
                    orders = livraisonDates;
            }

            if (orders.Count >= MinRealVolumeDays)
            {
                var dense = BuildDenseVolumeSeries(orders, MinRealVolumeDays);
                if (dense.series.Count >= MinRealVolumeDays)
                    return (dense.series, "real_data", dense.dates);
            }

            if (targetEntity == "bl" && orders.Count > 0)
            {
                var sparse = BuildDenseVolumeSeries(orders, 30);
                if (sparse.series.Count >= 14)
                    return (sparse.series, "real_sparse", sparse.dates);
            }

            // Fallback synthétique.
            var synth = SyntheticDataGenerator.GenerateVolumeSeries(120);
            var startDate = DateTime.UtcNow.Date.AddDays(-synth.Count);
            var fakeDates = Enumerable.Range(0, synth.Count).Select(i => startDate.AddDays(i)).ToList();
            return (synth, "synthetic", fakeDates);
        }

        private static (List<VolumeInput> series, List<DateTime> dates) BuildDenseVolumeSeries(
            List<DateTime> sourceDates,
            int minimumDays)
        {
            var grouped = sourceDates.GroupBy(d => d.Date).OrderBy(g => g.Key).ToList();
            var min = grouped.First().Key;
            var max = grouped.Last().Key;
            var requiredMin = max.AddDays(-(minimumDays - 1));
            if (min > requiredMin) min = requiredMin;

            var dict = grouped.ToDictionary(g => g.Key, g => g.Count());
            var series = new List<VolumeInput>();
            var dates = new List<DateTime>();
            for (var d = min; d <= max; d = d.AddDays(1))
            {
                series.Add(new VolumeInput { Orders = dict.TryGetValue(d, out var c) ? c : 0 });
                dates.Add(d);
            }
            return (series, dates);
        }

        private static ChatPredictResponseDto BuildAnnualVolumeForecast(
            List<ChatPredictForecastPointDto> dailyForecast,
            List<VolumeInput> trainingSeries,
            string trainedFrom,
            string targetLabel)
        {
            var nextYear = DateTime.UtcNow.Year + 1;
            var trainSamples = trainingSeries.Count;
            var historicalAvg = trainingSeries.Count == 0 ? 0d : trainingSeries.Average(p => p.Orders);
            var forecastAvg = dailyForecast.Count == 0 ? historicalAvg : dailyForecast.Average(p => p.Value);
            var avg = trainedFrom == "real_sparse" ? historicalAvg : forecastAvg;
            var avgLower = trainedFrom == "real_sparse"
                ? avg * 0.70
                : dailyForecast.Count == 0 ? avg * 0.70 : dailyForecast.Average(p => p.LowerBound);
            var avgUpper = trainedFrom == "real_sparse"
                ? avg * 1.30
                : dailyForecast.Count == 0 ? avg * 1.30 : dailyForecast.Average(p => p.UpperBound);
            var confidence = trainedFrom == "real_sparse" ? 0.60 : 0.80;

            var monthly = new List<ChatPredictForecastPointDto>();
            for (var month = 1; month <= 12; month++)
            {
                var days = DateTime.DaysInMonth(nextYear, month);
                monthly.Add(new ChatPredictForecastPointDto
                {
                    Date = $"{nextYear}-{month:00}",
                    Value = Math.Round(Math.Max(0, avg * days), 0),
                    LowerBound = Math.Round(Math.Max(0, avgLower * days), 0),
                    UpperBound = Math.Round(Math.Max(0, avgUpper * days), 0)
                });
            }

            var total = monthly.Sum(p => p.Value);
            return new ChatPredictResponseDto
            {
                Task = "volume_forecast",
                Label = $"Nombre de {targetLabel} prévu pour {nextYear} : ~{Math.Round(total, 0)} {targetLabel}",
                Prediction = Math.Round(total, 1),
                Confidence = confidence,
                Explanation = $"Projection annuelle par extrapolation du modèle SSA court terme, entraîné sur {trainSamples} jours d'historique " +
                              $"(cible : {targetLabel}, source : {trainedFrom}, base 30j, agrégation mensuelle).",
                Forecast = monthly,
                Meta = new ChatPredictMetaDto
                {
                    ModelType = "SSA Time Series Forecasting + annual extrapolation",
                    TrainedFrom = trainedFrom,
                    TrainSamples = trainSamples
                },
                Warnings = new List<string>
                {
                    trainedFrom == "real_sparse"
                        ? "Historique réel limité : estimation long terme à vérifier dès que plus de BL sont disponibles."
                        : "Prévision long terme extrapolée : à utiliser comme estimation, pas comme certitude opérationnelle."
                }
            };
        }

        // ====================================================================
        // REVENUE / CLAIMS FORECAST — SSA time series générique
        // ====================================================================
        private async Task<ChatPredictResponseDto> PredictRevenueForecastAsync(
            ChatPredictRequestDto req, CancellationToken ct)
        {
            var measures = await LoadRevenueDailyMeasuresAsync(ct);
            return PredictMeasureForecast(
                req,
                task: "revenue_forecast",
                targetLabel: "chiffre d'affaires",
                unit: "TND",
                sourceMeasures: measures);
        }

        private async Task<ChatPredictResponseDto> PredictClaimsForecastAsync(
            ChatPredictRequestDto req, CancellationToken ct)
        {
            var measures = await LoadClaimsDailyMeasuresAsync(ct);
            return PredictMeasureForecast(
                req,
                task: "claims_forecast",
                targetLabel: "réclamations",
                unit: "réclamations",
                sourceMeasures: measures);
        }

        private ChatPredictResponseDto PredictMeasureForecast(
            ChatPredictRequestDto req,
            string task,
            string targetLabel,
            string unit,
            List<DailyMeasure> sourceMeasures)
        {
            var period = NormalizeForecastPeriod(req.Input.Period);
            var requestedHorizon = ResolveVolumeHorizon(req.Input.HorizonDays, period);
            var modelHorizon = period == "next_year" || requestedHorizon > 90
                ? 30
                : Math.Min(requestedHorizon, 90);

            var (series, trainedFrom, trueDates) = BuildMeasureSeries(sourceMeasures, task);
            if (series.Count < 14)
            {
                return new ChatPredictResponseDto
                {
                    Task = task,
                    Label = $"Données insuffisantes pour prévoir {targetLabel}.",
                    Warnings = new List<string>
                    {
                        $"Minimum 14 jours requis (actuel : {series.Count})."
                    },
                    Meta = new ChatPredictMetaDto
                    {
                        ModelType = "SSA Time Series",
                        TrainedFrom = trainedFrom,
                        TrainSamples = series.Count
                    }
                };
            }

            var dataView = _ml.Data.LoadFromEnumerable(series);
            var pipeline = _ml.Forecasting.ForecastBySsa(
                outputColumnName: nameof(VolumeForecast.ForecastedOrders),
                inputColumnName: nameof(VolumeInput.Orders),
                windowSize: 7,
                seriesLength: Math.Min(series.Count, 90),
                trainSize: series.Count,
                horizon: modelHorizon,
                confidenceLevel: 0.95f,
                confidenceLowerBoundColumn: nameof(VolumeForecast.LowerBound),
                confidenceUpperBoundColumn: nameof(VolumeForecast.UpperBound));

            var model = pipeline.Fit(dataView);
            var engine = model.CreateTimeSeriesEngine<VolumeInput, VolumeForecast>(_ml);
            var forecast = engine.Predict();

            var startDate = trueDates.Count > 0 ? trueDates.Max().AddDays(1) : DateTime.UtcNow.Date.AddDays(1);
            var points = new List<ChatPredictForecastPointDto>();
            for (var i = 0; i < forecast.ForecastedOrders.Length; i++)
            {
                points.Add(new ChatPredictForecastPointDto
                {
                    Date = startDate.AddDays(i).ToString("yyyy-MM-dd"),
                    Value = Math.Round(Math.Max(0, forecast.ForecastedOrders[i]), unit == "TND" ? 3 : 1),
                    LowerBound = Math.Round(Math.Max(0, forecast.LowerBound[i]), unit == "TND" ? 3 : 1),
                    UpperBound = Math.Round(Math.Max(0, forecast.UpperBound[i]), unit == "TND" ? 3 : 1)
                });
            }

            if (period == "next_year" || requestedHorizon > 90)
            {
                return BuildAnnualMeasureForecast(points, series, trainedFrom, task, targetLabel, unit);
            }

            var totalForecast = forecast.ForecastedOrders.Sum();
            var warnings = BuildForecastWarnings(trainedFrom, targetLabel);
            return new ChatPredictResponseDto
            {
                Task = task,
                Label = $"{HumanizeForecastTarget(targetLabel)} {ForecastAgreement(targetLabel)} sur {modelHorizon} jour(s) : ~{FormatForecastValue(totalForecast, unit)}",
                Prediction = Math.Round(totalForecast, unit == "TND" ? 3 : 1),
                Confidence = trainedFrom == "real_sparse" ? 0.70 : 0.95,
                Explanation = $"Modèle SSA entraîné sur {series.Count} jours d'historique " +
                              $"(cible : {targetLabel}, source : {trainedFrom}, fenêtre 7j, horizon {modelHorizon}j, IC 95%).",
                Forecast = points,
                Meta = new ChatPredictMetaDto
                {
                    ModelType = "SSA Time Series Forecasting",
                    TrainedFrom = trainedFrom,
                    TrainSamples = series.Count
                },
                Warnings = warnings
            };
        }

        private async Task<List<DailyMeasure>> LoadRevenueDailyMeasuresAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var rows = await db.F_DOCENTETES.AsNoTracking()
                .Where(o => o.DO_Domaine == 0 && o.DO_Type == F_DOCENTETE.DOC_TYPE_BC && o.DO_Date.HasValue)
                .Select(o => new
                {
                    o.DO_Date,
                    o.DO_TotalTTC,
                    o.DO_NetAPayer
                })
                .ToListAsync(ct);

            return rows
                .Select(o => new
                {
                    Date = o.DO_Date!.Value.Date,
                    Value = (float)(o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m)
                })
                .Where(o => o.Value >= 0)
                .GroupBy(o => o.Date)
                .Select(g => new DailyMeasure { Date = g.Key, Value = g.Sum(x => x.Value) })
                .OrderBy(x => x.Date)
                .ToList();
        }

        private async Task<List<DailyMeasure>> LoadClaimsDailyMeasuresAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var dates = await db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.TypeCas == "RECLAMATION")
                .Select(r => r.CreatedAt.Date)
                .ToListAsync(ct);

            return dates
                .GroupBy(d => d.Date)
                .Select(g => new DailyMeasure { Date = g.Key, Value = g.Count() })
                .OrderBy(x => x.Date)
                .ToList();
        }

        private static (List<VolumeInput> series, string trainedFrom, List<DateTime> dates)
            BuildMeasureSeries(List<DailyMeasure> sourceMeasures, string task)
        {
            if (sourceMeasures.Count >= MinRealVolumeDays)
            {
                var dense = BuildDenseMeasureSeries(sourceMeasures, MinRealVolumeDays);
                if (dense.series.Count >= MinRealVolumeDays)
                    return (dense.series, "real_data", dense.dates);
            }

            if (sourceMeasures.Count > 0)
            {
                var sparse = BuildDenseMeasureSeries(sourceMeasures, 30);
                if (sparse.series.Count >= 14)
                    return (sparse.series, "real_sparse", sparse.dates);
            }

            var synth = task == "revenue_forecast"
                ? GenerateSyntheticMeasureSeries(days: 120, baseLevel: 1800, seed: 45, weekdayAmplitude: 420)
                : GenerateSyntheticMeasureSeries(days: 120, baseLevel: 3.5, seed: 46, weekdayAmplitude: 1.2);
            var startDate = DateTime.UtcNow.Date.AddDays(-synth.Count);
            var fakeDates = Enumerable.Range(0, synth.Count).Select(i => startDate.AddDays(i)).ToList();
            return (synth, "synthetic", fakeDates);
        }

        private static (List<VolumeInput> series, List<DateTime> dates) BuildDenseMeasureSeries(
            List<DailyMeasure> sourceMeasures,
            int minimumDays)
        {
            var grouped = sourceMeasures
                .GroupBy(x => x.Date.Date)
                .Select(g => new DailyMeasure { Date = g.Key, Value = g.Sum(x => x.Value) })
                .OrderBy(x => x.Date)
                .ToList();

            var min = grouped.First().Date;
            var max = grouped.Last().Date;
            var requiredMin = max.AddDays(-(minimumDays - 1));
            if (min > requiredMin) min = requiredMin;

            var dict = grouped.ToDictionary(g => g.Date, g => g.Value);
            var series = new List<VolumeInput>();
            var dates = new List<DateTime>();
            for (var d = min; d <= max; d = d.AddDays(1))
            {
                series.Add(new VolumeInput { Orders = dict.TryGetValue(d, out var value) ? value : 0 });
                dates.Add(d);
            }
            return (series, dates);
        }

        private static ChatPredictResponseDto BuildAnnualMeasureForecast(
            List<ChatPredictForecastPointDto> dailyForecast,
            List<VolumeInput> trainingSeries,
            string trainedFrom,
            string task,
            string targetLabel,
            string unit)
        {
            var nextYear = DateTime.UtcNow.Year + 1;
            var trainSamples = trainingSeries.Count;
            var historicalAvg = trainingSeries.Count == 0 ? 0d : trainingSeries.Average(p => p.Orders);
            var forecastAvg = dailyForecast.Count == 0 ? historicalAvg : dailyForecast.Average(p => p.Value);
            var avg = trainedFrom == "real_sparse" ? historicalAvg : forecastAvg;
            var avgLower = trainedFrom == "real_sparse"
                ? avg * 0.70
                : dailyForecast.Count == 0 ? avg * 0.70 : dailyForecast.Average(p => p.LowerBound);
            var avgUpper = trainedFrom == "real_sparse"
                ? avg * 1.30
                : dailyForecast.Count == 0 ? avg * 1.30 : dailyForecast.Average(p => p.UpperBound);
            var confidence = trainedFrom == "real_sparse" ? 0.60 : 0.80;

            var monthly = new List<ChatPredictForecastPointDto>();
            for (var month = 1; month <= 12; month++)
            {
                var days = DateTime.DaysInMonth(nextYear, month);
                monthly.Add(new ChatPredictForecastPointDto
                {
                    Date = $"{nextYear}-{month:00}",
                    Value = Math.Round(Math.Max(0, avg * days), unit == "TND" ? 3 : 0),
                    LowerBound = Math.Round(Math.Max(0, avgLower * days), unit == "TND" ? 3 : 0),
                    UpperBound = Math.Round(Math.Max(0, avgUpper * days), unit == "TND" ? 3 : 0)
                });
            }

            var total = monthly.Sum(p => p.Value);
            return new ChatPredictResponseDto
            {
                Task = task,
                Label = $"{HumanizeForecastTarget(targetLabel)} {ForecastAgreement(targetLabel)} pour {nextYear} : ~{FormatForecastValue(total, unit)}",
                Prediction = Math.Round(total, unit == "TND" ? 3 : 1),
                Confidence = confidence,
                Explanation = $"Projection annuelle par extrapolation du modèle SSA court terme, entraîné sur {trainSamples} jours d'historique " +
                              $"(cible : {targetLabel}, source : {trainedFrom}, base 30j, agrégation mensuelle).",
                Forecast = monthly,
                Meta = new ChatPredictMetaDto
                {
                    ModelType = "SSA Time Series Forecasting + annual extrapolation",
                    TrainedFrom = trainedFrom,
                    TrainSamples = trainSamples
                },
                Warnings = BuildForecastWarnings(trainedFrom, targetLabel, annual: true)
            };
        }

        private static List<VolumeInput> GenerateSyntheticMeasureSeries(
            int days,
            double baseLevel,
            int seed,
            double weekdayAmplitude)
        {
            var rng = new Random(seed);
            var result = new List<VolumeInput>(days);
            for (var i = 0; i < days; i++)
            {
                var trend = i * baseLevel * 0.002;
                var dow = i % 7;
                var seasonal = dow switch
                {
                    0 => -weekdayAmplitude,
                    1 => weekdayAmplitude * 0.5,
                    2 => weekdayAmplitude,
                    3 => weekdayAmplitude * 0.8,
                    4 => weekdayAmplitude * 0.6,
                    5 => weekdayAmplitude * 0.2,
                    _ => -weekdayAmplitude * 0.4
                };
                var noise = (rng.NextDouble() - 0.5) * weekdayAmplitude;
                var value = Math.Max(0, baseLevel + trend + seasonal + noise);
                result.Add(new VolumeInput { Orders = (float)Math.Round(value, 3) });
            }
            return result;
        }

        private static List<string> BuildForecastWarnings(string trainedFrom, string targetLabel, bool annual = false)
        {
            if (trainedFrom == "real_sparse")
            {
                return new List<string>
                {
                    $"Historique réel limité : estimation de {targetLabel} à vérifier dès que plus de données sont disponibles."
                };
            }

            if (annual)
            {
                return new List<string>
                {
                    "Prévision long terme extrapolée : à utiliser comme estimation, pas comme certitude opérationnelle."
                };
            }

            return new List<string>();
        }

        private static string HumanizeForecastTarget(string targetLabel)
            => targetLabel == "réclamations" ? "Réclamations" : "Chiffre d'affaires";

        private static string ForecastAgreement(string targetLabel)
            => targetLabel == "réclamations" ? "prévues" : "prévu";

        private static string FormatForecastValue(double value, string unit)
        {
            var decimals = unit == "TND" ? 3 : 0;
            var rounded = Math.Round(Math.Max(0, value), decimals);
            return $"{rounded.ToString(decimals == 0 ? "0" : "0.###", CultureInfo.InvariantCulture)} {unit}";
        }

        private sealed class DailyMeasure
        {
            public DateTime Date { get; set; }
            public float Value { get; set; }
        }

        private static string NormalizeVolumeTarget(string? raw)
        {
            var value = (raw ?? "orders").Trim().ToLowerInvariant();
            return value is "bl" or "delivery_note" or "delivery_notes" or "bon_livraison" or "bons_livraison"
                ? "bl"
                : "orders";
        }

        private static string NormalizeForecastPeriod(string? raw)
        {
            var value = (raw ?? string.Empty).Trim().ToLowerInvariant();
            return value switch
            {
                "next_year" or "year" or "12m" => "next_year",
                "next_month" or "month" or "30d" => "next_month",
                "next_week" or "week" or "7d" => "next_week",
                _ => string.Empty
            };
        }

        private static int ResolveVolumeHorizon(int? requested, string period)
        {
            if (period == "next_year") return 365;
            if (period == "next_month") return 30;
            if (period == "next_week") return 7;
            var horizon = requested.GetValueOrDefault(7);
            if (horizon <= 0) return 7;
            return Math.Min(horizon, 365);
        }

        // ====================================================================
        // Explanations / factors / helpers
        // ====================================================================
        private static List<ChatPredictFactorDto> BuildReturnRiskFactors(ReturnRiskInput input, double prob)
        {
            // Heuristique d'attribution — pas la vraie importance ML mais utile
            // pour expliquer le résultat à l'utilisateur (jury).
            var factors = new List<ChatPredictFactorDto>();
            if (input.PriorReturns >= 2)
                factors.Add(new() { Name = "client_history", Weight = 0.30, Value = $"{input.PriorReturns} retours antérieurs" });
            if (input.Amount > 200)
                factors.Add(new() { Name = "amount_bucket", Weight = 0.25, Value = "élevé (>200 DT)" });
            factors.Add(new() { Name = "governorate", Weight = 0.20, Value = input.Governorate });
            factors.Add(new() { Name = "client_type", Weight = 0.10, Value = input.ClientType });
            factors.Add(new() { Name = "day_of_week", Weight = 0.10, Value = ((DayOfWeek)(int)input.DayOfWeek).ToString() });
            return factors.OrderByDescending(f => f.Weight).ToList();
        }

        private static string ExplainReturnRisk(ReturnRiskInput input, double prob)
        {
            var pct = Math.Round(prob * 100, 1);
            var risk = prob >= 0.5 ? "élevé" : prob >= 0.3 ? "modéré" : "faible";
            var parts = new List<string> { $"Risque {risk} ({pct}%)" };
            parts.Add($"basé sur {input.Governorate}");
            parts.Add($"montant {input.Amount} DT");
            parts.Add($"client {input.ClientType}");
            if (input.PriorReturns > 0) parts.Add($"{input.PriorReturns} retour(s) antérieur(s)");
            return string.Join(", ", parts) + ".";
        }

        private static string ExplainDelivery(DeliveryFirstAttemptInput input, double prob)
        {
            var pct = Math.Round(prob * 100, 1);
            var conf = prob >= 0.7 ? "fortes chances" : prob >= 0.5 ? "chances raisonnables" : "chances limitées";
            return $"{conf} de livraison au 1er essai ({pct}%) — {input.Governorate}, {input.DeliveryMode}, {input.Amount} DT.";
        }

        private static float Sigmoid(float x) => (float)(1.0 / (1.0 + Math.Exp(-x)));

        private static double ConfidenceFromProb(double prob)
        {
            // Plus la prob est éloignée de 0.5, plus le modèle est confiant.
            return Math.Min(1.0, 0.5 + Math.Abs(prob - 0.5) * 1.6);
        }

        private static float ResolveDayOfWeek(string? raw, DateTime? fallbackDate)
        {
            if (!string.IsNullOrWhiteSpace(raw))
            {
                if (Enum.TryParse<DayOfWeek>(raw, true, out var dow))
                    return (float)(int)dow;
            }
            if (fallbackDate.HasValue) return (float)(int)fallbackDate.Value.DayOfWeek;
            return (float)(int)DateTime.UtcNow.DayOfWeek;
        }

        private static ChatPredictResponseDto Unsupported(string message)
            => new() { Task = "error", Label = message, Warnings = new List<string> { message } };
    }
}
