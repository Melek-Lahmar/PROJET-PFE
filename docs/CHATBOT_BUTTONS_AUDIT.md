# CHATBOT_BUTTONS_AUDIT.md

> Audit du chatbot admin (UI Flutter + backend services).
> Périmètre : `flutter/lib/ui/admin/screens/admin_chat_screen.dart` + `Web-Api/Services/Admin/Chat/` + `Web-Api/Controllers/Admin/AdminChatController.cs`.
> Date : 2026-05-09

## Flutter Chatbot UI

| Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|
| Effacer (Delete) | admin_chat_screen.dart:166 | ✅ OK | prov.clear() |
| Chips suggestions catégories | admin_chat_screen.dart:363 | ✅ OK | onSuggestion(q) → _send |
| Bouton Send | admin_chat_screen.dart:853 | ✅ OK | onSend(null) → _send |
| TextField composer | admin_chat_screen.dart:838 | ✅ OK | onSubmitted → _send |

Tous → `AdminChatProvider.send(text)` → `AdminChatService.ask` → `POST /api/admin/chat/ask`.

## Backend Services

| Service.Méthode | Fichier:ligne | Statut | Notes |
|---|---|---|---|
| AdminChatController.Ask | AdminChatController.cs:325 | ✅ OK | Pipeline orchestrateur complet |
| AdminChatController.Ping | AdminChatController.cs:338 | ✅ OK | Health endpoint |
| AdminChatController.OrdersCount | AdminChatController.cs:76 | ✅ OK | _orders.GetPageAsync |
| AdminChatController.OrdersList | AdminChatController.cs:104 | ✅ OK | Liste paginée |
| AdminChatController.OrderDetail | AdminChatController.cs:132 | ✅ OK | Gère 404 |
| AdminChatController.ClaimsCount | AdminChatController.cs:144 | ✅ OK | _claims.GetOverviewAsync |
| AdminChatController.ClaimsList | AdminChatController.cs:178 | ✅ OK | Liste cas |
| AdminChatController.ProductsTop | AdminChatController.cs:202 | ✅ OK | Top 5 produits |
| AdminChatController.GovernoratesStats | AdminChatController.cs:236 | ✅ OK | Stats gouvernorats |
| AdminChatController.Query | AdminChatController.cs:272 | ✅ OK | DSL universel |
| AdminChatController.Analyze | AdminChatController.cs:289 | ✅ OK | Analyse statistique |
| AdminChatController.Predict | AdminChatController.cs:306 | ✅ OK | ML.NET prédictions |
| AdminChatOrchestratorService.AskAsync | AdminChatOrchestratorService.cs:40 | ✅ OK | Router → exec → formatter Groq |
| AdminChatQueryService.ExecuteAsync | AdminChatQueryService.cs:42 | ✅ OK | Dispatcher entité |
| QueryOrdersAsync | AdminChatQueryService.cs:84 | ✅ OK | count/sum/avg/list/top + groupBy |
| QueryClaimsAsync | AdminChatQueryService.cs:387 | ✅ OK | count/list + groupBy |
| QueryProductsAsync | AdminChatQueryService.cs:562 | ✅ OK | top par qty/revenue |
| QueryGovernoratesAsync | AdminChatQueryService.cs:661 | ✅ OK | Répartition + taux |
| QueryDriversAsync | AdminChatQueryService.cs:740 | ✅ OK | QueryUsersByRoleAsync |
| QueryConfirmatricesAsync | AdminChatQueryService.cs:745 | ✅ OK | QueryUsersByRoleAsync |
| AdminChatAnalyzeService.ExecuteAsync | AdminChatAnalyzeService.cs:36 | ✅ OK | Dispatcher op |
| TrendAsync | AdminChatAnalyzeService.cs:59 | ✅ OK | Régression linéaire + R² |
| CompareAsync | AdminChatAnalyzeService.cs:119 | ✅ OK | GroupBy + top N |
| AnomalyAsync | AdminChatAnalyzeService.cs:260 | ✅ OK | Z-score |
| CorrelationAsync | AdminChatAnalyzeService.cs:329 | ✅ OK | Pearson |
| DistributionAsync | AdminChatAnalyzeService.cs:384 | ✅ OK | P25/P50/P75/P95 |
| PredictionService.PredictAsync | PredictionService.cs:67 | ✅ OK | Dispatcher tâche |
| PredictReturnRiskAsync | PredictionService.cs:86 | ✅ OK | SDCA + factors |
| EnsureReturnRiskModelAsync | PredictionService.cs:120 | ✅ OK | Lazy train, real+synth |
| LoadRealReturnRiskAsync | PredictionService.cs:182 | ✅ OK | Charge données réelles |
| PredictDeliveryFirstAsync | PredictionService.cs:300 | ✅ OK | SDCA synthétique |
| PredictVolumeForecastAsync | PredictionService.cs:390 | ✅ OK | SSA time series |

## TOTAL : 4 boutons UI ✅, 32 méthodes backend ✅, 0 stubs

## Ajouts à venir (Section 5 — 8 améliorations)

- **Mémoire conversationnelle** : tables `F_CHATBOT_SESSION` + `F_CHATBOT_MESSAGE` + injection 6 derniers
- **Bilingue FR/AR/Tounsi** : `LanguageDetectorService` + 3 prompts système
- **Suggestions proactives** : table `F_CHATBOT_INSIGHT` + job Hangfire 30min
- **Actions sécurisées** : tables `F_CHATBOT_PENDING_ACTION` + `F_CHATBOT_ACTION_LOG`, double confirmation OUI/ANNULER
- **Voice I/O** : packages `speech_to_text` + `flutter_tts`, boutons micro/HP, mode mains-libres
- **Streaming SSE** : endpoint `/api/admin/chat/ask-stream` + parser Dio Flutter
- **Quick-replies contextuelles** : champ `suggestions[]` dans réponse + composant `QuickRepliesRow`
- **KB hybride auto-générée** : `KbGeneratorService` (HostedService) + endpoint `/api/admin/chat/kb/refresh`
