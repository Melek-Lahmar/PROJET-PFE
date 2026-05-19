using System.Globalization;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Dashboard;
using Web_Api.Model;

namespace Web_Api.Services
{
    public class DashboardAggregationService
    {
        private const short DomainVente = 0;
        private const short BcType = 0;
        private const short BlType = 1;

        private readonly AppDbContext _db;

        public DashboardAggregationService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<OverviewDashboardResponseDto> GetOverviewAsync(DashboardQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var snapshot = await LoadSnapshotAsync(filter, ct);
            var previous = await LoadPreviousSnapshotAsync(filter, ct);

            var bcHeaders = snapshot.Headers.Where(IsBc).ToList();
            var blHeaders = snapshot.Headers.Where(IsBl).ToList();

            var revenue = SumNet(bcHeaders);
            var ordersCount = bcHeaders.Count;
            var bcCount = bcHeaders.Count;
            var blCount = blHeaders.Count;
            var inDeliveryCount = snapshot.Livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.EnLivraison);
            var averageBasket = ordersCount == 0 ? 0m : revenue / ordersCount;

            return new OverviewDashboardResponseDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = ToAppliedFilters(filter),
                DataCompletenessNote = "Le chiffre d’affaires est calculé sur les BC locaux pour éviter les doubles comptes potentiels entre BC et BL.",
                Warnings = BuildCommonWarnings(includeConversionWarning: true),
                HeadlineKpis = new List<KpiCardDto>
                {
                    CreateCurrencyKpi("revenue", "Chiffre d'affaires", revenue, SumNet(previous.Headers.Where(IsBc))),
                    CreateCountKpi("orders", "Commandes", ordersCount, previous.Headers.Count(IsBc)),
                    CreateCountKpi("bc", "BC", bcCount, previous.Headers.Count(IsBc)),
                    CreateCountKpi("bl", "BL", blCount, previous.Headers.Count(IsBl)),
                    CreateCountKpi("deliveriesInProgress", "Livraisons en cours", inDeliveryCount, previous.Livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.EnLivraison)),
                    CreateCurrencyKpi("averageBasket", "Panier moyen", averageBasket, SafeDivide(SumNet(previous.Headers.Where(IsBc)), previous.Headers.Count(IsBc)))
                },
                SalesTrend = BuildAmountTrend(bcHeaders, filter, x => x.DO_NetAPayer ?? 0m),
                OrderTrend = BuildCountTrend(bcHeaders, filter),
                DocumentFlow = BuildDocumentFlowBreakdown(bcHeaders, blHeaders),
                TopProducts = BuildTopProducts(snapshot, filter, includeOnlyBc: true),
                TopCategories = BuildTopCategories(snapshot, filter, includeOnlyBc: true),
                OperationalAlerts = BuildOverviewAlerts(snapshot, filter.TopN),
                Conversion = new ConversionMetricDto
                {
                    IsAvailable = false,
                    FormulaNote = "Aucune source de télémétrie web exploitable n’a été trouvée dans le backend actuel pour calculer un taux de conversion e-commerce fiable."
                }
            };
        }

        public async Task<SalesDashboardResponseDto> GetSalesAsync(DashboardQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var snapshot = await LoadSnapshotAsync(filter, ct);
            var previous = await LoadPreviousSnapshotAsync(filter, ct);

            var bcHeaders = snapshot.Headers.Where(IsBc).ToList();
            var groupedByClient = bcHeaders.GroupBy(x => Normalize(x.DO_Tiers) ?? "INCONNU").ToList();

            var totalRevenue = SumNet(bcHeaders);
            var totalOrders = bcHeaders.Count;
            var confirmedCount = bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME);
            var refusedCount = bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE);
            var repeatClients = groupedByClient.Count(g => g.Count() > 1 && g.Key != "INCONNU");

            return new SalesDashboardResponseDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = ToAppliedFilters(filter),
                DataCompletenessNote = "Les métriques ventes/clients utilisent les BC comme source de vérité commerciale afin d’éviter les doubles comptes liés aux transformations BC → BL.",
                Warnings = BuildCommonWarnings(),
                HeadlineKpis = new List<KpiCardDto>
                {
                    CreateCurrencyKpi("salesAmount", "Ventes période", totalRevenue, SumNet(previous.Headers.Where(IsBc))),
                    CreateCountKpi("salesOrders", "Commandes période", totalOrders, previous.Headers.Count(IsBc)),
                    CreatePercentKpi("confirmationRate", "Taux confirmation", ToPercent(confirmedCount, totalOrders), ToPercent(previous.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), previous.Headers.Count(IsBc))),
                    CreatePercentKpi("cancelRate", "Taux annulation", ToPercent(refusedCount, totalOrders), ToPercent(previous.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), previous.Headers.Count(IsBc))),
                    CreatePercentKpi("repeatPurchaseRate", "Réachat estimé", ToPercent(repeatClients, groupedByClient.Count), 0m)
                },
                SalesTrend = BuildAmountTrend(bcHeaders, filter, x => x.DO_NetAPayer ?? 0m),
                ClientSplit = BuildClientTypeBreakdown(bcHeaders, snapshot.ProfileByAlias),
                OrderStatusBreakdown = BuildBcStatusBreakdown(bcHeaders),
                ConfirmationFunnel = BuildConfirmationFunnel(bcHeaders, snapshot.Headers.Count(IsBl)),
                TopClients = BuildTopClients(bcHeaders, snapshot.ProfileByAlias, filter.TopN),
                TopProducts = BuildTopProducts(snapshot, filter, includeOnlyBc: true),
                GeoPerformance = BuildGeoPerformance(bcHeaders, snapshot.ProfileByAlias, filter.TopN),
                RepeatPurchaseInsights = groupedByClient
                    .Where(g => g.Key != "INCONNU" && g.Count() > 1)
                    .Select(g =>
                    {
                        var profile = ResolveProfile(g.First().DO_Tiers, snapshot.ProfileByAlias);
                        var label = ComputeClientDisplay(profile, g.First().DO_Tiers);
                        return new TopItemDto
                        {
                            Key = g.Key,
                            Label = label,
                            SecondaryLabel = profile?.TypeClient == TypeClient.B2B ? "B2B" : "B2C",
                            Value = g.Count(),
                            FormattedValue = $"{g.Count()} achats",
                            Meta = FormatCurrency(SumNet(g))
                        };
                    })
                    .OrderByDescending(x => x.Value)
                    .Take(filter.TopN)
                    .ToList()
            };
        }

        public async Task<LogisticsDashboardResponseDto> GetLogisticsAsync(DashboardQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var snapshot = await LoadSnapshotAsync(filter, ct);
            var previous = await LoadPreviousSnapshotAsync(filter, ct);

            var blHeaders = snapshot.Headers.Where(IsBl).ToList();
            var deliveryStatuses = BuildDeliveryStatusList(blHeaders, snapshot.Livraisons);
            var deliveredLivraisons = snapshot.Livraisons.Where(x => x.LI_DateLivree.HasValue).ToList();
            var avgDelayDays = deliveredLivraisons.Count == 0
                ? 0m
                : (decimal)deliveredLivraisons.Average(x => (x.LI_DateLivree!.Value - x.LI_DateCreation).TotalDays);

            return new LogisticsDashboardResponseDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = ToAppliedFilters(filter),
                DataCompletenessNote = "Les statuts logistiques agrègent F_LIVRAISON quand elle existe, sinon le statut documentaire BL local.",
                Warnings = BuildCommonWarnings(),
                HeadlineKpis = new List<KpiCardDto>
                {
                    CreateCountKpi("blGenerated", "BL générés", blHeaders.Count, previous.Headers.Count(IsBl)),
                    CreateCountKpi("blPending", "BL en attente", deliveryStatuses.Count(x => x.Status == DeliveryStatuses.EnAttente || x.Status == DeliveryStatuses.Confirme), CountDeliveryStatuses(previous.Headers.Where(IsBl).ToList(), previous.Livraisons, DeliveryStatuses.EnAttente, DeliveryStatuses.Confirme)),
                    CreateCountKpi("blInProgress", "BL en cours", deliveryStatuses.Count(x => x.Status == DeliveryStatuses.EnLivraison), CountDeliveryStatuses(previous.Headers.Where(IsBl).ToList(), previous.Livraisons, DeliveryStatuses.EnLivraison)),
                    CreateCountKpi("blDelivered", "BL livrés", deliveryStatuses.Count(x => x.Status == DeliveryStatuses.Livre), CountDeliveryStatuses(previous.Headers.Where(IsBl).ToList(), previous.Livraisons, DeliveryStatuses.Livre)),
                    CreateCountKpi("logisticsLoad", "Charge logistique", (int)Math.Round(snapshot.Lines.Where(x => x.DO_Type == BlType).Sum(x => x.DL_Qte ?? 0m), MidpointRounding.AwayFromZero), (int)Math.Round(previous.Lines.Where(x => x.DO_Type == BlType).Sum(x => x.DL_Qte ?? 0m), MidpointRounding.AwayFromZero)),
                    CreateDecimalKpi("averageDelay", "Délai moyen", avgDelayDays, previous.Livraisons.Where(x => x.LI_DateLivree.HasValue).Any() ? (decimal)previous.Livraisons.Where(x => x.LI_DateLivree.HasValue).Average(x => (x.LI_DateLivree!.Value - x.LI_DateCreation).TotalDays) : 0m, "j")
                },
                BlTrend = BuildCountTrend(blHeaders, filter),
                DeliveryStatusBreakdown = BuildDeliveryStatusBreakdown(deliveryStatuses),
                CourierPerformance = BuildCourierPerformance(snapshot, filter.TopN),
                DepotPerformance = BuildDepotPerformance(blHeaders, filter.TopN),
                CriticalStockItems = BuildCriticalStockItems(snapshot, filter.TopN),
                TopShippedItems = BuildTopProducts(snapshot, filter, includeOnlyBc: false),
                IncidentAlerts = BuildLogisticsAlerts(snapshot),
                BcToBlFlow = BuildBcToBlFlow(snapshot)
            };
        }

        public async Task<ConfirmateurDashboardResponseDto> GetConfirmateurAsync(DashboardQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var snapshot = await LoadSnapshotAsync(filter, ct);
            var previous = await LoadPreviousSnapshotAsync(filter, ct);

            var bcHeaders = snapshot.Headers.Where(IsBc).ToList();
            var processed = bcHeaders.Where(x => x.DO_Valide != F_DOCENTETE.STATUS_EN_ATTENTE).ToList();
            var processingDurations = processed
                .Where(x => x.cbCreation.HasValue && x.cbModification.HasValue && x.cbModification >= x.cbCreation)
                .Select(x => (x.cbModification!.Value - x.cbCreation!.Value).TotalHours)
                .ToList();

            var estimatedAverageProcessingHours = processingDurations.Count == 0
                ? 0m
                : decimal.Round((decimal)processingDurations.Average(), 2);

            var estimatedTransformationRate = EstimateTransformationRate(snapshot);
            var previousEstimatedTransformationRate = EstimateTransformationRate(previous);

            var warnings = BuildCommonWarnings();
            warnings.Add("Le calcul de transformation BC → BL reste estimatif car le backend contient encore deux implémentations concurrentes du workflow BC → BL.");

            return new ConfirmateurDashboardResponseDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = ToAppliedFilters(filter),
                DataCompletenessNote = "Le temps moyen de traitement et le taux BC → BL sont estimés à partir des dates et états locaux disponibles ; le backend actuel ne persiste pas un journal confirmateur exhaustif.",
                Warnings = warnings,
                HeadlineKpis = new List<KpiCardDto>
                {
                    CreateCountKpi("bcPending", "BC en attente", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE), previous.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE)),
                    CreateCountKpi("bcProcessed", "BC traités", processed.Count, previous.Headers.Count(x => IsBc(x) && x.DO_Valide != F_DOCENTETE.STATUS_EN_ATTENTE)),
                    CreateCountKpi("bcAttempts", "BC tentatives", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE), previous.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE)),
                    CreateCountKpi("bcRefused", "BC refusés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), previous.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_REFUSE)),
                    CreateDecimalKpi("processingTime", "Temps moyen traitement", estimatedAverageProcessingHours, 0m, "h"),
                    CreatePercentKpi("bcToBlRate", "Transformation BC → BL", estimatedTransformationRate, previousEstimatedTransformationRate)
                },
                QueueStatus = BuildBcStatusBreakdown(bcHeaders),
                ProcessingTrend = BuildCountTrend(processed, filter),
                TransformationTrend = BuildCountTrend(snapshot.Headers.Where(IsBl).ToList(), filter),
                BlockedOrders = BuildBlockedOrders(snapshot, filter.TopN),
                PriorityOrders = BuildPriorityOrders(snapshot, filter.TopN),
                OperationalAlerts = BuildConfirmateurAlerts(snapshot)
            };
        }

        public async Task<AdminSyncDashboardResponseDto> GetAdminSyncAsync(DashboardQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var snapshot = await LoadSnapshotAsync(filter, ct, includeDocuments: false);
            var internalUserCount = await CountInternalUsersAsync(ct);

            var articlesWithoutCatalog = snapshot.Articles.Count(x => x.CL_No1 <= 0 && x.CL_No2 <= 0 && x.CL_No3 <= 0 && x.CL_No4 <= 0);
            var sleepingArticles = snapshot.Articles.Count(x => x.AR_Sommeil == 1);
            var unpublishedArticles = snapshot.Articles.Count(x => x.AR_Publie != 1);
            var stocksNegative = snapshot.Stocks.Count(x => (x.AS_QteSto - x.AS_QteRes) < 0m);
            var customersWithoutAddress = snapshot.Profiles.Count(x => x.TypeProfil == TypeProfil.Client && string.IsNullOrWhiteSpace(x.Adresse));
            var customersWithoutSync = snapshot.Profiles.Count(x => x.TypeProfil == TypeProfil.Client && !x.EstSynchroniseAvecSage.GetValueOrDefault());
            var anomalies = articlesWithoutCatalog + sleepingArticles + unpublishedArticles + stocksNegative + customersWithoutAddress + customersWithoutSync;

            var latestProfileSync = snapshot.Profiles
                .Where(x => x.DateDerniereSynchronisation.HasValue)
                .OrderByDescending(x => x.DateDerniereSynchronisation)
                .Select(x => x.DateDerniereSynchronisation)
                .FirstOrDefault();

            return new AdminSyncDashboardResponseDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = ToAppliedFilters(filter),
                DataCompletenessNote = "Le backend actuel ne persiste pas un historique structuré de synchronisation ; ce dashboard expose donc l’état courant des référentiels et des anomalies détectables localement.",
                Warnings = new List<string>
                {
                    "Le endpoint /api/SyncAll/status dépend de sous-routes /status qui ne sont pas présentes dans les controllers de sync actuels ; l’état de synchronisation détaillé reste donc partiel."
                },
                HeadlineKpis = new List<KpiCardDto>
                {
                    CreateCountKpi("articlesSynced", "Articles sync", snapshot.Articles.Count, 0),
                    CreateCountKpi("stocksSynced", "Stocks sync", snapshot.Stocks.Count, 0),
                    CreateCountKpi("catalogsSynced", "Catalogues sync", snapshot.Catalogues.Count, 0),
                    CreateCountKpi("depotsSynced", "Dépôts sync", snapshot.Depots.Count, 0),
                    CreateCountKpi("anomalies", "Anomalies détectées", anomalies, 0),
                    CreateCountKpi("internalUsers", "Utilisateurs internes", internalUserCount, 0)
                },
                SyncModules = new List<StatusBreakdownItemDto>
                {
                    CreateStatusItem("articles", "Articles", snapshot.Articles.Count, snapshot.Articles.Count + snapshot.Catalogues.Count + snapshot.Depots.Count + snapshot.Stocks.Count),
                    CreateStatusItem("catalogues", "Catalogues", snapshot.Catalogues.Count, snapshot.Articles.Count + snapshot.Catalogues.Count + snapshot.Depots.Count + snapshot.Stocks.Count),
                    CreateStatusItem("depots", "Dépôts", snapshot.Depots.Count, snapshot.Articles.Count + snapshot.Catalogues.Count + snapshot.Depots.Count + snapshot.Stocks.Count),
                    CreateStatusItem("stocks", "Stocks", snapshot.Stocks.Count, snapshot.Articles.Count + snapshot.Catalogues.Count + snapshot.Depots.Count + snapshot.Stocks.Count),
                },
                DataIntegrityAlerts = new List<OperationalAlertDto>
                {
                    CreateAlert("warning", "CUSTOMERS_ADDRESS", "Clients sans adresse", $"{customersWithoutAddress} profils client n’ont pas d’adresse complète exploitable.", customersWithoutAddress, "Compléter les profils avant d’exposer davantage d’automatisation logistique."),
                    CreateAlert("warning", "CUSTOMERS_SYNC", "Clients non synchronisés", $"{customersWithoutSync} profils client ne sont pas marqués comme synchronisés avec Sage.", customersWithoutSync, "Contrôler le mapping CodeClientSage / UtilisateurId."),
                    CreateAlert("warning", "ARTICLE_CATALOG", "Articles sans famille", $"{articlesWithoutCatalog} articles ne possèdent aucun rattachement catalogue exploitable.", articlesWithoutCatalog, "Compléter la hiérarchie catalogue avant les analyses fines par catégorie."),
                    CreateAlert("critical", "NEGATIVE_STOCK", "Stocks incohérents", $"{stocksNegative} lignes de stock ont un disponible négatif (QteSto - QteRes).", stocksNegative, "Contrôler les réservations et la qualité de la synchronisation stock.")
                }
                .Where(x => x.Count.GetValueOrDefault() > 0)
                .ToList(),
                CatalogHealth = snapshot.Catalogues
                    .OrderBy(x => x.CL_Niveau)
                    .ThenBy(x => x.CL_Intitule)
                    .Take(filter.TopN)
                    .Select(x => new TopItemDto
                    {
                        Key = x.CL_No.ToString(CultureInfo.InvariantCulture),
                        Label = x.CL_Intitule,
                        SecondaryLabel = x.CL_Code,
                        Value = snapshot.Articles.Count(a => a.CL_No1 == x.CL_No || a.CL_No2 == x.CL_No || a.CL_No3 == x.CL_No || a.CL_No4 == x.CL_No),
                        FormattedValue = $"{snapshot.Articles.Count(a => a.CL_No1 == x.CL_No || a.CL_No2 == x.CL_No || a.CL_No3 == x.CL_No || a.CL_No4 == x.CL_No)} articles",
                        Meta = $"Niveau {x.CL_Niveau}"
                    })
                    .ToList(),
                StockHealth = snapshot.Stocks
                    .OrderBy(x => (x.AS_QteSto - x.AS_QteRes))
                    .Take(filter.TopN)
                    .Select(x => new TopItemDto
                    {
                        Key = $"{x.AR_Ref}-{x.DE_No}",
                        Label = snapshot.ArticleByRef.TryGetValue(x.AR_Ref, out var article) ? article.AR_Design : x.AR_Ref,
                        SecondaryLabel = x.AR_Ref,
                        Value = x.AS_QteSto - x.AS_QteRes,
                        FormattedValue = FormatQuantity(x.AS_QteSto - x.AS_QteRes),
                        Meta = $"Dépôt {x.DE_No}"
                    })
                    .ToList(),
                CustomerDataQuality = snapshot.Profiles
                    .Where(x => x.TypeProfil == TypeProfil.Client)
                    .OrderBy(x => string.IsNullOrWhiteSpace(x.Adresse) ? 0 : 1)
                    .ThenBy(x => x.EstSynchroniseAvecSage.GetValueOrDefault() ? 1 : 0)
                    .Take(filter.TopN)
                    .Select(x => new TopItemDto
                    {
                        Key = x.cbMarq.ToString(CultureInfo.InvariantCulture),
                        Label = ComputeClientDisplay(x, null),
                        SecondaryLabel = x.TypeClient == TypeClient.B2B ? "B2B" : "B2C",
                        Value = (string.IsNullOrWhiteSpace(x.Adresse) ? 0 : 1) + (x.EstSynchroniseAvecSage.GetValueOrDefault() ? 1 : 0),
                        FormattedValue = string.IsNullOrWhiteSpace(x.Adresse) ? "Adresse manquante" : (x.EstSynchroniseAvecSage.GetValueOrDefault() ? "Profil cohérent" : "Sync manquante"),
                        Meta = x.CodeClientSage
                    })
                    .ToList(),
                LatestSyncStatus = new SyncHealthDto
                {
                    IsAvailable = latestProfileSync.HasValue,
                    Status = latestProfileSync.HasValue ? "PARTIELLEMENT DISPONIBLE" : "NON DISPONIBLE",
                    CheckedAt = latestProfileSync,
                    Note = latestProfileSync.HasValue
                        ? "Date basée sur DateDerniereSynchronisation des profils ; aucun historique global de sync n’est persistant dans le backend actuel."
                        : "Aucune donnée de synchronisation exploitable n’a été trouvée dans les tables locales pour produire un état global fiable."
                }
            };
        }

        public async Task<StrategicInsightsDashboardResponseDto> GetStrategicInsightsAsync(DashboardQueryDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var snapshot = await LoadSnapshotAsync(filter, ct);
            var bcHeaders = snapshot.Headers.Where(IsBc).ToList();
            var blHeaders = snapshot.Headers.Where(IsBl).ToList();

            var salesBaseTrend = BuildAmountTrend(bcHeaders, filter, x => x.DO_NetAPayer ?? 0m);
            var logisticsBaseTrend = BuildCountTrend(blHeaders, filter);
            var salesForecast = BuildForecast(salesBaseTrend, filter);
            var logisticsForecast = BuildForecast(logisticsBaseTrend, filter);

            var stockRiskItems = BuildStockRiskItems(snapshot, filter.TopN);
            var customerScoring = BuildCustomerScoring(bcHeaders, snapshot.ProfileByAlias, filter.TopN);

            var warnings = BuildCommonWarnings();
            warnings.Add("Le backend actuel ne contient pas de moteur IA ni de modèle prédictif dédié ; les insights exposés ici sont volontairement heuristiques.");

            return new StrategicInsightsDashboardResponseDto
            {
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = ToAppliedFilters(filter),
                DataCompletenessNote = "Ce dashboard reste AI-ready : les métriques avancées reposent sur des heuristiques déterministes et des projections simples, pas sur un moteur IA déjà industrialisé.",
                Warnings = warnings,
                HeadlineKpis = new List<KpiCardDto>
                {
                    CreateCurrencyKpi("forecastSales", "Prévision ventes", salesForecast.LastOrDefault()?.Value ?? 0m, salesBaseTrend.LastOrDefault()?.Value ?? 0m),
                    CreateCountKpi("stockRisk", "Risque rupture stock", stockRiskItems.Count(x => x.Value < 7m), 0),
                    CreateCountKpi("forecastLogistics", "Charge logistique prévue", (int)Math.Round(logisticsForecast.LastOrDefault()?.Value ?? 0m, MidpointRounding.AwayFromZero), (int)Math.Round(logisticsBaseTrend.LastOrDefault()?.Value ?? 0m, MidpointRounding.AwayFromZero)),
                    CreateCountKpi("highValueCustomers", "Clients à forte valeur", customerScoring.Count(x => x.Value >= 70m), 0)
                },
                SalesForecast = salesForecast,
                LogisticsForecast = logisticsForecast,
                StockRiskItems = stockRiskItems,
                CustomerScoring = customerScoring,
                AutoInsights = BuildStrategicInsights(snapshot, stockRiskItems, customerScoring),
                ComingSoonModules = new List<TopItemDto>
                {
                    new() { Key = "ml-forecast", Label = "Forecast ML avancé", SecondaryLabel = "Coming soon", Value = 1m, FormattedValue = "Backlog", Meta = "Prévu quand l’historique sera fiabilisé." },
                    new() { Key = "customer-ltv", Label = "Scoring LTV", SecondaryLabel = "Coming soon", Value = 1m, FormattedValue = "Backlog", Meta = "Nécessite plus d’historique commande/paiement." },
                    new() { Key = "route-optimizer", Label = "Optimisation tournée", SecondaryLabel = "Coming soon", Value = 1m, FormattedValue = "Backlog", Meta = "Nécessite davantage de données livreur et géo." }
                },
                MethodologyNote = "Prévisions basées sur moyenne glissante des derniers points et scoring client heuristique basé sur fréquence, récence et montant.",
                ConfidenceNote = "Confiance moyenne : la structure est crédible pour la soutenance, mais les projections resteront indicatives tant qu’un historique analytique plus riche n’est pas persistant."
            };
        }

        private async Task<DashboardSnapshot> LoadSnapshotAsync(DashboardFilter filter, CancellationToken ct, bool includeDocuments = true)
        {
            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var articles = await _db.F_ARTICLES.AsNoTracking().ToListAsync(ct);
            var catalogues = await _db.F_CATALOGUES.AsNoTracking().ToListAsync(ct);
            var depots = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);

            var stocksQuery = _db.F_ARTSTOCKS.AsNoTracking().AsQueryable();
            if (filter.DepotNo.HasValue)
                stocksQuery = stocksQuery.Where(x => x.DE_No == filter.DepotNo.Value);
            var stocks = await stocksQuery.ToListAsync(ct);

            var headers = new List<F_DOCENTETE>();
            var lines = new List<F_DOCLIGNE>();
            var livraisons = new List<F_LIVRAISON>();

            if (includeDocuments)
            {
                var headerQuery = _db.F_DOCENTETES
                    .AsNoTracking()
                    .Where(x => x.DO_Domaine == DomainVente)
                    .Where(x =>
                        (x.DO_Date.HasValue && x.DO_Date.Value >= filter.From && x.DO_Date.Value < filter.ToExclusive) ||
                        (!x.DO_Date.HasValue && x.cbCreation.HasValue && x.cbCreation.Value >= filter.From && x.cbCreation.Value < filter.ToExclusive));

                if (filter.DepotNo.HasValue)
                    headerQuery = headerQuery.Where(x => x.DE_No == filter.DepotNo.Value);

                headers = await headerQuery
                    .OrderByDescending(x => x.cbMarq)
                    .ToListAsync(ct);

                headers = ApplyClientTypeFilter(headers, profiles, filter.ClientType);

                var pieces = headers
                    .Select(x => x.DO_Piece)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Cast<string>()
                    .ToList();

                if (pieces.Count > 0)
                {
                    lines = await _db.F_DOCLIGNES
                        .AsNoTracking()
                        .Where(x => x.DO_Domaine == DomainVente && x.DO_Piece != null && pieces.Contains(x.DO_Piece))
                        .OrderBy(x => x.cbMarq)
                        .ToListAsync(ct);

                    if (filter.CatalogueNo.HasValue)
                    {
                        var allowedRefs = articles
                            .Where(a => MatchesCatalogue(a, filter.CatalogueNo.Value))
                            .Select(a => a.AR_Ref)
                            .ToHashSet(StringComparer.OrdinalIgnoreCase);

                        lines = lines.Where(x => !string.IsNullOrWhiteSpace(x.AR_Ref) && allowedRefs.Contains(x.AR_Ref!)).ToList();

                        var allowedPieces = lines
                            .Select(x => x.DO_Piece)
                            .Where(x => !string.IsNullOrWhiteSpace(x))
                            .Distinct(StringComparer.OrdinalIgnoreCase)
                            .Cast<string>()
                            .ToHashSet(StringComparer.OrdinalIgnoreCase);

                        headers = headers.Where(x => !string.IsNullOrWhiteSpace(x.DO_Piece) && allowedPieces.Contains(x.DO_Piece!)).ToList();
                    }

                    var blPieces = headers
                        .Where(IsBl)
                        .Select(x => x.DO_Piece)
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .Cast<string>()
                        .ToList();

                    if (blPieces.Count > 0)
                    {
                        livraisons = await _db.F_LIVRAISONS
                            .AsNoTracking()
                            .Where(x => blPieces.Contains(x.DO_Piece))
                            .ToListAsync(ct);
                    }
                }
            }

            return new DashboardSnapshot
            {
                Headers = headers,
                Lines = lines,
                Livraisons = livraisons,
                Profiles = profiles,
                Articles = articles,
                Catalogues = catalogues,
                Depots = depots,
                Stocks = stocks,
                ProfileByAlias = BuildProfileLookup(profiles),
                ArticleByRef = articles
                    .Where(x => !string.IsNullOrWhiteSpace(x.AR_Ref))
                    .GroupBy(x => x.AR_Ref, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase),
                CatalogueByNo = catalogues.ToDictionary(x => x.CL_No, x => x)
            };
        }

        private Task<DashboardSnapshot> LoadPreviousSnapshotAsync(DashboardFilter current, CancellationToken ct)
        {
            var spanDays = Math.Max(1, (current.ToExclusive.Date - current.From.Date).Days);
            var previous = new DashboardFilter
            {
                Period = current.Period,
                From = current.From.AddDays(-spanDays),
                ToInclusive = current.From.Date.AddDays(-1),
                ToExclusive = current.From.Date,
                GroupBy = current.GroupBy,
                DepotNo = current.DepotNo,
                CatalogueNo = current.CatalogueNo,
                ClientType = current.ClientType,
                TopN = current.TopN
            };

            return LoadSnapshotAsync(previous, ct);
        }

        private static DashboardFilter BuildFilter(DashboardQueryDto query)
        {
            var today = DateTime.UtcNow.Date;
            var period = (query.Period ?? "30d").Trim().ToLowerInvariant();
            var clientType = NormalizeClientType(query.ClientType);
            var topN = Math.Clamp(query.TopN ?? 5, 3, 15);

            DateTime from;
            DateTime toInclusive;

            switch (period)
            {
                case "7d":
                    from = today.AddDays(-6);
                    toInclusive = today;
                    break;

                case "90d":
                    from = today.AddDays(-89);
                    toInclusive = today;
                    break;

                case "12m":
                    from = new DateTime(today.Year, today.Month, 1).AddMonths(-11);
                    toInclusive = today;
                    break;

                case "custom":
                    if (!query.From.HasValue || !query.To.HasValue)
                        throw new ArgumentException("Les champs from et to sont obligatoires quand period=custom.");

                    from = query.From.Value.ToDateTime(TimeOnly.MinValue);
                    toInclusive = query.To.Value.ToDateTime(TimeOnly.MinValue);

                    if (toInclusive < from)
                        throw new ArgumentException("La date to doit être supérieure ou égale à from.");
                    break;

                default:
                    period = "30d";
                    from = today.AddDays(-29);
                    toInclusive = today;
                    break;
            }

            return new DashboardFilter
            {
                Period = period,
                From = from,
                ToInclusive = toInclusive,
                ToExclusive = toInclusive.AddDays(1),
                GroupBy = NormalizeGroupBy(query.GroupBy, period),
                DepotNo = query.DepotNo,
                CatalogueNo = query.CatalogueNo,
                ClientType = clientType,
                TopN = topN
            };
        }

        private static string NormalizeGroupBy(string? groupBy, string period)
        {
            var normalized = (groupBy ?? string.Empty).Trim().ToLowerInvariant();
            if (normalized is "day" or "week" or "month")
                return normalized;

            return period switch
            {
                "12m" => "month",
                "90d" => "week",
                _ => "day"
            };
        }

        private static string NormalizeClientType(string? clientType)
        {
            var normalized = (clientType ?? "ALL").Trim().ToUpperInvariant();
            return normalized is "B2B" or "B2C" ? normalized : "ALL";
        }

        private static List<F_DOCENTETE> ApplyClientTypeFilter(List<F_DOCENTETE> headers, List<ProfilUtilisateur> profiles, string clientType)
        {
            if (clientType == "ALL")
                return headers;

            var lookup = BuildProfileLookup(profiles);
            return headers
                .Where(x => string.Equals(MapClientType(ResolveProfile(x.DO_Tiers, lookup)?.TypeClient), clientType, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        private static Dictionary<string, ProfilUtilisateur> BuildProfileLookup(IEnumerable<ProfilUtilisateur> profiles)
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
                    AddAlias(dict, "CL" + userId.ToString("N")[..15], profile);
                }
            }

            return dict;
        }

        private static void AddAlias(Dictionary<string, ProfilUtilisateur> dict, string? value, ProfilUtilisateur profile)
        {
            var normalized = Normalize(value);
            if (normalized != null && !dict.ContainsKey(normalized))
                dict[normalized] = profile;
        }

        private static ProfilUtilisateur? ResolveProfile(string? tiers, IReadOnlyDictionary<string, ProfilUtilisateur> lookup)
        {
            var normalized = Normalize(tiers);
            if (normalized == null)
                return null;

            return lookup.TryGetValue(normalized, out var profile) ? profile : null;
        }

        private static string? Normalize(string? value)
        {
            var normalized = (value ?? string.Empty).Trim();
            return string.IsNullOrWhiteSpace(normalized) ? null : normalized.ToUpperInvariant();
        }

        private static bool MatchesCatalogue(F_ARTICLE article, int catalogueNo)
            => article.CL_No1 == catalogueNo || article.CL_No2 == catalogueNo || article.CL_No3 == catalogueNo || article.CL_No4 == catalogueNo;

        private static bool IsBc(F_DOCENTETE header) => header.DO_Domaine == DomainVente && header.DO_Type == BcType;
        private static bool IsBl(F_DOCENTETE header) => header.DO_Domaine == DomainVente && header.DO_Type == BlType;

        private static DashboardAppliedFiltersDto ToAppliedFilters(DashboardFilter filter)
        {
            return new DashboardAppliedFiltersDto
            {
                Period = filter.Period,
                From = DateOnly.FromDateTime(filter.From),
                To = DateOnly.FromDateTime(filter.ToInclusive),
                GroupBy = filter.GroupBy,
                DepotNo = filter.DepotNo,
                CatalogueNo = filter.CatalogueNo,
                ClientType = filter.ClientType,
                TopN = filter.TopN
            };
        }

        private static List<string> BuildCommonWarnings(bool includeConversionWarning = false)
        {
            var warnings = new List<string>
            {
                "Le workflow BC → BL existe sous deux implémentations côté backend ; les dashboards évitent les doubles comptes en privilégiant les BC pour le revenu et les BL pour la logistique."
            };

            if (includeConversionWarning)
                warnings.Add("Le taux de conversion e-commerce n’est pas calculé car aucune source de navigation/visite n’est persistée dans le backend actuel.");

            return warnings;
        }

        private static decimal SumNet(IEnumerable<F_DOCENTETE> headers)
            => headers.Sum(x => x.DO_NetAPayer ?? x.DO_TotalTTC ?? 0m);

        private static List<TrendPointDto> BuildAmountTrend(List<F_DOCENTETE> headers, DashboardFilter filter, Func<F_DOCENTETE, decimal> selector)
        {
            var buckets = BuildDateBuckets(filter);
            return buckets
                .Select(bucket => new TrendPointDto
                {
                    Bucket = bucket.Key,
                    Label = bucket.Label,
                    Value = headers.Where(x => bucket.Contains(GetDocumentDate(x))).Sum(selector)
                })
                .ToList();
        }

        private static List<TrendPointDto> BuildCountTrend(List<F_DOCENTETE> headers, DashboardFilter filter)
        {
            var buckets = BuildDateBuckets(filter);
            return buckets
                .Select(bucket => new TrendPointDto
                {
                    Bucket = bucket.Key,
                    Label = bucket.Label,
                    Value = headers.Count(x => bucket.Contains(GetDocumentDate(x)))
                })
                .ToList();
        }

        private static List<DateBucket> BuildDateBuckets(DashboardFilter filter)
        {
            var buckets = new List<DateBucket>();
            var culture = CultureInfo.GetCultureInfo("fr-FR");

            if (filter.GroupBy == "month")
            {
                var cursor = new DateTime(filter.From.Year, filter.From.Month, 1);
                while (cursor < filter.ToExclusive)
                {
                    var next = cursor.AddMonths(1);
                    buckets.Add(new DateBucket(cursor.ToString("yyyy-MM"), cursor.ToString("MMM yyyy", culture), cursor, next));
                    cursor = next;
                }

                return buckets;
            }

            if (filter.GroupBy == "week")
            {
                var cursor = filter.From.Date;
                while (cursor < filter.ToExclusive)
                {
                    var next = cursor.AddDays(7);
                    buckets.Add(new DateBucket(cursor.ToString("yyyy-MM-dd"), $"Semaine du {cursor:dd/MM}", cursor, next));
                    cursor = next;
                }

                return buckets;
            }

            var dayCursor = filter.From.Date;
            while (dayCursor < filter.ToExclusive)
            {
                var next = dayCursor.AddDays(1);
                buckets.Add(new DateBucket(dayCursor.ToString("yyyy-MM-dd"), dayCursor.ToString("dd MMM", culture), dayCursor, next));
                dayCursor = next;
            }

            return buckets;
        }

        private static DateTime GetDocumentDate(F_DOCENTETE header)
            => (header.DO_Date ?? header.cbCreation ?? header.cbModification ?? DateTime.UtcNow).Date;

        private static List<StatusBreakdownItemDto> BuildDocumentFlowBreakdown(List<F_DOCENTETE> bcHeaders, List<F_DOCENTETE> blHeaders)
        {
            var total = bcHeaders.Count + blHeaders.Count;
            return new List<StatusBreakdownItemDto>
            {
                CreateStatusItem("bcPending", "BC en attente", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE), total),
                CreateStatusItem("bcConfirmed", "BC confirmés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), total),
                CreateStatusItem("bcAttempted", "BC tentatives", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE), total),
                CreateStatusItem("bcRefused", "BC refusés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), total),
                CreateStatusItem("bl", "BL générés", blHeaders.Count, total)
            };
        }

        private static List<StatusBreakdownItemDto> BuildBcStatusBreakdown(List<F_DOCENTETE> bcHeaders)
        {
            var total = bcHeaders.Count;
            return new List<StatusBreakdownItemDto>
            {
                CreateStatusItem("pending", "En attente", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE), total),
                CreateStatusItem("confirmed", "Confirmés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), total),
                CreateStatusItem("attempted", "Tentatives", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE), total),
                CreateStatusItem("refused", "Refusés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), total)
            };
        }

        private static List<StatusBreakdownItemDto> BuildClientTypeBreakdown(List<F_DOCENTETE> bcHeaders, IReadOnlyDictionary<string, ProfilUtilisateur> profileByAlias)
        {
            var total = bcHeaders.Count;
            var b2b = bcHeaders.Count(x => string.Equals(MapClientType(ResolveProfile(x.DO_Tiers, profileByAlias)?.TypeClient), "B2B", StringComparison.OrdinalIgnoreCase));
            var b2c = bcHeaders.Count(x => string.Equals(MapClientType(ResolveProfile(x.DO_Tiers, profileByAlias)?.TypeClient), "B2C", StringComparison.OrdinalIgnoreCase));
            var unknown = Math.Max(0, total - b2b - b2c);

            return new List<StatusBreakdownItemDto>
            {
                CreateStatusItem("b2b", "B2B", b2b, total),
                CreateStatusItem("b2c", "B2C", b2c, total),
                CreateStatusItem("unknown", "Non qualifié", unknown, total)
            };
        }

        private static List<StatusBreakdownItemDto> BuildConfirmationFunnel(List<F_DOCENTETE> bcHeaders, int blCount)
        {
            var total = Math.Max(1, bcHeaders.Count);
            return new List<StatusBreakdownItemDto>
            {
                CreateStatusItem("bcCreated", "BC créés", bcHeaders.Count, total),
                CreateStatusItem("bcConfirmed", "BC confirmés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), total),
                CreateStatusItem("blGenerated", "BL générés", blCount, total),
                CreateStatusItem("bcRefused", "BC refusés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), total)
            };
        }

        private static List<TopItemDto> BuildTopClients(List<F_DOCENTETE> bcHeaders, IReadOnlyDictionary<string, ProfilUtilisateur> profileByAlias, int topN)
        {
            return bcHeaders
                .GroupBy(x => Normalize(x.DO_Tiers) ?? "INCONNU")
                .Select(g =>
                {
                    var profile = ResolveProfile(g.First().DO_Tiers, profileByAlias);
                    return new TopItemDto
                    {
                        Key = g.Key,
                        Label = ComputeClientDisplay(profile, g.First().DO_Tiers),
                        SecondaryLabel = profile?.TypeClient == TypeClient.B2B ? "B2B" : (profile?.TypeClient == TypeClient.B2C ? "B2C" : null),
                        Value = SumNet(g),
                        FormattedValue = FormatCurrency(SumNet(g)),
                        Meta = $"{g.Count()} commandes"
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(topN)
                .ToList();
        }

        private static List<TopItemDto> BuildGeoPerformance(List<F_DOCENTETE> bcHeaders, IReadOnlyDictionary<string, ProfilUtilisateur> profileByAlias, int topN)
        {
            return bcHeaders
                .GroupBy(x =>
                {
                    var profile = ResolveProfile(x.DO_Tiers, profileByAlias);
                    return string.IsNullOrWhiteSpace(profile?.Gouvernorat?.ToString()) ? (x.DO_VilleLivraison ?? "Sans zone") : profile!.Gouvernorat!.ToString()!;
                })
                .Select(g => new TopItemDto
                {
                    Key = g.Key,
                    Label = g.Key,
                    Value = SumNet(g),
                    FormattedValue = FormatCurrency(SumNet(g)),
                    Meta = $"{g.Count()} commandes"
                })
                .OrderByDescending(x => x.Value)
                .Take(topN)
                .ToList();
        }

        private static List<TopItemDto> BuildTopProducts(DashboardSnapshot snapshot, DashboardFilter filter, bool includeOnlyBc)
        {
            var targetType = includeOnlyBc ? BcType : BlType;

            return snapshot.Lines
                .Where(x => x.DO_Type == targetType)
                .GroupBy(x => Normalize(x.AR_Ref) ?? "INCONNU")
                .Select(g =>
                {
                    var arRef = g.First().AR_Ref ?? g.Key;
                    snapshot.ArticleByRef.TryGetValue(arRef, out var article);

                    return new TopItemDto
                    {
                        Key = g.Key,
                        Label = article?.AR_Design ?? g.First().DL_Design ?? arRef,
                        SecondaryLabel = arRef,
                        Value = g.Sum(x => x.DL_MontantTTC ?? x.DL_MontantHT ?? 0m),
                        FormattedValue = FormatCurrency(g.Sum(x => x.DL_MontantTTC ?? x.DL_MontantHT ?? 0m)),
                        Meta = FormatQuantity(g.Sum(x => x.DL_Qte ?? 0m))
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(filter.TopN)
                .ToList();
        }

        private static List<TopItemDto> BuildTopCategories(DashboardSnapshot snapshot, DashboardFilter filter, bool includeOnlyBc)
        {
            var targetType = includeOnlyBc ? BcType : BlType;

            return snapshot.Lines
                .Where(x => x.DO_Type == targetType)
                .Select(line =>
                {
                    if (line.AR_Ref != null && snapshot.ArticleByRef.TryGetValue(line.AR_Ref, out var article))
                    {
                        var catalogue = ResolveMainCatalogue(article, snapshot.CatalogueByNo);
                        return new
                        {
                            CatalogueKey = catalogue?.CL_No ?? 0,
                            CatalogueLabel = catalogue?.CL_Intitule ?? "Sans catalogue",
                            Amount = line.DL_MontantTTC ?? line.DL_MontantHT ?? 0m
                        };
                    }

                    return new { CatalogueKey = 0, CatalogueLabel = "Sans catalogue", Amount = line.DL_MontantTTC ?? line.DL_MontantHT ?? 0m };
                })
                .GroupBy(x => new { x.CatalogueKey, x.CatalogueLabel })
                .Select(g => new TopItemDto
                {
                    Key = g.Key.CatalogueKey.ToString(CultureInfo.InvariantCulture),
                    Label = g.Key.CatalogueLabel,
                    Value = g.Sum(x => x.Amount),
                    FormattedValue = FormatCurrency(g.Sum(x => x.Amount)),
                    Meta = $"{g.Count()} lignes"
                })
                .OrderByDescending(x => x.Value)
                .Take(filter.TopN)
                .ToList();
        }

        private static F_CATALOGUE? ResolveMainCatalogue(F_ARTICLE article, IReadOnlyDictionary<int, F_CATALOGUE> catalogues)
        {
            if (article.CL_No1 > 0 && catalogues.TryGetValue(article.CL_No1, out var cl1)) return cl1;
            if (article.CL_No2 > 0 && catalogues.TryGetValue(article.CL_No2, out var cl2)) return cl2;
            if (article.CL_No3 > 0 && catalogues.TryGetValue(article.CL_No3, out var cl3)) return cl3;
            if (article.CL_No4 > 0 && catalogues.TryGetValue(article.CL_No4, out var cl4)) return cl4;
            return null;
        }

        private static List<OperationalAlertDto> BuildOverviewAlerts(DashboardSnapshot snapshot, int topN)
        {
            var alerts = new List<OperationalAlertDto>();
            var pendingBc = snapshot.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE);
            var reported = snapshot.Livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.Reporte);
            var criticalStock = BuildCriticalStockItems(snapshot, topN).Count;

            if (pendingBc > 0)
                alerts.Add(CreateAlert("warning", "BC_PENDING", "BC en attente", $"{pendingBc} bons de commande attendent encore une action confirmateur.", pendingBc, "Prioriser le traitement des commandes les plus anciennes."));
            if (reported > 0)
                alerts.Add(CreateAlert("warning", "DELIVERY_DELAY", "Livraisons reportées", $"{reported} livraisons sont actuellement en statut reporté.", reported, "Contrôler les tournées et les replanifications."));
            if (criticalStock > 0)
                alerts.Add(CreateAlert("critical", "LOW_STOCK", "Stock critique", $"{criticalStock} articles présentent un stock disponible critique.", criticalStock, "Vérifier les stocks avant confirmation de nouvelles commandes."));

            return alerts;
        }

        private static List<DeliveryStatusItem> BuildDeliveryStatusList(List<F_DOCENTETE> blHeaders, List<F_LIVRAISON> livraisons)
        {
            var livraisonByPiece = livraisons
                .GroupBy(x => x.DO_Piece, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.LI_DateCreation).First(), StringComparer.OrdinalIgnoreCase);

            return blHeaders
                .Select(bl =>
                {
                    var piece = bl.DO_Piece ?? string.Empty;
                    livraisonByPiece.TryGetValue(piece, out var livraison);
                    var status = livraison != null ? MapDeliveryCodeToString(livraison.LI_Statut) : NormalizeBlWorkflowStatus(bl.DO_Valide);
                    return new DeliveryStatusItem(piece, status);
                })
                .ToList();
        }

        private static string NormalizeBlWorkflowStatus(short? doValide)
        {
            return doValide switch
            {
                F_DOCENTETE.STATUS_EN_ATTENTE => DeliveryStatuses.EnAttente,
                F_DOCENTETE.STATUS_CONFIRME => DeliveryStatuses.Confirme,
                F_DOCENTETE.STATUS_TENTATIVE => DeliveryStatuses.Tentative,
                F_DOCENTETE.STATUS_REFUSE => DeliveryStatuses.Refuse,
                _ => DeliveryStatuses.EnAttente
            };
        }

        private static string MapDeliveryCodeToString(short code)
        {
            return code switch
            {
                DeliveryStatusCodes.Confirme => DeliveryStatuses.Confirme,
                DeliveryStatusCodes.EnLivraison => DeliveryStatuses.EnLivraison,
                DeliveryStatusCodes.Livre => DeliveryStatuses.Livre,
                DeliveryStatusCodes.Retour => DeliveryStatuses.Retour,
                DeliveryStatusCodes.Depot => DeliveryStatuses.Depot,
                DeliveryStatusCodes.Reporte => DeliveryStatuses.Reporte,
                _ => DeliveryStatuses.Confirme
            };
        }

        private static int CountDeliveryStatuses(List<F_DOCENTETE> blHeaders, List<F_LIVRAISON> livraisons, params string[] statuses)
        {
            var list = BuildDeliveryStatusList(blHeaders, livraisons);
            return list.Count(x => statuses.Contains(x.Status, StringComparer.OrdinalIgnoreCase));
        }

        private static List<StatusBreakdownItemDto> BuildDeliveryStatusBreakdown(List<DeliveryStatusItem> items)
        {
            var total = items.Count;
            return items
                .GroupBy(x => x.Status)
                .Select(g => CreateStatusItem(Normalize(g.Key) ?? g.Key, g.Key, g.Count(), total))
                .OrderByDescending(x => x.Count)
                .ToList();
        }

        private static List<TopItemDto> BuildCourierPerformance(DashboardSnapshot snapshot, int topN)
        {
            return snapshot.Livraisons
                .Where(x => x.LivreurId.HasValue)
                .GroupBy(x => x.LivreurId!.Value)
                .Select(g =>
                {
                    var profile = snapshot.Profiles.FirstOrDefault(x => x.cbMarq == g.Key);
                    var delivered = g.Count(x => x.LI_Statut == DeliveryStatusCodes.Livre);
                    var total = g.Count();

                    return new TopItemDto
                    {
                        Key = g.Key.ToString(CultureInfo.InvariantCulture),
                        Label = string.IsNullOrWhiteSpace(profile?.NomComplet) ? $"Livreur #{g.Key}" : profile!.NomComplet!,
                        SecondaryLabel = profile?.ZoneLivraison,
                        Value = delivered,
                        FormattedValue = $"{delivered} livraisons",
                        Meta = $"Taux réussite {ToPercent(delivered, total):0.#}% sur {total} affectations"
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(topN)
                .ToList();
        }

        private static List<TopItemDto> BuildDepotPerformance(List<F_DOCENTETE> blHeaders, int topN)
        {
            return blHeaders
                .GroupBy(x => x.DE_No ?? 0)
                .Select(g => new TopItemDto
                {
                    Key = g.Key.ToString(CultureInfo.InvariantCulture),
                    Label = g.Key > 0 ? $"Dépôt {g.Key}" : "Sans dépôt",
                    Value = g.Count(),
                    FormattedValue = $"{g.Count()} BL",
                    Meta = FormatCurrency(SumNet(g))
                })
                .OrderByDescending(x => x.Value)
                .Take(topN)
                .ToList();
        }

        private static List<TopItemDto> BuildCriticalStockItems(DashboardSnapshot snapshot, int topN)
        {
            return snapshot.Stocks
                .Select(stock =>
                {
                    var available = stock.AS_QteSto - stock.AS_QteRes;
                    var threshold = stock.AS_QteMini ?? 5m;
                    snapshot.ArticleByRef.TryGetValue(stock.AR_Ref, out var article);

                    return new
                    {
                        stock.AR_Ref,
                        Label = article?.AR_Design ?? stock.AR_Ref,
                        available,
                        threshold,
                        stock.DE_No
                    };
                })
                .Where(x => x.available <= x.threshold)
                .OrderBy(x => x.available)
                .Take(topN)
                .Select(x => new TopItemDto
                {
                    Key = $"{x.AR_Ref}-{x.DE_No}",
                    Label = x.Label,
                    SecondaryLabel = x.AR_Ref,
                    Value = x.available,
                    FormattedValue = FormatQuantity(x.available),
                    Meta = $"Seuil {FormatQuantity(x.threshold)} · Dépôt {x.DE_No}"
                })
                .ToList();
        }

        private static List<OperationalAlertDto> BuildLogisticsAlerts(DashboardSnapshot snapshot)
        {
            var alerts = new List<OperationalAlertDto>();
            var reported = snapshot.Livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.Reporte);
            var returned = snapshot.Livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.Retour);
            var unassigned = snapshot.Headers.Where(IsBl).Count(x => !snapshot.Livraisons.Any(li => string.Equals(li.DO_Piece, x.DO_Piece, StringComparison.OrdinalIgnoreCase)));

            if (reported > 0)
                alerts.Add(CreateAlert("warning", "REPORTED", "BL reportés", $"{reported} livraisons ont été reportées.", reported, "Contrôler les replanifications côté livreur."));
            if (returned > 0)
                alerts.Add(CreateAlert("critical", "RETURNED", "Retours", $"{returned} livraisons sont revenues en retour/dépôt.", returned, "Analyser la qualité adresse et la disponibilité client."));
            if (unassigned > 0)
                alerts.Add(CreateAlert("warning", "UNASSIGNED", "BL non affectés", $"{unassigned} BL n’ont pas encore de ligne F_LIVRAISON affectée à un livreur.", unassigned, "Distribuer les BL confirmés sur les tournées disponibles."));

            return alerts;
        }

        private static List<StatusBreakdownItemDto> BuildBcToBlFlow(DashboardSnapshot snapshot)
        {
            var bcHeaders = snapshot.Headers.Where(IsBc).ToList();
            var blHeaders = snapshot.Headers.Where(IsBl).ToList();
            var total = Math.Max(1, bcHeaders.Count);

            return new List<StatusBreakdownItemDto>
            {
                CreateStatusItem("bcCreated", "BC créés", bcHeaders.Count, total),
                CreateStatusItem("bcConfirmed", "BC confirmés", bcHeaders.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), total),
                CreateStatusItem("blGenerated", "BL générés", blHeaders.Count, total),
                CreateStatusItem("blDelivered", "BL livrés", CountDeliveryStatuses(blHeaders, snapshot.Livraisons, DeliveryStatuses.Livre), total)
            };
        }

        private static decimal EstimateTransformationRate(DashboardSnapshot snapshot)
        {
            var bcCount = snapshot.Headers.Count(IsBc);
            var blCount = snapshot.Headers.Count(IsBl);
            if (bcCount == 0) return 0m;
            return Math.Min(100m, Math.Round((decimal)blCount / bcCount * 100m, 2));
        }

        private static List<TopItemDto> BuildBlockedOrders(DashboardSnapshot snapshot, int topN)
        {
            var limitDate = DateTime.UtcNow.Date.AddDays(-2);

            return snapshot.Headers
                .Where(IsBc)
                .Where(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE && GetDocumentDate(x) <= limitDate)
                .OrderBy(x => GetDocumentDate(x))
                .Take(topN)
                .Select(x => new TopItemDto
                {
                    Key = x.DO_Piece ?? string.Empty,
                    Label = x.DO_Piece ?? string.Empty,
                    SecondaryLabel = ComputeClientDisplay(ResolveProfile(x.DO_Tiers, snapshot.ProfileByAlias), x.DO_Tiers),
                    Value = (decimal)(DateTime.UtcNow.Date - GetDocumentDate(x)).TotalDays,
                    FormattedValue = $"{(DateTime.UtcNow.Date - GetDocumentDate(x)).Days} j",
                    Meta = FormatCurrency(x.DO_NetAPayer ?? x.DO_TotalTTC ?? 0m)
                })
                .ToList();
        }

        private static List<TopItemDto> BuildPriorityOrders(DashboardSnapshot snapshot, int topN)
        {
            return snapshot.Headers
                .Where(IsBc)
                .Where(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE || x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE)
                .OrderByDescending(x => x.DO_NetAPayer ?? x.DO_TotalTTC ?? 0m)
                .ThenBy(x => GetDocumentDate(x))
                .Take(topN)
                .Select(x => new TopItemDto
                {
                    Key = x.DO_Piece ?? string.Empty,
                    Label = x.DO_Piece ?? string.Empty,
                    SecondaryLabel = ComputeClientDisplay(ResolveProfile(x.DO_Tiers, snapshot.ProfileByAlias), x.DO_Tiers),
                    Value = x.DO_NetAPayer ?? x.DO_TotalTTC ?? 0m,
                    FormattedValue = FormatCurrency(x.DO_NetAPayer ?? x.DO_TotalTTC ?? 0m),
                    Meta = x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE ? "Tentative" : "En attente"
                })
                .ToList();
        }

        private static List<OperationalAlertDto> BuildConfirmateurAlerts(DashboardSnapshot snapshot)
        {
            var alerts = new List<OperationalAlertDto>();
            var pending = snapshot.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE);
            var attempts = snapshot.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE);
            var refused = snapshot.Headers.Count(x => IsBc(x) && x.DO_Valide == F_DOCENTETE.STATUS_REFUSE);

            if (pending > 0)
                alerts.Add(CreateAlert("warning", "CONFIRM_PENDING", "Backlog confirmateur", $"{pending} BC restent en attente.", pending, "Traiter d’abord les BC les plus anciens et les plus élevés."));
            if (attempts > 0)
                alerts.Add(CreateAlert("warning", "CONFIRM_ATTEMPTS", "Tentatives à relancer", $"{attempts} BC sont en tentative et nécessitent un suivi client.", attempts, "Prévoir une relance ciblée."));
            if (refused > 0)
                alerts.Add(CreateAlert("info", "CONFIRM_REFUSED", "BC refusés", $"{refused} BC ont été refusés sur la période.", refused, "Analyser les causes avant le prochain sprint qualité."));

            return alerts;
        }

        private async Task<int> CountInternalUsersAsync(CancellationToken ct)
        {
            var internalRoleNames = new[] { AppRoles.ADMIN, AppRoles.VENDEUR, AppRoles.CONFIRMATEUR, AppRoles.LIVREUR };

            var internalRoleIds = await _db.Roles
                .Where(x => internalRoleNames.Contains(x.Name!))
                .Select(x => x.Id)
                .ToListAsync(ct);

            return await _db.UserRoles
                .Where(x => internalRoleIds.Contains(x.RoleId))
                .Select(x => x.UserId)
                .Distinct()
                .CountAsync(ct);
        }

        private static List<TrendPointDto> BuildForecast(List<TrendPointDto> source, DashboardFilter filter)
        {
            var actualPoints = source.Where(x => x.Value > 0m).Select(x => x.Value).ToList();
            var basis = actualPoints.Count == 0 ? 0m : actualPoints.TakeLast(Math.Min(3, actualPoints.Count)).Average();
            var projectionCount = Math.Min(4, Math.Max(2, source.Count / 4));
            var forecast = new List<TrendPointDto>(source);
            var lastDate = filter.ToInclusive.Date;

            for (var i = 1; i <= projectionCount; i++)
            {
                var projectedDate = filter.GroupBy switch
                {
                    "month" => new DateTime(lastDate.Year, lastDate.Month, 1).AddMonths(i),
                    "week" => lastDate.AddDays(7 * i),
                    _ => lastDate.AddDays(i)
                };

                forecast.Add(new TrendPointDto
                {
                    Bucket = $"forecast-{i}",
                    Label = $"Prévision {projectedDate:dd/MM}",
                    Value = Math.Round(basis, 2)
                });
            }

            return forecast;
        }

        private static List<TopItemDto> BuildStockRiskItems(DashboardSnapshot snapshot, int topN)
        {
            var shippedByArticle = snapshot.Lines
                .Where(x => x.DO_Type == BlType && !string.IsNullOrWhiteSpace(x.AR_Ref))
                .GroupBy(x => x.AR_Ref!, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.DL_Qte ?? 0m), StringComparer.OrdinalIgnoreCase);

            var firstDate = snapshot.Headers.Select(GetDocumentDate).DefaultIfEmpty(DateTime.UtcNow.Date).Min();
            var periodDays = Math.Max(1, (DateTime.UtcNow.Date - firstDate).Days + 1);

            return snapshot.Stocks
                .Select(stock =>
                {
                    shippedByArticle.TryGetValue(stock.AR_Ref, out var shippedQty);
                    var dailyOut = shippedQty <= 0m ? 0m : shippedQty / periodDays;
                    var available = stock.AS_QteSto - stock.AS_QteRes;
                    var coverDays = dailyOut <= 0m ? 999m : decimal.Round(available / dailyOut, 2);

                    snapshot.ArticleByRef.TryGetValue(stock.AR_Ref, out var article);

                    return new TopItemDto
                    {
                        Key = $"{stock.AR_Ref}-{stock.DE_No}",
                        Label = article?.AR_Design ?? stock.AR_Ref,
                        SecondaryLabel = stock.AR_Ref,
                        Value = coverDays,
                        FormattedValue = coverDays >= 999m ? "Couverture stable" : $"{coverDays:0.##} j",
                        Meta = $"Disponible {FormatQuantity(available)} · Dépôt {stock.DE_No}"
                    };
                })
                .OrderBy(x => x.Value)
                .Take(topN)
                .ToList();
        }

        private static List<TopItemDto> BuildCustomerScoring(List<F_DOCENTETE> bcHeaders, IReadOnlyDictionary<string, ProfilUtilisateur> profileByAlias, int topN)
        {
            return bcHeaders
                .GroupBy(x => Normalize(x.DO_Tiers) ?? "INCONNU")
                .Where(g => g.Key != "INCONNU")
                .Select(g =>
                {
                    var totalAmount = SumNet(g);
                    var frequency = g.Count();
                    var lastOrderDate = g.Max(GetDocumentDate);
                    var recencyDays = Math.Max(0, (DateTime.UtcNow.Date - lastOrderDate.Date).Days);

                    var score = Math.Min(100m,
                        Math.Round(
                            Math.Min(40m, frequency * 12m) +
                            Math.Min(40m, totalAmount / 100m) +
                            Math.Max(0m, 20m - recencyDays / 2m), 2));

                    var profile = ResolveProfile(g.First().DO_Tiers, profileByAlias);

                    return new TopItemDto
                    {
                        Key = g.Key,
                        Label = ComputeClientDisplay(profile, g.First().DO_Tiers),
                        SecondaryLabel = profile?.TypeClient == TypeClient.B2B ? "B2B" : "B2C",
                        Value = score,
                        FormattedValue = $"{score:0.#}/100",
                        Meta = $"{frequency} cmd · {FormatCurrency(totalAmount)}"
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(topN)
                .ToList();
        }

        private static List<OperationalAlertDto> BuildStrategicInsights(DashboardSnapshot snapshot, List<TopItemDto> stockRiskItems, List<TopItemDto> customerScoring)
        {
            var alerts = new List<OperationalAlertDto>();
            var highRiskStock = stockRiskItems.Count(x => x.Value < 7m);
            var highValueCustomers = customerScoring.Count(x => x.Value >= 70m);
            var reported = snapshot.Livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.Reporte);

            if (highRiskStock > 0)
                alerts.Add(CreateAlert("critical", "INSIGHT_STOCK_RISK", "Risque de rupture", $"{highRiskStock} articles ont une couverture estimée inférieure à 7 jours.", highRiskStock, "Prioriser réapprovisionnement ou arbitrage commercial."));
            if (highValueCustomers > 0)
                alerts.Add(CreateAlert("info", "INSIGHT_KEY_ACCOUNTS", "Clients à fort potentiel", $"{highValueCustomers} clients dépassent un score heuristique de 70/100.", highValueCustomers, "Prévoir des actions commerciales ciblées."));
            if (reported > 0)
                alerts.Add(CreateAlert("warning", "INSIGHT_LOGISTICS", "Charge logistique à surveiller", $"{reported} livraisons reportées peuvent dégrader la prochaine charge prévisionnelle.", reported, "Croiser charge prévue et disponibilité livreur."));

            return alerts;
        }

        private static KpiCardDto CreateCountKpi(string key, string label, int current, int previous)
        {
            var delta = current - previous;
            return new KpiCardDto
            {
                Key = key,
                Label = label,
                Value = current,
                FormattedValue = current.ToString(CultureInfo.InvariantCulture),
                Delta = delta,
                DeltaFormatted = delta == 0 ? "0" : (delta > 0 ? $"+{delta}" : delta.ToString(CultureInfo.InvariantCulture)),
                DeltaDirection = delta > 0 ? "up" : (delta < 0 ? "down" : "flat")
            };
        }

        private static KpiCardDto CreateCurrencyKpi(string key, string label, decimal current, decimal previous)
        {
            var delta = current - previous;
            return new KpiCardDto
            {
                Key = key,
                Label = label,
                Value = decimal.Round(current, 2),
                FormattedValue = FormatCurrency(current),
                Delta = decimal.Round(delta, 2),
                DeltaFormatted = FormatSignedCurrency(delta),
                DeltaDirection = delta > 0m ? "up" : (delta < 0m ? "down" : "flat")
            };
        }

        private static KpiCardDto CreatePercentKpi(string key, string label, decimal current, decimal previous)
        {
            var delta = current - previous;
            return new KpiCardDto
            {
                Key = key,
                Label = label,
                Value = decimal.Round(current, 2),
                FormattedValue = FormatPercent(current),
                Delta = decimal.Round(delta, 2),
                DeltaFormatted = FormatSignedPercent(delta),
                DeltaDirection = delta > 0m ? "up" : (delta < 0m ? "down" : "flat")
            };
        }

        private static KpiCardDto CreateDecimalKpi(string key, string label, decimal current, decimal previous, string suffix)
        {
            var delta = current - previous;
            return new KpiCardDto
            {
                Key = key,
                Label = label,
                Value = decimal.Round(current, 2),
                FormattedValue = $"{decimal.Round(current, 2):0.##} {suffix}",
                Delta = decimal.Round(delta, 2),
                DeltaFormatted = delta == 0m ? "0" : $"{delta:+0.##;-0.##;0} {suffix}",
                DeltaDirection = delta > 0m ? "up" : (delta < 0m ? "down" : "flat")
            };
        }

        private static StatusBreakdownItemDto CreateStatusItem(string key, string label, int count, int total)
        {
            return new StatusBreakdownItemDto
            {
                Key = key,
                Label = label,
                Count = count,
                Percentage = total <= 0 ? 0m : decimal.Round((decimal)count / total * 100m, 2)
            };
        }

        private static OperationalAlertDto CreateAlert(string severity, string code, string title, string description, int count, string actionHint)
        {
            return new OperationalAlertDto
            {
                Severity = severity,
                Code = code,
                Title = title,
                Description = description,
                Count = count,
                ActionHint = actionHint
            };
        }

        private static decimal SafeDivide(decimal numerator, int denominator)
            => denominator <= 0 ? 0m : numerator / denominator;

        private static decimal ToPercent(int numerator, int denominator)
            => denominator <= 0 ? 0m : decimal.Round((decimal)numerator / denominator * 100m, 2);

        private static string FormatCurrency(decimal value)
            => $"{decimal.Round(value, 2):0.00} TND";

        private static string FormatSignedCurrency(decimal value)
            => value == 0m ? "0.00 TND" : $"{value:+0.00;-0.00;0.00} TND";

        private static string FormatPercent(decimal value)
            => $"{decimal.Round(value, 2):0.##}%";

        private static string FormatSignedPercent(decimal value)
            => value == 0m ? "0%" : $"{value:+0.##;-0.##;0}%";

        private static string FormatQuantity(decimal value)
            => $"{decimal.Round(value, 2):0.##}";

        private static string? MapClientType(TypeClient? typeClient)
        {
            return typeClient switch
            {
                TypeClient.B2B => "B2B",
                TypeClient.B2C => "B2C",
                _ => null
            };
        }

        private static string ComputeClientDisplay(ProfilUtilisateur? profile, string? fallback)
        {
            if (profile == null)
                return string.IsNullOrWhiteSpace(fallback) ? "Client inconnu" : fallback!;

            if (profile.TypeClient == TypeClient.B2B && !string.IsNullOrWhiteSpace(profile.NomSociete))
                return profile.NomSociete!;

            if (!string.IsNullOrWhiteSpace(profile.NomComplet))
                return profile.NomComplet!;

            if (!string.IsNullOrWhiteSpace(profile.CodeClientSage))
                return profile.CodeClientSage!;

            return string.IsNullOrWhiteSpace(fallback) ? $"Client #{profile.cbMarq}" : fallback!;
        }

        private sealed class DashboardFilter
        {
            public string Period { get; set; } = "30d";
            public DateTime From { get; set; }
            public DateTime ToInclusive { get; set; }
            public DateTime ToExclusive { get; set; }
            public string GroupBy { get; set; } = "day";
            public int? DepotNo { get; set; }
            public int? CatalogueNo { get; set; }
            public string ClientType { get; set; } = "ALL";
            public int TopN { get; set; } = 5;
        }

        private sealed class DashboardSnapshot
        {
            public List<F_DOCENTETE> Headers { get; set; } = new();
            public List<F_DOCLIGNE> Lines { get; set; } = new();
            public List<F_LIVRAISON> Livraisons { get; set; } = new();
            public List<ProfilUtilisateur> Profiles { get; set; } = new();
            public List<F_ARTICLE> Articles { get; set; } = new();
            public List<F_ARTSTOCK> Stocks { get; set; } = new();
            public List<F_CATALOGUE> Catalogues { get; set; } = new();
            public List<F_DEPOT> Depots { get; set; } = new();
            public Dictionary<string, ProfilUtilisateur> ProfileByAlias { get; set; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, F_ARTICLE> ArticleByRef { get; set; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<int, F_CATALOGUE> CatalogueByNo { get; set; } = new();
        }

        private sealed record DateBucket(string Key, string Label, DateTime Start, DateTime EndExclusive)
        {
            public bool Contains(DateTime value) => value >= Start && value < EndExclusive;
        }

        private sealed record DeliveryStatusItem(string Piece, string Status);
    }
}