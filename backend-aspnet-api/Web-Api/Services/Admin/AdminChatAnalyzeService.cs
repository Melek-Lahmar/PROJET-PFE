using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Geo;
using Web_Api.Model;

namespace Web_Api.Services.Admin
{
    /// <summary>
    /// Couche B du chatbot — analyse statistique on-demand.
    /// Tendance, comparaison, anomalies (z-score), corrélation, distribution.
    /// Calculs faits en C# pur sur snapshot DB (pas de ML).
    /// </summary>
    public class AdminChatAnalyzeService
    {
        private const short DomainVente = 0;
        private const short BcType = 0;

        private readonly AppDbContext _db;

        public AdminChatAnalyzeService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<ChatAnalyzeResponseDto> ExecuteAsync(
            ChatAnalyzeRequestDto req, CancellationToken ct)
        {
            req ??= new ChatAnalyzeRequestDto();
            req.Subject ??= new ChatAnalyzeSubjectDto();
            req.Options ??= new ChatAnalyzeOptionsDto();

            var op = (req.Operation ?? "trend").Trim().ToLowerInvariant();

            return op switch
            {
                "trend" => await TrendAsync(req, ct),
                "compare" => await CompareAsync(req, ct),
                "anomaly" => await AnomalyAsync(req, ct),
                "correlation" => await CorrelationAsync(req, ct),
                "distribution" => await DistributionAsync(req, ct),
                _ => Unsupported($"Opération inconnue : {op}")
            };
        }

        // ====================================================================
        // TREND — slope, R², direction, change%
        // ====================================================================
        private async Task<ChatAnalyzeResponseDto> TrendAsync(
            ChatAnalyzeRequestDto req, CancellationToken ct)
        {
            var granularity = NormalizeGranularity(req.Options.Granularity ?? "day");
            var (from, to) = ResolvePeriod(req.Subject.Filters);
            var series = await BuildTimeSeriesAsync(req.Subject, granularity, from, to, ct);

            if (series.Count < 3)
            {
                return new ChatAnalyzeResponseDto
                {
                    Operation = "trend",
                    Label = "Données insuffisantes pour calculer une tendance.",
                    Series = series,
                    Warnings = new List<string>
                    {
                        $"Échantillon trop petit ({series.Count} points). Minimum requis : 3."
                    }
                };
            }

            // Régression linéaire simple : y = slope * x + intercept
            var n = series.Count;
            var xs = Enumerable.Range(0, n).Select(i => (decimal)i).ToList();
            var ys = series.Select(s => s.Value).ToList();
            var (slope, intercept, r2) = LinearRegression(xs, ys);

            // Direction et change%.
            var first = ys.First();
            var last = ys.Last();
            var changePct = first == 0 ? (last == 0 ? 0m : 100m) : Math.Round((last - first) * 100m / first, 1);
            var direction = Math.Abs(slope) < 0.01m ? "flat" : (slope > 0 ? "up" : "down");

            var label = req.Subject.Metric switch
            {
                "count" => $"Tendance du nombre de {req.Subject.Entity} sur {n} {granularity}(s)",
                "sum_amount" => $"Tendance du chiffre d'affaires sur {n} {granularity}(s)",
                _ => $"Tendance ({req.Subject.Metric}) sur {n} {granularity}(s)"
            };

            return new ChatAnalyzeResponseDto
            {
                Operation = "trend",
                Label = label,
                Series = series,
                Trend = new ChatTrendResultDto
                {
                    Slope = Math.Round(slope, 3),
                    Intercept = Math.Round(intercept, 3),
                    R2 = Math.Round(r2, 3),
                    Direction = direction,
                    ChangePct = changePct,
                    Samples = n
                }
            };
        }

        // ====================================================================
        // COMPARE — top groupes par valeur (avec taux quand pertinent)
        // ====================================================================
        private async Task<ChatAnalyzeResponseDto> CompareAsync(
            ChatAnalyzeRequestDto req, CancellationToken ct)
        {
            var groupBy = (req.Options.GroupBy ?? "governorate").Trim().ToLowerInvariant();
            var topN = req.Options.TopN.GetValueOrDefault(10);
            if (topN <= 0 || topN > 50) topN = 10;

            var (from, to) = ResolvePeriod(req.Subject.Filters);

            if (req.Subject.Entity == "orders")
            {
                var rows = await CompareOrdersAsync(req.Subject, groupBy, from, to, ct);
                rows = rows.OrderByDescending(g => g.Value).Take(topN).ToList();
                return new ChatAnalyzeResponseDto
                {
                    Operation = "compare",
                    Label = $"Comparaison {req.Subject.Metric} par {groupBy}",
                    Compare = rows
                };
            }

            if (req.Subject.Entity == "claims" || req.Subject.Entity == "demandes")
            {
                var rows = await CompareClaimsAsync(req.Subject, groupBy, from, to, ct);
                rows = rows.OrderByDescending(g => g.Value).Take(topN).ToList();
                return new ChatAnalyzeResponseDto
                {
                    Operation = "compare",
                    Label = $"Comparaison {req.Subject.Entity} par {groupBy}",
                    Compare = rows
                };
            }

            return Unsupported($"Comparaison non supportée pour entité : {req.Subject.Entity}");
        }

        private async Task<List<ChatCompareGroupDto>> CompareOrdersAsync(
            ChatAnalyzeSubjectDto subject, string groupBy, DateTime from, DateTime to, CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var lookup = BuildProfileLookup(profiles);

            var orders = await _db.F_DOCENTETES.AsNoTracking()
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                .Where(x => x.DO_Date >= from && x.DO_Date < to)
                .ToListAsync(ct);

            var pieces = orders.Select(o => o.DO_Piece).Where(p => !string.IsNullOrWhiteSpace(p)).Cast<string>().ToHashSet();
            var livraisons = pieces.Count == 0
                ? new List<F_LIVRAISON>()
                : await _db.F_LIVRAISONS.AsNoTracking()
                    .Where(l => pieces.Contains(l.DO_Piece))
                    .ToListAsync(ct);
            var livByPiece = livraisons.GroupBy(l => l.DO_Piece)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(l => l.LI_DateCreation).First(),
                    StringComparer.OrdinalIgnoreCase);

            // Group key extractor.
            Func<F_DOCENTETE, string> keyFn = groupBy switch
            {
                "status" => o => F_DOCENTETE.ToStatusLabel(o.DO_Valide),
                "governorate" => o =>
                {
                    var p = ResolveProfile(o.DO_Tiers, lookup);
                    return p?.Gouvernorat?.ToString() ?? "Inconnu";
                },
                "driver" => o =>
                {
                    if (o.DO_Piece == null) return "Inconnu";
                    if (!livByPiece.TryGetValue(o.DO_Piece, out var liv)) return "Aucun livreur";
                    if (!liv.LivreurId.HasValue) return "Aucun livreur";
                    var p = profiles.FirstOrDefault(x => x.cbMarq == liv.LivreurId.Value);
                    return p?.NomComplet ?? $"#{liv.LivreurId}";
                },
                _ => o => "Tous"
            };

            return orders.GroupBy(keyFn).Select(g =>
            {
                var groupOrders = g.ToList();
                var count = groupOrders.Count;
                var delivered = groupOrders.Count(o =>
                    o.DO_Piece != null && livByPiece.TryGetValue(o.DO_Piece, out var l)
                    && l.LI_Statut == DeliveryStatusCodes.Livre);
                var returned = groupOrders.Count(o =>
                    o.DO_Piece != null && livByPiece.TryGetValue(o.DO_Piece, out var l)
                    && l.LI_Statut == DeliveryStatusCodes.Retour);

                decimal value = subject.Metric switch
                {
                    "sum_amount" => groupOrders.Sum(o => o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m),
                    "delivery_rate" => count == 0 ? 0m : Math.Round((decimal)delivered * 100m / count, 1),
                    "return_rate" => count == 0 ? 0m : Math.Round((decimal)returned * 100m / count, 1),
                    _ => count
                };

                decimal? rate = subject.Metric == "count"
                    ? (count == 0 ? 0m : Math.Round((decimal)delivered * 100m / count, 1))
                    : null;

                return new ChatCompareGroupDto
                {
                    Label = g.Key,
                    Value = subject.Metric == "sum_amount" ? Math.Round(value, 2) : value,
                    Rate = rate,
                    Samples = count
                };
            }).ToList();
        }

        private async Task<List<ChatCompareGroupDto>> CompareClaimsAsync(
            ChatAnalyzeSubjectDto subject, string groupBy, DateTime from, DateTime to, CancellationToken ct)
        {
            var query = _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to);

            if (subject.Entity == "claims") query = query.Where(r => r.TypeCas == "RECLAMATION");
            if (subject.Entity == "demandes") query = query.Where(r => r.TypeCas == "DEMANDE");

            var rows = await query.ToListAsync(ct);

            Func<F_RECLAMATION, string> keyFn = groupBy switch
            {
                "status" => r => r.Statut,
                "motif" => r => r.Motif,
                "source" => r => r.Source,
                "typeCas" => r => r.TypeCas,
                _ => _ => "Tous"
            };

            return rows.GroupBy(keyFn).Select(g => new ChatCompareGroupDto
            {
                Label = g.Key,
                Value = g.Count(),
                Samples = g.Count()
            }).ToList();
        }

        // ====================================================================
        // ANOMALY — détection z-score sur la dernière fenêtre vs baseline
        // ====================================================================
        private async Task<ChatAnalyzeResponseDto> AnomalyAsync(
            ChatAnalyzeRequestDto req, CancellationToken ct)
        {
            var granularity = NormalizeGranularity(req.Options.Granularity ?? "day");
            var baselineDays = req.Options.BaselineWindow.GetValueOrDefault(30);
            if (baselineDays <= 7) baselineDays = 30;

            // Force la période pour inclure baseline + détection.
            req.Subject.Filters.Period = baselineDays > 30 ? "3m" : "30d";
            var (from, to) = ResolvePeriod(req.Subject.Filters);

            var series = await BuildTimeSeriesAsync(req.Subject, granularity, from, to, ct);
            if (series.Count < 5)
            {
                return new ChatAnalyzeResponseDto
                {
                    Operation = "anomaly",
                    Label = "Données insuffisantes pour détecter des anomalies.",
                    Series = series,
                    Warnings = new List<string> { $"Minimum 5 points requis (actuel : {series.Count})." }
                };
            }

            // Baseline = tous les points sauf les 3 derniers.
            var detection = series.TakeLast(3).ToList();
            var baseline = series.Take(series.Count - detection.Count).ToList();
            if (baseline.Count < 3)
            {
                baseline = series.ToList();
                detection = series.TakeLast(1).ToList();
            }

            var bMean = baseline.Average(p => p.Value);
            var bStd = StdDev(baseline.Select(p => p.Value).ToList());
            if (bStd == 0) bStd = 0.0001m; // évite division par zéro

            var anomalies = new List<ChatAnomalyDto>();
            foreach (var p in detection)
            {
                var z = Math.Round((p.Value - bMean) / bStd, 2);
                var severity = Math.Abs(z) >= 3 ? "high" : Math.Abs(z) >= 2 ? "medium" : "low";
                if (Math.Abs(z) >= 1.5m)
                {
                    anomalies.Add(new ChatAnomalyDto
                    {
                        Bucket = p.Bucket,
                        Value = p.Value,
                        Mean = Math.Round(bMean, 2),
                        Std = Math.Round(bStd, 2),
                        ZScore = z,
                        Severity = severity
                    });
                }
            }

            return new ChatAnalyzeResponseDto
            {
                Operation = "anomaly",
                Label = anomalies.Count == 0
                    ? "Aucune anomalie détectée sur la période récente."
                    : $"{anomalies.Count} anomalie(s) détectée(s) sur les derniers points.",
                Anomalies = anomalies,
                Series = series
            };
        }

        // ====================================================================
        // CORRELATION — Pearson entre deux séries temporelles
        // ====================================================================
        private async Task<ChatAnalyzeResponseDto> CorrelationAsync(
            ChatAnalyzeRequestDto req, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(req.Options.SecondMetric))
                return Unsupported("Le champ 'options.secondMetric' est requis pour une corrélation.");

            var granularity = NormalizeGranularity(req.Options.Granularity ?? "day");
            var (from, to) = ResolvePeriod(req.Subject.Filters);

            var s1 = await BuildTimeSeriesAsync(req.Subject, granularity, from, to, ct);
            var s2subject = new ChatAnalyzeSubjectDto
            {
                Entity = req.Subject.Entity,
                Metric = req.Options.SecondMetric!,
                Filters = req.Subject.Filters
            };
            var s2 = await BuildTimeSeriesAsync(s2subject, granularity, from, to, ct);

            // Aligne sur les mêmes buckets.
            var s2Map = s2.ToDictionary(p => p.Bucket, p => p.Value);
            var aligned = s1.Where(p => s2Map.ContainsKey(p.Bucket))
                .Select(p => (x: p.Value, y: s2Map[p.Bucket])).ToList();

            if (aligned.Count < 5)
            {
                return new ChatAnalyzeResponseDto
                {
                    Operation = "correlation",
                    Label = "Échantillon trop petit pour une corrélation fiable.",
                    Warnings = new List<string> { $"{aligned.Count} points alignés (minimum 5)." }
                };
            }

            var pearson = Pearson(aligned.Select(p => p.x).ToList(), aligned.Select(p => p.y).ToList());
            var abs = Math.Abs(pearson);
            var strength = abs < 0.2m ? "none" : abs < 0.4m ? "weak" : abs < 0.7m ? "moderate" : "strong";
            var direction = Math.Abs(pearson) < 0.05m ? "flat" : (pearson > 0 ? "positive" : "negative");

            return new ChatAnalyzeResponseDto
            {
                Operation = "correlation",
                Label = $"Corrélation {req.Subject.Metric} ↔ {req.Options.SecondMetric} : {pearson:0.000} ({strength}, {direction})",
                Correlation = new ChatCorrelationDto
                {
                    Pearson = Math.Round(pearson, 3),
                    Samples = aligned.Count,
                    Strength = strength,
                    Direction = direction
                }
            };
        }

        // ====================================================================
        // DISTRIBUTION — percentiles d'une métrique
        // ====================================================================
        private async Task<ChatAnalyzeResponseDto> DistributionAsync(
            ChatAnalyzeRequestDto req, CancellationToken ct)
        {
            var (from, to) = ResolvePeriod(req.Subject.Filters);
            List<decimal> values;

            if (req.Subject.Entity == "orders" && req.Subject.Metric == "amount")
            {
                values = await _db.F_DOCENTETES.AsNoTracking()
                    .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                    .Where(x => x.DO_Date >= from && x.DO_Date < to)
                    .Select(x => (x.DO_TotalTTC ?? x.DO_NetAPayer ?? 0m))
                    .ToListAsync(ct);
            }
            else if ((req.Subject.Entity == "claims" || req.Subject.Entity == "demandes")
                     && req.Subject.Metric == "tentatives")
            {
                var q = _db.F_RECLAMATIONS.AsNoTracking()
                    .Where(r => r.CreatedAt >= from && r.CreatedAt < to);
                if (req.Subject.Entity == "claims") q = q.Where(r => r.TypeCas == "RECLAMATION");
                if (req.Subject.Entity == "demandes") q = q.Where(r => r.TypeCas == "DEMANDE");
                values = (await q.Select(r => r.TentativesCount).ToListAsync(ct))
                    .Select(x => (decimal)x).ToList();
            }
            else
            {
                return Unsupported(
                    $"Distribution non supportée : entity={req.Subject.Entity}, metric={req.Subject.Metric}.");
            }

            if (values.Count == 0)
            {
                return new ChatAnalyzeResponseDto
                {
                    Operation = "distribution",
                    Label = "Aucune donnée sur la période.",
                    Distribution = new ChatDistributionDto { Samples = 0 }
                };
            }

            values.Sort();
            decimal P(double q) => Quantile(values, q);
            var mean = values.Average();

            return new ChatAnalyzeResponseDto
            {
                Operation = "distribution",
                Label = $"Distribution de {req.Subject.Metric} ({values.Count} valeurs)",
                Distribution = new ChatDistributionDto
                {
                    Mean = Math.Round(mean, 2),
                    Std = Math.Round(StdDev(values), 2),
                    P25 = Math.Round(P(0.25), 2),
                    P50 = Math.Round(P(0.50), 2),
                    P75 = Math.Round(P(0.75), 2),
                    P95 = Math.Round(P(0.95), 2),
                    Samples = values.Count
                }
            };
        }

        // ====================================================================
        // Time series builder (commun à trend / anomaly / correlation)
        // ====================================================================
        private async Task<List<ChatQuerySeriesPointDto>> BuildTimeSeriesAsync(
            ChatAnalyzeSubjectDto subject, string granularity,
            DateTime from, DateTime to, CancellationToken ct)
        {
            if (subject.Entity == "orders")
                return await BuildOrdersSeriesAsync(subject, granularity, from, to, ct);
            if (subject.Entity == "claims" || subject.Entity == "demandes")
                return await BuildClaimsSeriesAsync(subject, granularity, from, to, ct);
            return new List<ChatQuerySeriesPointDto>();
        }

        private async Task<List<ChatQuerySeriesPointDto>> BuildOrdersSeriesAsync(
            ChatAnalyzeSubjectDto subject, string granularity,
            DateTime from, DateTime to, CancellationToken ct)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var govKey = NormalizeGovKey(subject.Filters.Governorate);
            HashSet<string>? matchingTiers = null;
            if (govKey != null)
            {
                matchingTiers = profiles
                    .Where(p => p.Gouvernorat.HasValue && NormalizeGov(p.Gouvernorat.Value) == govKey)
                    .Select(p => Normalize(p.CodeClientSage))
                    .Where(c => c != null).Cast<string>().ToHashSet();
            }

            var orders = await _db.F_DOCENTETES.AsNoTracking()
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType)
                .Where(x => x.DO_Date >= from && x.DO_Date < to)
                .ToListAsync(ct);

            if (matchingTiers != null)
                orders = orders.Where(o => o.DO_Tiers != null && matchingTiers.Contains(o.DO_Tiers.ToUpperInvariant())).ToList();

            // Filtre statut commande (si demandé).
            switch ((subject.Filters.Status ?? "").ToLowerInvariant())
            {
                case "confirmed": orders = orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_CONFIRME).ToList(); break;
                case "refused": orders = orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_REFUSE).ToList(); break;
                case "tentative": orders = orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE).ToList(); break;
                case "pending": orders = orders.Where(o => o.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE).ToList(); break;
            }

            // Si métrique = delivery_rate / return_rate, il faut joindre les livraisons.
            Dictionary<string, F_LIVRAISON>? livByPiece = null;
            if (subject.Metric == "delivery_rate" || subject.Metric == "return_rate")
            {
                var pieces = orders.Select(o => o.DO_Piece).Where(p => !string.IsNullOrWhiteSpace(p)).Cast<string>().ToHashSet();
                var livs = pieces.Count == 0 ? new List<F_LIVRAISON>()
                    : await _db.F_LIVRAISONS.AsNoTracking()
                        .Where(l => pieces.Contains(l.DO_Piece)).ToListAsync(ct);
                livByPiece = livs.GroupBy(l => l.DO_Piece)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(l => l.LI_DateCreation).First(),
                        StringComparer.OrdinalIgnoreCase);
            }

            var withDate = orders.Where(o => o.DO_Date.HasValue).ToList();

            return withDate
                .GroupBy(o => BucketKey(o.DO_Date!.Value, granularity))
                .OrderBy(g => g.Key)
                .Select(g => new ChatQuerySeriesPointDto
                {
                    Bucket = g.Key,
                    Value = subject.Metric switch
                    {
                        "sum_amount" => Math.Round(g.Sum(o => o.DO_TotalTTC ?? o.DO_NetAPayer ?? 0m), 2),
                        "delivery_rate" => RateOver(g.ToList(), livByPiece, DeliveryStatusCodes.Livre),
                        "return_rate" => RateOver(g.ToList(), livByPiece, DeliveryStatusCodes.Retour),
                        _ => g.Count()
                    }
                })
                .ToList();
        }

        private static decimal RateOver(List<F_DOCENTETE> orders,
            Dictionary<string, F_LIVRAISON>? livByPiece, short targetStatus)
        {
            if (livByPiece == null || orders.Count == 0) return 0m;
            var matched = orders.Count(o =>
                o.DO_Piece != null && livByPiece.TryGetValue(o.DO_Piece, out var l)
                && l.LI_Statut == targetStatus);
            return Math.Round((decimal)matched * 100m / orders.Count, 1);
        }

        private async Task<List<ChatQuerySeriesPointDto>> BuildClaimsSeriesAsync(
            ChatAnalyzeSubjectDto subject, string granularity,
            DateTime from, DateTime to, CancellationToken ct)
        {
            var query = _db.F_RECLAMATIONS.AsNoTracking()
                .Where(r => r.CreatedAt >= from && r.CreatedAt < to);

            if (subject.Entity == "claims") query = query.Where(r => r.TypeCas == "RECLAMATION");
            if (subject.Entity == "demandes") query = query.Where(r => r.TypeCas == "DEMANDE");

            var rows = await query.ToListAsync(ct);

            return rows
                .GroupBy(r => BucketKey(r.CreatedAt, granularity))
                .OrderBy(g => g.Key)
                .Select(g => new ChatQuerySeriesPointDto
                {
                    Bucket = g.Key,
                    Value = g.Count()
                })
                .ToList();
        }

        // ====================================================================
        // Math helpers
        // ====================================================================
        private static (decimal slope, decimal intercept, decimal r2) LinearRegression(
            List<decimal> xs, List<decimal> ys)
        {
            var n = xs.Count;
            var meanX = xs.Average();
            var meanY = ys.Average();
            decimal num = 0m, den = 0m;
            for (var i = 0; i < n; i++)
            {
                var dx = xs[i] - meanX;
                var dy = ys[i] - meanY;
                num += dx * dy;
                den += dx * dx;
            }
            var slope = den == 0 ? 0m : num / den;
            var intercept = meanY - slope * meanX;

            // R²
            decimal ssTot = 0m, ssRes = 0m;
            for (var i = 0; i < n; i++)
            {
                var dy = ys[i] - meanY;
                ssTot += dy * dy;
                var pred = slope * xs[i] + intercept;
                var res = ys[i] - pred;
                ssRes += res * res;
            }
            var r2 = ssTot == 0 ? 1m : 1m - (ssRes / ssTot);
            return (slope, intercept, r2);
        }

        private static decimal Pearson(List<decimal> xs, List<decimal> ys)
        {
            var n = Math.Min(xs.Count, ys.Count);
            if (n < 2) return 0m;
            var meanX = xs.Take(n).Average();
            var meanY = ys.Take(n).Average();
            decimal num = 0m, denX = 0m, denY = 0m;
            for (var i = 0; i < n; i++)
            {
                var dx = xs[i] - meanX;
                var dy = ys[i] - meanY;
                num += dx * dy;
                denX += dx * dx;
                denY += dy * dy;
            }
            var den = (decimal)Math.Sqrt((double)(denX * denY));
            return den == 0 ? 0m : num / den;
        }

        private static decimal StdDev(List<decimal> values)
        {
            if (values.Count <= 1) return 0m;
            var mean = values.Average();
            var sumSq = values.Sum(v => (v - mean) * (v - mean));
            return (decimal)Math.Sqrt((double)(sumSq / (values.Count - 1)));
        }

        private static decimal Quantile(List<decimal> sorted, double q)
        {
            if (sorted.Count == 0) return 0m;
            if (sorted.Count == 1) return sorted[0];
            var pos = q * (sorted.Count - 1);
            var lo = (int)Math.Floor(pos);
            var hi = (int)Math.Ceiling(pos);
            if (lo == hi) return sorted[lo];
            var frac = (decimal)(pos - lo);
            return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
        }

        // ====================================================================
        // Helpers communs
        // ====================================================================
        private static string NormalizeGranularity(string raw)
            => (raw ?? "day").Trim().ToLowerInvariant() switch
            {
                "week" => "week",
                "month" => "month",
                _ => "day"
            };

        private static string BucketKey(DateTime d, string granularity)
            => granularity switch
            {
                "week" => StartOfWeek(d).ToString("yyyy-'W'ww", CultureInfo.InvariantCulture),
                "month" => new DateTime(d.Year, d.Month, 1).ToString("yyyy-MM"),
                _ => d.Date.ToString("yyyy-MM-dd")
            };

        private static DateTime StartOfWeek(DateTime d)
        {
            var diff = (7 + (d.DayOfWeek - DayOfWeek.Monday)) % 7;
            return d.Date.AddDays(-diff);
        }

        private static (DateTime from, DateTime to) ResolvePeriod(ChatQueryFiltersDto f)
        {
            var now = DateTime.UtcNow;
            if (f.From.HasValue && f.To.HasValue)
                return (f.From.Value.Date, f.To.Value.Date.AddDays(1));
            var p = (f.Period ?? "30d").Trim().ToLowerInvariant();
            return p switch
            {
                "today" => (now.Date, now.Date.AddDays(1)),
                "7d" => (now.Date.AddDays(-7), now.Date.AddDays(1)),
                "3m" => (now.Date.AddMonths(-3), now.Date.AddDays(1)),
                "6m" => (now.Date.AddMonths(-6), now.Date.AddDays(1)),
                "12m" => (now.Date.AddYears(-1), now.Date.AddDays(1)),
                _ => (now.Date.AddDays(-30), now.Date.AddDays(1))
            };
        }

        private static Dictionary<string, ProfilUtilisateur> BuildProfileLookup(
            IEnumerable<ProfilUtilisateur> profiles)
        {
            var dict = new Dictionary<string, ProfilUtilisateur>(StringComparer.OrdinalIgnoreCase);
            foreach (var profile in profiles)
            {
                AddAlias(dict, profile.CodeClientSage, profile);
                if (profile.UtilisateurId.HasValue)
                {
                    var userId = profile.UtilisateurId.Value;
                    AddAlias(dict, userId.ToString(), profile);
                    AddAlias(dict, userId.ToString("N"), profile);
                }
            }
            return dict;
        }

        private static void AddAlias(Dictionary<string, ProfilUtilisateur> dict,
            string? value, ProfilUtilisateur profile)
        {
            var n = Normalize(value);
            if (n != null && !dict.ContainsKey(n)) dict[n] = profile;
        }

        private static ProfilUtilisateur? ResolveProfile(string? tiers,
            IReadOnlyDictionary<string, ProfilUtilisateur> lookup)
        {
            var n = Normalize(tiers);
            return n != null && lookup.TryGetValue(n, out var p) ? p : null;
        }

        private static string? Normalize(string? value)
        {
            var n = (value ?? string.Empty).Trim();
            return string.IsNullOrWhiteSpace(n) ? null : n.ToUpperInvariant();
        }

        private static string NormalizeGov(GouvernoratTunisie g)
            => g.ToString().ToUpperInvariant().Replace(" ", "").Replace("-", "");

        private static string? NormalizeGovKey(string? s)
            => string.IsNullOrWhiteSpace(s) ? null
               : s.ToUpperInvariant().Replace(" ", "").Replace("-", "")
                  .Replace("É", "E").Replace("È", "E").Replace("Ê", "E");

        private static ChatAnalyzeResponseDto Unsupported(string message)
            => new() { Operation = "error", Label = message, Warnings = new List<string> { message } };
    }
}
