# Documentation technique — Plateforme PFE multi-app

> **Auteur** : Firas Yezi (mel Tnaisnis)
> **Établissement** : ISET Sfax
> **Date de génération** : 2026-05-13
> **Périmètre** : 3 applications (1 backend + 2 frontends) consommant la même API REST + SignalR + DB SQL Server.

---

## Table des matières

1. [Vue d'ensemble du système](#1-vue-densemble-du-système)
2. [Stack technique global](#2-stack-technique-global)
3. [Architecture & flux inter-apps](#3-architecture--flux-inter-apps)
4. [Backend — Web-Api (ASP.NET Core 8)](#4-backend--web-api-aspnet-core-8)
   1. [Structure du projet](#41-structure-du-projet)
   2. [Configuration & démarrage (`Program.cs`)](#42-configuration--démarrage-programcs)
   3. [Identité & authentification (Identity + JWT)](#43-identité--authentification-identity--jwt)
   4. [Couche données (EF Core + entités F_*)](#44-couche-données-ef-core--entités-f_)
   5. [Inventaire des controllers par domaine](#45-inventaire-des-controllers-par-domaine)
   6. [Services métier](#46-services-métier)
   7. [SignalR (`ReclamationHub`)](#47-signalr-reclamationhub)
   8. [Tâches planifiées (Hangfire)](#48-tâches-planifiées-hangfire)
   9. [Intégrations externes (Sage X3, Konnect, Cloudinary, OAuth, SMS, Groq)](#49-intégrations-externes)
   10. [Middleware transverses](#410-middleware-transverses)
   11. [DTOs & contrats JSON](#411-dtos--contrats-json)
   12. [Migrations & schéma DB](#412-migrations--schéma-db)
5. [Application React (e-commerce + back-office web)](#5-application-react-e-commerce--back-office-web)
   1. [Structure & arborescence](#51-structure--arborescence)
   2. [Routing & guards](#52-routing--guards)
   3. [State management (Zustand + React Query)](#53-state-management-zustand--react-query)
   4. [Couche HTTP & endpoints](#54-couche-http--endpoints)
   5. [Features / pages détaillées](#55-features--pages-détaillées)
   6. [Kit premium (composants partagés)](#56-kit-premium-composants-partagés)
   7. [Authentification & rôles](#57-authentification--rôles)
   8. [Build & déploiement](#58-build--déploiement)
6. [Application Flutter (multi-rôles : Client, Vendeur, Confirmatrice, Livreur, Admin)](#6-application-flutter-multi-rôles)
   1. [Architecture en couches](#61-architecture-en-couches)
   2. [Shell par rôle (`main.dart`)](#62-shell-par-rôle-maindart)
   3. [Providers & state](#63-providers--state)
   4. [Services HTTP](#64-services-http)
   5. [Screens par rôle](#65-screens-par-rôle)
   6. [Plugins natifs](#66-plugins-natifs)
   7. [Notifications & SignalR](#67-notifications--signalr)
   8. [Internationalisation & textes](#68-internationalisation--textes)
   9. [Build & cibles supportées](#69-build--cibles-supportées)
7. [Intégrations transverses & contrats](#7-intégrations-transverses--contrats)
8. [Procédures opérationnelles](#8-procédures-opérationnelles)
9. [Annexes](#9-annexes)

---

## 1. Vue d'ensemble du système

Le projet est une plateforme de **gestion de livraison Cash-on-Delivery (COD) multi-acteurs** déployée en Tunisie, articulée autour de 5 rôles métier :

| Rôle | Code interne | Application(s) | Mission principale |
|---|---|---|---|
| Client | `CLIENT` | React (e-commerce) + Flutter (suivi) | Passer commande, suivre livraison, faire réclamation |
| Vendeur | `VENDEUR` | React | Saisir commandes pour clients existants/passagers (B2B / B2C) |
| Confirmatrice | `CONFIRMATEUR` | Flutter + React (light) | Valider BC, transformer en BL, gérer réclamations/demandes |
| Livreur | `LIVREUR` | Flutter | Prendre en charge livraisons, scan dépôt, livrer, encaisser |
| Admin | `ADMIN` | Flutter + React | Supervision globale, KPIs, gestion utilisateurs, dashboard |

Le système s'interface en backend avec **Sage X3** (ERP) pour la synchronisation des articles, catalogues, dépôts, stocks et entêtes de documents, et avec **Konnect** pour le paiement en ligne (sandbox/prod). Les notifications temps réel passent par **SignalR**, les jobs récurrents par **Hangfire**.

```
┌─────────────────┐   ┌─────────────────┐
│  React          │   │  Flutter        │
│  (Vite + TS)    │   │  (Dart, multi-  │
│  e-commerce +   │   │   rôles app)    │
│  admin web      │   │                 │
└────────┬────────┘   └────────┬────────┘
         │ HTTPS REST + SignalR │
         └──────────┬───────────┘
                    │
            ┌───────▼────────┐
            │  Web-Api       │
            │  ASP.NET 8     │
            │  Hangfire+ML   │
            └───────┬────────┘
                    │
        ┌───────────┼────────────┐
        │           │            │
  ┌─────▼────┐ ┌────▼────┐  ┌────▼─────┐
  │SQL Server│ │Sage X3  │  │Konnect/  │
  │webApi_   │ │ERP      │  │Cloudinary│
  │flutter_  │ │         │  │/OAuth    │
  │test      │ │         │  │          │
  └──────────┘ └─────────┘  └──────────┘
```

---

## 2. Stack technique global

| Couche | Technologie | Version | Rôle |
|---|---|---|---|
| Backend runtime | .NET (ASP.NET Core) | 8.0 | API REST + SignalR |
| Backend ORM | Entity Framework Core | 8.x | SQL Server, migrations code-first |
| Backend Identity | ASP.NET Identity | 8.x | Users, rôles, hashage password |
| Auth tokens | JWT Bearer | HS256, 60 min | API stateless |
| Real-time | SignalR | — | Hubs réclamations, sessions confirmatrice |
| Jobs | Hangfire | 1.8.14 | Recurring jobs, dashboard admin |
| ML | Microsoft.ML + ML.TimeSeries | 3.0.1 | Risque retour, volume forecast |
| Export | ClosedXML + QuestPDF | — | Excel, PDF reports |
| Database | SQL Server | Express ou supérieur | Persistance |
| Frontend e-commerce | React + Vite + TypeScript | React 19, Vite 7, TS 5 | App web SPA |
| Frontend e-commerce CSS | Tailwind CSS 4 | — | Utility-first styling |
| Frontend e-commerce state | Zustand + React Query | — | Local store + cache HTTP |
| Frontend e-commerce HTTP | Axios | — | Client HTTP + interceptors |
| Frontend mobile | Flutter | Dart ^3.9 | App Android/iOS/Web/Desktop |
| Flutter state | provider (ChangeNotifier) | — | Providers scoped par rôle |
| Maps | Google Maps Flutter + Mapbox routing | — | Vue livreur GPS |
| Push notif | NotificationService + flutter_local_notifications | — | Notifs locales/push |
| Storage flutter | flutter_secure_storage | — | Token JWT côté mobile |
| Paiement en ligne | Konnect (Tunisie) | API publique | Wallet + carte bancaire + e-DINAR |
| ERP | Sage X3 | Web Services SOAP/REST | Import articles/stocks, push BL |
| Médias | Cloudinary | — | Stockage images articles + réclamations |
| SMS | Tunisie Telecom gateway (config'd) | — | Hooks transition livraison |
| LLM | Groq (Llama 3.3 70B) | API | Chatbot admin (assistance et requêtes) |

---

## 3. Architecture & flux inter-apps

### 3.1 Flux d'une commande "happy path" — Client React → Livraison Flutter

```
[Client React]
  1. Login (POST /api/auth/login → JWT)
  2. Parcours catalogue (GET /api/articles + /api/catalogues)
  3. Ajout au panier (state local Zustand)
  4. Checkout (POST /api/orders)
     → F_DOCENTETE créée (DO_Type=0=BC, DO_Valide=0=EN_ATTENTE)
  5. (optionnel) Paiement Konnect (POST /api/payments/konnect/initiate)
     → redirection vers Konnect
     → webhook callback met à jour le statut

[Confirmatrice Flutter]
  6. Ouvre l'app, voit la commande dans "Commandes EN_ATTENTE"
  7. Confirme la BC (POST /api/confirmateur/commandes/{piece}/transform-to-bl)
     → SageService.PostDocEnteteAsync envoie le BL à Sage X3
     → F_LIVRAISON créée (LI_Statut=0=CONFIRME)
     → Stock décrémenté (F_ARTSTOCK)

[Livreur Flutter]
  8. Voit la livraison dans le pool (GET /api/livreur/pool/disponibles)
  9. La prend (POST /api/livreur/pool/{piece}/prendre)
  10. Active delivery (POST /api/livreur/orders/{piece}/start-heading)
      → pings GPS périodiques (POST /api/livreur/location/ping)
  11. Marque "Livré" (PUT /api/livreur/orders/{piece}/status)
      → auto-encaissement (Encaisse=true, MontantEncaisse=DO_NetAPayer)
      → SMS Trigger.Livre envoyé au client
      → KPI caisse incrémenté côté stats livreur

[Client]
  12. Commande visible "Livrée" (GET /api/orders/{piece})
  13. Demande d'avis pop-up (GET /api/avis/pending)
  14. Tier de fidélité mis à jour (GET /api/client/loyalty)
```

### 3.2 Flux d'une réclamation

```
[Client] crée la réclamation (POST /api/reclamations)
  → F_RECLAMATION (Statut=ENVOYEE, TypeCas=RECLAMATION)
  → photos jointes (POST /api/reclamations/{id}/photos)
  → SignalR ReclamationHub diffuse aux confirmatrices

[Confirmatrice] prend en charge (POST /api/confirmateur/reclamations/{id}/take-over)
  → Statut = EN_COURS_DE_TRAITEMENT
  → Décide :
    a. Échange (POST .../echange + lignes RETOUR/LIVRAISON)
    b. Refus (PUT .../status statut=REFUSEE)
    c. Clôture (PUT .../status statut=CLOTUREE)
```

### 3.3 Flux d'une demande livreur

```
[Livreur] détecte ADRESSE_INCORRECTE / NUMERO_INCORRECT sur le terrain
  → POST /api/livreur/reclamations/attempt
  → F_RECLAMATION (TypeCas=DEMANDE, VisibleClient=true, Motif=ADRESSE_INCORRECTE)

[Client] reçoit notification, ouvre l'app
  → voit la demande (GET /api/demandes/mine)
  → répond (POST /api/demandes/{id}/reply)
    avec newAddress + lat/lng OU newPhone
  → CorrectionProposee JSON stocké

[Confirmatrice] voit le badge "Adresse modifiée" / "Téléphone modifié"
  → applique (PUT /api/confirmateur/reclamations/{id}/correction)
    → met à jour F_DOCENTETE.DO_AdresseLivraison ou ProfilUtilisateur.Telephone
  → libère le BL pour le livreur
```

---

## 4. Backend — Web-Api (ASP.NET Core 8)

### 4.1 Structure du projet

```
Web-Api(Asp.net)/Web-Api/
├── Program.cs                  ← composition root, DI, middleware pipeline
├── appsettings.json            ← config (DB, JWT, Sage, Konnect, etc.)
├── Web-Api.csproj              ← packages NuGet
├── Auth/                       ← Identity, JWT, rôles, seed
│   ├── Constants/              ← AppRoles, statuses, motifs
│   ├── Entities/               ← ApplicationUser, ProfilUtilisateur
│   ├── Options/                ← JwtOptions, SageOptions
│   ├── Seed/                   ← IdentitySeeder (rôles + AppConfig)
│   ├── Services/               ← JwtTokenService
│   └── HangfireAdminAuthFilter.cs
├── Controllers/                ← endpoints REST (organisé par domaine)
│   ├── Admin/                  ← chatbot, dashboard, drivers, claims, …
│   ├── Articles/               ← articles + images + sync Sage
│   ├── Auth/                   ← login, register, OAuth, profile
│   ├── Avis/                   ← reviews post-livraison
│   ├── Catalogues/             ← arbre catégories Sage
│   ├── Client/                 ← addresses, contact-prefs, loyalty, push, tracking, demandes
│   ├── Confirmateur/           ← commandes, BL, réclamations, history
│   ├── Confirmatrice/          ← session online/pause, redistribution
│   ├── Dashboard/              ← KPIs cross-rôles
│   ├── Depots/                 ← liste dépôts Sage
│   ├── Dev/                    ← seed-clean-demo, reset
│   ├── Geo/                    ← gouvernorats + délégations Tunisie
│   ├── Homepage/               ← homepage admin draft/publish
│   ├── Livreur/                ← pool, orders, ActiveDelivery, stats/cashbox, map, escalations, demandes
│   ├── Reclamations/           ← side client (création, listing)
│   ├── Statistics/             ← stats globales
│   ├── Stocks/                 ← F_ARTSTOCK aggregated
│   ├── Vendeur/                ← context, clients, orders B2B
│   ├── BonLivraisonsController.cs
│   ├── DocEntetesController.cs
│   ├── DocLignesController.cs
│   ├── HealthController.cs
│   ├── KonnectPaymentsController.cs
│   ├── OrdersController.cs
│   ├── PublicTrackingController.cs
│   ├── SyncAllController.cs
│   └── TestController.cs
├── Services/                   ← logique métier réutilisable
│   ├── Admin/                  ← Chat (Query/Analyze/Orchestrator), Claims, Confirmatrices, Dashboard, Drivers, Orders, Products, Prediction (ML), Theme
│   ├── Avis/
│   ├── Confirmatrice/          ← session, redistribution
│   ├── DevTest/                ← DevTestDataSeeder (xlsx ML.NET)
│   ├── Email/
│   ├── Images/                 ← Cloudinary upload
│   ├── Livreur/                ← active delivery, escalation, location, etc.
│   ├── Orders/                 ← CustomerTrackingBuilder
│   ├── Payments/               ← KonnectPaymentService + IKonnectClient
│   ├── Push/                   ← FCM token registry
│   ├── Reclamations/           ← ReclamationsService (cœur du module)
│   ├── Sms/                    ← ISmsGateway + TT/Mock implementations
│   ├── BcToBlService.cs        ← transformation BC → BL
│   ├── BonCommandeService.cs   ← création commande client/guest/vendeur
│   ├── DashboardAggregationService.cs
│   ├── HomepageService.cs
│   └── SageService.cs          ← HttpClient Sage X3 (GET articles/stocks, POST BL)
├── Model/                      ← entités EF Core (28 tables F_*)
├── DTO/                        ← contrats JSON (71 DTOs organisés en sous-dossiers)
├── Migrations/                 ← EF Core migrations (71 fichiers, code-first)
├── Hubs/                       ← SignalR (ReclamationHub, ReclamationEvents)
├── Middleware/                 ← GlobalException, Idempotency, ConfirmatriceActivity
├── Options/                    ← KonnectOptions, autres options injectées
├── Geo/                        ← TunisieDecoupage (24 gouvernorats + délégations)
├── Validation/                 ← TunisianPhone
└── data/                       ← AppDbContext
```

### 4.2 Configuration & démarrage (`Program.cs`)

Le composition root enregistre dans cet ordre :

1. **EF Core + DbContext** : `AppDbContext` connecté à SQL Server (`ConnectionStrings:Default`).
2. **Identity** : `AddIdentity<ApplicationUser, IdentityRole<Guid>>` avec `DefaultTokenProviders`.
3. **JWT auth** : `AddAuthentication().AddJwtBearer(...)` lit `Jwt:Key/Issuer/Audience`. Token symétrique HS256.
4. **OAuth externes** : Google et Facebook providers (cf. `appsettings.ExternalAuth`).
5. **CORS** policy `AllowDev` autorisant :
   - `http://localhost:5173` + `https://localhost:5173` (Vite/React dev)
   - `http://10.0.2.2:5000` (Flutter Android emulator)
   - `http://localhost:5000` (Flutter web/desktop)
   - `http://localhost:8080`, `http://127.0.0.1:8080` (dev variants)
6. **Services métier** (60+ Scoped/Singleton). Highlights :
   - `BonCommandeService`, `BcToBlService`, `SageService` (HttpClient configuré avec `IOptions<SageOptions>`)
   - `KonnectPaymentService` + `IKonnectClient` (HttpClient Konnect API)
   - Toute la suite `Admin*Service` (Dashboard, Orders, Drivers, Confirmatrices, Claims, Products, Theme)
   - `AdminChatQueryService`, `AdminChatAnalyzeService`, `AdminChatOrchestratorService`, `GroqClient`, `KbProvider`, `KbGeneratorService`, `LanguageDetectorService` (chatbot admin LLM-powered)
   - `PredictionService` (Singleton ML.NET — risque retour client, forecast volume)
   - `PushNotificationService`, `SmsNotificationService` (factory : `MockSmsGateway` en dev, `TunisieTelecomSmsGateway` en prod)
   - `DepotIncrementJob`, `ProactiveInsightsJob`, `ReclamationRedistributionHostedService`
   - `ExportService` (Excel + PDF via ClosedXML + QuestPDF)
7. **SignalR** : `AddSignalR()`, hub mappé sur `/hubs/reclamations`.
8. **Hangfire** : `AddHangfire(...)` + `AddHangfireServer(...)`, storage SQL Server, dashboard sous `/hangfire` protégé par `HangfireAdminAuthFilter` (rôle ADMIN).
9. **Middleware pipeline** dans cet ordre :
   - `UseGlobalExceptionMiddleware()`
   - `UseRouting()`
   - `UseCors("AllowDev")`
   - `UseAuthentication()`
   - `UseAuthorization()`
   - `UseIdempotencyMiddleware()` (sur POST sensibles + header `X-Idempotency-Key`)
   - `UseConfirmatriceActivityMiddleware()` (mise à jour `LastActivityAt`)
   - `MapHangfireDashboard()`, `MapHub<ReclamationHub>()`, `MapControllers()`
10. **Seeds** au démarrage : `IdentitySeeder.SeedRolesAsync()` + `SeedAppConfigAsync()` (singleton F_APP_CONFIG via SET IDENTITY_INSERT).
11. **Hangfire RecurringJobs** : `DepotIncrementJob` quotidien à 00:00 (Africa/Tunis), `ProactiveInsightsJob` quotidien à 02:00.

### 4.3 Identité & authentification (Identity + JWT)

**Rôles** (`Auth/Constants/AppRoles.cs`) :
- `CLIENT`, `VENDEUR`, `CONFIRMATEUR`, `LIVREUR`, `ADMIN`

**Entités** :
- `ApplicationUser : IdentityUser<Guid>` — étend Identity. Clé : `Guid`.
- `ProfilUtilisateur` (table riche application-side) — lié à `ApplicationUser` via `UtilisateurId`. Contient :
  - Identité : `NomComplet`, `Cin`, `NomSociete`, `MatriculeFiscal`, `NumeroTVA`, `RegistreCommerce`
  - Type : `TypeProfil` (CLIENT/VENDEUR/...), `TypeClient` (B2C=0, B2B=1)
  - Adresse : `Gouvernorat` (enum 24 valeurs), `Delegation`, `CodePostal`, `Adresse`, `AdresseComplementaire`, `Latitude`, `Longitude`
  - Livreur-spécifique : `LivreurOnline`, `LivreurInPause`, `PauseStartedAt`, `LastActivityAt`
  - Confirmatrice-spécifique : `ConfirmatriceOnline`, `LastActivityAt`
  - Client-spécifique : `CodeClientSage` (mapping vers `F_DOCENTETE.DO_Tiers`)
  - `ContactPreference` (Both | AppelOnly | SmsOnly)

**Endpoint d'auth** :
- `POST /api/auth/login` body `{ email, password }` → `{ accessToken, expiresInMinutes, userId, email, roles }`
- `POST /api/auth/register` → crée user + profil
- `POST /api/auth/forgot-password` → envoie email reset
- `POST /api/auth/reset-password` → applique nouveau password via token
- `GET /api/auth/me` (Authorize) → user + roles + profil
- `PUT /api/auth/me/profile` → update profil

**JWT** :
- HS256, clé symétrique dans `appsettings.Jwt.Key`
- Claims : `sub` (UserId), `email`, `jti`, rôles via `ClaimTypes.Role`
- Expiration : `AccessTokenMinutes` (60 par défaut)

**OAuth externes** :
- Google + Facebook via `Controllers/Auth/ExternalAuthController.cs`
- Flow : POST `/api/auth/external/{provider}` avec token client → vérifie token → crée/login user → retourne JWT interne

### 4.4 Couche données (EF Core + entités F_*)

**Contexte unique** : `data/AppDbContext.cs` qui hérite de `IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>`.

**Convention de nommage** : préfixe `F_` pour les tables qui miroitent Sage X3 (ou s'en inspirent). Ajout de tables application-side pour les besoins propres (réclamations, sessions, push tokens, etc.).

#### Entités principales (28 au total)

| Entité | Rôle | Liens clés |
|---|---|---|
| `F_ARTICLE` | Produits Sage (cbMarq PK, AR_Ref, AR_Design, AR_PrixVen, etc.) | Lié via AR_Ref dans F_DOCLIGNE, F_ARTSTOCK |
| `F_ARTICLE_IMAGE` | Images article (Cloudinary URLs, IsMain, SortOrder) | AR_Ref → F_ARTICLE |
| `F_CATALOGUE` | Arbre catégories (CL_No, CL_NoParent, CL_Niveau) | CL_No1..CL_No4 dans F_ARTICLE |
| `F_DEPOT` | Dépôts physiques (DE_No, DE_Intitule, DE_Principal) | DE_No dans F_ARTSTOCK + F_DOCENTETE |
| `F_ARTSTOCK` | Stock par article × dépôt (AS_QteSto, AS_QteRes) | AR_Ref + DE_No |
| `F_DOCENTETE` | Entête commande / BL (DO_Piece PK, DO_Type 0=BC/1=BL, DO_Valide 0..3) | DO_Tiers → ProfilUtilisateur.CodeClientSage |
| `F_DOCLIGNE` | Ligne commande (DO_Piece, AR_Ref, DL_Qte, DL_PrixUnitaire, LigneType : LIVRAISON/RETOUR pour échanges) | DO_Piece → F_DOCENTETE |
| `F_LIVRAISON` | Livraison physique (LI_Statut DeliveryStatusCodes, LivreurId, Encaisse, MontantEncaisse, RemisAuDepot) | DO_Piece → F_DOCENTETE.DO_Piece |
| `F_LIVRAISON_HISTORIQUE` | Audit log changements de statut | F_LIVRAISON |
| `F_LIVREUR_POSITION` | Dernière position GPS livreur en vie (1 row par livreur) | LivreurId |
| `F_LIVREUR_POSITION_HISTORY` | Historique pings GPS (avec idempotence ActionId) | LivreurId |
| `F_LIVREUR_ACTION_LOG` | Log idempotent des actions livreur (status changes, encaissement, etc.) | LivreurId + ActionId |
| `F_LIVREUR_ABANDON_LOG` | Cas d'abandon d'une livraison | LivreurId + DoPiece |
| `F_RECLAMATION` | Réclamation client OU demande livreur (TypeCas) | ClientUserId + DoPiece |
| `F_RECLAMATION_TENTATIVE` | Tentatives de livraison enregistrées | ReclamationId |
| `F_RECLAMATION_PHOTO` | Photos jointes (Cloudinary) | ReclamationId |
| `F_AVIS_COMMANDE` | Avis client post-livraison (Note 1-5) | DO_Piece + ClientUserId |
| `F_CLIENT_ADDRESS` | Adresses sauvegardées client (max 3) | UtilisateurId |
| `F_CLIENT_DEVICE_TOKEN` | Tokens FCM pour push notifications | UtilisateurId |
| `F_CONFIRMATRICE_SESSION` | Session online d'une confirmatrice (Phase 5) | UtilisateurId + StartedAt |
| `F_APP_CONFIG` | Singleton (Id=1) : PrimaryColor, ThemeMode | — |
| `F_CHATBOT` | Conversations chatbot admin | UserId |
| `F_SMS_LOG` | Historique SMS envoyés | DO_Piece + Trigger |
| `F_TAXE` | Taux TVA Sage | — |
| `B_PAIEMENT` | Paiement Konnect (LocalStatus, PaymentRef, AmountTnd) | DO_Piece |
| `CMS_HOMEPAGE` | Configuration homepage drag-drop (sections JSON) | — |
| `CommandeConfirmationLock` | Verrou EF en transaction sur la transition BC→BL (anti-double-clic) | DO_Piece |

#### Index & contraintes critiques

- `F_RECLAMATION.ClientUserId` indexé (filtre principal client).
- `F_LIVRAISON.LivreurId` indexé.
- `F_LIVRAISON.LI_Statut` indexé (queries pool, mes-livraisons).
- `F_LIVREUR_POSITION_HISTORY.ActionId` UNIQUE (idempotence).
- `B_PAIEMENT.PaymentRef` UNIQUE (idempotence webhook Konnect).
- `F_AVIS_COMMANDE` clé composite `(DO_Piece, ClientUserId)` UNIQUE.

### 4.5 Inventaire des controllers par domaine

#### 4.5.1 Auth & Profile

| Controller | Route | Endpoints |
|---|---|---|
| `AuthController` | `api/auth` | `POST login`, `POST register`, `POST forgot-password`, `POST reset-password`, `GET me`, `PUT me/profile` |
| `ExternalAuthController` | `api/auth/external` | `POST {provider}` (google\|facebook) |

#### 4.5.2 Catalogue & Articles

| Controller | Endpoints clés |
|---|---|
| `ArticlesController` | `GET /api/articles` (filtres complets : search, publishedOnly, catalogueNo, depotNo, minPrice, maxPrice, stockStatus, sortBy/Dir, take/skip), `GET /api/articles/{arRef}`, `GET /api/articles/filter-metadata` (min/max prix + count) |
| `ArticleImagesController` | `GET /api/articles/{arRef}/images`, `POST /api/articles/{arRef}/images` (admin), `POST /api/articles/images/main` (batch main image lookup), `POST /api/admin/articles/{arRef}/images/upload` (Cloudinary), `PUT/DELETE /api/articles/images/{id}` |
| `CataloguesController` | `GET /api/catalogues` (arbre Sage hiérarchique) |
| `SyncArticleController` | `POST /api/sync/articles` (import Sage X3 brut) |

#### 4.5.3 Géographie

| Controller | Endpoints |
|---|---|
| `GeoController` | `GET /api/geo/gouvernorats` (24 gouvernorats Tunisie), `GET /api/geo/gouvernorats/{id}/delegations` |

#### 4.5.4 Stocks & Dépôts

| Controller | Endpoints |
|---|---|
| `StocksController` | `GET /api/stocks?arRef=&deNo=&principalOnly=&take=&skip=`, `GET /api/stocks/{arRef}/{deNo}` |
| `DepotsController` | `GET /api/depots?principalOnly=&search=`, `GET /api/depots/{deNo}` |

#### 4.5.5 Homepage

| Controller | Endpoints |
|---|---|
| `HomepageController` | `GET /api/homepage` (public), `GET /api/admin/homepage` (admin draft view), `GET /api/admin/homepage/preview`, `PUT /api/admin/homepage/draft`, `POST /api/admin/homepage/publish`, `POST /api/admin/homepage/sections/reorder`, `POST/DELETE /api/admin/homepage/images` |

#### 4.5.6 Orders & Checkout

| Controller | Endpoints |
|---|---|
| `OrdersController` | `POST /api/orders` (auth client), `POST /api/orders/guest` (anonymous), `GET /api/orders` (auth, mine), `GET /api/orders/{piece}` |
| `KonnectPaymentsController` | `POST /api/payments/konnect/initiate` (auth), `POST /api/payments/konnect/initiate/guest`, `GET /api/payments/konnect/webhook?payment_ref=` (callback Konnect), `GET /api/payments/konnect/status?piece=&paymentRef=&refresh=` |

#### 4.5.7 Vendeur

| Controller | Endpoints |
|---|---|
| `VendeurController` (legacy) ou regroupé sous `Vendeur/` | `GET /api/vendeur/context`, `GET /api/vendeur/clients?search=`, `GET /api/vendeur/orders`, `GET /api/vendeur/orders/{piece}`, `POST /api/vendeur/orders` |

#### 4.5.8 Client (espace authentifié)

| Controller | Endpoints |
|---|---|
| `ClientAddressesController` | CRUD `/api/client/addresses` (max 3 par client) + `PUT .../set-default` |
| `ClientContactPrefsController` | `GET/PUT /api/client/contact-prefs` (Both / AppelOnly / SmsOnly) |
| `ClientLoyaltyController` | `GET /api/client/loyalty` → `{ tier, deliveriesCount, nextTier, deliveriesUntilNextTier, currentBenefit, deliveryPriceTnd }`. Paliers Bronze 1-9 (8 TND), Argent 10-24 (7.2 TND), Or 25+ (6 TND) |
| `ClientPushController` | `POST /api/client/push/register-token` (FCM) |
| `ClientTrackingStateController` | `GET /api/client/orders/{piece}/tracking-state` (état temps réel pour banner tracking) |
| `ClientDemandesController` | `GET /api/demandes/mine`, `GET /api/demandes/{id}`, `POST /api/demandes/{id}/reply` (avec newAddress/lat/lng OU newPhone) |

#### 4.5.9 Confirmateur

| Controller | Endpoints |
|---|---|
| `ConfirmateurController` | `GET /api/confirmateur/commandes?statut=`, `GET /api/confirmateur/commandes/{piece}`, `PUT /api/confirmateur/commandes/{piece}/status` (0-3), `PUT .../status-extended` (CONFIRME/TENTATIVE/REFUSE/REPORTE/...), `POST .../transform-to-bl` (BC→BL+Sage POST) |
| `ConfirmateurReclamationsController` | Liste, filtres (tab : a-traiter/en-attente/historique), prise en charge, échange multi-lignes, refus, clôture, application correction client, change-commande-status, note interne, photos, depot-damaged decide+stock-check |
| `ConfirmatriceOrderHistoryController` | `GET /api/confirmatrice/orders/{piece}/history` (timeline événements, accessible ADMIN+CONFIRMATEUR) |
| `ConfirmatriceClientHistoryController` | `GET /api/confirmatrice/clients/{userId}/orders` (BottomSheet historique client) |
| `ConfirmatriceTentativesController` | Listage tentatives livraison pour debug confirmatrice |
| `ConfirmatriceStatusController` | `GET /api/confirmateur/status/me`, `POST .../pause`, `POST .../resume`, `GET .../me/stats` |

#### 4.5.10 Livreur

| Controller | Endpoints |
|---|---|
| `LivreurController` | `PUT /api/livreur/orders/{piece}/status` (Livré/Reporté/Retourné/Dépôt + motif + note + replannedAt), `PUT /api/livreur/orders/batch-status`, `GET /api/livreur/orders/{piece}/full-details` (avec historique) |
| `LivreurPoolController` | `GET /api/livreur/pool/disponibles` (BL en attente d'affectation), `GET /api/livreur/pool/{piece}/detail`, `POST .../prendre`, `POST .../abandon`, `GET /api/livreur/pool/mes-livraisons` |
| `LivreurActiveDeliveryController` | `POST /api/livreur/orders/{piece}/start-heading`, `POST .../stop-heading`, `POST /api/livreur/location/ping`, `POST /api/livreur/location/ping-batch` (offline queue) |
| `LivreurStatsController` | `GET /api/livreur/stats?period=today\|yesterday\|week\|month` ou `?date=YYYY-MM-DD`, `POST /api/livreur/cashbox/remettre`, `POST /api/livreur/orders/{piece}/encaisser` |
| `LivreurMapController` | Routes liées map (heatmap, optimisation tournée) |
| `LivreurReclamationsController` | `POST /api/livreur/reclamations/attempt` (3 tentatives → escalade), `GET .../commandes/{piece}/escalation-status`, `POST .../delivered` |
| `LivreurDemandesController` (si présent) | Demandes côté livreur |

#### 4.5.11 Réclamations (Client)

| Controller | Endpoints |
|---|---|
| `ReclamationsController` | `GET /api/reclamations/mine`, `GET /api/reclamations/{id}`, `POST /api/reclamations` (CreateReclamationRequestDto + motifs ClientMotifs), `POST /api/reclamations/{id}/photos`, `GET /api/reclamations/{id}/repeat-order`, `POST /api/reclamations/{id}/demande-echange` |

#### 4.5.12 Admin

| Controller | Endpoints clés |
|---|---|
| `AdminUsersController` | CRUD `/api/admin/users` + `/api/admin/users/{id}/roles` (assign/revoke) + `/profile` |
| `AdminBackofficeController` | `/api/admin/personnel`, `/api/admin/clients`, `/api/admin/clients/{userId}`, `/api/admin/clients/{userId}/orders`, `/api/admin/legacy/orders` |
| `AdminOrdersController` | `GET /api/admin/orders?period=&status=&pageSize=`, `GET /api/admin/orders/{piece}` (entête + lignes + livraison + réclamations + historique) |
| `AdminDashboardController` | `GET /api/admin/dashboard/overview` |
| `AdminDriversController` | `GET /api/admin/drivers`, `GET /api/admin/drivers/{userId}` |
| `AdminConfirmatricesController` | `GET /api/admin/confirmatrices`, `GET .../{userId}` |
| `AdminConfirmatricesWorkStatsController` | Stats temps de pause par confirmatrice |
| `AdminClaimsController` | `GET /api/admin/claims/overview` (KPIs cohérents : total = somme statuts RECLAMATION) |
| `AdminProductsController` | `GET /api/admin/products/overview?period=&topN=` (top revenue / quantity / returns) |
| `AdminSummaryController` | Cards résumé global homepage admin |
| `AdminThemeController` | `GET/PUT /api/admin/theme` (PrimaryColor + ThemeMode via F_APP_CONFIG) + broadcast SignalR ThemeChanged |
| `AdminChatController` | `POST /api/admin/chat/ask` (LLM Groq + DSL + analytics + ML.NET) |
| `AdminDevController` | `POST /api/admin/dev/seed-clean-demo` (reset + 5 users + 4 commandes BL00001-04 — env démo) |

#### 4.5.13 Dashboard (cross-rôles)

| Endpoint | Rôles autorisés |
|---|---|
| `GET /api/dashboard/overview` | ADMIN, VENDEUR, CONFIRMATEUR |
| `GET /api/dashboard/sales` | ADMIN, VENDEUR |
| `GET /api/dashboard/logistics` | ADMIN, CONFIRMATEUR, LIVREUR |
| `GET /api/dashboard/confirmateur` | ADMIN, CONFIRMATEUR |
| `GET /api/dashboard/admin-sync` | ADMIN |
| `GET /api/dashboard/strategic-insights` | ADMIN |

#### 4.5.14 Sync & autres

| Controller | Endpoints |
|---|---|
| `SyncAllController` | `POST /api/sync/articles`, `/catalogues`, `/depots`, `/stocks`, `/SyncAll` (orchestrateur), `GET /api/SyncAll/status` |
| `HealthController` | `GET /api/health` (liveness probe) |
| `PublicTrackingController` | `GET /api/track/{piece}` (public, anonymous — suivi par référence) |
| `TestController` | endpoints de dev |
| `BonLivraisonsController` | Listing F_DOCENTETE BL natifs |
| `DocEntetesController` / `DocLignesController` | Bruts EF Core, usage admin/debug |

### 4.6 Services métier

Les services sont dans `Services/`, organisés en sous-dossiers. Les plus critiques :

#### `BonCommandeService` (création commande)
- `CreateForAuthenticatedClientAsync(userId, dto, ct)` : valide stock, calcule TTC/HT/timbre/livraison, persiste F_DOCENTETE + F_DOCLIGNE.
- `CreateForGuestAsync(dto, ct)` : crée un client "passager" si nouveau (CodeClientSage généré), puis commande.
- `CreateForVendeurAsync(vendeurId, dto, ct)` : permet au vendeur de choisir un client existant ou de créer un nouveau (B2B/B2C).

#### `BcToBlService` (transformation BC → BL)
- `TransformAsync(piece, actorUserId, ct)` exécute en **transaction serializable** :
  1. Verrou `CommandeConfirmationLock` (UPSERT) pour empêcher double-clic.
  2. Charge le BC (F_DOCENTETE DO_Type=0 DO_Valide=0).
  3. Décrémente stocks (F_ARTSTOCK.AS_QteSto -= DL_Qte).
  4. Crée le BL (nouveau F_DOCENTETE DO_Type=1).
  5. Crée la F_LIVRAISON (LI_Statut=0 CONFIRME).
  6. Optionnellement push vers Sage X3 via `SageService.PostDocEnteteAsync` (si `Sage:PostBlEnabled=true`).
  7. Retourne le BL piece généré.

#### `ReclamationsService` (cœur réclamations & demandes)
~2200 lignes. Méthodes clés :
- `GetMineAsync`, `GetForStaffAsync`, `GetForStaffByTabAsync` (tabs a-traiter/en-attente/historique)
- `CreateClientReclamationAsync` (validations : photo obligatoire pour COLIS_ENDOMMAGE/COLIS_NON_CORRESPONDANT, correction proposée pour CHANGEMENT_ADRESSE/CHANGEMENT_NUMERO)
- `CreateLivreurDemandeAsync` (auto-escalade après 3 tentatives pour motifs différés)
- `TakeOverAsync`, `ApplyCorrectionAsync`, `RepriseAsync`, `UpdateStatusAsync`, `UpdateNoteAsync`, `AssignAsync`, `AddPhotoAsync`
- `RequestEchangeAsync`, `CreateEchangeCommandeAsync` (multi-lignes RETOUR+LIVRAISON, nouveau F_DOCENTETE TypeCommande=ECHANGE)
- `DecideDepotDamagedAsync` (motif livreur COLIS_ENDOMMAGE_DEPOT : check stock → ÉCHANGE si dispo, sinon RETOUR_APPEL)
- `CheckStockForReclamationAsync` (agrège F_ARTSTOCK pour vérifier dispo)
- `ReplyToDemandeAsync` (réponse client à une demande adresse/téléphone — stocke correction JSON)
- `BroadcastDemandeStatusChangedAsync` (SignalR push aux confirmatrices)
- `ReleaseActiveCasesForUserAsync` (libère les cas si une confirmatrice se déconnecte > 5s)
- `ParseCorrectionFlags(json)` : extrait `hasAddressChange` + `hasPhoneChange` pour badges UI

#### `DashboardAggregationService`
- 6 méthodes : `GetOverviewAsync`, `GetSalesAsync`, `GetLogisticsAsync`, `GetConfirmateurAsync`, `GetAdminSyncAsync`, `GetStrategicInsightsAsync`
- Chacune retourne un DTO dédié avec KPIs + breakdowns + séries temporelles

#### `SageService`
- `HttpClient` configuré via `IOptions<SageOptions>`. URL : `Sage:BaseUrl` (ex. `http://192.168.100.19/WEB_API_STAGE_X3/`).
- Méthodes : `GetArticlesAsync`, `GetCataloguesAsync`, `GetDepotsAsync`, `GetStocksAsync`, `PostDocEnteteAsync` (push BL avec lignes), `TestConnectionAsync`.
- Auth : Basic Auth optionnel (`Sage:Username`, `Sage:Password`) si `Sage:HasBasicAuth=true`.
- Handler accepte les certificats invalides (`DangerousAcceptAnyServerCertificateValidator`) — **acceptable en dev, à durcir en prod**.

#### `Services/Admin/Chat/*` (chatbot LLM)
- `AdminChatOrchestratorService` orchestre les 3 couches :
  1. **Query** (DSL universel) : analyse l'intention, extrait les filtres → `AdminChatQueryService`.
  2. **Analyze** (analytics) : calcule métriques, comparaisons → `AdminChatAnalyzeService`.
  3. **Predict** (ML.NET) : risque retour client, forecast volume → `PredictionService`.
- `GroqClient` : appelle l'API Groq (Llama 3.3 70B) avec une system prompt construite à partir de `KbProvider` (base de connaissances générée).
- `KbGeneratorService` génère `wwwroot/kb/kb_auto_generated.md` au startup avec les motifs, statuts, mappings.

#### `Services/Livreur/*`
- `LivreurActiveDeliveryService` : start/stop heading, gestion `IsActiveDelivery` flag.
- `LivreurEscalationService` : compte tentatives, déclenche escalade après seuil 3.
- `LivreurLocationService` : ingestion pings GPS (idempotent via `ActionId`), upsert `F_LIVREUR_POSITION`, append `F_LIVREUR_POSITION_HISTORY`.

#### `Services/Payments/KonnectPaymentService`
- `InitiateForAuthenticatedClientAsync` : crée `B_PAIEMENT` local + appelle `IKonnectClient.InitiateAsync` → retourne `payUrl` + `paymentRef`.
- `HandleWebhookAsync(paymentRef)` : appelle Konnect `GET /payments/{ref}` → met à jour `B_PAIEMENT.LocalStatus` (PENDING/PAID/FAILED/CANCELLED) → idempotent (skip si déjà final).
- `GetPublicStatusAsync(piece, paymentRef, refresh)` : retourne le statut courant pour la page de retour côté frontend.

### 4.7 SignalR (`ReclamationHub`)

**Endpoint** : `/hubs/reclamations`. Auth JWT requis (rôle CONFIRMATEUR ou ADMIN).

**Events broadcastés** (`Hubs/ReclamationEvents.cs`) :
- `ReclamationCree` (nouvelle réclamation/demande)
- `ReclamationStatutChange`
- `ReclamationAssignee`
- `ReclamationLibere`
- `ClientARepondu` (notif spécifique à la confirmatrice assignée)
- `CommandeAttribuee` (push direct sur affectation BL)
- `ThemeChanged` (broadcast sur changement thème app — 4 rôles écoutent)

**Logique session (Phase 5)** :
- `OnConnectedAsync` : crée `F_CONFIRMATRICE_SESSION` (UtilisateurId, ConnectionId, StartedAt). Ajoute aux groupes (`role:CONFIRMATEUR`, `user:{id}`).
- `OnDisconnectedAsync` : attente 5 secondes (grace period Wi-Fi flaky), puis si toujours déconnecté → ferme la session + libère les cas pris en charge (`ReleaseActiveCasesForUserAsync`).
- `_activeConnections` (`ConcurrentDictionary<Guid, int>`) tracke le nombre de tabs ouvertes par user (multi-fenêtre) — décrémente sur chaque disconnect, libère seulement quand 0.

### 4.8 Tâches planifiées (Hangfire)

Dashboard accessible sur `/hangfire` (rôle ADMIN via `HangfireAdminAuthFilter`).

**Jobs récurrents** :
- `DepotIncrementJob` (CRON `0 0 * * *` Africa/Tunis) : pour chaque livraison `LI_Statut=REPORTE` non encore au dépôt, incrémente `DepotPassageNumber` et passe à `LI_Statut=DEPOT`. Permet le filtrage "Reporté → Au dépôt" côté livreur le lendemain.
- `ProactiveInsightsJob` (CRON `0 2 * * *`) : recalcule les KPIs admin "insights stratégiques" (cluster clients à risque, articles en retour fréquent, etc.). Stocké dans cache mémoire.
- `ReclamationRedistributionHostedService` : long-running, vérifie périodiquement les cas non pris en charge depuis > X minutes et les réassigne.

### 4.9 Intégrations externes

#### Sage X3
- URL : `Sage:BaseUrl`
- Endpoints consommés : articles, catalogues, dépôts, stocks, POST entête (BL)
- Wrapper Sage côté ERP attendu : `WEB_API_STAGE_X3` (folder ERP standard)

#### Konnect (paiement Tunisie)
- 3 modes : `Mock` (dev), `Sandbox` (preprod), `Production`.
- Méthodes acceptées : `wallet`, `bank_card`, `e-DINAR`.
- Devise : `TND`, lifespan 30 min.
- Webhook : `GET /api/payments/konnect/webhook?payment_ref={ref}` (Konnect appelle ce endpoint à chaque transition).
- URL de retour configurée via `Konnect:FrontendBaseUrl` (React `KonnectReturnPage` lit `?status=success|fail&piece=...`).

#### Cloudinary
- Upload images articles + photos réclamations.
- Service : `Services/Images/CloudinaryUploader.cs` (configuré via `Cloudinary:CloudName/ApiKey/ApiSecret`).
- Réponse stockée comme URL absolue dans `F_ARTICLE_IMAGE.Url` ou `F_RECLAMATION_PHOTO.Url`.

#### OAuth Google + Facebook
- Configurés dans `appsettings.ExternalAuth.Google.ClientId/ClientSecret` et `Facebook.AppId/AppSecret`.
- Flow : le frontend obtient un id_token / access_token Google/Facebook → POST `/api/auth/external/{provider}` → backend vérifie le token + crée/login le user.

#### SMS (Tunisie Telecom)
- Interface `ISmsGateway`.
- 2 implémentations : `MockSmsGateway` (logge en console, dev), `TunisieTelecomSmsGateway` (HTTP API TT).
- Triggers : `SmsTrigger.Livre` (confirmation livraison), `SmsTrigger.Reporte`, etc.
- Logs persistés dans `F_SMS_LOG`.

#### Groq LLM (Chatbot admin)
- Modèle : `llama-3.3-70b-versatile`.
- API : `https://api.groq.com/openai/v1` (OpenAI-compatible).
- Clé : `Groq:ApiKey`.
- Streaming non utilisé — réponse complète attendue (latence ~1-3s).
- System prompt construite avec `KbProvider.GetKnowledgeBase()` (motifs, statuts, mappings).

### 4.10 Middleware transverses

1. **GlobalExceptionMiddleware** : catch toute exception non gérée → réponse JSON `{ message, traceId }` + code HTTP approprié. Logué avec stack trace.
2. **IdempotencyMiddleware** : sur les POST sensibles, lit l'en-tête `X-Idempotency-Key`, vérifie en cache (mémoire ou DB), retourne la réponse précédente si déjà traité. Utilisé pour : encaissement, prise BL, ping GPS batch.
3. **ConfirmatriceActivityMiddleware** : sur toutes les requêtes auth d'une confirmatrice, met à jour `LastActivityAt` (throttle 60s pour éviter les writes excessifs).

### 4.11 DTOs & contrats JSON

Organisés dans `DTO/` (71 DTOs au total) avec sous-dossiers miroirs des controllers : `Auth/`, `Orders/`, `Vendeur/`, `Konnect/`, `Reclamations/`, `Confirmateur/`, `Livreur/`, `Admin/`, `Dashboard/`, etc.

**Conventions** :
- Serialization camelCase (par défaut ASP.NET Core 8 avec System.Text.Json).
- `[Required]`, `[MaxLength]`, `[EmailAddress]` validation attributes.
- Nullable reference types activé — `?` explicite quand optionnel.
- `[JsonPropertyName("custom")]` rare, utilisé uniquement pour matcher les noms Konnect (snake_case ou camelCase strict).

**Exemples critiques** :

```csharp
// Création commande client
public class CreateBonCommandeRequestDto
{
    public int? DepotNo { get; set; }              // null si HOME, requis si PICKUP
    public string? DeliveryType { get; set; }      // "HOME" | "PICKUP"
    public string? PaymentMethod { get; set; }     // "COD" | "KONNECT_WALLET" | ...
    public string? Address { get; set; }
    public string? City { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public List<CreateBonCommandeLineRequestDto> Lines { get; set; } = new();
}

// Konnect initiate response
public class KonnectInitiatePaymentResponseDto
{
    public Guid LocalPaymentId { get; set; }
    public string Piece { get; set; } = "";
    public string Provider { get; set; } = "KONNECT";
    public string PaymentRef { get; set; } = "";
    public string PayUrl { get; set; } = "";        // ← URL de redirection
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TND";
    public string LocalStatusCode { get; set; } = "PENDING";
    public bool IsSandbox { get; set; }
    public bool IsMock { get; set; }
}
```

### 4.12 Migrations & schéma DB

EF Core code-first. 71 migrations dans `Migrations/`. Stratégie :
- Une migration par feature ou évolution de schéma (ex: `MergeKonnectVendeur`, `AddLivreurCashboxAndActionLog`, `ConfirmatriceSession`).
- Pas d'utilisation de SQL brut pour les migrations, sauf cas exceptionnel (`SeedAppConfigAsync` utilise `SET IDENTITY_INSERT` pour le singleton Id=1).
- Appliquées au démarrage si `appsettings.AutoMigrateOnStartup=true` (sinon `dotnet ef database update`).

**Migrations remarquables** :
- `20260505232823_MergeKonnectVendeur` : fusion historique des features Konnect+Vendeur de v2 vers v1.
- `20260509100000_AddLivreurCashboxAndActionLog` : ajout colonnes `Encaisse`, `EncaisseAt`, `MontantEncaisse`, `RemisAuDepot`, `RemisAuDepotAt` à `F_LIVRAISON` + table `F_LIVREUR_ACTION_LOG`.
- `20260509110000_AddRefonteTablesSections345` : ajout `F_CLIENT_ADDRESS`, `F_CLIENT_DEVICE_TOKEN`, `F_CONFIRMATRICE_SESSION`.
- `20260512004458_ConfirmatriceSession` : finalisation tracking sessions confirmatrice.

---

## 5. Application React (e-commerce + back-office web)

### 5.1 Structure & arborescence

```
React-Ecommerce/
├── package.json                  ← React 19, Vite 7, TS 5, Tailwind 4
├── vite.config.ts
├── tsconfig.json
├── .env.local                    ← VITE_API_BASE_URL=http://localhost:5123
├── index.html
└── src/
    ├── main.tsx                  ← entry point, ReactDOM.createRoot
    ├── app/
    │   ├── App.tsx               ← QueryProvider + ToastProvider + AuthBootstrapper + ThemeBootstrapper + CursorEffect + RouterProvider
    │   ├── routes.tsx            ← createBrowserRouter avec toutes les routes
    │   ├── providers/
    │   │   ├── QueryProvider.tsx (TanStack React Query)
    │   │   └── RouterProvider.tsx
    │   └── guards/
    │       ├── ProtectedRoute.tsx (auth required)
    │       ├── RoleRoute.tsx (rôles autorisés)
    │       └── PublicShopRoute.tsx (boutique publique pour visiteurs)
    ├── core/
    │   ├── config/env.ts         ← apiBaseUrl + apiOrigin
    │   └── http/
    │       ├── axiosClient.ts    ← interceptors auth (token injection) + 401 redirect login
    │       └── endpoints.ts      ← centralisation des URLs API
    ├── features/                 ← organisation par domaine (feature-slice)
    │   ├── auth/                 ← login, register, forgot-password, reset-password, profile
    │   ├── catalog/              ← articles list, article detail, filters
    │   ├── cart/                 ← panier (state local + persistance)
    │   ├── checkout/             ← auth checkout, guest checkout, success page
    │   ├── compare/              ← comparateur d'articles
    │   ├── orders/               ← liste + détail commandes (client)
    │   ├── bl/                   ← bons de livraison (vendeur/confirmateur)
    │   ├── confirmateur/         ← écrans confirmateur côté web
    │   ├── homepage/             ← homepage publique + admin builder
    │   ├── payments/             ← Konnect return page
    │   ├── static/               ← pages CMS (about, contact, privacy, terms)
    │   ├── admin/                ← back-office admin
    │   ├── adminArticles/        ← gestion articles + images Cloudinary
    │   ├── adminUsers/           ← gestion users + rôles
    │   ├── vendeur/              ← espace vendeur (catalogue + cart + checkout B2B/B2C)
    │   ├── dashboard/            ← dashboards admin (overview/sales/logistics/etc.)
    │   └── geo/                  ← sélecteurs gouvernorat/délégation
    └── shared/
        ├── components/
        │   ├── premium/          ← KIT PREMIUM (cf §5.6) — 20+ composants
        │   ├── Button.tsx (legacy)
        │   └── …
        ├── layouts/
        │   └── MainLayout.tsx    ← shell : Navbar + main (PageTransition wrap) + Footer
        ├── pages/
        │   └── RouteErrorPage.tsx
        ├── store/                ← Zustand stores (auth, cart, layout, theme)
        └── utils/
```

Chaque feature suit la structure :
```
features/<domain>/
├── api/<domain>Api.ts            ← appels axios + buildApiError
├── components/                   ← composants spécifiques au domaine
├── hooks/                        ← hooks React Query (useQuery / useMutation)
├── pages/                        ← pages mappées aux routes
└── types.ts                      ← types TypeScript locaux
```

### 5.2 Routing & guards

`createBrowserRouter` central dans `src/app/routes.tsx`. Toutes les routes héritent de `MainLayout` (Navbar + Outlet + Footer).

**Hiérarchie typique** :
```
/                            (HomepagePage)
/articles                    (ArticlesPage)
/articles/:arRef             (ArticleDetailsPage)
/cart                        (CartPage)
/compare                     (ComparePage)

/checkout/start              (CheckoutEntryPage)
/checkout/guest              (GuestCheckoutPage)
/checkout/guest/success      (GuestCheckoutSuccessPage)         ← Confetti
/checkout                    (CheckoutPage, ProtectedRoute)
/payments/konnect/return     (KonnectReturnPage)

/orders                      (OrdersPage, ProtectedRoute)
/orders/:piece               (OrderDetailsPage)

/auth/login                  (LoginPage)
/auth/register               (RegisterPage)
/auth/forgot-password
/auth/reset-password
/profile                     (ProfilePage, ProtectedRoute)

/about, /contact, /privacy, /terms (Static pages)

/admin/dashboard             (AdminDashboardPage, RoleRoute admin)
/admin/dashboard/overview, /sales, /logistics, /admin-sync, /strategic-insights, /confirmateur
/admin/users
/admin/personnel
/admin/clients
/admin/orders
/admin/stock, /depots
/admin/articles, /admin/articles/:arRef/images
/admin/sync
/admin/homepage              (AdminHomepagePage, drag-drop builder)

/confirmateur/commandes      (ConfirmateurOrdersPage, RoleRoute confirmateur)
/confirmateur/commandes/:piece
/confirmateur/bl
/confirmateur/bl/:piece

/vendeur/articles, /cart, /checkout, /orders, /orders/:piece (RoleRoute vendeur)
```

**Guards** :
- `ProtectedRoute` : vérifie présence d'un token via `useAuthStore`. Sinon → `/auth/login?redirect=...`.
- `RoleRoute({ roles: ["ADMIN"] })` : protected + vérifie rôle dans `session.roles`. Sinon → page 403 ou redirection.
- `PublicShopRoute` : permet l'accès non-auth aux pages catalogue/cart/checkout-guest.

### 5.3 State management (Zustand + React Query)

#### Zustand stores (`shared/store/`)
- `authStore` : `{ session: AuthSession | null, token: string | null, setSession, clear, hasRole }`
- `cartStore` : `{ items: CartItem[], add, remove, clear, totalAmount, totalQty }` + persistance localStorage
- `layoutStore` : `{ themeMode: "light"|"dark", sidebarOpen, setTheme, toggleSidebar }`

#### React Query (TanStack)
- Cache HTTP centralisé. Patterns :
  - `useArticles({ filters })` : `useQuery(["articles", filters], () => getArticles(filters))`.
  - `useOrders()` : pareil.
  - `useCheckoutMutation()` : `useMutation(createOrder, { onSuccess: () => toast.success(...) })`.
- Stale time : par défaut 0 (refetch on focus), 30s sur listes statiques.

### 5.4 Couche HTTP & endpoints

#### `core/http/axiosClient.ts`
```ts
const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,       // http://localhost:5123 (dev)
  withCredentials: false,
});

// Inject JWT
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → logout + redirect
axiosClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clear();
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  },
);
```

#### `core/http/endpoints.ts`
Centralise toutes les URLs API (40+ endpoints). Permet refactor URL en un seul fichier.

### 5.5 Features / pages détaillées

#### 5.5.1 Auth (`features/auth`)
- **LoginPage** : formulaire email/password, OAuth Google + Facebook (boutons), redirige selon `?redirect=` après login.
- **RegisterPage** : long formulaire (typeProfil, typeClient, adresse complète Tunisie via sélecteurs `geoApi`). Validation TunisianPhone.
- **ForgotPasswordPage** + **ResetPasswordPage** (avec token URL).
- **ProfilePage** : édition profil + adresses (3 max) + contact prefs + (si VENDEUR) accès context vendeur.

#### 5.5.2 Catalog (`features/catalog`)
- **ArticlesPage** : filtres dynamiques (catalogue tree dropdown, prix slider via `filter-metadata`, dépôt, recherche debounce 300ms, sort), pagination (24 par page), grille responsive.
- **ArticleDetailsPage** : galerie images Cloudinary, infos prix HT/TTC, stock par dépôt, articles liés (par famille), bouton "ajouter au panier" avec quantité.

#### 5.5.3 Cart & Checkout
- **CartPage** : liste des items locaux (Zustand persistant), modification quantités, lien vers checkout.
- **CheckoutEntryPage** : choix entre "auth checkout" et "guest checkout".
- **CheckoutPage** (auth) : formulaire adresse + dépôt + mode paiement (COD / Konnect), récap, validation. Si Konnect → redirection vers `payUrl`.
- **GuestCheckoutPage** : formulaire complet client passager (auto-création profil B2C ou B2B).
- **GuestCheckoutSuccessPage** : confetti 🎉, ref BC affichée, CTAs retour catalogue / refaire commande.

#### 5.5.4 Orders
- **OrdersPage** : liste des commandes du client connecté, filtres statut, tri date.
- **OrderDetailsPage** : entête + lignes + livraison (statut + livreur + dates) + bouton réclamation.

#### 5.5.5 Vendeur
- **VendeurArticlesPage** : catalogue avec ajout panier B2B (prix peut différer selon client).
- **VendeurCartPage** + **VendeurCheckoutPage** : avec sélection client (existant via `/api/vendeur/clients` ou création).
- **VendeurOrdersPage** + **VendeurOrderDetailsPage** : suivi des commandes saisies par ce vendeur.

#### 5.5.6 Confirmateur (web light, en complément du Flutter)
- **ConfirmateurOrdersPage** : liste BC EN_ATTENTE.
- **ConfirmateurOrderDetailsPage** : actions (Confirmer→BL, Refuser, Tentative).
- **ConfirmateurBlPage** + **ConfirmateurBlDetailsPage** : BL générés.

#### 5.5.7 Admin
- **AdminUsersPage** : CRUD users + assign rôles.
- **AdminPersonnelPage** : liste personnel (VENDEUR/CONFIRMATEUR/LIVREUR/ADMIN).
- **AdminClientsPage** : liste clients + détail + commandes par client.
- **AdminOrdersPage** : toutes les commandes admin avec filtres.
- **AdminStockPage** + **AdminDepotsPage**.
- **AdminArticlesPage** : éditeur articles + images.
- **AdminArticleImagesPage** : upload Cloudinary, set as main, reorder.
- **AdminSyncPage** : lance les syncs Sage (articles, catalogues, stocks, dépôts).
- **AdminHomepagePage** : builder drag-drop des sections homepage (sliders, banners, featured).

#### 5.5.8 Dashboards Admin (6 pages)
- **AdminOverviewDashboardPage** : KPIs globaux multi-rôles.
- **AdminSalesDashboardPage** : CA, top produits, top vendeurs.
- **AdminLogisticsDashboardPage** : KPIs livreurs, dépôts, taux livraison.
- **AdminConfirmateurDashboardPage** : KPIs confirmateurs, temps moyen traitement, taux refus.
- **AdminAdminSyncDashboardPage** : santé syncs Sage.
- **AdminStrategicInsightsDashboardPage** : insights ML (cluster clients, articles risqués).

#### 5.5.9 Konnect Return
- **KonnectReturnPage** : lit `?status=success|fail&piece=&paymentRef=` de l'URL, appelle `/api/payments/konnect/status` pour confirmer, affiche message + CTAs. Confetti si success.

### 5.6 Kit premium (composants partagés)

`src/shared/components/premium/` (20+ composants exposés via `index.ts`) :

| Composant | Rôle |
|---|---|
| `StatusPill` | Badge statut coloré selon `statusPalette` |
| `PremiumHero` | Hero gradient + kicker + titre + description + actions |
| `PremiumCard` | Card avec ombre + radius + variants |
| `SectionHeader` | Header de section avec icône + titre |
| `EmptyView` | État vide premium avec illustration + CTA |
| `Skeleton` / `SkeletonLines` | Placeholders chargement (shimmer animation) |
| `AnimatedEntry` / `StaggeredColumn` | Animation d'apparition séquentielle |
| `FloatingOrbs` | Orbes flottantes décoratives en arrière-plan |
| `AnimatedCounter` | Compteur animé qui s'incrémente jusqu'à la valeur cible |
| `GradientText` | Texte avec gradient |
| `TiltCard` | Card 3D qui suit le curseur (effet Linear/Stripe) |
| `ScrollReveal` | Apparition au scroll (IntersectionObserver) |
| `AnimatedProgress` | Progress bar avec animation |
| **Nouveaux 2026-05-13 (refonte large)** | |
| `PremiumButton` | 5 variants × 3 tailles, ripple, magnetic, glow |
| `Toast` (`ToastProvider` + `useToast`) | Notifications animées slide-in droite |
| `PageTransition` | Wrapper transitions de routes |
| `PremiumModal` | Modal blur backdrop + scale-in |
| `Confetti` | Particules colorées CSS pure |
| `CursorEffect` | Cursor dot + ring avec lag |
| `ParallaxHero` | Hero avec parallax scroll + gradient animé |
| `ThemeSwitcherPremium` | Toggle light/dark/auto avec morph sun↔moon |

#### Animations CSS (dans `src/styles/globals.css`)
- `premium-btn-glow-anim` : halo pulse
- `premium-ripple-anim` : onde au clic
- `premium-toast-in-anim` : slide-in droite
- `premium-backdrop-in-anim` + `premium-modal-in-anim` : blur + scale modal
- `premium-confetti-anim` : chute particules avec sway
- `premium-page-transition` : fade + slide léger
- `premium-cursor-dot` / `premium-cursor-ring` : pointer custom
- `premium-hero-gradient-shift` : gradient hero animé
- `premium-glass-nav` : glassmorphism backdrop-filter
- `premium-glow-cta::before` : halo gradient animé sur CTAs
- `premium-shimmer-anim` : skeleton shimmer enhanced
- `premium-theme-switcher` : morph sun↔moon

### 5.7 Authentification & rôles

`useAuthBootstrap` (hook dans `features/auth/hooks`) :
- Au mount initial : lit le token depuis localStorage → appelle `GET /api/auth/me` → stocke `session` (roles, profile) dans Zustand.
- Si 401 → clear store.

`useAuthStore.hasRole("ADMIN")` est utilisé par `RoleRoute` et par les conditionals dans Navbar/Footer pour afficher/cacher des liens.

### 5.8 Build & déploiement

- `npm run dev` → Vite dev server sur `http://localhost:5173`.
- `npm run build` → tsc + vite build → `dist/` (assets minifiés + index.html).
- `npm run preview` → preview du build local.
- Production : déployer `dist/` sur n'importe quel static host (Nginx, IIS, S3+CloudFront, Cloudflare Pages).
- `.env.production` : `VITE_API_BASE_URL=https://api.your-domain.com` à définir avant le build.

---

## 6. Application Flutter (multi-rôles)

### 6.1 Architecture en couches

```
flutter/lib/
├── main.dart                     ← entry, MultiProvider racine, _Root mounte un shell différent par rôle
├── core/
│   ├── api_client.dart           ← ApiClient (Dio-like) avec injection JWT
│   ├── constants.dart            ← apiBaseUrl, Statut enum, palettes
│   ├── mapbox_routing_service.dart
│   ├── premium_routing.dart      ← optimiseur tournée multi-facteurs
│   ├── notification_service.dart ← singleton flutter_local_notifications
│   ├── token_store.dart          ← flutter_secure_storage wrapper
│   └── theme/                    ← AppTheme + tokens
├── data/
│   ├── repositories/             ← interfaces + impl API/Mock (deliveries)
│   └── services/                 ← services HTTP par domaine (32 fichiers)
├── models/                       ← classes Dart fromMap/toMap
├── state/                        ← ChangeNotifierProviders (auth, deliveries, customer orders, confirmatrice orders, claims, navigation, etc.)
├── ui/
│   ├── widgets/                  ← composants partagés
│   │   ├── premium/              ← kit visuel (animated_entry, status_pill, etc.)
│   │   ├── claims/
│   │   ├── confirmatrice/
│   │   ├── map/                  ← NavigationControls, RoutePremiumPanel, RouteReorderSheet
│   │   ├── orders/
│   │   ├── premium/              ← mapbox_static_preview, etc.
│   │   └── states/               ← AppLoadingState, AppEmptyState
│   └── screens/                  ← écrans full-page
│       ├── splash_screen.dart
│       ├── login_screen.dart
│       ├── onboarding_screen.dart
│       ├── map_screen.dart       ← map livreur Google Maps + bouton "Arrêté ici"
│       ├── order_history_screen.dart  ← timeline réutilisable (4 rôles)
│       ├── client/               ← écrans client (customer_home, customer_orders, etc.)
│       ├── confirmatrice/        ← écrans confirmatrice
│       ├── livreur/              ← écrans livreur (my_orders, new_orders, delivery_details)
│       ├── admin/                ← écrans admin (KPI drill-down, etc.)
│       └── …
└── ui/admin/                     ← sous-arbre admin avec ses propres widgets/screens
```

### 6.2 Shell par rôle (`main.dart`)

Après splash + onboarding, `_Root` lit `AuthProvider.session.roles` et mounte un sous-arbre complet :

| Rôle | Shell mounté | Providers scopés (créés ici) |
|---|---|---|
| LIVREUR / ADMIN | `Home` (driver app) | `DeliveriesProvider`, `LivreurStatsProvider`, `NavigationProvider` |
| CONFIRMATEUR | `ConfirmatriceHome` | `ConfirmatriceOrdersProvider`, `ConfirmatriceClaimsProvider` |
| CLIENT | `CustomerHome` | `CustomerOrdersProvider`, `ClientClaimsProvider`, `ClientClaimChatProvider` |
| Sinon | `_UnsupportedRoleScreen` | — |

Les providers app-wide (`AppNavProvider`, `ThemeProvider`, `AuthProvider`, `NavigationProvider`, `DashboardProvider`) sont déclarés au root.

`AuthSession` (dans `data/services/auth_service.dart`) expose `canUseDriverApp`, `canUseConfirmatriceApp`, `canUseCustomerApp` — à utiliser plutôt que de comparer les strings de rôle.

### 6.3 Providers & state

Pattern uniforme : `loading` + `error` + `items` + actions qui terminent par `notifyListeners()`.

**Providers principaux** :
- `AuthProvider` : login, logout, restoreSession, tryAutoLogin.
- `DeliveriesProvider` (livreur) : refresh, activeForMap, select, urgent flags.
- `NavigationProvider` (livreur) : GPS tracking, hasDriverLocation, isGpsBlocked, isUrgent, toggleUrgent, recompute.
- `CustomerOrdersProvider` (client) : refresh, items, current.
- `ConfirmatriceOrdersProvider` : fetchDetails, updateStatusExtended, confirmToBl, locking.
- `ConfirmatriceClaimsProvider` : fetchDetails, takeOver, updateStatus, applyCorrection, changeCommandeStatus, updateNote.
- `LivreurStatsProvider` : load, setScope, remettreCaisse (avec OfflineQueue).
- `ClientClaimsProvider` / `ClientClaimChatProvider` : équivalent côté client.
- `OfflinePhotosQueue` / `OfflineQueueService` : actions mutatives en hors-ligne, flush automatique au retour réseau.
- `ThemeProvider` : écoute SignalR ThemeChanged, applique le primaryColor live.

### 6.4 Services HTTP

`data/services/` (32 services). Chacun wrap `ApiClient`.

**Exemples** :
```dart
class ConfirmatriceOrdersService {
  final ApiClient api;
  ConfirmatriceOrdersService(this.api);

  Future<List<ConfirmatriceOrder>> fetchAll({String? statut}) async { ... }
  Future<ConfirmatriceOrder> fetchDetails(String piece) async { ... }
  Future<bool> updateStatusExtended(String piece, String statusKey,
      {int? tentativeCount, String? note}) async { ... }
  Future<String?> transformToBl(String piece) async { ... }
}
```

`ApiClient` (`core/api_client.dart`) :
- Injecte le bearer token via `TokenStore` (backed by `flutter_secure_storage`).
- Parse les erreurs JSON `{ message: "..." }` et les throw comme `Exception`.
- Méthodes : `getMap`, `getList`, `postJson`, `putJson`, `deleteJson`, `postMultipart` (pour upload photos).

### 6.5 Screens par rôle

#### 6.5.1 Client
- **CustomerHome** : 4 onglets (Home / Catalog / Orders / Profile).
- **CustomerHomePage** : hero gradient + promotions + accès rapide commandes en cours.
- **ArticlesScreen** + **ArticleDetailsScreen** : équivalent Flutter du catalog React.
- **CartScreen** : panier local + checkout.
- **CheckoutScreen** : adresse (saved ou nouvelle) + paiement (COD / Konnect via WebView).
- **ClientOrdersScreen** : liste commandes filtrables par statut.
- **ClientOrderDetailsScreen** : détail + tracking (timeline live via SignalR).
- **ClientOrderTrackingScreen** : map "Voir le livreur" (refresh 8s) + polyline Mapbox driving-traffic + bouton appel.
- **ClientClaimsScreen** / **ClientCreateClaimScreen** / **ClientClaimDetailsScreen** : module réclamations.
- **ClientDemandesScreen** / **ClientDemandeReplyScreen** : réponse aux demandes livreur (adresse/téléphone).
- **AvisScreen** (BottomSheet) : note 1-5 + commentaire + emoji tags.
- **ClientProfileScreen** : profil + médailles fidélité (Bronze/Argent/Or avec prix de livraison décroissant).
- **AddressPickerScreen** : sélecteur d'adresses sauvegardées (max 3).

#### 6.5.2 Confirmatrice
- **ConfirmatriceHome** : 4 onglets (Commandes / Réclamations / Demandes / Profil), header gradient violet, AppNavProvider scopé.
- **ConfirmatriceOrdersScreen** : liste BC à confirmer.
- **ConfirmatriceOrderDetailsScreen** (refonte "Converty") : hero violet, carte client + bouton appel vert, cart photos, dropdown statut 1-ligne (CONFIRME/TENTATIVE/REFUSE), historique inline via `OrderTimelineList`.
- **ConfirmatriceClaimsScreen** (wrapper `DemandeWrapper(lockedTypeCas: 'DEMANDE')` ou 'RECLAMATION') : filtres + cards avec badges modifs client (`HasAddressChange` / `HasPhoneChange`).
- **ConfirmatriceClaimDetailsScreen** : header gradient (rouge si urgent, bleu si demande livreur, orange réclamation) + actions (TakeOver, Resolve, Refuse, ApplyCorrection, ChangeCommandeStatus, CreateEchange) + panel décision colis endommagé (stock-check + boutons ÉCHANGE/RETOUR_APPEL).
- **ConfirmatriceProfileScreen**.

#### 6.5.3 Livreur
- **Home** (driver app) : tabs Pool / Mes livraisons / Map / Stats / Profil.
- **NewOrdersScreen** (Pool) : liste BL disponibles avec accept/abandon.
- **MyOrdersScreen** : liste livraisons assignées + filtres (Au dépôt prêtes, En préparation, Au dépôt, En livraison, Reportées, Livrées, Retournées) + multi-select bulk action.
- **DeliveryDetailsScreen** : détail BL + actions statut (Livré/Reporté/Retourné/Dépôt) avec motifs contextuels + bouton appel + escalade tentatives + historique timeline inline.
- **MapScreen** : Google Maps + markers urgents + polyline Mapbox driving-traffic multicolore + bouton "Arrêté ici" FAB rouge (haversine → ouverture détail commande la plus proche) + zoom controls + drag reorder.
- **LivreurStatsScreen** : hero gradient bleu (KPI totalCommandes + 4 pills colorées Livrées/En cours/Reportées/Retours), CashboxBlock premium gradient vert (montant en accent jaune + bouton "Remettre caisse au dépôt"), CountersGrid 2×2, TopZones, Performance (taux livraison/retour, delta vs jour précédent), Sparkline 7j.
- **EscalationsScreen** : tentatives accumulées, escalade auto à 3.

#### 6.5.4 Admin
- **AdminDashboardScreen** : KPIs globaux avec drill-down (`KpiDrillDownResolver`).
- **AdminOrdersScreen** + drawer détail avec section Historique inline (timeline).
- **AdminDriversScreen** + détail driver.
- **AdminConfirmatricesScreen** + détail confirmatrice + work stats (temps pause).
- **AdminClaimsScreen** : 2 tabs (Réclamations / Demandes), KPIs cohérents (total = somme statuts RECLAMATION).
- **AdminProductsScreen** : top produits.
- **AdminUsersScreen** : CRUD + assign rôles.
- **AdminThemeScreen** : color picker → broadcast SignalR aux 4 rôles.
- **AdminChatScreen** (chatbot LLM) : interface chat plein-écran avec orchestrateur query/analyze/predict.

### 6.6 Plugins natifs

| Plugin | Usage |
|---|---|
| `google_maps_flutter` | Map livreur + tracking client |
| `geolocator` | GPS permissions + position courante (livreur) |
| `flutter_secure_storage` | Token JWT chiffré (Keystore Android / Keychain iOS) |
| `flutter_local_notifications` | Notifications locales (rappel pause, nouvelle commande) |
| `signalr_netcore` | Connexion ReclamationHub |
| `url_launcher` | Appels téléphoniques + navigation externe Google Maps |
| `image_picker` | Photos réclamations |
| `provider` | State management |
| `intl` | Format dates en fr_FR |
| `flutter_tts` | Annonces vocales optionnelles (livreur) |
| `permission_handler` | Permissions runtime |
| `webview_flutter` | Konnect payment flow |

### 6.7 Notifications & SignalR

`NotificationService.I.init()` est appelé avant `runApp()` dans `main.dart` — initialise les channels Android + permissions iOS.

`SignalRConnectionManager` (souvent dans `state/`) :
- Démarre la connexion après login (token JWT envoyé via `accessTokenFactory`).
- Reconnecte automatiquement (retry exponentiel).
- Écoute `ReclamationCree`, `ReclamationStatutChange`, `ClientARepondu`, `CommandeAttribuee`, `ThemeChanged`.
- Émet vers les providers concernés pour rafraîchir l'UI.

### 6.8 Internationalisation & textes

UI 100% en français (FR-FR). Pas de plugin `flutter_localizations` chargé pour i18n complète — les strings sont en dur dans le code. `DateFormat('dd MMM yyyy à HH:mm', 'fr_FR')` est utilisé pour les dates.

### 6.9 Build & cibles supportées

- `flutter run` (debug, hot reload).
- `flutter build apk --release` (Android APK).
- `flutter build appbundle` (Google Play AAB).
- `flutter build ios --release` (iOS, nécessite Xcode + provisioning).
- `flutter build web --release` → `build/web/` (assets statiques pour PWA).
- `flutter build windows` (desktop Windows).

Cibles principales : Android (livreurs, clients), Web (admin/confirmatrice si pas Flutter natif), Windows (desktop confirmatrice optionnel).

---

## 7. Intégrations transverses & contrats

### 7.1 JSON property names (contrat React/Flutter)

ASP.NET Core 8 sérialise en `camelCase` par défaut (System.Text.Json). Les modèles Flutter (`fromMap`/`toMap`) et les types React (`type ArticleResponse = { arRef: string; arDesign: string; }`) DOIVENT matcher exactement.

**Risque** : renommer une propriété DTO sans mettre à jour les 2 frontends casse silencieusement le contrat (fallback à `null` ou valeur par défaut, sans erreur 4xx).

### 7.2 Statuts (multiples espaces de noms)

3 systèmes de statuts coexistent :

| Layer | Range | Enum |
|---|---|---|
| Backend F_DOCENTETE.DO_Valide | 0-3 | EN_ATTENTE=0, CONFIRME=1, TENTATIVE=2, REFUSE=3 |
| Backend F_LIVRAISON.LI_Statut (DeliveryStatusCodes) | 0-7 | Confirme=0, EnLivraison=1, Livre=2, Retour=3, Depot=4, Reporte=5, DepotEnCoursDePreparation=6, DepotPret=7 |
| Flutter Statut enum (constants.dart) | 1-6 | confirme=1, enLivraison=2, livre=3, reporte=4, retourne=5, depot=6 |

**Mapping** explicite côté layer : ne JAMAIS conflater. La confirmatrice utilise `DO_Valide`, le livreur `LI_Statut`. Le client voit les sub-statuts dépôt comme "AU DÉPÔT" générique.

### 7.3 ConnectionString & DB unifiée

- React `.env.local` : `VITE_API_BASE_URL=http://localhost:5123`
- Flutter `constants.dart` : `apiBaseUrl = "http://10.0.2.2:5000"` (Android emulator loopback)
- Backend HTTP : `5123`, HTTPS : `7178` (cf. `Properties/launchSettings.json`)
- Backend → SQL Server : `PCTAWFIK\SQLEXPRESS01;Database=webApi_flutter_test`

### 7.4 CORS

Policy `AllowDev` autorise les origines des 2 frontends (Vite + Flutter web/emulator). En prod, restreindre à `https://your-domain.com`.

---

## 8. Procédures opérationnelles

### 8.1 Démarrage local

```bash
# 1. Backend
cd Web-Api\(Asp.net\)/Web-Api
dotnet restore
dotnet ef database update      # applique migrations
dotnet run --launch-profile https-Swagger
# → https://localhost:7178/swagger
# → http://localhost:5123 (HTTP)

# 2. React
cd React-Ecommerce
npm install
npm run dev
# → http://localhost:5173

# 3. Flutter (Android emulator)
cd flutter
flutter pub get
flutter run
# → app installée sur l'emulator
```

### 8.2 Seed démo

```http
POST /api/admin/dev/seed-clean-demo
Authorization: Bearer {admin-token}
Content-Type: application/json

{ "confirm": "RESET_AND_SEED" }
```

→ reset complet + 5 users (admin/admin123, client1/123456, conf1/123456, conf2/123456, livreur1/123456) + 4 commandes EN_ATTENTE BL00001-04.

### 8.3 Sync Sage (initial)

```http
POST /api/SyncAll      # orchestrateur (articles + catalogues + dépôts + stocks)
# OU individuellement
POST /api/sync/articles
POST /api/sync/catalogues
POST /api/sync/depots
POST /api/sync/stocks
GET  /api/SyncAll/status
```

### 8.4 Tests & qualité

```bash
# Backend
dotnet build                            # 0 erreur attendu
# (pas de test project dans la solution actuellement)

# React
npx tsc --noEmit                        # type-check strict
npm run build                           # production build (catch erreurs runtime CSS/JS)

# Flutter
flutter analyze                         # lint (0 erreur attendu)
flutter test                            # unit tests si présents
flutter build web --release             # vérif compilation tous écrans
```

### 8.5 Déploiement prod

| Composant | Cible | Méthode |
|---|---|---|
| Backend | IIS / Linux + Kestrel / Azure App Service | `dotnet publish -c Release -o publish/` puis copier ; SQL Server géré séparément ; secrets via env vars (JWT_KEY, KONNECT_API_KEY, GROQ_API_KEY) |
| React | Nginx / Cloudflare Pages / IIS static | `npm run build` puis copier `dist/` ; reverse-proxy vers backend en `/api` |
| Flutter Android | Google Play Console | `flutter build appbundle --release` → upload AAB |
| Flutter Web | Static host | `flutter build web --release` → copier `build/web/` |

---

## 9. Annexes

### 9.1 Variables d'environnement / secrets

#### Backend (`appsettings.json` + env vars en prod)
| Clé | Description |
|---|---|
| `ConnectionStrings:Default` | SQL Server connection string |
| `Jwt:Key` | Secret HMAC pour signer JWT (32+ chars random) |
| `Jwt:Issuer`, `Jwt:Audience` | Emitteur/audience JWT |
| `Sage:BaseUrl` | URL Sage X3 Web API |
| `Sage:Username`, `Sage:Password` | Basic Auth Sage (optionnel) |
| `Sage:PostBlEnabled` | true/false — active le POST BL vers Sage |
| `Konnect:Mode` | Mock / Sandbox / Production |
| `Konnect:ApiKey`, `Konnect:ReceiverWalletId` | Credentials Konnect |
| `Konnect:FrontendBaseUrl` | URL de retour frontend |
| `Konnect:BackendPublicBaseUrl` | URL webhook public |
| `Cloudinary:CloudName/ApiKey/ApiSecret` | Upload images |
| `ExternalAuth:Google:ClientId/Secret` | OAuth Google |
| `ExternalAuth:Facebook:AppId/Secret` | OAuth Facebook |
| `Groq:ApiKey` | LLM chatbot |
| `Chatbot:ApiKey` | Alias Groq pour le chatbot |

#### React (`.env.local`, `.env.production`)
| Clé | Description |
|---|---|
| `VITE_API_BASE_URL` | URL backend (ex: `http://localhost:5123` ou `https://api.your-domain.com`) |

#### Flutter (`lib/core/constants.dart` — à externaliser idéalement)
| Constante | Description |
|---|---|
| `apiBaseUrl` | URL backend (loopback emulator par défaut) |
| `osrmBaseUrl` | OSRM routing public |
| `mapboxToken` | Token pour Mapbox routing (pk.*) |

### 9.2 Endpoints — récapitulatif tableau (extrait des plus utilisés)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | — | Login → JWT |
| POST | /api/auth/register | — | Inscription |
| GET | /api/auth/me | JWT | Profil + roles |
| GET | /api/articles | — | Liste articles + filtres |
| GET | /api/articles/{arRef} | — | Détail article |
| GET | /api/articles/filter-metadata | — | Min/max prix + count |
| GET | /api/catalogues | — | Arbre catégories |
| GET | /api/geo/gouvernorats | — | 24 gouvernorats |
| GET | /api/depots | — | Liste dépôts |
| GET | /api/homepage | — | Configuration homepage publique |
| POST | /api/orders | JWT CLIENT | Création BC auth |
| POST | /api/orders/guest | — | Création BC invité |
| GET | /api/orders | JWT CLIENT | Mes commandes |
| GET | /api/orders/{piece} | JWT CLIENT | Détail commande |
| POST | /api/payments/konnect/initiate | JWT CLIENT | Lancer paiement |
| GET | /api/payments/konnect/webhook | — | Callback Konnect |
| GET | /api/payments/konnect/status | — | Status pour return page |
| GET | /api/confirmateur/commandes | JWT CONF | BC à confirmer |
| POST | /api/confirmateur/commandes/{piece}/transform-to-bl | JWT CONF | Confirme + crée BL |
| POST | /api/confirmateur/reclamations/{id}/take-over | JWT CONF | Prendre charge |
| POST | /api/confirmateur/reclamations/{id}/depot-damaged/decide | JWT CONF | Décision colis endommagé |
| GET | /api/livreur/pool/disponibles | JWT LIVREUR | Pool BL |
| POST | /api/livreur/pool/{piece}/prendre | JWT LIVREUR | Prendre BL |
| POST | /api/livreur/orders/{piece}/start-heading | JWT LIVREUR | Active delivery start |
| POST | /api/livreur/location/ping | JWT LIVREUR | Ping GPS |
| PUT | /api/livreur/orders/{piece}/status | JWT LIVREUR | Change statut |
| GET | /api/livreur/stats | JWT LIVREUR | Stats du jour |
| POST | /api/livreur/cashbox/remettre | JWT LIVREUR | Remise caisse |
| GET | /api/admin/dashboard/overview | JWT ADMIN | Dashboard global |
| GET | /api/admin/orders | JWT ADMIN | Toutes commandes |
| GET | /api/admin/claims/overview | JWT ADMIN | KPI réclamations |
| POST | /api/admin/dev/seed-clean-demo | JWT ADMIN | Reset démo |

### 9.3 Décisions architecturales remarquables

1. **DB unifiée** — un seul `webApi_flutter_test` consommé par les 3 apps (React + Flutter + jobs Hangfire).
2. **Backend canonique unique** — fusion des anciens `Web-Api(Asp.net)` et `Web-Api-(Asp.net)v2-de-react` finalisée le 2026-05-13.
3. **Pas de cart serveur** — le panier est local (Zustand React, Provider Flutter). La commande est créée d'un coup au checkout.
4. **Cash-on-Delivery par défaut** — Konnect est optionnel. La transition "Livré" auto-encaisse `DO_NetAPayer` dans `F_LIVRAISON`.
5. **Offline queue Flutter** — actions mutatives (status change, ping GPS batch, encaissement, photos réclamation) sont enqueueables en hors-ligne avec idempotence via `X-Client-Action-Id`.
6. **3 statuts mappings** distincts (DO_Valide / LI_Statut / Statut Flutter) → mapping explicite à chaque frontière.
7. **SignalR session tracking 5s** — grace period pour Wi-Fi instable confirmatrices (release différée des cas).
8. **Idempotency middleware** — POST sensibles supportent `X-Idempotency-Key`.

### 9.4 Fichiers de référence à lire

| Fichier | Pourquoi |
|---|---|
| `CLAUDE.md` (root) | Vue d'ensemble + commandes |
| `Web-Api(Asp.net)/Web-Api/Web-Api_REFERENCE_PFE.md` | Référence backend exhaustive |
| `flutter/CLAUDE.md` | Conventions Flutter |
| `React-Ecommerce/React-Ecommerce_REFERENCE_PFE.md` | Référence React |
| `MERGE_REPORT_2026-05-06.md` | Historique merge précédent |

### 9.5 Roadmap / TODO ouverts connus

- [ ] Durcir le handler HTTPS Sage en prod (retirer `DangerousAcceptAnyServerCertificateValidator`).
- [ ] Remplacer JWT key par défaut en prod (rotation secrète).
- [ ] Code-splitting du bundle React (chunk > 500 kB warning sur le main).
- [ ] Tests automatisés backend (xUnit) absents.
- [ ] Tests Flutter / Widget tests étoffés.
- [ ] Migrer hardcoded URLs Konnect/Sage vers configuration centrale.
- [ ] Externaliser `apiBaseUrl` Flutter en flavor / config build.
- [ ] CI/CD pipeline (Github Actions / Azure DevOps).
- [ ] Monitoring prod (Application Insights / Seq).

---

**Fin du document.**
Toute remarque ou correction technique : à reporter dans ce fichier directement et committer avec un message clair.
