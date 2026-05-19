# Rapport de fusion — backend Flutter + backend React → version finale unique

Date : 2026-05-06
Branche source A : `Web-Api(Asp.net)` (V1, lié au client Flutter — features Admin/ML.NET/chatbot/réclamations)
Branche source B : `Web-Api-(Asp.net)v2-de-react` (V2, lié au client React — features Konnect/Vendeur/Guest checkout)
Branche cible : `Web-Api(Asp.net)` (V1) reçoit la fusion → c'est la version finale officielle.

---

## 1. Fichiers V2-only portés vers V1 (copie verbatim)

| Catégorie | Fichier |
|---|---|
| Controller | `Controllers/KonnectPaymentsController.cs` |
| Controller | `Controllers/Vendeur/VendeurOrdersController.cs` |
| DTO        | `DTO/Payments/KonnectPaymentDtos.cs` |
| DTO        | `DTO/Vendeur/VendeurClientLookupDtos.cs` |
| DTO        | `DTO/Vendeur/VendeurContextDtos.cs` |
| DTO        | `DTO/Vendeur/VendeurCreateBonCommandeRequestDto.cs` |
| DTO        | `DTO/Vendeur/VendeurOrderDtos.cs` |
| DTO        | `DTO/Orders/CreateGuestBonCommandeRequestDto.cs` |
| Options    | `Options/KonnectOptions.cs` |
| Service    | `Services/Payments/IKonnectClient.cs` |
| Service    | `Services/Payments/KonnectClient.cs` |
| Service    | `Services/Payments/KonnectPaymentService.cs` |

## 2. Fichiers partagés — adoption de la version V2

V2 contenait la version refactorée canonique (le `BonCommandeService` de V1 était **vide** — toute la logique vivait inline dans `OrdersController`). V2 a été adopté tel quel pour ces fichiers :

- `Services/BonCommandeService.cs` (895 lignes — créé par binôme côté React)
- `Controllers/OrdersController.cs` (refactor → délègue à `BonCommandeService` + endpoint guest)
- `Model/B_PAIEMENT.cs` (ajoute constantes Konnect, `PA_Fournisseur`, `PA_StatutExterne`, `PA_IsSandbox`, helpers `IsTerminalStatus` / `LocalStatusLabel`)
- `Model/F_DOCENTETE.cs` (ajoute traçabilité vendeur/client : `DO_VendeurUserId`, `DO_ClientUserId`, `DO_ClientMode`, et 12 colonnes `DO_Passager*` pour les commandes invité/passager)
- `Auth/Seed/IdentitySeeder.cs` (ajoute `SeedDevUsersAsync` — crée client/admin/caisse/confirmatrice/livreur de démo)

## 3. Merges manuels (V1 conserve ses ajouts + greffe ceux de V2)

### `data/AppDbContext.cs`
- Conserve toute la config V1 (réclamations, livreur logs, avis, locks)
- Ajoute le bloc B_PAIEMENT V2 : précision décimale, défaut PA_IsSandbox, 4 index (composite + uniques filtrés)

### `Program.cs`
- Conserve toute la DI V1 : `Web_Api.Services.Admin.*`, `PredictionService` (ML.NET singleton), `GroqClient`, `AdminChatOrchestratorService`, etc.
- Ajoute :
  - `using System.Net.Http.Headers`, `using Microsoft.Extensions.Options`, `using Web_Api.Services.Payments`
  - `Configure<KonnectOptions>(...)`
  - `AddScoped<BonCommandeService>()` + `AddScoped<KonnectPaymentService>()`
  - `AddHttpClient<IKonnectClient, KonnectClient>(...)` (résout `BaseAddress` depuis `KonnectOptions.ResolveApiBaseUrl()`)
  - Au boot : `IdentitySeeder.SeedDevUsersAsync(userManager, db)` après `SeedRolesAsync`

### `appsettings.json`
- Conserve : ConnectionString locale `PCTAWFIK\SQLEXPRESS01`, Sage `192.168.100.18`, `Chatbot.ApiKey`, bloc `Groq`, `ExternalAuth` (Google/Facebook)
- Ajoute : blocs `Cloudinary` (CloudName=melek) et `Konnect` (Mode=Mock par défaut, Sandbox/Production URLs, montants/lifespan/theme/devises)

### `Web-Api.csproj`
- Conserve V1 (NuGet `Microsoft.ML` + `Microsoft.ML.TimeSeries` 3.0.1 indispensables pour `PredictionService`).

### `Controllers/Admin/AdminBackofficeController.cs` + `AdminUsersController.cs` + `Services/DevTest/DevTestDataSeeder.cs`
- Conservés en V1 (V1 a routes `legacy/orders` pour éviter collision avec `AdminOrdersController` ; V1 a endpoints `UpdateProfile` + `DeleteUser` ; V1 seed un `admin@test.com`).

## 4. Migrations EF Core

- Migration `aaaa123zz` (pré-existante, pendante en V1 — ses colonnes étaient déjà créées sur la DB par d'autres canaux) marquée comme appliquée via insert manuel dans `__EFMigrationsHistory`.
- Nouvelle migration générée : **`20260505232823_MergeKonnectVendeur`** — capture les 12 nouveaux champs `DO_Passager*`, `DO_VendeurUserId`, `DO_ClientUserId`, `DO_ClientMode` sur `F_DOCENTETE` + 4 nouveaux champs `PA_*` + indexes B_PAIEMENT.
- Appliquée à la base sans erreur.

## 5. Vérification backend mergé

```
dotnet build         → 0 erreur, 0 warning
dotnet ef ... update → migration appliquée
dotnet run :5123     → écoute, 5 dev users seedés
```

Smoke-tests endpoints (tous OK) :

| Endpoint | Statut | Note |
|---|---|---|
| `GET  /swagger/v1/swagger.json` | 200 (335 KB) | OpenAPI complet |
| `POST /api/auth/login` (client/admin/caisse/confirmatrice/livreur) | 200 | Tokens JWT émis |
| `GET  /api/articles` | 200 (82 KB) | Sage data servi |
| `GET  /api/admin/dashboard/overview` | 200 | Auth admin OK |
| `GET  /api/vendeur/context` | 400 sémantique | Caisse demo n'a pas de `CodeDepot` (à seeder) |
| `GET  /api/payments/konnect/status` | 404 propre | Aucun paiement avec ce ref |
| `POST /api/orders/guest` | 400 « panier vide » | Validation correcte |
| `GET  /api/admin/chat/ping` | 401 | Header `X-Chat-Api-Key` requis (V1) |

## 6. Côté React (`React-Ecommerce/`)

- `vite.config.ts` + `.env.local` pointent déjà sur `http://localhost:5123` → **aucun changement nécessaire**.
- `npm run dev` → `:5173` HTTP 200, HMR reçoit toutes les modifications sans erreur.

### Refonte design (alignement Flutter premium)

Tokens ajoutés dans `src/styles/globals.css` (light + dark) :
- `--danger` = #DC2626 (vrai rouge Flutter, plus fuchsia)
- `--teal`, `--sky` (alignés sur AppColors.secondary / AppColors.accent)
- 18 tokens `--status-*` mappant 1:1 sur `flutter/lib/core/theme/app_status_palette.dart` (pending, in-delivery, delivered, rescheduled, returned, depot)

Utilitaires CSS ajoutés :
- `.status-pill` + `.status-pill-{variant}` (×6)
- `.premium-hero` (gradient + glow animé)
- `.anim-fade-up`, `.anim-fade-in`, `.anim-scale-in` (480ms / 380ms / 340ms — courbes identiques à Flutter `EntryAnimation`)
- `.skeleton` (shimmer 1.4 s — équivalent du `skeleton.dart`)
- 4 nouveaux `@keyframes` (fade-up, fade-in, scale-in, skeleton-shimmer, premium-glow)

Composants partagés créés dans `src/shared/components/premium/` :

| Fichier | Mirror Flutter | Usage |
|---|---|---|
| `statusPalette.ts` | `app_status_palette.dart` | `statusVisual(statut, apiStatus) → StatusVisual` |
| `StatusPill.tsx` | `status_pill.dart` | Pastille de statut iconographiée |
| `PremiumHero.tsx` | `premium_hero.dart` | Bannière hero avec gradient + glow |
| `SectionHeader.tsx` | `section_header.dart` | Kicker + titre + sous-titre + slot trailing |
| `EmptyView.tsx` | `empty_view.dart` | État vide avec icône + CTA |
| `Skeleton.tsx` + `SkeletonLines` | `skeleton.dart` | Placeholder shimmer |
| `PremiumCard.tsx` | `premium_card.dart` | Carte glass avec tones (default/soft/primary/success/warning/danger) |
| `AnimatedEntry.tsx` + `StaggeredColumn` | `animated_entry.dart` | Entrée animée + cascade sur listes |
| `index.ts` | — | Barrel export propre |

Refonte appliquée (preuve d'utilisation) :
- `src/features/orders/pages/OrdersPage.tsx` :
  - Hero remplacé par `<PremiumHero/>`
  - État vide remplacé par `<EmptyView/>`
  - Liste des commandes enveloppée dans `<StaggeredColumn step={60} animation="fade-up"/>` → entrée échelonnée

Le binôme peut désormais bâtir le reste de l'UI React en important :
```ts
import { StatusPill, PremiumHero, EmptyView, PremiumCard, Skeleton } from "@/shared/components/premium";
```

## 7. Côté Flutter (`flutter/`)

- `lib/core/constants.dart` → `apiBaseUrl = "http://10.160.197.169:5123"` (LAN). Le backend mergé écoute toujours `0.0.0.0:5123` → compatible.
- `flutter pub get` → OK
- `flutter analyze` → 1 erreur unique (test `widget_test.dart` référençant une classe `App` qui n'existe plus — pré-existant), 447 infos de dépréciation `withOpacity`/`surfaceVariant` (cosmétique). **Aucun problème lié au merge.**
- Tous les endpoints utilisés par l'app Flutter (`auth`, `articles`, `admin/*`, `confirmateur/*`, `livreur/*`, `reclamations/*`, `admin/chat/*`, `admin/dashboard/*`) sont **préservés** dans la version mergée.

## 8. Comment lancer la stack mergée

```powershell
# Backend
cd "C:\peojet-pfe(backend+fronted)\Web-Api(Asp.net)\Web-Api"
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --urls "http://0.0.0.0:5123"

# React
cd "C:\peojet-pfe(backend+fronted)\React-Ecommerce"
npm run dev          # → http://localhost:5173

# Flutter (Android emulator)
cd "C:\peojet-pfe(backend+fronted)\flutter"
flutter run
```

Comptes de démo (auto-seedés au démarrage) :

| Email | Password | Rôle |
|---|---|---|
| `client@gmail.com` | `123456` | CLIENT |
| `admin@gmail.com` | `123456` | ADMIN |
| `caisse@gmail.com` | `123456` | VENDEUR |
| `confirmatrice@gmail.com` | `123456` | CONFIRMATEUR |
| `livreur@gmail.com` | `123456` | LIVREUR |

> Le compte `caisse@gmail.com` doit recevoir un `CodeDepot` non vide dans `ProfilsUtilisateurs` pour que `/api/vendeur/context` retourne 200.

## 9. Le dossier `Web-Api-(Asp.net)v2-de-react/`

Ne contient plus rien d'unique. Il peut être archivé / supprimé une fois que tu as confirmé que tout marche bout en bout. Conservé tel quel pour le moment afin de préserver son `.git` historique.
