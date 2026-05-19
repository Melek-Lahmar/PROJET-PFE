# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository layout

This is a two-part monorepo for a PFE (Projet de Fin d'Études) e-commerce / delivery system. The two parts are deployed independently and communicate via HTTP.

```
Web-Api(Asp.net)/Web-Api/   ASP.NET Core 8 Web API (backend, SQL Server, JWT, Sage X3 integration)
flutter/                     Flutter mobile/web client (driver, confirmateur, customer, admin roles)
```

The path contains parentheses and a hyphen (`Web-Api(Asp.net)`) — always quote it in shell commands.

Each part has its own deeper documentation that should be consulted before non-trivial work:

- **Backend:** `Web-Api(Asp.net)/Web-Api/Web-Api_REFERENCE_PFE.md` — complete reference for controllers, services, entities, DTOs, critical flows, Sage integration, and known structural issues. Read this before changing any backend logic.
- **Frontend:** `flutter/AGENTS.md` — covers the Flutter app's role-based shell, provider scoping rules, status code mappings, and feature-slice conventions.

## Backend (ASP.NET Core 8)

### Commands

Run from `Web-Api(Asp.net)/Web-Api/` (the project directory, not the solution root):

```bash
dotnet restore
dotnet build
dotnet run                                # default profile (https-Stable) → https://localhost:7178 / http://localhost:5123
dotnet run --launch-profile https-Swagger # opens Swagger UI
dotnet ef migrations add <Name>           # create a new EF Core migration
dotnet ef database update                 # apply migrations to the configured SQL Server
```

There is no test project in the solution.

### Configuration

`appsettings.json` holds connection string, JWT secret, Sage base URL, and OAuth (Google/Facebook) client IDs. The default `ConnectionString` points at a local SQL Server instance (`PCTAWFIK\SQLEXPRESS01`, DB `webApi_flutter_test`); override via `appsettings.Development.json` or user-secrets (`UserSecretsId` is set in the csproj). The default JWT key in source is a placeholder — replace it for any non-dev environment.

### Architecture essentials

- ASP.NET Identity with `Guid` keys, roles defined in `Auth/Constants/AppRoles.cs`: `CLIENT`, `VENDEUR`, `CONFIRMATEUR`, `LIVREUR`, `ADMIN`. Roles are seeded at startup by `IdentitySeeder`.
- `data/AppDbContext.cs` is the single `DbContext`. Tables prefixed `F_` mirror Sage X3 entities (`F_ARTICLE`, `F_DOCENTETE`, `F_DOCLIGNE`, `F_ARTSTOCK`, etc.); `ProfilUtilisateur` carries the rich application-side user profile.
- Controllers are grouped by domain folder under `Controllers/` (`Articles/`, `Auth/`, `Confirmateur/`, `Livreur/`, `Reclamations/`, `Admin/`, `Dashboard/`, `Statistics/`, `Homepage/`). DTOs mirror this structure under `DTO/`.
- Sage X3 sync flows go through `Services/SageService.cs` (an `HttpClient` configured against the URL in `Sage:BaseUrl`). The handler uses `DangerousAcceptAnyServerCertificateValidator` — acceptable for the dev Sage server, must not ship to prod.
- **Known duplication to be careful of:** BC → BL transformation logic exists both in `Services/BcToBlService.cs` (the rigorous version with serializable transactions and stock decrement) and inline in `Controllers/Confirmateur/ConfirmateurController.cs`. Prefer the service when adding new behavior; consult the reference doc §14.1 before "fixing" either.
- Document status code: `F_DOCENTETE.DO_Valide` → `0=EN_ATTENTE, 1=CONFIRME, 2=TENTATIVE, 3=REFUSE`. The Flutter client uses a different domain `Statut` enum (1–6) for its own UI — do not conflate them.

### Sync endpoints (security note)

`POST /api/sync/articles`, `/api/sync/catalogues`, `/api/sync/depots`, `/api/sync/stocks`, `/api/SyncAll`, `GET /api/SyncAll/status` are not consistently `[Authorize]`-gated in the current code. Treat any change here as security-relevant.

### CORS

`Program.cs` whitelists `http://localhost:5173`, `https://localhost:5173`, `http://10.0.2.2:5000`, `http://localhost:5000`. Add new client origins in the `AllowDev` policy.

## Frontend (Flutter)

See `flutter/AGENTS.md` for the full guide. Key points that affect cross-cutting work:

- Run from `flutter/`: `flutter pub get`, `flutter run`, `flutter analyze`, `flutter test`.
- API base URL is `lib/core/constants.dart` → `apiBaseUrl`, defaulting to `http://10.0.2.2:5000` (Android emulator → host loopback). Adjust for real devices, web, or desktop. The backend's HTTPS dev port is 7178 and HTTP is 5123 — make sure the client points at one the backend is actually listening on.
- The app mounts a completely different widget subtree per role (`LIVREUR`/`ADMIN` → driver app, `CONFIRMATEUR` → confirmatrice app, `CLIENT` → customer app). Role-scoped providers live inside the matching branch of `_Root.build` in `lib/main.dart`, not in the root `MultiProvider`.
- All HTTP goes through `lib/core/api_client.dart` (`ApiClient`), which injects the bearer token from `TokenStore`. Server error messages are extracted from the JSON `message` field.
- UI strings and error messages are in French — keep new strings consistent.

## Cross-cutting concerns when changing both sides

- **Role names** in `Auth/Constants/AppRoles.cs` (backend) and the role checks on `AuthSession` in `flutter/lib/data/services/auth_service.dart` must stay aligned.
- **JSON property names** on DTOs are the contract. The Flutter models do `fromMap`/`toMap` by string key — renaming a backend property without updating the corresponding Flutter model will silently break the field.
- **Status codes** differ between layers (see above). When adding a new status, decide which layer owns it and map explicitly at the boundary.
- **Confirmatrice orders** use a 0–3 numeric status range in the API (`ConfirmatriceOrdersService.updateStatus` validates this) that is distinct from both `DO_Valide` and the client `Statut` enum.
