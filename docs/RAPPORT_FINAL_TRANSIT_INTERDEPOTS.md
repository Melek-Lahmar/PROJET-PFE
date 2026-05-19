# Rapport final — Module Transit Inter-Dépôts

Date : 2026-05-18  
Branche : `feature/transit-interdepots`

## 1. Résumé

Le module Transit Inter-Dépôts a été implémenté en conservant le backend ASP.NET Core comme source unique de vérité.

Une commande peut désormais déclencher des missions de transit lorsqu'un article n'est pas disponible dans le dépôt destination. Les missions sont suivies par statut, exposées aux livreurs transit via Flutter/React, et contrôlables par le superviseur. Le scan code-barres passe par l'API backend et aucune interface ne modifie l'état localement sans confirmation serveur.

## 2. Fichiers modifiés

Backend :

- `Web-Api(Asp.net)/Web-Api/Controllers/Refonte/TransitController.cs`
- `Web-Api(Asp.net)/Web-Api/Controllers/Refonte/SupervisorController.cs`
- `Web-Api(Asp.net)/Web-Api/Controllers/OrdersController.cs`
- `Web-Api(Asp.net)/Web-Api/DTO/Refonte/RefonteDtos.cs`
- `Web-Api(Asp.net)/Web-Api/Model/F_TRANSFERT.cs`
- `Web-Api(Asp.net)/Web-Api/Migrations/20260518010000_AddRefonteZonesTransitSupervisor.cs`
- `Web-Api(Asp.net)/Web-Api/Migrations/20260518214000_EnsureReclamationTentativeTable.cs`
- `Web-Api(Asp.net)/Web-Api/Program.cs`
- `Web-Api(Asp.net)/Web-Api/Services/BonCommandeService.cs`
- `Web-Api(Asp.net)/Web-Api/Services/Orders/CustomerTrackingBuilder.cs`
- `Web-Api(Asp.net)/Web-Api/Services/Refonte/StockTransferService.cs`
- `Web-Api(Asp.net)/Web-Api/Services/Refonte/TransitOrchestrationService.cs`
- `Web-Api(Asp.net)/Web-Api/Services/Refonte/OrderTimelineService.cs`

React :

- `React-Ecommerce/src/core/http/endpoints.ts`
- `React-Ecommerce/src/features/orders/api/ordersApi.ts`
- `React-Ecommerce/src/features/orders/components/OrderTimeline.tsx`
- `React-Ecommerce/src/features/orders/pages/ClientOrderDetailsPage.tsx`
- `React-Ecommerce/src/features/orders/pages/OrderDetailsPage.tsx`
- `React-Ecommerce/src/features/orders/types/order.ts`
- `React-Ecommerce/src/features/supervisor/pages/SupervisorAlertsPage.tsx`
- `React-Ecommerce/src/features/supervisor/pages/SupervisorDashboardPage.tsx`
- `React-Ecommerce/src/features/transit/pages/TransitDashboardPage.tsx`

Flutter :

- `flutter/android/app/src/main/AndroidManifest.xml`
- `flutter/lib/data/services/refonte/transit_service.dart`
- `flutter/lib/data/services/refonte/supervisor_service.dart`
- `flutter/lib/ui/screens/transit/transit_home_screen.dart`
- `flutter/lib/ui/screens/transit/transit_mission_details_screen.dart`
- `flutter/lib/ui/screens/transit/transit_barcode_scanner_screen.dart`
- `flutter/lib/ui/screens/supervisor/supervisor_home_screen.dart`

## 3. Backend

Le backend gère :

- la planification des transits après création de commande ;
- la réutilisation de `F_TRANSFERT` comme table de mission transit ;
- les statuts transit normalisés ;
- le scan code-barres transactionnel ;
- les logs d'audit transit ;
- la timeline commande commune à React et Flutter ;
- les anomalies superviseur via `F_SUPERVISOR_ALERT`.

Les anciennes routes transit sont conservées pour compatibilité.

## 4. React

React ne recalcule plus la timeline client lorsqu'une timeline backend est disponible.

Ajouts principaux :

- consommation de `GET /api/orders/{commandeId}/timeline` ;
- consommation de `GET /api/orders/{commandeId}/transit-summary` ;
- dashboard livreur transit basé sur `/api/transit/my-missions` ;
- dashboard superviseur basé sur `/api/supervisor/transit-missions` ;
- page problèmes superviseur basée sur `/api/supervisor/issues`.

## 5. Flutter

Flutter consomme les mêmes endpoints que React.

Ajouts principaux :

- écran missions livreur transit ;
- écran détail mission ;
- écran scan code-barres avec `mobile_scanner` ;
- permission Android caméra ;
- espace superviseur avec statistiques, missions transit, problèmes et livreurs ;
- correction superviseur de statut avec justification ;
- relance d'affectation automatique par commande.

Flutter n'applique aucun changement optimiste après scan : il attend la réponse API.

## 6. n8n

n8n n'a pas été modifié.

Audit rapide :

- les workflows présents concernent le chatbot admin ;
- les webhooks n8n appellent principalement `/api/admin/chat/*` ;
- aucun workflow n8n détecté ne modifie directement les statuts transit ;
- le transit reste donc contrôlé par le backend.

## 7. Endpoints ajoutés ou complétés

Livreur transit :

- `GET /api/transit/my-missions`
- `GET /api/transit/my-missions/{id}`
- `POST /api/transit/scan`
- `POST /api/transit/manual-status`

Superviseur :

- `GET /api/supervisor/transit-missions`
- `GET /api/supervisor/transit-missions/{id}`
- `POST /api/supervisor/transit-missions/{id}/assign`
- `POST /api/supervisor/transit-missions/{id}/change-status`
- `GET /api/supervisor/issues`
- `POST /api/supervisor/issues/{id}/resolve`
- `POST /api/supervisor/orders/{commandeId}/retry-assignment`

Timeline :

- `GET /api/orders/{commandeId}/timeline`
- `GET /api/orders/{commandeId}/transit-summary`

## 8. Entités, tables et migrations

Tables réutilisées :

- `F_TRANSFERT`
- `F_TRANSFERT_AUDIT_LOG`
- `F_SUPERVISOR_ALERT`
- `F_ARTSTOCK`
- `F_DEPOT`
- `F_DOCENTETE`
- `F_DOCLIGNE`

Migrations ajoutées ou corrigées :

- `20260518010000_AddRefonteZonesTransitSupervisor` : migration transit rendue visible par EF et idempotente pour pouvoir être appliquée sur une base déjà préparée ou une base neuve.
- `20260518214000_EnsureReclamationTentativeTable` : migration de réparation idempotente pour créer `F_RECLAMATION_TENTATIVE`, table référencée par le modèle mais absente de la base locale.

Validation migration :

- `dotnet ef migrations list --no-build` liste maintenant les deux migrations comme appliquées.
- `dotnet ef database update --no-build` exécuté avec succès sur `webApi_old`.
- `/api/dev/reset-seed` validé après correction : `Reset + seed OK`.

## 9. DTOs

DTOs ajoutés ou complétés :

- `TransitScanRequestDto`
- `TransitScanResultDto`
- `ChangeTransitStatusDto`
- `ManualTransitAssignmentDto`
- `TransitOrderLineInput`
- `TransitPreparationResult`
- `TransitTransferDraftDto`
- `TransitBlockedItemDto`
- `OrderTimelineDto`
- `OrderTimelineStepDto`
- `OrderItemTransitStatusDto`
- `OrderItemsTransitSummaryDto`

## 10. Services

Services ajoutés :

- `TransitOrchestrationService`
- `OrderTimelineService`

Service complété :

- `StockTransferService`

Responsabilités :

- création de missions transit ;
- affectation livreur transit ;
- scan départ/arrivée ;
- audit des scans ;
- recalcul du statut commande ;
- création d'anomalies superviseur ;
- construction de la timeline backend.

## 11. Sécurité

Contrôles appliqués :

- endpoints transit protégés par rôles ;
- seuls le livreur transit affecté, le superviseur ou l'admin peuvent accéder aux missions concernées ;
- endpoints superviseur limités à la policy superviseur ;
- validation mission, utilisateur, statut, code-barres et appartenance commande avant mutation ;
- mauvais scan sans mutation métier ;
- transition manuelle réservée au superviseur/admin avec justification.

## 12. Tests exécutés

Commandes exécutées :

```bash
dotnet build "C:\PFE-Refonte-Complete\Web-Api(Asp.net)\Web-Api.slnx"
dotnet test "C:\PFE-Refonte-Complete\Web-Api(Asp.net)\Web-Api.slnx" --no-build
npm run build
flutter analyze
flutter analyze --no-fatal-infos --no-fatal-warnings
flutter analyze <fichiers Flutter modifiés> --no-fatal-infos --no-fatal-warnings
dotnet ef database update --no-build
```

Résultats :

- Backend build : OK.
- Backend tests : OK, 1 réussi, 5 ignorés.
- React build : OK.
- Flutter analyse globale stricte : uniquement des diagnostics `info` existants, pas d'erreur bloquante.
- Flutter analyse globale non fatale : OK.
- Flutter analyse ciblée des fichiers modifiés : OK, aucun diagnostic.
- Migrations EF : OK, aucune migration transit en attente après application.
- Seed dev : OK après création de `F_RECLAMATION_TENTATIVE`.

Validation API réelle :

- Authentification OK : `transit@gmail.com` avec rôle `LIVREUR` et `isTransit=true`.
- Authentification OK : `superviseur@gmail.com` avec rôle `SUPERVISEUR`.
- `GET /api/transit/my-missions` : OK.
- `GET /api/supervisor/transit-missions` : OK.
- `GET /api/supervisor/issues` : OK.

Scénario E2E contrôlé :

- Article : `ASS001`, code-barres `3782940199614`.
- Fixture stock : dépôt source 1 avec quantité 10, dépôt destination 2 sans stock.
- Commande pickup créée : `BC26051820526`.
- Mission transit créée : `fa7d4eda-eb14-476c-afe2-416db5f86368`.
- Timeline initiale : `EN_ATTENTE_TRANSIT`.
- Mauvais scan `0000000000000` : HTTP 404, `BARCODE_NOT_FOUND`, aucune mutation métier attendue.
- Premier scan correct : réponse `EN_COURS_TRANSIT`, mission `EN_TRANSIT`.
- Deuxième scan correct : réponse `RECU_DEPOT_DESTINE`, mission `RECU_AU_DEPOT`.
- Timeline finale : `TRANSIT_TERMINE`.
- Résumé final : transit requis et complet.
- Stock après scan : dépôt 1 = 9, dépôt 2 = 1.
- Audit logs : 3 entrées pour la mission.
- Nettoyage test : commande, mission, audit logs et stock fixture supprimés après validation.

## 13. Résultats build

Backend :

- 0 erreur.
- 21 warnings existants.

React :

- build Vite OK.
- warning non bloquant : chunk JavaScript supérieur à 500 kB.

Flutter :

- pas d'erreur bloquante détectée.
- le projet global contient encore des infos/lints historiques non liés au module transit.

## 14. Bugs restants

Non vérifiés en conditions réelles :

- scan physique caméra sur appareil ;
- affectation automatique avec données GPS/proximité réelles ;
- réception stock destination sur cas multi-articles réel ;
- contrôle visuel final sur toutes tailles d'écran Flutter.

## 15. Points à vérifier manuellement

Scénarios métier prioritaires :

1. Commande retrait dépôt sans transit.
2. Commande retrait dépôt avec un article venant d'un autre dépôt.
3. Commande multi-articles multi-dépôts.
4. Livraison domicile avec transit puis affectation livreur classique.
5. Premier scan correct.
6. Deuxième scan correct.
7. Mauvais scan.
8. Code-barres inconnu.
9. Article déjà reçu.
10. Aucun livreur transit disponible.
11. Superviseur relance l'affectation.
12. Superviseur corrige un statut avec justification.

## 16. Instructions de lancement

Backend :

```bash
cd "C:\PFE-Refonte-Complete\Web-Api(Asp.net)\Web-Api"
dotnet run
```

React :

```bash
cd "C:\PFE-Refonte-Complete\React-Ecommerce"
npm run dev
```

Flutter :

```bash
cd "C:\PFE-Refonte-Complete\flutter"
flutter pub get
flutter run
```

n8n, si démonstration chatbot :

```bash
cd "C:\PFE-Refonte-Complete\n8n"
start-n8n.bat
```

## 17. Limites connues

- Le module utilise les tables transit existantes au lieu d'ajouter un modèle `TransitMissionLine` séparé.
- Les anomalies superviseur sont exposées via `F_SUPERVISOR_ALERT`, qui joue le rôle opérationnel de `SupervisorIssue`.
- Les tests automatisés métier transit complets ne sont pas encore créés.
- La validation caméra Flutter nécessite un appareil ou émulateur avec caméra.
- Les workflows n8n restent historiques/chatbot et ne sont pas intégrés au transit.
