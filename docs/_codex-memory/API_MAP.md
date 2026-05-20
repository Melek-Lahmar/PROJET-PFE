# Cartographie API

> Carte compacte par groupes fonctionnels. Les routes exactes doivent être vérifiées dans les controllers avant modification.

| Méthode | Route | Controller | Rôle métier | Entrée | Sortie | Utilisé par | Risque |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | `AuthController` | Inscription | Register DTO | Auth/user | React/Flutter | Validation/roles à vérifier |
| POST | `/api/auth/login` | `AuthController` | Connexion JWT | Credentials | Token + user | React/Flutter | Sécurité password |
| GET/PUT | `/api/auth/me`, `/api/auth/me/profile` | `AuthController` | Profil utilisateur | JWT/profil | User/profil | React/Flutter | Contrat profil |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password` | `AuthController` | Reset password | Email/token | Statut | React/Flutter | Email/config |
| GET/POST | `/api/articles*` | `ArticlesController` | Catalogue produits | Filtres/article | Articles | React/Flutter | Contrats images/prix |
| GET | `/api/articles/filter-metadata` | `ArticlesController` | Métadonnées filtre | Query | Metadata | React | Performance |
| GET/POST | `/api/catalogues*` | `CataloguesController` | Familles/catalogues | Query/body | Catalogues | React/Flutter | Alignement Sage |
| GET/POST | `/api/depots*` | `DepotsController` | Dépôts | Query/body | Dépôts | React/Flutter | Données stock |
| GET/POST | `/api/stocks*` | `StocksController` | Stocks article/dépôt | Query/body | Stocks | React/Flutter | Performance |
| POST | `/api/sync/articles`, `/api/sync/catalogues`, `/api/sync/depots`, `/api/sync/stocks`, `/api/SyncAll` | `Sync*Controller` | Synchronisation Sage-like | Trigger | Résultat sync | Admin React | Sécurité/admin |
| GET/POST/DELETE | `/api/articles/{arRef}/images*`, `/api/admin/articles/{arRef}/images*` | `ArticleImagesController` | Images produit | Image/metadata | Image URLs | React admin | Upload/stockage |
| POST | `/api/orders` | `OrdersController` | Créer commande client | Panier/adresse | Commande | React/Flutter | Stock/prix |
| POST | `/api/orders/guest` | `OrdersController` | Commande invité | Client/panier | Commande | React | Paiement/validation |
| GET | `/api/orders/{piece}` | `OrdersController` | Détail commande | Piece | Commande | React/Flutter | Autorisation |
| GET | `/api/orders/{piece}/timeline` | `OrdersController` | Timeline commande | Piece | Timeline | React/Flutter | Cohérence statuts |
| GET | `/api/orders/{piece}/transit-summary` | `OrdersController` | Résumé transit | Piece | Transit | React/Flutter | Données zones |
| POST | `/api/orders/preview-address` | `OrdersController` | Prévisualiser adresse/livraison | Adresse | Options | React/Flutter | Geo |
| POST | `/api/payments/konnect/initiate` | `PaymentsController` | Paiement Konnect | Piece/montant | Pay URL/ref | React | Secrets/provider |
| POST | `/api/payments/konnect/initiate/guest` | `PaymentsController` | Paiement invité Konnect | Panier/client | Pay URL/ref | React | Création ordre |
| GET/POST | `/api/payments/konnect/status`, `/api/payments/konnect/webhook` | `PaymentsController` | Statut/webhook Konnect | Ref/webhook | Statut | Provider/React | Signature/webhook |
| POST | `/api/payments/virtual/initiate`, `/api/payments/virtual/initiate/guest` | `PaymentsController` | Paiement virtuel sandbox | Piece/client | Pay URL/ref | React | Sandbox vs prod |
| GET/POST | `/api/payments/virtual/status`, `/api/payments/virtual/webhook` | `PaymentsController` | Statut virtuel | Ref/webhook | Statut | React/test | Environnement |
| GET/POST | `/api/client/addresses*` | `ClientAddressesController` | Adresses client | Adresse | Adresse(s) | React/Flutter | Données personnelles |
| GET | `/api/client/loyalty` | `ClientController` | Fidélité client | JWT | Score/points | React/Flutter | Calcul |
| POST | `/api/client/push/register-token` | `ClientController` | Token push client | Token device | Statut | Flutter | Secret FCM |
| GET | `/api/client/orders/{piece}/tracking*` | `ClientController` | Tracking client | Piece | Tracking | React/Flutter | Autorisation |
| GET/POST | `/api/public/track*` | `PublicTrackingController` | Tracking public | Code/piece | Statut | React/Flutter | Exposition données |
| GET/POST | `/api/reclamations*`, `/api/demandes*` | `ReclamationsController`, `DemandesController` | Réclamations/demandes | Type/cas/photo | Dossier | React/Flutter | Flux unifié complexe |
| GET/POST | `/api/avis*` | `AvisController` | Avis commande | Note/commentaire | Avis | React/Flutter | Modération |
| GET/POST | `/api/confirmateur/*` | `ConfirmateurController` | Confirmation commandes/BC/BL | Piece/statut | Résultat | React/Flutter | Workflow critique |
| GET/POST | `/api/confirmatrice/reclamations*` | `ConfirmatriceReclamationsController` | Traitement réclamations | Action/tentative | Dossier | React/Flutter | Concurrence |
| GET/POST | `/api/confirmatrice/status*` | `ConfirmatriceStatusController` | Statut travail | Pause/resume | Statut/stats | React/Flutter | Présence |
| GET/POST | `/api/commande-locks*` | `CommandeLocksController` | Verrouillage commande | Piece/user | Lock | React/Flutter | Deadlocks/cleanup |
| GET/POST | `/api/livreur/orders/available`, `/mine`, `/{piece}/assign`, `/{piece}/status` | `LivreurController` | Livraison terrain | Piece/statut | BL/livraison | React/Flutter | Idempotence |
| POST | `/api/livreur/orders/{piece}/encaisser` | `LivreurController` | Encaissement COD | Montant | Statut | Flutter | Traçabilité cash |
| POST | `/api/livreur/location/ping`, `/ping-batch` | `LivreurController` | Position livreur | GPS | Statut | Flutter | Vie privée/perf |
| GET/POST | `/api/livreur/pool/*` | `LivreurPoolController` | Pool livraison | Action | Missions | React/Flutter | Assignation |
| GET | `/api/livreur/stats*` | `LivreurStatsController` | Statistiques livreur | Période | Stats | React/Flutter | Calcul |
| GET/POST | `/api/livreur/reclamations*` | `LivreurReclamationsController` | Réclamations livreur | Action/photo | Dossier | Flutter | Upload |
| GET/POST | `/api/admin/dashboard*`, `/api/admin/summary*` | `AdminDashboardController`, `AdminSummaryController` | Dashboard admin | Filtres | KPIs | React | Performance |
| GET/POST | `/api/admin/users*` | `AdminUsersController` | Gestion utilisateurs | User/role | Users | React admin | Sécurité |
| GET/POST | `/api/admin/orders*` | `AdminOrdersController` | Gestion commandes | Filtres/action | Orders | React admin | Autorisation |
| GET/POST | `/api/admin/products*` | `AdminProductsController` | Gestion produits | Produit | Produits | React admin | Sync Sage |
| GET/POST | `/api/admin/claims*` | `AdminClaimsController` | Gestion réclamations | Action | Claims | React admin | Workflow |
| GET/POST | `/api/admin/drivers*`, `/api/admin/confirmatrices*` | `AdminDriversController`, `AdminConfirmatricesController` | Personnel | User/stats | Personnel | React admin | Roles |
| GET/POST | `/api/admin/settings*`, `/api/admin/theme*`, `/api/admin/homepage*` | Admin settings/homepage controllers | Paramétrage UI/app | Config | Config | React admin | Mismatch possible |
| GET/POST | `/api/admin/chat*`, `/api/admin/chat-history*` | `AdminChatController`, `AdminChatHistoryController` | Chatbot admin | Prompt/query | Réponse/history | React/n8n | Secret IA |
| GET/POST | `/api/supervisor/*` | `SupervisorController` | Supervision zones/alertes | Filtres/action | Alerts/zones | React/Flutter | Rôle/policy |
| GET/POST | `/api/transit/*` | `TransitController` | Transit inter-dépôts | Transfert/action | Transferts | React/Flutter | Stock |
| GET/POST | `/api/depot-zones*` | `DepotZonesController` | Zones dépôt | Polygon/zone | Zones | React | Geo data |
| GET | `/api/geo/gouvernorats`, `/delegations`, `/validate-point`, `/health`, `/pickup-options` | `GeoController`, `GeoPickupOptionsController` | Géolocalisation | GPS/zone | Validation/options | React/Flutter | Qualité données |
| GET | `/api/health` | `HealthController` | Santé API | Aucun | Health | Ops | Exposition faible |
| POST | `/api/dev/*`, `/api/admin/dev/*` | `DevSeedController`, `AdminDevController` | Seed/dev reset | Action dev | Résultat | Dev only | Très sensible en prod |
| GET/POST | `/api/docentetes*`, `/api/doclignes*` | `DocEntetesController`, `DocLignesController` | CRUD documents brut | Document/ligne | Document/ligne | Legacy/admin | Exposition modèle DB |
