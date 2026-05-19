# Rapport — Refonte PFE préparée

## Statut

Cette archive contient une version **préparée pour tests locaux** de la refonte demandée autour du flow commande tunisien.

Travail réalisé sans exécution `dotnet build` ni `flutter analyze`, car ces outils ne sont pas disponibles dans l’environnement d’exécution utilisé ici. La vérification TypeScript a été lancée via `tsc -b` et a passé l’étape TypeScript ; le lancement Vite a échoué uniquement sur une permission d’exécutable liée au `node_modules` symlinké de l’environnement, pas sur une erreur TypeScript détectée.

## Modifications principales backend

- Ajout du rôle `SUPERVISEUR` dans `AppRoles`.
- Ajout de `IsTransit` et `DepotRattacheNo` dans `ProfilUtilisateur`.
- Ajout des champs de refonte dans `F_DOCENTETE` : `DeliveryMode`, `PickupDepotNo`, `GeoValidationStatus`, `HasDeliveryIncident`, `GeoLat`, `GeoLng`.
- Enrichissement de `F_CLIENT_ADDRESS` : limite logique 4, `Landmark`, `GeoValidationStatus`.
- Ajout des entités :
  - `F_DEPOT_ZONE`
  - `F_LIVREUR_ZONE`
  - `F_TRANSFERT`
  - `F_TRANSFERT_AUDIT_LOG`
  - `F_SUPERVISOR_ALERT`
  - `F_DELIVERY_INCIDENT_PHOTO`
- Ajout de services :
  - `IDepotZoneService`
  - `IStockTransferService`
  - `ISupervisorAlertService`
- Ajout d’endpoints :
  - `/api/admin/depot-zones`
  - `/api/geo/pickup-options`
  - `/api/transit/*`
  - `/api/supervisor/*`
  - `/api/orders/preview-address`
- Ajout de `SupervisorHub`.
- Ajout d’une migration manuelle : `AddRefonteZonesTransitSupervisor`.
- Normalisation partielle des erreurs dans `GlobalExceptionMiddleware`.
- Nettoyage des secrets en clair dans `appsettings.json` avec placeholders.

## Modifications principales React

- Ajout endpoints refonte dans `endpoints.ts`.
- Ajout routes admin :
  - `/admin/depot-zones`
  - `/admin/coverage-map`
- Ajout routes superviseur :
  - `/supervisor/dashboard`
  - `/supervisor/zones`
  - `/supervisor/alerts`
  - `/supervisor/audit`
- Ajout routes transit consultation :
  - `/transit`
  - `/transit/dashboard`
- Ajout composants checkout :
  - `GpsValidatorSection`
  - `MapPinPicker`
  - `AddressTempForm`
  - `DepotPickerSection`
- Ajout intercepteur d’erreur Axios compatible avec le format backend normalisé.

## Modifications principales Flutter

- Correction `apiBaseUrl` : `http:/...` → `http://...`.
- Désactivation du webhook n8n codé en dur dans `constants.dart`.
- Externalisation du token Mapbox via `String.fromEnvironment`.
- Ajout dépendances prévues : `mobile_scanner`, `audioplayers`, `flutter_image_compress`.
- Ajout services :
  - `TransitService`
  - `SupervisorService`
- Ajout écrans :
  - `TransitHomeScreen`
  - `SupervisorHomeScreen`
- Auth Flutter enrichie avec `isTransit`, `interfaces`, `canUseTransitApp`, `canUseSupervisorApp`.

## Points à vérifier localement

1. `dotnet restore`
2. `dotnet build "Web-Api(Asp.net)/Web-Api/Web-Api.sln"`
3. `dotnet ef database update -p "Web-Api(Asp.net)/Web-Api"`
4. `cd React-Ecommerce && npm install && npm run build`
5. `cd flutter && flutter pub get && flutter analyze`

## Limites connues

- La refonte complète fonctionnelle de tous les chantiers reste très large. Cette archive prépare les structures principales, endpoints, modèles et interfaces de base.
- Les algorithmes D12/D13/D14 sont amorcés mais pas entièrement industrialisés.
- Le scan Flutter contient l’espace transit et les services API, mais le branchement caméra `mobile_scanner` doit être finalisé localement.
- La validation distance dépôt < 500m est à renforcer dans `StockTransferService`.
- Le fichier GeoJSON réel `tunisia_delegations.geojson` reste nécessaire pour finaliser le Chantier 1.
- Le snapshot EF Core n’a pas été régénéré faute de CLI dotnet disponible.

