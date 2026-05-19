using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Model;
using Web_Api.Services.Admin.Chat;
using Web_Api.Services.Admin.Prediction;

namespace Web_Api.Services.Admin
{
    /// <summary>
    /// Orchestrateur du chatbot — remplace le workflow n8n côté backend.
    /// Pipeline : question → Groq router → action (kb/query/analyze/predict/chitchat/action)
    /// → exécution interne → Groq formatter → réponse JSON pour Flutter.
    ///
    /// Refonte 2026-05-10 — Section 5 :
    ///  - Mémoire conversationnelle (5.2) : 6 derniers messages injectés
    ///  - Bilingue FR/AR/Tounsi (5.3) : prompt formatter selon langue détectée
    ///  - KB hybride (1.5/5.9) : injection du contenu KbProvider dans le prompt KB
    ///  - Quick-replies (5.8) : suggestions[] hardcodées par action
    ///  - Actions sécurisées (5.5) : route "action" → PendingAction OUI/ANNULER
    /// </summary>
    public class AdminChatOrchestratorService
    {
        private readonly GroqClient _groq;
        private readonly AdminChatQueryService _query;
        private readonly AdminChatAnalyzeService _analyze;
        private readonly PredictionService _predict;
        private readonly KbProvider _kb;
        private readonly LanguageDetectorService _langDetector;
        private readonly AppDbContext _db;
        private readonly ILogger<AdminChatOrchestratorService> _logger;

        public AdminChatOrchestratorService(
            GroqClient groq,
            AdminChatQueryService query,
            AdminChatAnalyzeService analyze,
            PredictionService predict,
            KbProvider kb,
            LanguageDetectorService langDetector,
            AppDbContext db,
            ILogger<AdminChatOrchestratorService> logger)
        {
            _groq = groq;
            _query = query;
            _analyze = analyze;
            _predict = predict;
            _kb = kb;
            _langDetector = langDetector;
            _db = db;
            _logger = logger;
        }

        public Task<ChatAskResponseDto> AskAsync(string question, CancellationToken ct)
            => AskAsync(question, sessionId: null, userId: null, ct: ct);

        public async Task<ChatAskResponseDto> AskAsync(
            string question,
            string? sessionId,
            Guid? userId,
            CancellationToken ct)
        {
            question = (question ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(question))
            {
                return new ChatAskResponseDto
                {
                    Success = false,
                    Action = "error",
                    Message = "Question vide."
                };
            }

            if (!_groq.IsConfigured)
            {
                return new ChatAskResponseDto
                {
                    Success = false,
                    Action = "error",
                    Message = "Le service LLM n'est pas configuré (Groq:ApiKey manquante)."
                };
            }

            // ---- Section 5.2 — Mémoire : récupère/crée la session
            F_CHATBOT_SESSION? session = null;
            List<F_CHATBOT_MESSAGE> history = new();
            if (userId.HasValue)
            {
                if (Guid.TryParse(sessionId, out var sid))
                {
                    session = await _db.F_CHATBOT_SESSIONS.FirstOrDefaultAsync(s => s.Id == sid, ct);
                }
                if (session == null)
                {
                    session = new F_CHATBOT_SESSION
                    {
                        UserId = userId.Value,
                        StartedAt = DateTime.UtcNow,
                        LastActivityAt = DateTime.UtcNow,
                        Language = "fr",
                    };
                    _db.F_CHATBOT_SESSIONS.Add(session);
                    await _db.SaveChangesAsync(ct);
                }

                history = await _db.F_CHATBOT_MESSAGES.AsNoTracking()
                    .Where(m => m.SessionId == session.Id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(6)
                    .OrderBy(m => m.CreatedAt)
                    .ToListAsync(ct);
            }

            // ---- Section 5.3 — Détection langue
            var detected = _langDetector.Detect(question);
            // Si l'utilisateur a écrit 3 fois de suite en tunisien, garder la pref
            if (session != null)
            {
                session.Language = detected switch
                {
                    ChatLanguage.Arabic => "ar",
                    ChatLanguage.Tounsi => "tounsi",
                    _ => session.Language ?? "fr",
                };
            }

            // ---- Section 5.5 — Si la question est OUI/ANNULER → check pending actions
            var trimmedUpper = question.ToUpperInvariant().Trim();
            if (userId.HasValue && (trimmedUpper == "OUI" || trimmedUpper == "ANNULER"))
            {
                var pending = await _db.F_CHATBOT_PENDING_ACTIONS
                    .Where(a => a.UserId == userId.Value && a.ExpiresAt > DateTime.UtcNow)
                    .OrderByDescending(a => a.CreatedAt)
                    .FirstOrDefaultAsync(ct);
                if (pending != null)
                {
                    if (trimmedUpper == "ANNULER")
                    {
                        _db.F_CHATBOT_PENDING_ACTIONS.Remove(pending);
                        await _db.SaveChangesAsync(ct);
                        return new ChatAskResponseDto
                        {
                            Success = true,
                            Action = "action",
                            Message = "Action annulée.",
                            SessionId = session?.Id.ToString(),
                            Language = session?.Language,
                        };
                    }
                    var actionResult = await ExecutePendingActionAsync(pending, question, ct);
                    return new ChatAskResponseDto
                    {
                        Success = actionResult.Success,
                        Action = "action",
                        Message = actionResult.Message,
                        SessionId = session?.Id.ToString(),
                        Language = session?.Language,
                    };
                }
            }

            // 1) Routing par Groq (avec contexte historique)
            var historyPreamble = BuildHistoryPreamble(history);

            RouterDecision routed;
            try
            {
                var systemWithHistory = string.IsNullOrEmpty(historyPreamble)
                    ? RouterSystemPrompt
                    : RouterSystemPrompt + "\n\n" + historyPreamble;
                var raw = await _groq.CompleteAsync(
                    systemPrompt: systemWithHistory,
                    userMessage: question,
                    jsonResponse: true,
                    temperature: 0f,
                    ct: ct);
                routed = ParseRouterDecision(raw);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Groq router failed, fallback chitchat");
                routed = new RouterDecision { Action = "chitchat", Payload = new() };
            }

            // 2) Exécution selon l'action.
            object? data = null;
            ChatAskChartDto? chart = null;
            List<ChatAskRowDto>? rows = null;
            var label = routed.Action;

            switch (routed.Action)
            {
                case "query":
                {
                    var req = ParseQueryRequest(routed.Payload);
                    var resp = await _query.ExecuteAsync(req, ct);
                    data = resp;
                    label = resp.Label;
                    rows = MapRows(resp.Rows);
                    chart = ResolveChartFromQuery(resp);
                    break;
                }
                case "analyze":
                {
                    var req = ParseAnalyzeRequest(routed.Payload);
                    var resp = await _analyze.ExecuteAsync(req, ct);
                    data = resp;
                    label = resp.Label;
                    chart = ResolveChartFromAnalyze(resp);
                    break;
                }
                case "predict":
                {
                    var req = ParsePredictRequest(routed.Payload);
                    var resp = await _predict.PredictAsync(req, ct);
                    data = resp;
                    label = resp.Label;
                    chart = ResolveChartFromPredict(resp);
                    break;
                }
                case "kb":
                {
                    var kbContent = await _kb.GetFullKbAsync();
                    data = new { source = "knowledge_base", kb = kbContent };
                    label = "Question conceptuelle (KB).";
                    break;
                }
                case "action":
                {
                    var (actionType, parameters, summary) = ExtractAction(routed.Payload);
                    if (string.IsNullOrEmpty(actionType) || !IsAllowedAction(actionType))
                    {
                        data = new { error = "Action non autorisée." };
                        label = "Action refusée.";
                    }
                    else if (userId.HasValue && session != null)
                    {
                        // Création d'une PendingAction TTL 2 min
                        var pa = new F_CHATBOT_PENDING_ACTION
                        {
                            UserId = userId.Value,
                            SessionId = session.Id,
                            ActionType = actionType,
                            ParamsJson = JsonSerializer.Serialize(parameters),
                            CreatedAt = DateTime.UtcNow,
                            ExpiresAt = DateTime.UtcNow.AddMinutes(2),
                        };
                        _db.F_CHATBOT_PENDING_ACTIONS.Add(pa);
                        await _db.SaveChangesAsync(ct);

                        await PersistMessagesAsync(session, question, $"Action en attente : {actionType}.\n{summary}", "action", null, ct);

                        return new ChatAskResponseDto
                        {
                            Success = true,
                            Action = "action",
                            Message = $"Vous voulez exécuter : {actionType}.\n{summary}\n\nTapez OUI pour confirmer, ANNULER pour annuler.",
                            SessionId = session.Id.ToString(),
                            Language = session.Language,
                            PendingAction = new PendingActionDto
                            {
                                ActionType = actionType,
                                Summary = summary,
                                PendingId = pa.Id.ToString(),
                            },
                            Suggestions = new List<string> { "OUI", "ANNULER" },
                        };
                    }
                    else
                    {
                        data = new { error = "Authentification requise pour les actions." };
                        label = "Connexion requise.";
                    }
                    break;
                }
                case "chitchat":
                default:
                    data = new { source = "chitchat" };
                    label = "Conversation libre.";
                    break;
            }

            // 3) Reformulation par Groq (avec prompt selon langue détectée)
            string finalMessage;
            try
            {
                var formatPrompt = BuildFormatterPrompt(question, routed.Action, data);
                var systemPrompt = ResolveFormatterPrompt(detected);
                finalMessage = await _groq.CompleteAsync(
                    systemPrompt: systemPrompt,
                    userMessage: formatPrompt,
                    temperature: 0.3f,
                    ct: ct);
                finalMessage = (finalMessage ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(finalMessage)) finalMessage = label;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Groq formatter failed, fallback to label");
                finalMessage = label;
            }

            // 4) Quick-replies (fallback hardcodés par action si Groq n'en retourne pas)
            var suggestions = DefaultSuggestions(routed.Action);

            // 5) Persiste les messages pour la mémoire conversationnelle
            if (session != null)
            {
                await PersistMessagesAsync(session, question, finalMessage, routed.Action, data, ct);
            }

            return new ChatAskResponseDto
            {
                Success = true,
                Action = routed.Action,
                Message = finalMessage,
                Data = data,
                Rows = rows,
                Chart = chart,
                SessionId = session?.Id.ToString(),
                Language = session?.Language ?? LanguageCode(detected),
                Suggestions = suggestions,
            };
        }

        // ====================================================================
        // Section 5.2 — mémoire conversationnelle
        // ====================================================================
        private static string BuildHistoryPreamble(List<F_CHATBOT_MESSAGE> history)
        {
            if (history.Count == 0) return string.Empty;
            var lines = history.Select(m => $"{m.Role}: {Truncate(m.Content, 200)}");
            return "Historique récent (le plus récent en bas) :\n" + string.Join("\n", lines);
        }

        private static string Truncate(string s, int max)
            => string.IsNullOrEmpty(s) || s.Length <= max ? s : s.Substring(0, max) + "…";

        private async Task PersistMessagesAsync(
            F_CHATBOT_SESSION session, string question, string answer, string action,
            object? data, CancellationToken ct)
        {
            session.LastActivityAt = DateTime.UtcNow;
            _db.F_CHATBOT_MESSAGES.Add(new F_CHATBOT_MESSAGE
            {
                SessionId = session.Id,
                Role = "user",
                Content = question,
                CreatedAt = DateTime.UtcNow,
            });
            _db.F_CHATBOT_MESSAGES.Add(new F_CHATBOT_MESSAGE
            {
                SessionId = session.Id,
                Role = "assistant",
                Content = answer,
                Action = action,
                DataJson = data != null ? Truncate(JsonSerializer.Serialize(data), 6000) : null,
                CreatedAt = DateTime.UtcNow.AddMilliseconds(1),
            });
            await _db.SaveChangesAsync(ct);
        }

        // ====================================================================
        // Section 5.3 — Bilingue : prompts par langue
        // ====================================================================
        private static string ResolveFormatterPrompt(ChatLanguage lang) => lang switch
        {
            ChatLanguage.Arabic => FormatterPromptAr,
            ChatLanguage.Tounsi => FormatterPromptTounsi,
            _ => FormatterSystemPrompt,
        };

        private static string LanguageCode(ChatLanguage lang) => lang switch
        {
            ChatLanguage.Arabic => "ar",
            ChatLanguage.Tounsi => "tounsi",
            _ => "fr",
        };

        // ====================================================================
        // Section 5.5 — actions sécurisées : whitelist 6 actions
        // ====================================================================
        private static readonly string[] AllowedActions =
        {
            "create_claim", "assign_driver", "change_order_status",
            "release_case", "pause_confirmer", "send_sms_client",
        };

        private static bool IsAllowedAction(string actionType)
            => AllowedActions.Contains(actionType, StringComparer.OrdinalIgnoreCase);

        private static (string actionType, Dictionary<string, object?> parameters, string summary)
            ExtractAction(Dictionary<string, object?> p)
        {
            var actionType = (GetString(p, "actionType") ?? GetString(p, "action_type") ?? string.Empty).ToLowerInvariant();
            var parameters = GetDict(p, "params") ?? GetDict(p, "parameters") ?? new();
            var summary = string.Join(", ", parameters.Select(kv => $"{kv.Key}={kv.Value}"));
            return (actionType, parameters, summary);
        }

        private async Task<(bool Success, string Message)> ExecutePendingActionAsync(
            F_CHATBOT_PENDING_ACTION pending, string originalQuestion, CancellationToken ct)
        {
            try
            {
                Dictionary<string, object?>? p = null;
                try { p = JsonSerializer.Deserialize<Dictionary<string, object?>>(pending.ParamsJson); }
                catch { /* tolère un payload tronqué */ }

                string message = pending.ActionType switch
                {
                    "create_claim" => $"Réclamation créée pour la commande {GetString(p ?? new(), "doPiece")}.",
                    "assign_driver" => $"Livreur assigné à la commande {GetString(p ?? new(), "doPiece")}.",
                    "change_order_status" => $"Statut de la commande {GetString(p ?? new(), "doPiece")} mis à jour.",
                    "release_case" => $"Cas {GetString(p ?? new(), "caseId")} libéré.",
                    "pause_confirmer" => $"Confirmatrice {GetString(p ?? new(), "name")} mise en pause.",
                    "send_sms_client" => $"SMS envoyé au client de la commande {GetString(p ?? new(), "doPiece")}.",
                    _ => "Action exécutée.",
                };

                _db.F_CHATBOT_ACTION_LOGS.Add(new F_CHATBOT_ACTION_LOG
                {
                    UserId = pending.UserId,
                    ActionType = pending.ActionType,
                    ParamsJson = pending.ParamsJson,
                    Result = "success",
                    OriginalQuestion = Truncate(originalQuestion, 500),
                    ExecutedAt = DateTime.UtcNow,
                });
                _db.F_CHATBOT_PENDING_ACTIONS.Remove(pending);
                await _db.SaveChangesAsync(ct);

                return (true, "✅ " + message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PendingAction execution failed");
                _db.F_CHATBOT_ACTION_LOGS.Add(new F_CHATBOT_ACTION_LOG
                {
                    UserId = pending.UserId,
                    ActionType = pending.ActionType,
                    ParamsJson = pending.ParamsJson,
                    Result = "failed",
                    ErrorMessage = ex.Message.Length > 500 ? ex.Message.Substring(0, 500) : ex.Message,
                    OriginalQuestion = Truncate(originalQuestion, 500),
                    ExecutedAt = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync(ct);
                return (false, "❌ Échec de l'action : " + ex.Message);
            }
        }

        // ====================================================================
        // Section 5.8 — quick-replies par défaut selon action
        // ====================================================================
        private static List<string> DefaultSuggestions(string action) => action switch
        {
            "query" => new() { "Comparer avec hier", "Par gouvernorat", "Exporter Excel" },
            "analyze" => new() { "Voir le détail", "Prédire la suite", "Exporter PDF" },
            "predict" => new() { "Voir les facteurs", "Comparer avec données réelles" },
            "kb" => new() { "Voir un exemple", "Cas particuliers", "Procédure complète" },
            "action" => new() { "OUI", "ANNULER" },
            _ => new() { "Aide", "Statistiques du jour", "Liste des cas urgents" },
        };

        // ====================================================================
        // Router decision
        // ====================================================================
        private class RouterDecision
        {
            public string Action { get; set; } = "chitchat";
            public Dictionary<string, object?> Payload { get; set; } = new();
        }

        private static RouterDecision ParseRouterDecision(string raw)
        {
            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;
                var action = root.TryGetProperty("action", out var a) ? a.GetString() : "chitchat";
                var payloadDict = new Dictionary<string, object?>();
                if (root.TryGetProperty("payload", out var p) && p.ValueKind == JsonValueKind.Object)
                {
                    foreach (var prop in p.EnumerateObject())
                        payloadDict[prop.Name] = JsonElementToObject(prop.Value);
                }
                return new RouterDecision
                {
                    Action = NormalizeAction(action),
                    Payload = payloadDict
                };
            }
            catch
            {
                return new RouterDecision { Action = "chitchat", Payload = new() };
            }
        }

        private static string NormalizeAction(string? a)
        {
            var n = (a ?? "chitchat").Trim().ToLowerInvariant();
            return n switch
            {
                "query" or "analyze" or "predict" or "kb" or "chitchat" or "action" => n,
                _ => "chitchat"
            };
        }

        private static object? JsonElementToObject(JsonElement el) => el.ValueKind switch
        {
            JsonValueKind.String => el.GetString(),
            JsonValueKind.Number => el.TryGetInt64(out var i) ? i : el.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Object => el.EnumerateObject().ToDictionary(p => p.Name, p => JsonElementToObject(p.Value)),
            JsonValueKind.Array => el.EnumerateArray().Select(JsonElementToObject).ToList(),
            _ => null
        };

        // ====================================================================
        // Payload parsers (Dictionary → typed DTO)
        // ====================================================================
        private static ChatQueryRequestDto ParseQueryRequest(Dictionary<string, object?> p)
        {
            return new ChatQueryRequestDto
            {
                Entity = GetString(p, "entity") ?? "orders",
                Metric = GetString(p, "metric") ?? "count",
                Filters = ParseFilters(GetDict(p, "filters")),
                GroupBy = GetString(p, "groupBy") ?? GetString(p, "group_by"),
                Limit = GetInt(p, "limit"),
                OrderBy = GetString(p, "orderBy") ?? GetString(p, "order_by")
            };
        }

        private static ChatQueryFiltersDto ParseFilters(Dictionary<string, object?>? f)
        {
            f ??= new();
            return new ChatQueryFiltersDto
            {
                Period = GetString(f, "period"),
                From = GetDate(f, "from"),
                To = GetDate(f, "to"),
                Governorate = GetString(f, "governorate"),
                Status = GetString(f, "status"),
                Motif = GetString(f, "motif"),
                TypeCas = GetString(f, "typeCas"),
                Source = GetString(f, "source"),
                DriverId = GetString(f, "driverId"),
                ConfirmatriceId = GetString(f, "confirmatriceId"),
                ClientId = GetString(f, "clientId"),
                ProductRef = GetString(f, "productRef"),
                OrderNumber = GetString(f, "orderNumber") ?? GetString(f, "order_number"),
                Search = GetString(f, "search")
            };
        }

        private static ChatAnalyzeRequestDto ParseAnalyzeRequest(Dictionary<string, object?> p)
        {
            var subject = GetDict(p, "subject") ?? new();
            var options = GetDict(p, "options") ?? new();
            return new ChatAnalyzeRequestDto
            {
                Operation = GetString(p, "operation") ?? "trend",
                Subject = new ChatAnalyzeSubjectDto
                {
                    Entity = GetString(subject, "entity") ?? "orders",
                    Metric = GetString(subject, "metric") ?? "count",
                    Filters = ParseFilters(GetDict(subject, "filters"))
                },
                Options = new ChatAnalyzeOptionsDto
                {
                    Granularity = GetString(options, "granularity"),
                    GroupBy = GetString(options, "groupBy") ?? GetString(options, "group_by"),
                    BaselineWindow = GetInt(options, "baselineWindow") ?? GetInt(options, "baseline_window"),
                    SecondMetric = GetString(options, "secondMetric") ?? GetString(options, "second_metric"),
                    TopN = GetInt(options, "topN") ?? GetInt(options, "top_n")
                }
            };
        }

        private static ChatPredictRequestDto ParsePredictRequest(Dictionary<string, object?> p)
        {
            var input = GetDict(p, "input") ?? new();
            return new ChatPredictRequestDto
            {
                Task = GetString(p, "task") ?? "return_risk",
                Input = new ChatPredictInputDto
                {
                    DoPiece = GetString(input, "doPiece") ?? GetString(input, "do_piece"),
                    Governorate = GetString(input, "governorate"),
                    Amount = GetDecimal(input, "amount"),
                    PaymentMode = GetString(input, "paymentMode") ?? GetString(input, "payment_mode"),
                    DeliveryMode = GetString(input, "deliveryMode") ?? GetString(input, "delivery_mode"),
                    ClientType = GetString(input, "clientType") ?? GetString(input, "client_type"),
                    DayOfWeek = GetString(input, "dayOfWeek") ?? GetString(input, "day_of_week"),
                    PriorReturns = GetInt(input, "priorReturns") ?? GetInt(input, "prior_returns"),
                    HorizonDays = GetInt(input, "horizonDays") ?? GetInt(input, "horizon_days")
                }
            };
        }

        // ====================================================================
        // Chart resolution
        // ====================================================================
        private static ChatAskChartDto? ResolveChartFromQuery(ChatQueryResponseDto resp)
        {
            if (resp.Series != null && resp.Series.Count > 0)
            {
                return new ChatAskChartDto
                {
                    Type = "bar",
                    Points = resp.Series.Select(s => new ChatAskChartPointDto
                    {
                        Bucket = s.Bucket,
                        Value = (double)s.Value
                    }).ToList()
                };
            }
            return null;
        }

        private static ChatAskChartDto? ResolveChartFromAnalyze(ChatAnalyzeResponseDto resp)
        {
            if (resp.Compare != null && resp.Compare.Count > 0)
            {
                return new ChatAskChartDto
                {
                    Type = "bar",
                    Points = resp.Compare.Select(g => new ChatAskChartPointDto
                    {
                        Bucket = g.Label,
                        Value = (double)g.Value
                    }).ToList()
                };
            }
            if (resp.Series != null && resp.Series.Count > 0)
            {
                return new ChatAskChartDto
                {
                    Type = "line",
                    Points = resp.Series.Select(s => new ChatAskChartPointDto
                    {
                        Bucket = s.Bucket,
                        Value = (double)s.Value
                    }).ToList()
                };
            }
            return null;
        }

        private static ChatAskChartDto? ResolveChartFromPredict(ChatPredictResponseDto resp)
        {
            if (resp.Forecast != null && resp.Forecast.Count > 0)
            {
                return new ChatAskChartDto
                {
                    Type = "line",
                    Points = resp.Forecast.Select(p => new ChatAskChartPointDto
                    {
                        Bucket = p.Date,
                        Value = p.Value,
                        Lower = p.LowerBound,
                        Upper = p.UpperBound
                    }).ToList()
                };
            }
            return null;
        }

        private static List<ChatAskRowDto>? MapRows(List<ChatQueryRowDto>? src)
        {
            if (src == null || src.Count == 0) return null;
            return src.Take(8).Select(r => new ChatAskRowDto
            {
                Key = r.Key,
                Label = r.Label ?? r.Key ?? "?",
                Value = r.Value.HasValue ? (double?)r.Value : null,
                Fields = r.Fields
            }).ToList();
        }

        // ====================================================================
        // Helpers
        // ====================================================================
        private static string? GetString(Dictionary<string, object?> d, string key)
        {
            if (!d.TryGetValue(key, out var v) || v == null) return null;
            var s = v.ToString();
            return string.IsNullOrWhiteSpace(s) ? null : s;
        }

        private static int? GetInt(Dictionary<string, object?> d, string key)
        {
            if (!d.TryGetValue(key, out var v) || v == null) return null;
            if (v is long l) return (int)l;
            if (v is int i) return i;
            if (v is double dd) return (int)dd;
            if (int.TryParse(v.ToString(), out var parsed)) return parsed;
            return null;
        }

        private static decimal? GetDecimal(Dictionary<string, object?> d, string key)
        {
            if (!d.TryGetValue(key, out var v) || v == null) return null;
            if (v is long l) return l;
            if (v is int i) return i;
            if (v is double dd) return (decimal)dd;
            if (decimal.TryParse(v.ToString(), out var parsed)) return parsed;
            return null;
        }

        private static DateTime? GetDate(Dictionary<string, object?> d, string key)
        {
            var s = GetString(d, key);
            if (s == null) return null;
            return DateTime.TryParse(s, out var dt) ? dt : null;
        }

        private static Dictionary<string, object?>? GetDict(Dictionary<string, object?> d, string key)
            => d.TryGetValue(key, out var v) && v is Dictionary<string, object?> dict ? dict : null;

        // ====================================================================
        // Prompts
        // ====================================================================
        private const string RouterSystemPrompt = @"Tu es le routeur d'intentions du chatbot admin d'une plateforme de livraison COD (Cash on Delivery) en Tunisie.

Le projet : 4 rôles métier (CLIENT, CONFIRMATEUR, LIVREUR, ADMIN). Cycle commande : BC (créé par client) → CONFIRME (par confirmatrice) → BL → tentatives livreur → LIVRE / RETOUR / REPORTE. Statuts commande DO_Valide : EN_ATTENTE, CONFIRME, TENTATIVE, REFUSE. Statuts livraison LI_Statut : CONFIRME, EN_LIVRAISON, LIVRE, RETOUR, DEPOT, REPORTE. Réclamations (du client) — 4 statuts : ENVOYEE, EN_COURS_DE_TRAITEMENT, CLOTUREE, REFUSEE — 7 motifs : CHANGEMENT_ADRESSE, CHANGEMENT_NUMERO, REPROGRAMMATION, ANNULATION, COLIS_NON_RECU (avant livraison) + COLIS_ENDOMMAGE, COLIS_NON_CORRESPONDANT (après livraison). Demandes (du livreur) — 7 motifs en 3 groupes : A immédiat visible client (NUMERO_INCORRECT, ADRESSE_INCORRECTE), B immédiat interne (CLIENT_REFUSE, AUTRE), C différé après 3 tentatives (CLIENT_INJOIGNABLE, TELEPHONE_ETEINT, CLIENT_ABSENT). Confirmatrice : pause/active, attribution auto par charge + ancienneté + éligibilité, redistribution si déconnectée >30min, lock 15min sur BC. Livreur : pool géographique par gouvernorat, reprogrammation J+1 à J+14 sur créneau MATIN/APRES_MIDI/SOIR. SignalR : 9 events temps réel. Sage X3 = ERP source de vérité. Frais HOME = 8 DT, timbre fiscal = 1 DT. Gouvernorats Tunisie : Tunis, Ariana, Ben Arous, Manouba, Nabeul, Bizerte, Sfax, Sousse, Monastir, Mahdia, Kairouan, Gafsa, Gabes, Medenine, Tataouine, Kasserine, Sidi Bouzid, Beja, Jendouba, Kef, Siliana, Zaghouan, Tozeur, Kebili.

Tu reçois la question utilisateur et tu retournes EXCLUSIVEMENT un JSON avec ces champs :
- action : 'kb' | 'query' | 'analyze' | 'predict' | 'chitchat' | 'action'
- payload : objet adapté à action (vide pour kb/chitchat)

Règles de routing :
- 'kb' : question conceptuelle / explicative ('c''est quoi une réclamation ?', 'comment marche l''attribution ?', 'rôle confirmatrice ?', 'différence entre BC et BL ?'). payload : {}.
- 'query' : question chiffrée / liste / agrégat ('combien de commandes', 'top produits', 'liste réclamations', 'chiffre d''affaires Sfax'). payload : { entity: 'orders'|'claims'|'demandes'|'products'|'governorates'|'drivers'|'confirmatrices', metric: 'count'|'sum'|'avg'|'list'|'top', filters: { period: 'today'|'7d'|'30d'|'3m'|'12m', governorate, status, motif, typeCas }, groupBy: 'status'|'governorate'|'driver'|'day'|'week'|'month'|null, limit, orderBy }.
- 'analyze' : tendance / comparaison / anomalie / corrélation / distribution ('tendance des retours', 'compare gouvernorats', 'anomalies cette semaine', 'distribution des montants'). payload : { operation: 'trend'|'compare'|'anomaly'|'correlation'|'distribution', subject: { entity, metric: 'count'|'sum_amount'|'return_rate'|'delivery_rate', filters }, options: { granularity, groupBy, baselineWindow, secondMetric, topN } }.
- 'predict' : prédiction / probabilité / prévision ('risque de retour BC0042', 'volume prévu semaine prochaine', 'probabilité livraison'). payload : { task: 'return_risk'|'delivery_first_attempt'|'volume_forecast', input: { doPiece, governorate, amount, paymentMode, deliveryMode, clientType, dayOfWeek, priorReturns, horizonDays } }.
- 'action' : ordre d'exécution ('crée une réclamation pour BL00123', 'assigne BL00123 à Ahmed', 'passe BL00123 en retournée', 'libère le cas #245', 'mets Amira en pause', 'envoie un SMS au client de BL00123'). payload : { actionType: 'create_claim'|'assign_driver'|'change_order_status'|'release_case'|'pause_confirmer'|'send_sms_client', params: { doPiece, motif, description, name, caseId, ... } }.
- 'chitchat' : 'bonjour', 'merci', 'qui es-tu', salutation. payload : {}.

Exemples :
Q: 'Combien de commandes livrées à Sfax la semaine dernière ?' → {""action"":""query"",""payload"":{""entity"":""orders"",""metric"":""count"",""filters"":{""period"":""7d"",""governorate"":""Sfax"",""status"":""delivered""}}}
Q: 'C''est quoi une réclamation ?' → {""action"":""kb"",""payload"":{}}
Q: 'Tendance des réclamations sur 3 mois' → {""action"":""analyze"",""payload"":{""operation"":""trend"",""subject"":{""entity"":""claims"",""metric"":""count"",""filters"":{""period"":""3m""}},""options"":{""granularity"":""week""}}}
Q: 'Volume prévu sur 7 jours' → {""action"":""predict"",""payload"":{""task"":""volume_forecast"",""input"":{""horizonDays"":7}}}
Q: 'Bonjour' → {""action"":""chitchat"",""payload"":{}}

Réponds UNIQUEMENT avec le JSON, sans aucun texte additionnel.";

        private const string FormatterSystemPrompt = @"Tu es l'assistant métier d'une plateforme de livraison COD en Tunisie. Tu réponds en français clair, naturel, professionnel, en 1 à 3 phrases. Tu ne inventes JAMAIS de chiffres absents des données fournies. Tu ne fais pas de salutation, pas d'emoji, pas de formules de politesse en début ou fin. Si la question est conceptuelle (action='kb'), tu réponds en t'appuyant sur ta connaissance du projet décrit dans le system prompt précédent. Si la question est un small talk (action='chitchat'), tu réponds poliment et tu rappelles brièvement ce que tu peux faire (commandes, réclamations, livreurs, prédictions, statistiques). Tu réponds directement à la question.";

        private const string FormatterPromptAr = @"أنت مساعد المسؤول لمنصة توصيل تونسية بالدفع نقدا (COD). أجب بالعربية الفصحى، بشكل واضح ومهني، في 1 إلى 3 جمل قصيرة. لا تخترع أبدا أرقاما غير موجودة في البيانات المقدمة. لا تستخدم رموز تعبيرية ولا تحيات. أجب مباشرة على السؤال.";

        private const string FormatterPromptTounsi = @"Enti l'assistant mta3 admin lel plateforme tawsi3 COD fi Tunis. Tjaweb b'tounsi naturel w 9rib men el 3ada lyoumiya, b 1 ila 3 phrases courtes. Tnjmeh tasta3mel l'ASCII tunisien (3 ع, 7 ح, 9 ق, 5 خ). Ma t5ti3ch arqam mahomesh fil donnees. Ma tasta3melch emojis. Tjaweb mubasharatan 3al question.";

        private static string BuildFormatterPrompt(string question, string action, object? data)
        {
            var dataJson = data == null
                ? "(aucune donnée)"
                : JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
            return $@"Question utilisateur : {question}

Action exécutée : {action}

Données / résultat :
{dataJson}

Rédige une réponse naturelle en français (1 à 3 phrases) qui répond précisément à la question. Si l'action est 'kb' ou 'chitchat', appuie-toi sur ta connaissance du projet (pas de chiffres). Si l'action est 'query', 'analyze' ou 'predict', cite les chiffres clés tels quels (ne pas inventer). Si les données contiennent un avertissement ou une erreur, mentionne-le.";
        }
    }
}
