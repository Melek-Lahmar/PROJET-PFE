using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Dashboard;
using Web_Api.Model;

namespace Web_Api.Services.Dashboard
{
    public class ProDashboardAggregationService : IProDashboardAggregationService
    {
        private const short DomainVente = 0;
        private const short BcType = 0;
        private const short BlType = 1;

        private readonly AppDbContext _db;

        public ProDashboardAggregationService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<ProDashboardPageResponseDto> GetOverviewAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);

            var bc = ApplyOrderStatus(scope.BcDocuments, filter.OrderStatus).ToList();
            var bl = scope.BlDocuments;
            var criticalStock = GetCriticalStock(scope, filter.Top);
            var openClaims = scope.Reclamations.Count(x => !IsClosedClaim(x.Statut));

            var response = Base("overview", "Vue globale", "Centre de pilotage général de l'activité e-commerce.", filter);

            response.ExecutiveSummary = new ProDashboardExecutiveSummaryDto
            {
                Title = "Synthèse exécutive",
                Description = "Vue consolidée basée sur les commandes, BL, stocks, clients, livraisons et réclamations disponibles.",
                Status = criticalStock.Count > 0 || openClaims > 0 ? "warning" : "success",
                Highlights = new List<string>
                {
                    $"{bc.Count} commandes sur la période",
                    $"{bl.Count} bons de livraison",
                    $"{criticalStock.Count} articles en stock critique",
                    $"{openClaims} réclamations ouvertes"
                }
            };

            response.Kpis = new List<ProKpiMetricDto>
            {
                Currency("revenue", "Chiffre d'affaires", SumAmount(bc), "Calculé sur les BC pour éviter le double comptage BC/BL."),
                Count("orders", "Commandes", bc.Count),
                Count("pendingOrders", "Commandes en attente", bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE), "warning"),
                Count("confirmedOrders", "Commandes confirmées", bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), "success"),
                Count("refusedOrders", "Commandes refusées", bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), "critical"),
                Count("bl", "Transformées en BL", bl.Count),
                Count("clients", "Clients", scope.Clients.Count),
                Count("products", "Produits", scope.Articles.Count),
                Count("depots", "Dépôts", scope.Depots.Count),
                Count("deliveries", "Livraisons", scope.Livraisons.Count),
                Count("openClaims", "Réclamations ouvertes", openClaims, openClaims > 0 ? "warning" : "success"),
                Count("criticalStock", "Stock critique", criticalStock.Count, criticalStock.Count > 0 ? "critical" : "success")
            };

            response.PrimaryTrend = BuildDocumentAmountTrend(bc, filter);
            response.SecondaryTrend = BuildDocumentCountTrend(bc, filter);
            response.StatusDistribution = BuildOrderStatusDistribution(bc);
            response.SecondaryDistribution = BuildDeliveryStatusDistribution(scope.Livraisons);
            response.TopEntities = BuildTopProducts(scope, filter.Top);
            response.SecondaryTopEntities = BuildTopDepots(scope, filter.Top);
            response.Alerts = BuildCommonAlerts(scope, criticalStock, openClaims);
            response.Insights = BuildCommonInsights(scope, criticalStock);
            response.Table = BuildDocumentsTable(bc.OrderByDescending(GetDocumentDate).Take(20).ToList(), "Commandes récentes");

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetSalesAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var bc = scope.BcDocuments;
            var revenue = SumAmount(bc);
            var avgBasket = bc.Count == 0 ? 0m : revenue / bc.Count;
            var paidPieces = scope.Payments
                .Where(x => x.PA_Statut == B_PAIEMENT.STATUS_SUCCES)
                .Select(x => x.DO_Piece)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var response = Base("sales", "Ventes", "Analyse commerciale du chiffre d'affaires, panier moyen, clients et produits.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Currency("revenue", "CA total", revenue),
                Currency("avgBasket", "Panier moyen", avgBasket),
                Count("orders", "Commandes", bc.Count),
                Count("paidOrders", "Commandes payées", bc.Count(x => !string.IsNullOrWhiteSpace(x.DO_Piece) && paidPieces.Contains(x.DO_Piece)), "success"),
                Percent("confirmationRate", "Taux confirmation", Percent(bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), bc.Count), "success"),
                Percent("refusalRate", "Taux refus", Percent(bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), bc.Count), "critical")
            };

            response.PrimaryTrend = BuildDocumentAmountTrend(bc, filter);
            response.SecondaryTrend = BuildDocumentCountTrend(bc, filter);
            response.StatusDistribution = BuildClientTypeDistribution(bc, scope.Profiles);
            response.SecondaryDistribution = BuildStringDistribution(bc.Select(x => Normalize(x.DO_ModePaiement) ?? "NON_RENSEIGNE"));
            response.TopEntities = BuildTopProducts(scope, filter.Top);
            response.SecondaryTopEntities = BuildTopClients(bc, scope.Profiles, filter.Top);
            response.Alerts = new List<ProDashboardAlertDto>
            {
                Alert("sales-volume", "Volume commercial", $"{bc.Count} commandes analysées.", "info", "Ventes", "Suivre l'évolution par période.", bc.Count)
            };
            response.Insights = new List<ProDashboardInsightDto>
            {
                Insight("avg-basket", "Panier moyen", $"Le panier moyen est de {FormatCurrency(avgBasket)}.", "Commercial", "Analyser les produits qui augmentent le panier.", "info")
            };
            response.Table = BuildTopEntitiesTable(response.TopEntities, "Top produits");

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetOrdersAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var bc = ApplyOrderStatus(scope.BcDocuments, filter.OrderStatus).ToList();
            var oldPending = bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE && GetDocumentDate(x) < DateTime.UtcNow.AddDays(-2));

            var response = Base("orders", "Commandes", "Pilotage des commandes, statuts, paiements et modes de livraison.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("orders", "Total commandes", bc.Count),
                Count("pending", "En attente", bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_EN_ATTENTE), "warning"),
                Count("confirmed", "Confirmées", bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_CONFIRME), "success"),
                Count("attempts", "Tentatives", bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_TENTATIVE), "warning"),
                Count("refused", "Refusées", bc.Count(x => x.DO_Valide == F_DOCENTETE.STATUS_REFUSE), "critical"),
                Count("oldPending", "Anciennes > 48h", oldPending, oldPending > 0 ? "critical" : "success")
            };

            response.PrimaryTrend = BuildDocumentCountTrend(bc, filter);
            response.SecondaryTrend = BuildDocumentAmountTrend(bc, filter);
            response.StatusDistribution = BuildOrderStatusDistribution(bc);
            response.SecondaryDistribution = BuildStringDistribution(bc.Select(x => Normalize(x.DO_ModeLivraison) ?? "NON_RENSEIGNE"));
            response.TopEntities = BuildTopClients(bc, scope.Profiles, filter.Top);
            response.SecondaryTopEntities = BuildTopStatusItems(bc.Select(x => Normalize(x.DO_ModePaiement) ?? "NON_RENSEIGNE"), filter.Top);
            response.Alerts = oldPending > 0
                ? new List<ProDashboardAlertDto> { Alert("old-pending", "Commandes anciennes", $"{oldPending} commandes sont en attente depuis plus de 48h.", "critical", "Commandes", "Prioriser le traitement.", oldPending) }
                : new List<ProDashboardAlertDto>();
            response.Table = BuildDocumentsTable(bc.OrderByDescending(GetDocumentDate).Take(25).ToList(), "Commandes récentes");

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetProductsAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);

            var refsWithImage = scope.Images
                .Select(x => x.AR_Ref)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var soldRefs = scope.Lines
                .Where(x => !string.IsNullOrWhiteSpace(x.AR_Ref))
                .Select(x => x.AR_Ref!)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var withoutImage = scope.Articles.Count(x => !refsWithImage.Contains(x.AR_Ref));
            var withoutCatalogue = scope.Articles.Count(x => x.CL_No1 <= 0 && x.CL_No2 <= 0 && x.CL_No3 <= 0 && x.CL_No4 <= 0);
            var neverSold = scope.Articles.Count(x => !soldRefs.Contains(x.AR_Ref));

            var response = Base("products", "Produits", "Analyse catalogue, publication, images, ventes et ruptures.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("products", "Total produits", scope.Articles.Count),
                Count("active", "Produits actifs", scope.Articles.Count(x => x.AR_Sommeil == 0), "success"),
                Count("inactive", "Produits inactifs", scope.Articles.Count(x => x.AR_Sommeil != 0), "warning"),
                Count("published", "Produits publiés", scope.Articles.Count(x => x.AR_Publie == 1), "success"),
                Count("unpublished", "Non publiés", scope.Articles.Count(x => x.AR_Publie != 1), "warning"),
                Count("withoutImage", "Sans image", withoutImage, withoutImage > 0 ? "warning" : "success"),
                Count("withoutCatalogue", "Sans catalogue", withoutCatalogue, withoutCatalogue > 0 ? "warning" : "success"),
                Count("neverSold", "Jamais vendus", neverSold, "warning")
            };

            response.PrimaryTrend = BuildQuantityTrend(scope.Lines, filter);
            response.StatusDistribution = BuildStringDistribution(scope.Articles.Select(x => x.AR_Publie == 1 ? "PUBLIE" : "NON_PUBLIE"));
            response.TopEntities = BuildTopProducts(scope, filter.Top);
            response.SecondaryTopEntities = scope.Articles
                .Where(x => x.CL_No1 <= 0 && x.CL_No2 <= 0 && x.CL_No3 <= 0 && x.CL_No4 <= 0)
                .Take(filter.Top)
                .Select(x => new ProTopEntityItemDto
                {
                    Key = x.AR_Ref,
                    Label = x.AR_Design,
                    SecondaryLabel = x.AR_Ref,
                    Value = 1,
                    FormattedValue = "Sans catalogue",
                    Severity = "warning"
                })
                .ToList();

            response.Alerts = withoutImage > 0
                ? new List<ProDashboardAlertDto> { Alert("products-no-image", "Produits sans image", $"{withoutImage} produits n'ont pas d'image.", "warning", "Produits", "Compléter les images catalogue.", withoutImage) }
                : new List<ProDashboardAlertDto>();

            response.Table = BuildTopEntitiesTable(response.TopEntities, "Top produits");

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetStockAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var stocks = filter.DepotNo.HasValue
                ? scope.Stocks.Where(x => x.DE_No == filter.DepotNo.Value).ToList()
                : scope.Stocks;

            var totalStock = stocks.Sum(x => x.AS_QteSto);
            var reserved = stocks.Sum(x => x.AS_QteRes);
            var available = totalStock - reserved;
            var critical = GetCriticalStock(scope, filter.Top);
            var negative = stocks.Count(x => x.AS_QteSto - x.AS_QteRes < 0);

            var response = Base("stock", "Stock", "Disponibilité, réservation, stock critique et stock par dépôt.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Quantity("stockTotal", "Stock total", totalStock),
                Quantity("reserved", "Stock réservé", reserved, "info"),
                Quantity("available", "Stock disponible", available, available < 0 ? "critical" : "success"),
                Count("critical", "Stock critique", critical.Count, critical.Count > 0 ? "critical" : "success"),
                Count("negative", "Stock négatif", negative, negative > 0 ? "critical" : "success")
            };

            response.PrimaryTrend = stocks
                .GroupBy(x => x.DE_No)
                .Select(g => new ProChartPointDto
                {
                    Key = g.Key.ToString(CultureInfo.InvariantCulture),
                    Label = DepotLabel(scope, g.Key),
                    Value = g.Sum(x => x.AS_QteSto - x.AS_QteRes),
                    SecondaryValue = g.Sum(x => x.AS_QteRes)
                })
                .OrderByDescending(x => x.Value)
                .Take(filter.Top)
                .ToList();

            response.StatusDistribution = BuildStringDistribution(stocks.Select(x =>
            {
                var availableQty = x.AS_QteSto - x.AS_QteRes;
                var threshold = x.AS_QteMini ?? 0m;
                if (availableQty < 0) return "NEGATIF";
                if (threshold > 0 && availableQty <= threshold) return "CRITIQUE";
                return "NORMAL";
            }));

            response.TopEntities = critical;
            response.Table = BuildTopEntitiesTable(critical, "Stock critique");
            response.Alerts = critical.Count > 0
                ? new List<ProDashboardAlertDto> { Alert("critical-stock", "Stock critique", $"{critical.Count} articles sous seuil critique.", "critical", "Stock", "Réapprovisionner ou transférer depuis un autre dépôt.", critical.Count) }
                : new List<ProDashboardAlertDto>();

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetDepotsAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);

            var depotItems = scope.Stocks
                .GroupBy(x => x.DE_No)
                .Select(g =>
                {
                    var available = g.Sum(x => x.AS_QteSto - x.AS_QteRes);
                    return new ProTopEntityItemDto
                    {
                        Key = g.Key.ToString(CultureInfo.InvariantCulture),
                        Label = DepotLabel(scope, g.Key),
                        Value = available,
                        FormattedValue = FormatQuantity(available),
                        Meta = $"{g.Count()} articles"
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(filter.Top)
                .ToList();

            var response = Base("depots", "Dépôts", "Stock, commandes et activité par dépôt.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("depots", "Nombre de dépôts", scope.Depots.Count),
                Quantity("stock", "Stock total", scope.Stocks.Sum(x => x.AS_QteSto)),
                Quantity("available", "Stock disponible", scope.Stocks.Sum(x => x.AS_QteSto - x.AS_QteRes)),
                Count("orders", "Commandes avec dépôt", scope.BcDocuments.Count(x => x.DE_No.HasValue)),
                Count("criticalDepots", "Dépôts avec stock critique", GetCriticalStock(scope, 1000).Select(x => x.Meta).Distinct().Count(), "warning")
            };

            response.PrimaryTrend = depotItems
                .Select(x => new ProChartPointDto { Key = x.Key, Label = x.Label, Value = x.Value })
                .ToList();

            response.StatusDistribution = BuildStringDistribution(scope.BcDocuments.Select(x => x.DE_No?.ToString(CultureInfo.InvariantCulture) ?? "SANS_DEPOT"));
            response.TopEntities = depotItems;
            response.Table = BuildTopEntitiesTable(depotItems, "Synthèse dépôt");

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetLogisticsAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var livraisons = ApplyDeliveryStatus(scope.Livraisons, filter.DeliveryStatus).ToList();

            var delivered = livraisons.Count(x => x.LI_Statut == 3);
            var returned = livraisons.Count(x => x.LI_Statut == 4);
            var avgDelay = CalculateAverageDeliveryDelay(livraisons);

            var response = Base("logistics", "Livraison", "Suivi des livraisons, retours, reports et délais.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("deliveries", "Livraisons totales", livraisons.Count),
                Count("inProgress", "En cours", livraisons.Count(x => x.LI_Statut == 2), "info"),
                Count("delivered", "Livrées", delivered, "success"),
                Count("returned", "Retours", returned, returned > 0 ? "critical" : "success"),
                Count("postponed", "Reportées", livraisons.Count(x => x.LI_Statut == 6), "warning"),
                Percent("successRate", "Taux réussite", Percent(delivered, livraisons.Count), "success"),
                Percent("returnRate", "Taux retour", Percent(returned, livraisons.Count), returned > 0 ? "critical" : "success"),
                Days("avgDelay", "Délai moyen", avgDelay)
            };

            response.PrimaryTrend = BuildDeliveryTrend(livraisons, filter);
            response.StatusDistribution = BuildDeliveryStatusDistribution(livraisons);
            response.TopEntities = BuildTopDrivers(scope, filter.Top);
            response.SecondaryTopEntities = BuildTopDepots(scope, filter.Top);
            response.Table = BuildDeliveryTable(livraisons.OrderByDescending(x => x.LI_DateCreation).Take(25).ToList());
            response.Alerts = returned > 0
                ? new List<ProDashboardAlertDto> { Alert("returns", "Retours livraison", $"{returned} livraisons retournées.", "critical", "Livraison", "Analyser les causes de retour.", returned) }
                : new List<ProDashboardAlertDto>();

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetDriversAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var drivers = scope.Profiles
                .Where(x => x.TypeProfil == TypeProfil.Employe && IsDriverProfile(x))
                .ToList();

            var topDrivers = BuildTopDrivers(scope, filter.Top);

            var response = Base("drivers", "Livreurs", "Performance, charge et activité des livreurs.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("drivers", "Nombre de livreurs", drivers.Count),
                Count("activeDrivers", "Livreurs actifs", drivers.Count(x => x.LastActivityAt.HasValue && x.LastActivityAt.Value >= DateTime.UtcNow.AddMinutes(-30)), "success"),
                Count("assigned", "Livraisons affectées", scope.Livraisons.Count(x => x.LivreurId.HasValue)),
                Count("delivered", "Livraisons réussies", scope.Livraisons.Count(x => x.LI_Statut == 3), "success"),
                Count("returns", "Retours", scope.Livraisons.Count(x => x.LI_Statut == 4), "critical")
            };

            response.TopEntities = topDrivers;
            response.PrimaryTrend = topDrivers.Select(x => new ProChartPointDto { Key = x.Key, Label = x.Label, Value = x.Value }).ToList();
            response.StatusDistribution = BuildDeliveryStatusDistribution(scope.Livraisons);
            response.Table = BuildTopEntitiesTable(topDrivers, "Classement livreurs");

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetClientsAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var clients = scope.Clients;

            var response = Base("clients", "Clients", "Segmentation client, activité, régions et qualité des données.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("clients", "Total clients", clients.Count),
                Count("b2b", "Clients B2B", clients.Count(x => x.TypeClient == TypeClient.B2B)),
                Count("b2c", "Clients B2C", clients.Count(x => x.TypeClient == TypeClient.B2C)),
                Count("active", "Clients actifs", scope.BcDocuments.Select(x => Normalize(x.DO_Tiers)).Where(x => x != null).Distinct().Count()),
                Count("recent", "Clients récents", clients.Count(x => x.DateCreation.HasValue && x.DateCreation.Value >= DateTime.UtcNow.AddDays(-30))),
                Count("missingAddress", "Adresse incomplète", clients.Count(x => string.IsNullOrWhiteSpace(x.Adresse)), "warning")
            };

            response.StatusDistribution = BuildStringDistribution(clients.Select(x => x.TypeClient == TypeClient.B2B ? "B2B" : "B2C"));
            response.SecondaryDistribution = BuildStringDistribution(clients.Select(x => x.Gouvernorat?.ToString() ?? "NON_RENSEIGNE"));
            response.TopEntities = BuildTopClients(scope.BcDocuments, scope.Profiles, filter.Top);
            response.Table = BuildTopEntitiesTable(response.TopEntities, "Top clients");

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetReclamationsAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var claims = scope.Reclamations;
            var open = claims.Count(x => !IsClosedClaim(x.Statut));
            var avgDelay = CalculateAverageClaimDelay(claims);

            var response = Base("reclamations", "Réclamations", "Suivi des réclamations par statut, motif et délai de traitement.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("claims", "Total réclamations", claims.Count),
                Count("open", "Ouvertes", open, open > 0 ? "warning" : "success"),
                Count("closed", "Clôturées", claims.Count(x => IsClosedClaim(x.Statut)), "success"),
                Count("refused", "Refusées", claims.Count(x => Normalize(x.Statut) == "REFUSEE" || Normalize(x.Statut) == "REFUSE"), "critical"),
                Days("avgDelay", "Délai moyen", avgDelay)
            };

            response.PrimaryTrend = BuildClaimTrend(claims, filter);
            response.StatusDistribution = BuildStringDistribution(claims.Select(x => Normalize(x.Statut) ?? "NON_RENSEIGNE"));
            response.SecondaryDistribution = BuildStringDistribution(claims.Select(x => Normalize(x.Motif) ?? "NON_RENSEIGNE"));
            response.TopEntities = BuildTopStatusItems(claims.Select(x => Normalize(x.Motif) ?? "NON_RENSEIGNE"), filter.Top);
            response.Table = BuildClaimsTable(claims.OrderByDescending(x => x.CreatedAt).Take(25).ToList());

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetSyncAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);

            var refsWithImage = scope.Images.Select(x => x.AR_Ref).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var productsWithoutImage = scope.Articles.Count(x => !refsWithImage.Contains(x.AR_Ref));
            var productsWithoutCatalogue = scope.Articles.Count(x => x.CL_No1 <= 0 && x.CL_No2 <= 0 && x.CL_No3 <= 0 && x.CL_No4 <= 0);
            var negativeStocks = scope.Stocks.Count(x => x.AS_QteSto - x.AS_QteRes < 0);
            var clientsWithoutAddress = scope.Clients.Count(x => string.IsNullOrWhiteSpace(x.Adresse));

            var response = Base("sync", "Synchronisation / qualité données", "Contrôle des anomalies catalogue, stock et clients.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("articles", "Articles", scope.Articles.Count),
                Count("clients", "Clients", scope.Clients.Count),
                Count("depots", "Dépôts", scope.Depots.Count),
                Count("stocks", "Lignes stock", scope.Stocks.Count),
                Count("productsWithoutImage", "Produits sans image", productsWithoutImage, productsWithoutImage > 0 ? "warning" : "success"),
                Count("productsWithoutCatalogue", "Produits sans catalogue", productsWithoutCatalogue, productsWithoutCatalogue > 0 ? "warning" : "success"),
                Count("negativeStocks", "Stocks négatifs", negativeStocks, negativeStocks > 0 ? "critical" : "success"),
                Count("clientsWithoutAddress", "Clients sans adresse", clientsWithoutAddress, clientsWithoutAddress > 0 ? "warning" : "success")
            };

            response.StatusDistribution = BuildStringDistribution(new[]
            {
                productsWithoutImage > 0 ? "IMAGE_INCOMPLETE" : "IMAGE_OK",
                productsWithoutCatalogue > 0 ? "CATALOGUE_INCOMPLETE" : "CATALOGUE_OK",
                negativeStocks > 0 ? "STOCK_NEGATIVE" : "STOCK_OK",
                clientsWithoutAddress > 0 ? "CLIENT_ADDRESS_INCOMPLETE" : "CLIENT_ADDRESS_OK"
            });

            response.PrimaryTrend = BuildSyncVolumeTrend(scope, filter);
            response.SecondaryTrend = BuildSyncQualityTrend(scope, filter);
            response.TopEntities = BuildSyncTopEntities(scope, filter.Top, productsWithoutImage, productsWithoutCatalogue, negativeStocks, clientsWithoutAddress);
            response.SecondaryTopEntities = BuildSyncQualityItems(productsWithoutImage, productsWithoutCatalogue, negativeStocks, clientsWithoutAddress);
            response.Alerts = BuildSyncAlerts(productsWithoutImage, productsWithoutCatalogue, negativeStocks, clientsWithoutAddress);
            response.Insights = new List<ProDashboardInsightDto>
            {
                Insight("sync-quality", "Qualité des données", "Les anomalies sont recalculées à chaque rafraîchissement à partir de la base locale.", "Data quality", "Traiter les anomalies avant reporting final.", "info"),
                Insight("sync-realtime", "Lecture temps réel", "Les courbes de synchronisation sont générées à partir des dernières écritures locales Sage X3.", "Synchronisation", "Relancer une sync puis suivre les variations sans changer de page.", "success")
            };
            response.Table = BuildTopEntitiesTable(response.TopEntities, "Anomalies stock");
            response.DataCompletenessNote = "Les tendances sont recalculées en temps réel depuis les documents, lignes, clients et images présents en base locale.";

            return response;
        }

        public async Task<ProDashboardPageResponseDto> GetInsightsAsync(ProDashboardFilterDto query, CancellationToken ct)
        {
            var filter = BuildFilter(query);
            var scope = await LoadScopeAsync(filter, ct);
            var criticalStock = GetCriticalStock(scope, filter.Top);
            var openClaims = scope.Reclamations.Count(x => !IsClosedClaim(x.Statut));
            var returns = scope.Livraisons.Count(x => x.LI_Statut == 4);

            var response = Base("insights", "Insights", "Recommandations basées sur des règles métier et agrégations analytiques.", filter);

            response.Kpis = new List<ProKpiMetricDto>
            {
                Count("criticalStock", "Risques stock", criticalStock.Count, criticalStock.Count > 0 ? "critical" : "success"),
                Count("openClaims", "Réclamations ouvertes", openClaims, openClaims > 0 ? "warning" : "success"),
                Count("returns", "Retours livraison", returns, returns > 0 ? "critical" : "success"),
                Currency("revenue", "CA période", SumAmount(scope.BcDocuments))
            };

            response.Insights = BuildCommonInsights(scope, criticalStock);
            response.Alerts = BuildCommonAlerts(scope, criticalStock, openClaims);
            response.TopEntities = criticalStock;
            response.PrimaryTrend = BuildDocumentAmountTrend(scope.BcDocuments, filter);
            response.SecondaryTrend = BuildDocumentCountTrend(scope.BcDocuments, filter);
            response.Table = BuildTopEntitiesTable(criticalStock, "Priorités métier");
            response.DataCompletenessNote = "Ces insights ne sont pas un modèle IA. Ils sont basés sur des règles métier déterministes.";

            return response;
        }

        private async Task<DashboardScope> LoadScopeAsync(DashboardFilter filter, CancellationToken ct)
        {
            var docs = await _db.F_DOCENTETES
                .AsNoTracking()
                .Where(x => (x.DO_Date ?? x.cbCreation) >= filter.From && (x.DO_Date ?? x.cbCreation) < filter.ToExclusive)
                .ToListAsync(ct);

            if (filter.DepotNo.HasValue)
                docs = docs.Where(x => x.DE_No == filter.DepotNo.Value).ToList();

            if (!string.IsNullOrWhiteSpace(filter.Governorate))
                docs = docs.Where(x =>
                    Contains(x.DO_PassagerGouvernorat, filter.Governorate) ||
                    Contains(x.DO_VilleLivraison, filter.Governorate)).ToList();

            if (!string.IsNullOrWhiteSpace(filter.Delegation))
                docs = docs.Where(x => Contains(x.DO_PassagerDelegation, filter.Delegation)).ToList();

            var profiles = await _db.ProfilsUtilisateurs.AsNoTracking().ToListAsync(ct);
            var clients = profiles.Where(x => x.TypeProfil == TypeProfil.Client).ToList();

            if (filter.ClientType != "ALL")
            {
                docs = docs.Where(x => ResolveClientType(x, profiles) == filter.ClientType).ToList();
                clients = clients.Where(x => (x.TypeClient == TypeClient.B2B ? "B2B" : "B2C") == filter.ClientType).ToList();
            }

            var lines = await _db.F_DOCLIGNES
                .AsNoTracking()
                .Where(x => (x.DO_Date ?? x.cbCreation) >= filter.From && (x.DO_Date ?? x.cbCreation) < filter.ToExclusive)
                .ToListAsync(ct);

            var livraisons = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Where(x => x.LI_DateCreation >= filter.From && x.LI_DateCreation < filter.ToExclusive)
                .ToListAsync(ct);

            var payments = await _db.B_PAIEMENTS
                .AsNoTracking()
                .Where(x => (x.PA_Date ?? x.cbCreation) >= filter.From && (x.PA_Date ?? x.cbCreation) < filter.ToExclusive)
                .ToListAsync(ct);

            var reclamations = await _db.F_RECLAMATIONS
                .AsNoTracking()
                .Where(x => x.CreatedAt >= filter.From && x.CreatedAt < filter.ToExclusive)
                .ToListAsync(ct);

            var articles = await _db.F_ARTICLES.AsNoTracking().ToListAsync(ct);
            var stocks = await _db.F_ARTSTOCKS.AsNoTracking().ToListAsync(ct);
            var depots = await _db.F_DEPOTS.AsNoTracking().ToListAsync(ct);
            var catalogues = await _db.F_CATALOGUES.AsNoTracking().ToListAsync(ct);
            var images = await _db.F_ARTICLE_IMAGES.AsNoTracking().ToListAsync(ct);

            return new DashboardScope
            {
                Documents = docs,
                BcDocuments = docs.Where(IsBc).ToList(),
                BlDocuments = docs.Where(IsBl).ToList(),
                Lines = lines,
                Livraisons = livraisons,
                Payments = payments,
                Reclamations = reclamations,
                Profiles = profiles,
                Clients = clients,
                Articles = articles,
                Stocks = stocks,
                Depots = depots,
                Catalogues = catalogues,
                Images = images
            };
        }

        private static ProDashboardPageResponseDto Base(string scope, string title, string description, DashboardFilter filter)
        {
            return new ProDashboardPageResponseDto
            {
                Scope = scope,
                Title = title,
                Description = description,
                GeneratedAt = DateTime.UtcNow,
                AppliedFilters = new ProDashboardAppliedFiltersDto
                {
                    Period = filter.Period,
                    From = filter.From,
                    To = filter.ToInclusive,
                    DepotNo = filter.DepotNo,
                    Governorate = filter.Governorate,
                    Delegation = filter.Delegation,
                    ClientType = filter.ClientType,
                    OrderStatus = filter.OrderStatus,
                    DeliveryStatus = filter.DeliveryStatus,
                    Top = filter.Top
                },
                Warnings = new List<string>()
            };
        }

        private static DashboardFilter BuildFilter(ProDashboardFilterDto query)
        {
            var today = DateTime.UtcNow.Date;
            var period = Normalize(query.Period) switch
            {
                "7D" => "7d",
                "90D" => "90d",
                "12M" => "12m",
                "CUSTOM" => "custom",
                _ => "30d"
            };

            DateTime from;
            DateTime to;

            if (period == "custom")
            {
                if (!query.From.HasValue || !query.To.HasValue)
                    throw new ArgumentException("from et to sont obligatoires quand period=custom.");

                from = query.From.Value.Date;
                to = query.To.Value.Date;

                if (to < from)
                    throw new ArgumentException("La date to doit être supérieure ou égale à from.");
            }
            else if (period == "7d")
            {
                from = today.AddDays(-6);
                to = today;
            }
            else if (period == "90d")
            {
                from = today.AddDays(-89);
                to = today;
            }
            else if (period == "12m")
            {
                from = new DateTime(today.Year, today.Month, 1).AddMonths(-11);
                to = today;
            }
            else
            {
                from = today.AddDays(-29);
                to = today;
            }

            return new DashboardFilter
            {
                Period = period,
                From = from,
                ToInclusive = to,
                ToExclusive = to.AddDays(1),
                DepotNo = query.DepotNo,
                Governorate = query.Governorate,
                Delegation = query.Delegation,
                ClientType = NormalizeClientType(query.ClientType),
                OrderStatus = query.OrderStatus,
                DeliveryStatus = query.DeliveryStatus,
                Top = Math.Clamp(query.Top ?? 10, 5, 15)
            };
        }

        private static IEnumerable<F_DOCENTETE> ApplyOrderStatus(IEnumerable<F_DOCENTETE> docs, string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return docs;

            var normalized = Normalize(status);
            return docs.Where(x => StatusLabel(x.DO_Valide) == normalized);
        }

        private static IEnumerable<F_LIVRAISON> ApplyDeliveryStatus(IEnumerable<F_LIVRAISON> livraisons, string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return livraisons;

            var normalized = Normalize(status);
            return livraisons.Where(x => DeliveryStatusLabel(x.LI_Statut) == normalized);
        }

        private static List<ProChartPointDto> BuildDocumentAmountTrend(List<F_DOCENTETE> docs, DashboardFilter filter)
        {
            return BuildBuckets(filter)
                .Select(bucket =>
                {
                    var bucketDocs = docs.Where(x => GetDocumentDate(x) >= bucket.From && GetDocumentDate(x) < bucket.To).ToList();
                    return new ProChartPointDto
                    {
                        Key = bucket.Key,
                        Label = bucket.Label,
                        Value = SumAmount(bucketDocs),
                        SecondaryValue = bucketDocs.Count
                    };
                })
                .ToList();
        }

        private static List<ProChartPointDto> BuildDocumentCountTrend(List<F_DOCENTETE> docs, DashboardFilter filter)
        {
            return BuildBuckets(filter)
                .Select(bucket =>
                {
                    var bucketDocs = docs.Where(x => GetDocumentDate(x) >= bucket.From && GetDocumentDate(x) < bucket.To).ToList();
                    return new ProChartPointDto
                    {
                        Key = bucket.Key,
                        Label = bucket.Label,
                        Value = bucketDocs.Count,
                        SecondaryValue = SumAmount(bucketDocs)
                    };
                })
                .ToList();
        }

        private static List<ProChartPointDto> BuildQuantityTrend(List<F_DOCLIGNE> lines, DashboardFilter filter)
        {
            return BuildBuckets(filter)
                .Select(bucket =>
                {
                    var bucketLines = lines.Where(x => GetLineDate(x) >= bucket.From && GetLineDate(x) < bucket.To).ToList();
                    return new ProChartPointDto
                    {
                        Key = bucket.Key,
                        Label = bucket.Label,
                        Value = bucketLines.Sum(x => x.DL_Qte ?? 0m),
                        SecondaryValue = bucketLines.Sum(x => x.DL_MontantTTC ?? x.DL_MontantHT ?? 0m)
                    };
                })
                .ToList();
        }

        private static List<ProChartPointDto> BuildDeliveryTrend(List<F_LIVRAISON> livraisons, DashboardFilter filter)
        {
            return BuildBuckets(filter)
                .Select(bucket =>
                {
                    var bucketItems = livraisons.Where(x => x.LI_DateCreation >= bucket.From && x.LI_DateCreation < bucket.To).ToList();
                    return new ProChartPointDto
                    {
                        Key = bucket.Key,
                        Label = bucket.Label,
                        Value = bucketItems.Count,
                        SecondaryValue = bucketItems.Count(x => x.LI_Statut == 3)
                    };
                })
                .ToList();
        }

        private static List<ProChartPointDto> BuildClaimTrend(List<F_RECLAMATION> claims, DashboardFilter filter)
        {
            return BuildBuckets(filter)
                .Select(bucket =>
                {
                    var bucketItems = claims.Where(x => x.CreatedAt >= bucket.From && x.CreatedAt < bucket.To).ToList();
                    return new ProChartPointDto
                    {
                        Key = bucket.Key,
                        Label = bucket.Label,
                        Value = bucketItems.Count,
                        SecondaryValue = bucketItems.Count(x => IsClosedClaim(x.Statut))
                    };
                })
                .ToList();
        }

        private static List<ProChartPointDto> BuildSyncVolumeTrend(DashboardScope scope, DashboardFilter filter)
        {
            return BuildBuckets(filter)
                .Select(bucket =>
                {
                    var documents = scope.Documents.Count(x => GetDocumentDate(x) >= bucket.From && GetDocumentDate(x) < bucket.To);
                    var lines = scope.Lines.Count(x => GetLineDate(x) >= bucket.From && GetLineDate(x) < bucket.To);
                    var deliveries = scope.Livraisons.Count(x => x.LI_DateCreation >= bucket.From && x.LI_DateCreation < bucket.To);
                    var claims = scope.Reclamations.Count(x => x.CreatedAt >= bucket.From && x.CreatedAt < bucket.To);

                    return new ProChartPointDto
                    {
                        Key = bucket.Key,
                        Label = bucket.Label,
                        Value = documents + lines,
                        SecondaryValue = deliveries + claims
                    };
                })
                .ToList();
        }

        private static List<ProChartPointDto> BuildSyncQualityTrend(DashboardScope scope, DashboardFilter filter)
        {
            return BuildBuckets(filter)
                .Select(bucket =>
                {
                    var clientSyncs = scope.Clients.Count(x =>
                    {
                        var syncDate = x.DateDerniereSynchronisation ?? x.DateModification ?? x.DateCreation;
                        return syncDate.HasValue && syncDate.Value >= bucket.From && syncDate.Value < bucket.To;
                    });

                    var imageSyncs = scope.Images.Count(x => x.CreatedAt.HasValue && x.CreatedAt.Value >= bucket.From && x.CreatedAt.Value < bucket.To);

                    return new ProChartPointDto
                    {
                        Key = bucket.Key,
                        Label = bucket.Label,
                        Value = clientSyncs,
                        SecondaryValue = imageSyncs
                    };
                })
                .ToList();
        }

        private static List<DateBucket> BuildBuckets(DashboardFilter filter)
        {
            var buckets = new List<DateBucket>();

            if (filter.Period == "12m")
            {
                var cursor = new DateTime(filter.From.Year, filter.From.Month, 1);
                while (cursor < filter.ToExclusive)
                {
                    var next = cursor.AddMonths(1);
                    buckets.Add(new DateBucket(cursor.ToString("yyyy-MM", CultureInfo.InvariantCulture), cursor.ToString("MMM yyyy", CultureInfo.InvariantCulture), cursor, next));
                    cursor = next;
                }
            }
            else
            {
                var cursor = filter.From.Date;
                while (cursor < filter.ToExclusive)
                {
                    var next = cursor.AddDays(1);
                    buckets.Add(new DateBucket(cursor.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), cursor.ToString("dd/MM", CultureInfo.InvariantCulture), cursor, next));
                    cursor = next;
                }
            }

            return buckets;
        }

        private static List<ProStatusDistributionItemDto> BuildOrderStatusDistribution(List<F_DOCENTETE> docs)
        {
            return BuildStringDistribution(docs.Select(x => StatusLabel(x.DO_Valide)));
        }

        private static List<ProStatusDistributionItemDto> BuildDeliveryStatusDistribution(List<F_LIVRAISON> livraisons)
        {
            return BuildStringDistribution(livraisons.Select(x => DeliveryStatusLabel(x.LI_Statut)));
        }

        private static List<ProStatusDistributionItemDto> BuildClientTypeDistribution(List<F_DOCENTETE> docs, List<ProfilUtilisateur> profiles)
        {
            return BuildStringDistribution(docs.Select(x => ResolveClientType(x, profiles)));
        }

        private static List<ProStatusDistributionItemDto> BuildStringDistribution(IEnumerable<string?> values)
        {
            var normalized = values.Select(x => Normalize(x) ?? "NON_RENSEIGNE").ToList();
            var total = normalized.Count;

            return normalized
                .GroupBy(x => x)
                .Select(g => new ProStatusDistributionItemDto
                {
                    Key = g.Key,
                    Label = Labelize(g.Key),
                    Count = g.Count(),
                    Percentage = Percent(g.Count(), total),
                    Severity = SeverityForKey(g.Key)
                })
                .OrderByDescending(x => x.Count)
                .ToList();
        }

        private static List<ProTopEntityItemDto> BuildTopProducts(DashboardScope scope, int top)
        {
            var articleByRef = scope.Articles
                .Where(x => !string.IsNullOrWhiteSpace(x.AR_Ref))
                .GroupBy(x => x.AR_Ref, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            return scope.Lines
                .Where(x => x.DO_Domaine == DomainVente && x.DO_Type == BcType && !string.IsNullOrWhiteSpace(x.AR_Ref))
                .GroupBy(x => x.AR_Ref!, StringComparer.OrdinalIgnoreCase)
                .Select(g =>
                {
                    var amount = g.Sum(x => x.DL_MontantTTC ?? x.DL_MontantHT ?? 0m);
                    var qty = g.Sum(x => x.DL_Qte ?? 0m);
                    articleByRef.TryGetValue(g.Key, out var article);

                    return new ProTopEntityItemDto
                    {
                        Key = g.Key,
                        Label = article?.AR_Design ?? g.Key,
                        SecondaryLabel = g.Key,
                        Value = amount,
                        FormattedValue = FormatCurrency(amount),
                        Meta = $"Quantité {FormatQuantity(qty)}"
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(top)
                .ToList();
        }

        private static List<ProTopEntityItemDto> BuildTopClients(List<F_DOCENTETE> docs, List<ProfilUtilisateur> profiles, int top)
        {
            return docs
                .Where(x => !string.IsNullOrWhiteSpace(x.DO_Tiers))
                .GroupBy(x => Normalize(x.DO_Tiers) ?? "CLIENT")
                .Select(g =>
                {
                    var profile = profiles.FirstOrDefault(p => Normalize(p.CodeClientSage) == g.Key);
                    var amount = SumAmount(g.ToList());

                    return new ProTopEntityItemDto
                    {
                        Key = g.Key,
                        Label = ClientName(profile, g.Key),
                        SecondaryLabel = profile?.TypeClient == TypeClient.B2B ? "B2B" : "B2C",
                        Value = amount,
                        FormattedValue = FormatCurrency(amount),
                        Meta = $"{g.Count()} commandes"
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(top)
                .ToList();
        }

        private static List<ProTopEntityItemDto> BuildTopDepots(DashboardScope scope, int top)
        {
            return scope.BcDocuments
                .GroupBy(x => x.DE_No ?? 0)
                .Select(g =>
                {
                    var amount = SumAmount(g.ToList());
                    return new ProTopEntityItemDto
                    {
                        Key = g.Key.ToString(CultureInfo.InvariantCulture),
                        Label = g.Key > 0 ? DepotLabel(scope, g.Key) : "Sans dépôt",
                        Value = g.Count(),
                        FormattedValue = $"{g.Count()} commandes",
                        Meta = FormatCurrency(amount)
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(top)
                .ToList();
        }

        private static List<ProTopEntityItemDto> BuildTopDrivers(DashboardScope scope, int top)
        {
            var profilesById = scope.Profiles.ToDictionary(x => x.cbMarq, x => x);

            return scope.Livraisons
                .Where(x => x.LivreurId.HasValue)
                .GroupBy(x => x.LivreurId!.Value)
                .Select(g =>
                {
                    profilesById.TryGetValue(g.Key, out var profile);
                    var total = g.Count();
                    var delivered = g.Count(x => x.LI_Statut == 3);
                    var successRate = Percent(delivered, total);

                    return new ProTopEntityItemDto
                    {
                        Key = g.Key.ToString(CultureInfo.InvariantCulture),
                        Label = profile?.NomComplet ?? $"Livreur #{g.Key}",
                        SecondaryLabel = profile?.ZoneLivraison,
                        Value = delivered,
                        FormattedValue = $"{successRate:0.#}% réussite",
                        Meta = $"{total} affectations",
                        Severity = successRate >= 70 ? "success" : "warning"
                    };
                })
                .OrderByDescending(x => x.Value)
                .Take(top)
                .ToList();
        }

        private static List<ProTopEntityItemDto> GetCriticalStock(DashboardScope scope, int top)
        {
            var articleByRef = scope.Articles
                .Where(x => !string.IsNullOrWhiteSpace(x.AR_Ref))
                .GroupBy(x => x.AR_Ref, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            return scope.Stocks
                .Select(stock =>
                {
                    var available = stock.AS_QteSto - stock.AS_QteRes;
                    var threshold = stock.AS_QteMini ?? 0m;
                    articleByRef.TryGetValue(stock.AR_Ref, out var article);

                    return new
                    {
                        Stock = stock,
                        Available = available,
                        Threshold = threshold,
                        Article = article
                    };
                })
                .Where(x => x.Available < 0 || (x.Threshold > 0 && x.Available <= x.Threshold))
                .OrderBy(x => x.Available)
                .Take(top)
                .Select(x => new ProTopEntityItemDto
                {
                    Key = $"{x.Stock.AR_Ref}-{x.Stock.DE_No}",
                    Label = x.Article?.AR_Design ?? x.Stock.AR_Ref,
                    SecondaryLabel = x.Stock.AR_Ref,
                    Value = x.Available,
                    FormattedValue = FormatQuantity(x.Available),
                    Meta = $"Dépôt {x.Stock.DE_No} · seuil {FormatQuantity(x.Threshold)}",
                    Severity = x.Available < 0 ? "critical" : "warning"
                })
                .ToList();
        }

        private static List<ProTopEntityItemDto> BuildSyncTopEntities(
            DashboardScope scope,
            int top,
            int productsWithoutImage,
            int productsWithoutCatalogue,
            int negativeStocks,
            int clientsWithoutAddress)
        {
            var criticalStock = GetCriticalStock(scope, top);
            return criticalStock.Count > 0
                ? criticalStock
                : BuildSyncQualityItems(productsWithoutImage, productsWithoutCatalogue, negativeStocks, clientsWithoutAddress);
        }

        private static List<ProTopEntityItemDto> BuildSyncQualityItems(
            int productsWithoutImage,
            int productsWithoutCatalogue,
            int negativeStocks,
            int clientsWithoutAddress)
        {
            return new List<ProTopEntityItemDto>
            {
                QualityItem("products-without-image", "Produits sans image", productsWithoutImage, "Catalogue", "warning"),
                QualityItem("products-without-catalogue", "Produits sans catalogue", productsWithoutCatalogue, "Catalogue", "warning"),
                QualityItem("negative-stocks", "Stocks négatifs", negativeStocks, "Stock", "critical"),
                QualityItem("clients-without-address", "Clients sans adresse", clientsWithoutAddress, "Clients", "warning")
            }
            .OrderByDescending(x => x.Value)
            .ToList();
        }

        private static ProTopEntityItemDto QualityItem(string key, string label, int value, string module, string severity)
        {
            return new ProTopEntityItemDto
            {
                Key = key,
                Label = label,
                SecondaryLabel = module,
                Value = value,
                FormattedValue = value.ToString(CultureInfo.InvariantCulture),
                Meta = value > 0 ? "Action requise" : "OK",
                Severity = value > 0 ? severity : "success"
            };
        }

        private static List<ProTopEntityItemDto> BuildTopStatusItems(IEnumerable<string?> values, int top)
        {
            return values
                .Select(x => Normalize(x) ?? "NON_RENSEIGNE")
                .GroupBy(x => x)
                .Select(g => new ProTopEntityItemDto
                {
                    Key = g.Key,
                    Label = Labelize(g.Key),
                    Value = g.Count(),
                    FormattedValue = g.Count().ToString(CultureInfo.InvariantCulture)
                })
                .OrderByDescending(x => x.Value)
                .Take(top)
                .ToList();
        }

        private static ProDashboardTableDto BuildDocumentsTable(List<F_DOCENTETE> docs, string title)
        {
            return new ProDashboardTableDto
            {
                Title = title,
                Columns = new List<ProDataTableColumnDto>
                {
                    Col("piece", "Pièce"),
                    Col("client", "Client"),
                    Col("date", "Date"),
                    Col("status", "Statut"),
                    Col("amount", "Montant", "right")
                },
                Rows = docs.Select(x => Row(x.cbMarq.ToString(CultureInfo.InvariantCulture), new Dictionary<string, object?>
                {
                    ["piece"] = x.DO_Piece,
                    ["client"] = x.DO_Tiers ?? x.DO_PassagerNomComplet,
                    ["date"] = GetDocumentDate(x).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    ["status"] = StatusLabel(x.DO_Valide),
                    ["amount"] = FormatCurrency(Amount(x))
                })).ToList()
            };
        }

        private static ProDashboardTableDto BuildDeliveryTable(List<F_LIVRAISON> livraisons)
        {
            return new ProDashboardTableDto
            {
                Title = "Livraisons récentes",
                Columns = new List<ProDataTableColumnDto>
                {
                    Col("piece", "Pièce"),
                    Col("city", "Ville"),
                    Col("status", "Statut"),
                    Col("driver", "Livreur"),
                    Col("date", "Date")
                },
                Rows = livraisons.Select(x => Row(x.cbMarq.ToString(CultureInfo.InvariantCulture), new Dictionary<string, object?>
                {
                    ["piece"] = x.DO_Piece,
                    ["city"] = x.LI_Ville,
                    ["status"] = DeliveryStatusLabel(x.LI_Statut),
                    ["driver"] = x.LivreurId?.ToString(CultureInfo.InvariantCulture),
                    ["date"] = x.LI_DateCreation.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                })).ToList()
            };
        }

        private static ProDashboardTableDto BuildClaimsTable(List<F_RECLAMATION> claims)
        {
            return new ProDashboardTableDto
            {
                Title = "Réclamations récentes",
                Columns = new List<ProDataTableColumnDto>
                {
                    Col("code", "Code"),
                    Col("piece", "Commande"),
                    Col("motif", "Motif"),
                    Col("status", "Statut"),
                    Col("date", "Date")
                },
                Rows = claims.Select(x => Row(x.Id.ToString(CultureInfo.InvariantCulture), new Dictionary<string, object?>
                {
                    ["code"] = x.CodeReclamation,
                    ["piece"] = x.DoPiece,
                    ["motif"] = x.Motif,
                    ["status"] = x.Statut,
                    ["date"] = x.CreatedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                })).ToList()
            };
        }

        private static ProDashboardTableDto BuildTopEntitiesTable(List<ProTopEntityItemDto> items, string title)
        {
            return new ProDashboardTableDto
            {
                Title = title,
                Columns = new List<ProDataTableColumnDto>
                {
                    Col("label", "Libellé"),
                    Col("secondaryLabel", "Référence"),
                    Col("value", "Valeur", "right"),
                    Col("formattedValue", "Format"),
                    Col("meta", "Info")
                },
                Rows = items.Select(x => Row(x.Key, new Dictionary<string, object?>
                {
                    ["label"] = x.Label,
                    ["secondaryLabel"] = x.SecondaryLabel,
                    ["value"] = x.Value,
                    ["formattedValue"] = x.FormattedValue,
                    ["meta"] = x.Meta
                })).ToList()
            };
        }

        private static List<ProDashboardAlertDto> BuildCommonAlerts(DashboardScope scope, List<ProTopEntityItemDto> criticalStock, int openClaims)
        {
            var alerts = new List<ProDashboardAlertDto>();

            if (criticalStock.Count > 0)
                alerts.Add(Alert("critical-stock", "Stock critique", $"{criticalStock.Count} articles sont sous seuil.", "critical", "Stock", "Prévoir un réapprovisionnement.", criticalStock.Count));

            if (openClaims > 0)
                alerts.Add(Alert("open-claims", "Réclamations ouvertes", $"{openClaims} réclamations sont encore ouvertes.", "warning", "Réclamations", "Traiter les réclamations prioritaires.", openClaims));

            var returns = scope.Livraisons.Count(x => x.LI_Statut == 4);
            if (returns > 0)
                alerts.Add(Alert("delivery-returns", "Retours livraison", $"{returns} retours détectés.", "critical", "Livraison", "Analyser les causes de retour.", returns));

            return alerts;
        }

        private static List<ProDashboardAlertDto> BuildSyncAlerts(int productsWithoutImage, int productsWithoutCatalogue, int negativeStocks, int clientsWithoutAddress)
        {
            var alerts = new List<ProDashboardAlertDto>();

            if (productsWithoutImage > 0)
                alerts.Add(Alert("products-without-image", "Produits sans image", $"{productsWithoutImage} produits sans image.", "warning", "Catalogue", "Compléter les images.", productsWithoutImage));

            if (productsWithoutCatalogue > 0)
                alerts.Add(Alert("products-without-catalogue", "Produits sans catalogue", $"{productsWithoutCatalogue} produits sans catalogue.", "warning", "Catalogue", "Corriger l'affectation catalogue.", productsWithoutCatalogue));

            if (negativeStocks > 0)
                alerts.Add(Alert("negative-stock", "Stocks négatifs", $"{negativeStocks} lignes stock négatives.", "critical", "Stock", "Corriger les quantités.", negativeStocks));

            if (clientsWithoutAddress > 0)
                alerts.Add(Alert("clients-without-address", "Clients sans adresse", $"{clientsWithoutAddress} clients sans adresse complète.", "warning", "Clients", "Compléter les profils clients.", clientsWithoutAddress));

            return alerts;
        }

        private static List<ProDashboardInsightDto> BuildCommonInsights(DashboardScope scope, List<ProTopEntityItemDto> criticalStock)
        {
            var insights = new List<ProDashboardInsightDto>
            {
                Insight("sales-trend", "Suivi des ventes", $"CA période : {FormatCurrency(SumAmount(scope.BcDocuments))}.", "Commercial", "Comparer avec les périodes précédentes.", "info"),
                Insight("order-volume", "Volume commandes", $"{scope.BcDocuments.Count} commandes détectées sur la période.", "Opérationnel", "Suivre la charge confirmateur/livraison.", "info")
            };

            if (criticalStock.Count > 0)
                insights.Add(Insight("stock-risk", "Risque de rupture", $"{criticalStock.Count} articles sont en stock critique.", "Stock", "Réapprovisionner rapidement.", "critical"));

            return insights;
        }

        private static decimal CalculateAverageDeliveryDelay(List<F_LIVRAISON> livraisons)
        {
            var delays = livraisons
                .Where(x => x.LI_DateLivree.HasValue)
                .Select(x => (decimal)(x.LI_DateLivree!.Value - x.LI_DateCreation).TotalDays)
                .ToList();

            return delays.Count == 0 ? 0m : decimal.Round(delays.Average(), 2);
        }

        private static decimal CalculateAverageClaimDelay(List<F_RECLAMATION> claims)
        {
            var delays = claims
                .Where(x => x.ResolvedAt.HasValue || x.ClosedAt.HasValue)
                .Select(x =>
                {
                    var endDate = x.ResolvedAt ?? x.ClosedAt ?? x.CreatedAt;
                    return (decimal)(endDate - x.CreatedAt).TotalDays;
                })
                .ToList();

            return delays.Count == 0 ? 0m : decimal.Round(delays.Average(), 2);
        }

        private static bool IsBc(F_DOCENTETE doc)
        {
            return doc.DO_Domaine == DomainVente && doc.DO_Type == BcType;
        }

        private static bool IsBl(F_DOCENTETE doc)
        {
            return doc.DO_Domaine == DomainVente && doc.DO_Type == BlType;
        }

        private static DateTime GetDocumentDate(F_DOCENTETE doc)
        {
            return doc.DO_Date ?? doc.cbCreation ?? DateTime.UtcNow;
        }

        private static DateTime GetLineDate(F_DOCLIGNE line)
        {
            return line.DO_Date ?? line.cbCreation ?? DateTime.UtcNow;
        }

        private static decimal Amount(F_DOCENTETE doc)
        {
            return doc.DO_NetAPayer ?? doc.DO_TotalTTC ?? doc.DO_TotalHTNet ?? doc.DO_TotalHT ?? 0m;
        }

        private static decimal SumAmount(List<F_DOCENTETE> docs)
        {
            return docs.Sum(Amount);
        }

        private static string? Normalize(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();
        }

        private static bool Contains(string? source, string? value)
        {
            return !string.IsNullOrWhiteSpace(source)
                && !string.IsNullOrWhiteSpace(value)
                && source.Contains(value, StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeClientType(string? value)
        {
            var normalized = Normalize(value);
            return normalized == "B2B" ? "B2B" : normalized == "B2C" ? "B2C" : "ALL";
        }

        private static string ResolveClientType(F_DOCENTETE doc, List<ProfilUtilisateur> profiles)
        {
            var passengerType = Normalize(doc.DO_PassagerTypeClient);
            if (passengerType == "B2B" || passengerType == "B2C")
                return passengerType;

            var tiers = Normalize(doc.DO_Tiers);
            var profile = profiles.FirstOrDefault(x => Normalize(x.CodeClientSage) == tiers);

            return profile?.TypeClient == TypeClient.B2B ? "B2B" : "B2C";
        }

        private static string ClientName(ProfilUtilisateur? profile, string? fallback)
        {
            if (!string.IsNullOrWhiteSpace(profile?.NomSociete))
                return profile.NomSociete;

            if (!string.IsNullOrWhiteSpace(profile?.NomComplet))
                return profile.NomComplet;

            return fallback ?? "Client";
        }

        private static string DepotLabel(DashboardScope scope, int depotNo)
        {
            var depot = scope.Depots.FirstOrDefault(x => x.DE_No == depotNo);
            return depot?.DE_Intitule ?? $"Dépôt {depotNo}";
        }

        private static bool IsDriverProfile(ProfilUtilisateur profile)
        {
            return Contains(profile.Poste, "livreur")
                || Contains(profile.ZoneLivraison, "livraison")
                || !string.IsNullOrWhiteSpace(profile.CodeDepot);
        }

        private static bool IsClosedClaim(string? status)
        {
            var normalized = Normalize(status);
            return normalized is "CLOTUREE" or "CLOTURE" or "RESOLUE" or "FERMEE" or "ACCEPTEE";
        }

        private static string StatusLabel(short? status)
        {
            return status switch
            {
                F_DOCENTETE.STATUS_EN_ATTENTE => "EN_ATTENTE",
                F_DOCENTETE.STATUS_CONFIRME => "CONFIRME",
                F_DOCENTETE.STATUS_TENTATIVE => "TENTATIVE",
                F_DOCENTETE.STATUS_REFUSE => "REFUSE",
                _ => "INCONNU"
            };
        }

        private static string DeliveryStatusLabel(short status)
        {
            return status switch
            {
                1 => "CONFIRME",
                2 => "EN_LIVRAISON",
                3 => "LIVRE",
                4 => "RETOUR",
                5 => "DEPOT",
                6 => "REPORTE",
                _ => "INCONNU"
            };
        }

        private static decimal Percent(int count, int total)
        {
            return total <= 0 ? 0m : decimal.Round(count * 100m / total, 2);
        }

        private static string FormatCurrency(decimal value)
        {
            return $"{value.ToString("0.###", CultureInfo.InvariantCulture)} TND";
        }

        private static string FormatQuantity(decimal value)
        {
            return value.ToString("0.###", CultureInfo.InvariantCulture);
        }

        private static string Labelize(string key)
        {
            var text = key.Replace('_', ' ').ToLowerInvariant();
            return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(text);
        }

        private static string SeverityForKey(string key)
        {
            return key switch
            {
                "CONFIRME" or "LIVRE" or "PUBLIE" or "NORMAL" or "B2B" or "B2C" => "success",
                "REFUSE" or "RETOUR" or "NEGATIF" or "STOCK_NEGATIVE" => "critical",
                "EN_ATTENTE" or "TENTATIVE" or "REPORTE" or "CRITIQUE" => "warning",
                _ => "info"
            };
        }

        private static ProKpiMetricDto Count(string key, string label, int value, string? severity = null, string? hint = null)
        {
            return new ProKpiMetricDto
            {
                Key = key,
                Label = label,
                Value = value,
                FormattedValue = value.ToString(CultureInfo.InvariantCulture),
                Format = "count",
                Severity = severity,
                Hint = hint
            };
        }

        private static ProKpiMetricDto Currency(string key, string label, decimal value, string? hint = null)
        {
            return new ProKpiMetricDto
            {
                Key = key,
                Label = label,
                Value = value,
                FormattedValue = FormatCurrency(value),
                Format = "currency",
                Severity = "info",
                Hint = hint
            };
        }

        private static ProKpiMetricDto Percent(string key, string label, decimal value, string? severity = null)
        {
            return new ProKpiMetricDto
            {
                Key = key,
                Label = label,
                Value = value,
                FormattedValue = $"{value.ToString("0.#", CultureInfo.InvariantCulture)}%",
                Format = "percent",
                Severity = severity
            };
        }

        private static ProKpiMetricDto Quantity(string key, string label, decimal value, string? severity = null)
        {
            return new ProKpiMetricDto
            {
                Key = key,
                Label = label,
                Value = value,
                FormattedValue = FormatQuantity(value),
                Format = "quantity",
                Severity = severity
            };
        }

        private static ProKpiMetricDto Days(string key, string label, decimal value)
        {
            return new ProKpiMetricDto
            {
                Key = key,
                Label = label,
                Value = value,
                FormattedValue = $"{value.ToString("0.#", CultureInfo.InvariantCulture)} j",
                Format = "days",
                Severity = value > 3 ? "warning" : "success"
            };
        }

        private static ProDashboardAlertDto Alert(string key, string title, string description, string severity, string module, string action, int? count)
        {
            return new ProDashboardAlertDto
            {
                Key = key,
                Title = title,
                Description = description,
                Severity = severity,
                Module = module,
                Action = action,
                Count = count
            };
        }

        private static ProDashboardInsightDto Insight(string key, string title, string description, string? impact, string? action, string severity)
        {
            return new ProDashboardInsightDto
            {
                Key = key,
                Title = title,
                Description = description,
                Impact = impact,
                Action = action,
                Severity = severity
            };
        }

        private static ProDataTableColumnDto Col(string key, string label, string align = "left")
        {
            return new ProDataTableColumnDto
            {
                Key = key,
                Label = label,
                Align = align
            };
        }

        private static Dictionary<string, object?> Row(string key, Dictionary<string, object?> data)
        {
            data["key"] = key;
            return data;
        }

        private sealed class DashboardFilter
        {
            public string Period { get; set; } = "30d";
            public DateTime From { get; set; }
            public DateTime ToInclusive { get; set; }
            public DateTime ToExclusive { get; set; }
            public int? DepotNo { get; set; }
            public string? Governorate { get; set; }
            public string? Delegation { get; set; }
            public string ClientType { get; set; } = "ALL";
            public string? OrderStatus { get; set; }
            public string? DeliveryStatus { get; set; }
            public int Top { get; set; } = 10;
        }

        private sealed class DashboardScope
        {
            public List<F_DOCENTETE> Documents { get; set; } = new();
            public List<F_DOCENTETE> BcDocuments { get; set; } = new();
            public List<F_DOCENTETE> BlDocuments { get; set; } = new();
            public List<F_DOCLIGNE> Lines { get; set; } = new();
            public List<F_LIVRAISON> Livraisons { get; set; } = new();
            public List<B_PAIEMENT> Payments { get; set; } = new();
            public List<F_RECLAMATION> Reclamations { get; set; } = new();
            public List<ProfilUtilisateur> Profiles { get; set; } = new();
            public List<ProfilUtilisateur> Clients { get; set; } = new();
            public List<F_ARTICLE> Articles { get; set; } = new();
            public List<F_ARTSTOCK> Stocks { get; set; } = new();
            public List<F_DEPOT> Depots { get; set; } = new();
            public List<F_CATALOGUE> Catalogues { get; set; } = new();
            public List<F_ARTICLE_IMAGE> Images { get; set; } = new();
        }

        private sealed record DateBucket(string Key, string Label, DateTime From, DateTime To);
    }
}
