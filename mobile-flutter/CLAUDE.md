# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
flutter pub get                  # install dependencies
flutter run                      # run on connected device/emulator
flutter analyze                  # lint (uses package:flutter_lints)
flutter test                     # run all tests
flutter test test/widget_test.dart   # run a single test file
flutter build apk                # build Android release
```

Dart SDK: `^3.9.0`. The project targets Android, Web, and Windows.

## Backend / API

The app is a pure client that talks to an external REST backend. Configuration lives in `lib/core/constants.dart`:

- `apiBaseUrl` defaults to `http://10.0.2.2:5000` (Android emulator loopback to host). Change this when running on a real device, web, or desktop.
- `osrmBaseUrl` points at the public OSRM routing service for delivery route optimization.

All HTTP flows go through `lib/core/api_client.dart` (`ApiClient`), which injects a bearer token from `TokenStore` (backed by `flutter_secure_storage`, with explicit `WebOptions` so web/IndexedDB works). Every non-2xx response is thrown as `Exception` with `_extractErrorMessage` parsing the server's `message` field — services and providers catch these and surface `error` strings to the UI.

## Architecture

Three-layer architecture with `provider` (ChangeNotifier) for state management:

```
ui/            Widgets and screens (no direct HTTP/storage access)
  ↓ watches
state/         ChangeNotifier providers (loading/error/data + actions)
  ↓ calls
data/services/ Thin wrappers around ApiClient that return typed models
data/repositories/   Abstract interfaces (see deliveries_repository.dart) with
                     API and mock implementations
  ↓ uses
core/          ApiClient, TokenStore, NotificationService, theme, constants
models/        Plain Dart classes with fromMap/toMap
```

### Role-based app shell (critical)

`lib/main.dart` is the routing backbone. After splash + onboarding, `_Root` inspects `AuthProvider.session.roles` and mounts a completely different subtree per role:

- `LIVREUR` / `ADMIN` → `Home` (driver app) with `DeliveriesProvider`
- `CONFIRMATEUR` → `ConfirmatriceHome` with `ConfirmatriceOrdersProvider`, `ConfirmatriceClaimsProvider`, `ConfirmatriceClaimChatProvider`
- `CLIENT` → `CustomerHome` with `CustomerOrdersProvider`, `ClientClaimsProvider`, `ClientClaimChatProvider`
- Otherwise `_UnsupportedRoleScreen`

Role-scoped providers (orders, claims, chats) are **created inside the role branch**, not at the top-level `MultiProvider`. Only app-wide concerns (`AppNavProvider`, `ThemeProvider`, `AuthProvider`, `NavigationProvider`, `DashboardProvider`) live at the root. When adding a new role-specific feature, register its provider in the matching branch of `_Root.build`.

Role checks live on `AuthSession` (`canUseDriverApp`, `canUseConfirmatriceApp`, `canUseCustomerApp` in `data/services/auth_service.dart`) — use these instead of comparing role strings directly.

### Feature slices

Each role's feature typically has four files that must stay in sync:

- `models/<entity>.dart` — `fromMap`/`toMap`
- `data/services/<entity>_service.dart` — endpoint paths and body shapes
- `state/<entity>_provider.dart` — `loading`/`saving`/`error`/`items` + actions that call `notifyListeners()`
- `ui/screens/<entity>_screen.dart`

Confirmatrice orders (`lib/data/services/confirmatrice_orders_service.dart`) is a clean reference example, including `updateStatus` (PUT with numeric status 0–3) and `transformToBl` (POST that returns a BL piece ID under several possible field names).

### Status codes

`lib/core/constants.dart` defines the domain `Statut` enum (1=confirmé, 2=enLivraison, 3=livré, 4=reporté, 5=retourné, 6=dépôt). Keep numeric values consistent with the backend; the confirmatrice orders API uses a different 0–3 range validated in `ConfirmatriceOrdersService.updateStatus`.

### Auth flow

`AuthService.login` → `POST /api/auth/login` → store token → `restoreSession` → `GET /api/auth/me` → build `AuthSession(roles, profile)`. `AuthProvider.tryAutoLogin()` runs at startup; if the token is present it rehydrates the session before the first frame.

### Notifications

`NotificationService.I.init()` runs before `runApp` in `main.dart`. Any new scheduled/local notification code should go through this singleton.

### Language

UI copy is in French. Error messages thrown from services and shown in the UI are also French — keep new strings consistent.
