# Cartographie Backend

## Stack détectée

- ASP.NET Core Web API `.NET 8` (`Web-Api.csproj`, `net8.0`).
- EF Core 8 SQL Server, ASP.NET Identity, JWT Bearer, SignalR, Hangfire SQL Server, Swagger.
- Intégrations/packages: Cloudinary, Google/Facebook auth, ClosedXML, QuestPDF, Microsoft.ML, NetTopologySuite, Hangfire.
- Tests: xUnit dans `Web-Api.Tests`.

## Architecture

- `Program.cs` configure DI, CORS dev, auth, Swagger, SignalR, Hangfire, middleware global et fallback SPA.
- Controllers orientés domaine: auth, admin, commandes, paiements, client, livreur, confirmatrice, réclamations, transit, geo, chatbot.
- Services métier dans `Services`, `Admin`, `Reclamation`, `Refonte`, `Sage`, `Security`, `Scheduler`, `Storage`, `Notifications`.
- Pas de repository pattern dédié détecté; controllers/services utilisent directement `AppDbContext`.
- Hubs SignalR: `/hubs/reclamations`, `/hubs/supervisor`.

## Controllers

- Auth: `AuthController`.
- Catalogue/sync: `ArticlesController`, `CataloguesController`, `StocksController`, `DepotsController`, `Sync*Controller`, `ArticleImagesController`.
- Commandes/paiement: `OrdersController`, `PaymentsController`, `BcToBlController`, `DocEntetesController`, `DocLignesController`.
- Client: `ClientController`, `ClientAddressesController`, `PublicTrackingController`, `AvisController`, `ReclamationsController`, `DemandesController`.
- Confirmatrice/confirmateur: `ConfirmateurController`, `ConfirmatriceReclamationsController`, `ConfirmatriceStatusController`, `CommandeLocksController`.
- Livreur: `LivreurController`, `LivreurPoolController`, `LivreurReclamationsController`, `LivreurStatsController`.
- Admin: controllers `Admin*` pour dashboard, users, orders, products, claims, drivers, confirmatrices, settings, theme, homepage, B2B, chatbot.
- Refonte/supervision: `SupervisorController`, `TransitController`, `DepotZonesController`, `GeoPickupOptionsController`, `ClientAddressPreviewController`.
- Geo/health/dev: `GeoController`, `HealthController`, `DevSeedController`, `AdminDevController`, `TestController`.

## Services

- Commandes/livraison: `BonCommandeService`, `BcToBlService`, `DepotIncrementService`, `OrderTrackingService`, `OrderTimelineService`.
- Paiement: `KonnectPaymentService`, `VirtualPaymentService`.
- Réclamations: `ReclamationsService`, redistribution/cleanup hosted services, lock/status services.
- Admin/dashboard/chatbot: `AdminDashboardService`, `AdminChatService`, `ChatbotService`, `KnowledgeBaseService`, `ProactiveInsightsService`.
- Refonte/transit: `DepotZoneService`, `StockTransferService`, `TransitOrchestrationService`, `SupervisorAlertService`.
- Notifications/intégrations: email, SMS, push, Cloudinary, Sage HTTP client.
- Geo: `GeoPolygonService` + hosted initializer.

## Repositories

- Aucun repository séparé confirmé.
- **Risque**: couplage EF direct dans services/controllers; acceptable pour PFE, mais tests et évolutions plus difficiles.

## DbContext

- `data/AppDbContext.cs` est le point central.
- Entités métiers: documents Sage-like, livraisons, paiements, articles, stocks, dépôts, réclamations, avis, livreurs, zones, transferts, alertes, SMS, app config, chatbot.
- Index/contraintes présents pour paiements, réclamations, tokens, zones, transferts, config single-row et photos incidents.

## Entités

- Documents/stock: `F_DOCENTETE`, `F_DOCLIGNE`, `F_ARTICLE`, `F_ARTSTOCK`, `F_DEPOT`, `F_CATALOGUE`, `F_TAXE`.
- Livraison/paiement: `F_LIVRAISON`, `B_PAIEMENT`.
- Réclamations/avis: `F_RECLAMATION`, `F_RECLAMATION_TENTATIVE`, `F_RECLAMATION_PHOTO`, `F_AVIS_COMMANDE`.
- Terrain: `F_LIVREUR_*`, `F_CLIENT_DEVICE_TOKEN`, `F_CLIENT_ADDRESS`, `F_LIVREUR_POSITION`.
- Refonte/transit: `F_DEPOT_ZONE`, `F_LIVREUR_ZONE`, `F_TRANSFERT`, `F_TRANSFERT_AUDIT_LOG`, `F_SUPERVISOR_ALERT`, `F_DELIVERY_INCIDENT_PHOTO`.
- Config/chatbot: `F_APP_CONFIG`, `AppSetting`, `HomepageTemplate`, `F_CHATBOT_*`.

## DTOs

- DTOs nombreux sous `Models`, `Models/DTOs`, `Services/*/Dtos` et dossiers domaine.
- Contrats critiques: auth/login/register, commandes, paiements, réclamations, livreur, admin dashboard, transit/supervisor, geo.
- **Risque**: certains contrats côté frontend/mobile sont reconstruits localement plutôt que partagés.

## Endpoints API

- Voir `API_MAP.md` pour la cartographie compacte.
- Surface API importante avec groupes `/api/auth`, `/api/orders`, `/api/payments`, `/api/reclamations`, `/api/livreur`, `/api/admin/*`, `/api/supervisor`, `/api/transit`, `/api/geo`.

## Authentification et sécurité

- JWT Bearer et ASP.NET Identity configurés.
- Rôles confirmés par routes/policies: `ADMIN`, `CLIENT`, `VENDEUR`, `LIVREUR`, `CONFIRMATEUR`, `SUPERVISEUR`.
- CORS dev autorise localhost/127.0.0.1/10.0.2.2 avec credentials.
- **Risque sensible**: `appsettings.json` contient des secrets/configs intégration; valeurs non reproduites ici.
- **Risque sensible**: `IdentitySeeder.cs` contient des comptes/mots de passe de démonstration; valeurs non reproduites ici.
- **Risque TLS**: `Program.cs` désactive la validation certificat pour le client Sage.
- **Risque dev**: dashboards/endpoints de seed autorisés en Development; garder hors production.

## Base de données

- SQL Server via connection string `DefaultConnection`.
- Migrations nombreuses, dont plusieurs noms temporaires/non professionnels.
- Certaines migrations utilisent SQL idempotent ou correctifs de tables; vérifier l'état réel DB avant nettoyage.

## Problèmes détectés

- Secrets et configurations sensibles dans fichiers de configuration/source.
- Validation TLS Sage désactivée.
- Politique mot de passe faible pour production.
- Endpoints dev/seed à verrouiller strictement.
- Migrations nombreuses avec noms temporaires.
- Surface API très large, documentation OpenAPI métier à renforcer.
- Couplage direct EF sans repository/ports sur domaines complexes.
- Tests backend limités à quelques domaines.
- Routes CRUD brutes `docentetes`/`doclignes` probablement héritées.

## Améliorations proposées

- Déplacer secrets vers variables d'environnement, user-secrets ou coffre.
- Remplacer le bypass TLS par un certificat de confiance/config sécurisée.
- Durcir Identity et règles d'accès production.
- Générer/maintenir une documentation Swagger par tags et contrats.
- Ajouter tests ciblés: auth, commande, paiement, réclamation, livreur, supervisor.
- Isoler les services critiques derrière interfaces testables déjà partiellement présentes.
- Nettoyer migrations seulement après sauvegarde DB et validation équipe.
