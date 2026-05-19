# PAYMENT_MODULE_ANALYSIS

Date : 2026-05-19  
Module cible : Paiement virtuel sécurisé / Virtual Payment Gateway

## 1. Structure générale du backend

Le backend est un projet ASP.NET Core Web API situé dans `Web-Api(Asp.net)/Web-Api`.

Structure observée :

- `Program.cs` : composition de l'application, DI, JWT, CORS, Swagger, Hangfire, services métier.
- `data/AppDbContext.cs` : `IdentityDbContext` principal, DbSet Sage/refonte, configuration EF Core.
- `Controllers/` : contrôleurs API par domaine, dont `OrdersController` et `KonnectPaymentsController`.
- `Services/` : services métier, dont `BonCommandeService`, `OrderCalculatorService`, services paiement et services refonte.
- `Model/` : entités EF/Sage, dont `B_PAIEMENT`, `F_DOCENTETE`, `F_DOCLIGNE`, `F_ARTICLE`, `F_ARTSTOCK`.
- `DTO/` : contrats API séparés par domaine.
- `Options/` : options typées, dont `KonnectOptions`.

Le projet de tests se trouve dans `Web-Api(Asp.net)/Web-Api.Tests` et utilise xUnit.

## 2. Structure générale du frontend

Le frontend est une application React/Vite/TypeScript située dans `React-Ecommerce`.

Structure observée :

- `src/app/routes.tsx` : routage principal React Router.
- `src/core/http/axiosClient.ts` : client Axios centralisé avec injection automatique du JWT.
- `src/core/http/endpoints.ts` : registre central des endpoints API.
- `src/features/checkout/pages/CheckoutPage.tsx` : checkout client connecté.
- `src/features/checkout/pages/GuestCheckoutPage.tsx` : checkout invité.
- `src/features/payments/` : types, API et pages liées au paiement Konnect.
- `src/features/orders/` : types et API commandes.
- `src/features/cart/store/cartStore.ts` : panier Zustand persisté.

Le style utilise des variables CSS `hsl(var(--...))`, Tailwind et des classes globales comme `app-surface`, avec compatibilité dark mode via la classe `dark`.

## 3. Fichiers existants liés au paiement

Backend :

- `Model/B_PAIEMENT.cs`
- `Controllers/KonnectPaymentsController.cs`
- `Services/Payments/KonnectPaymentService.cs`
- `Services/Payments/IKonnectClient.cs`
- `Services/Payments/KonnectClient.cs`
- `DTO/Payments/KonnectPaymentDtos.cs`
- `Options/KonnectOptions.cs`
- `Program.cs`
- `data/AppDbContext.cs`

Frontend :

- `src/features/payments/types/konnectPayment.ts`
- `src/features/payments/api/konnectPaymentsApi.ts`
- `src/features/payments/pages/KonnectReturnPage.tsx`
- `src/features/payments/components/CheckoutPaymentMethodSelector.tsx`
- `src/core/http/endpoints.ts`

## 4. Fichiers existants liés au checkout

Backend :

- `Controllers/OrdersController.cs`
- `Services/BonCommandeService.cs`
- `DTO/Orders/CreateBonCommandeRequestDto.cs`
- `DTO/Orders/CreateGuestBonCommandeRequestDto.cs`
- `DTO/Orders/BonCommandeResponseDto.cs`

Frontend :

- `src/features/checkout/pages/CheckoutPage.tsx`
- `src/features/checkout/pages/GuestCheckoutPage.tsx`
- `src/features/checkout/pages/CheckoutEntryPage.tsx`
- `src/features/checkout/pages/GuestCheckoutSuccessPage.tsx`
- `src/features/cart/store/cartStore.ts`

## 5. Fichiers existants liés aux commandes

Backend :

- `Controllers/OrdersController.cs`
- `Services/BonCommandeService.cs`
- `Services/OrderCalculatorService.cs`
- `Model/F_DOCENTETE.cs`
- `Model/F_DOCLIGNE.cs`
- `Model/F_ARTICLE.cs`
- `Model/F_ARTSTOCK.cs`

Frontend :

- `src/features/orders/api/ordersApi.ts`
- `src/features/orders/types/order.ts`
- `src/features/orders/pages/OrdersPage.tsx`
- `src/features/orders/pages/OrderDetailsPage.tsx`

## 6. Fichiers existants liés à Konnect

Backend :

- `Controllers/KonnectPaymentsController.cs`
- `Services/Payments/KonnectPaymentService.cs`
- `Services/Payments/IKonnectClient.cs`
- `Services/Payments/KonnectClient.cs`
- `DTO/Payments/KonnectPaymentDtos.cs`
- `Options/KonnectOptions.cs`
- section `Konnect` dans `appsettings.json`

Frontend :

- `src/features/payments/api/konnectPaymentsApi.ts`
- `src/features/payments/types/konnectPayment.ts`
- `src/features/payments/pages/KonnectReturnPage.tsx`
- route `/checkout/konnect/return`

Konnect doit rester présent et non modifié fonctionnellement.

## 7. Modèle de paiement existant

`B_PAIEMENT` est la table de paiement locale et suffit pour le module virtuel.

Constantes existantes :

- `MODE_ONLINE`
- `TYPE_ONLINE`
- `FOURNISSEUR_KONNECT`
- `FOURNISSEUR_MOCK`
- `STATUS_INITIE`
- `STATUS_EN_ATTENTE`
- `STATUS_SUCCES`
- `STATUS_ECHEC`
- `STATUS_ANNULE`
- `STATUS_EXPIRE`

À ajouter si absent :

- `FOURNISSEUR_VIRTUAL = "VIRTUAL"`

Champs exploitables :

- `DO_Piece`
- `PA_Mode`
- `PA_Type`
- `PA_Statut`
- `PA_Montant`
- `PA_Date`
- `PA_Reference`
- `PA_Fournisseur`
- `PA_ProviderPaymentId`
- `PA_StatutExterne`
- `PA_IsSandbox`
- `cbCreation`
- `cbModification`

Aucune nouvelle table n'est nécessaire.

## 8. Flux actuel du paiement client connecté

Dans `CheckoutPage.tsx` :

1. Le client choisit `COD` ou `KONNECT`.
2. `COD` appelle `createOrder`.
3. `KONNECT` appelle `initiateKonnectPayment`.
4. Le backend crée la commande via `BonCommandeService.CreateForAuthenticatedClientAsync`.
5. `KonnectPaymentService` crée une ligne `B_PAIEMENT`.
6. En mode mock, le backend retourne une URL de retour Konnect simulée.
7. Le panier est vidé après initiation réussie.

Ce flux est déjà backend-driven.

## 9. Flux actuel du paiement invité

Dans `GuestCheckoutPage.tsx` :

1. Le client invité choisit `COD` ou `KONNECT`.
2. `COD` appelle `createGuestOrder`.
3. `KONNECT` n'appelle pas le backend de paiement.
4. `KONNECT` utilise une fonction locale `buildKonnectPreviewUrl`.
5. Aucune commande invitée ni ligne `B_PAIEMENT` n'est créée pour ce paiement simulé.

C'est le problème fonctionnel principal : le paiement invité doit devenir backend-driven comme le client connecté.

## 10. Problèmes détectés

- Le checkout invité Konnect est une preview frontend locale.
- Le type `CheckoutPaymentMethod` est actuellement `"COD" | "KONNECT"`.
- Le composant `CheckoutPaymentMethodSelector` affiche encore Konnect comme simulation visuelle.
- `CheckoutPage.tsx` utilise un select simple pour le paiement, pas le composant premium déjà disponible.
- Les tests backend existants ne couvrent pas le paiement.
- `B_PAIEMENT` n'a pas encore `FOURNISSEUR_VIRTUAL`.
- Le worktree contient déjà des changements non liés au paiement ; il faut éviter tout revert.

## 11. Risques techniques

- Double création de commande si double clic non maîtrisé.
- Double confirmation d'un même paiement.
- Confirmation après annulation ou après statut final.
- Stock insuffisant remonté par `BonCommandeService`.
- Divergence entre statut commande et statut paiement.
- Exposition accidentelle de données sensibles dans logs ou base.
- Régression Konnect si les types ou routes existantes sont remplacés au lieu d'être conservés.
- Régression checkout invité si le payload invité n'est pas transmis tel que prévu par `CreateGuestBonCommandeRequestDto`.

## 12. Fichiers à créer

Backend :

- `Web-Api(Asp.net)/Web-Api/DTO/Payments/VirtualPaymentDtos.cs`
- `Web-Api(Asp.net)/Web-Api/Services/Payments/VirtualPaymentService.cs`
- `Web-Api(Asp.net)/Web-Api/Controllers/VirtualPaymentsController.cs`
- `Web-Api(Asp.net)/Web-Api.Tests/Payments/VirtualPaymentServiceTests.cs`

Frontend :

- `React-Ecommerce/src/features/payments/types/virtualPayment.ts`
- `React-Ecommerce/src/features/payments/api/virtualPaymentsApi.ts`
- `React-Ecommerce/src/features/payments/pages/VirtualPaymentPage.tsx`
- `React-Ecommerce/src/features/payments/pages/VirtualPaymentReturnPage.tsx`

Documentation :

- `PAYMENT_MODULE_TEST_REPORT.md`
- `PAYMENT_MODULE_REPORT_SECTION.md`

## 13. Fichiers à modifier

Backend :

- `Model/B_PAIEMENT.cs`
- `Program.cs`

Frontend :

- `src/core/http/endpoints.ts`
- `src/features/payments/types/konnectPayment.ts`
- `src/features/payments/components/CheckoutPaymentMethodSelector.tsx`
- `src/features/checkout/pages/CheckoutPage.tsx`
- `src/features/checkout/pages/GuestCheckoutPage.tsx`
- `src/app/routes.tsx`

## 14. Stratégie d'intégration retenue

Stratégie retenue : ajouter une passerelle virtuelle à côté de Konnect.

- Konnect reste intact pour une future production.
- Le module virtuel possède ses DTOs, son service, son contrôleur, son API frontend et ses pages React.
- `B_PAIEMENT` reste la source locale de vérité paiement.
- `BonCommandeService` reste la source de création des commandes.
- Le statut paiement reste séparé du statut commande.
- Les cartes, CVV et OTP sont validés en mémoire uniquement.
- Le checkout utilise techniquement la valeur `"VIRTUAL"` pour le nouveau flux afin d'éviter l'ambiguïté avec Konnect.
- Les fichiers Konnect existants sont conservés.

## 15. Plan de test

Backend :

- `dotnet restore`
- `dotnet build Web-Api/Web-Api.csproj`
- `dotnet test Web-Api.Tests/Web-Api.Tests.csproj`

Tests unitaires à ajouter :

- validation carte succès ;
- refus ;
- annulation ;
- expiration ;
- attente ;
- fonds insuffisants ;
- carte bloquée ;
- erreur provider ;
- OTP incorrect ;
- carte inconnue ;
- date expirée ;
- CVV invalide ;
- paiement inexistant ;
- double confirmation ;
- confirmation après annulation ;
- annulation après succès.

Frontend :

- `npm install`
- `npm run build`
- `npm run lint`

Tests manuels :

- client connecté + paiement virtuel succès/refus/annulé/expiré/en attente ;
- invité + paiement virtuel succès/refus/annulé/expiré ;
- OTP incorrect ;
- carte inconnue ;
- CVV invalide ;
- date expirée ;
- mauvaise référence `paymentRef` ;
- double clic ;
- double confirmation ;
- confirmation après annulation ;
- annulation après succès ;
- panier vide ;
- stock insuffisant.

## 16. Diagnostic correctif - page de paiement virtuelle non affichée

Après vérification du code réel, le problème critique n'était pas dans les rapports Markdown mais dans le branchement effectif du flux utilisateur.

Causes confirmées :

- Le service backend générait une URL de paiement à partir de `KonnectOptions.FrontendBaseUrl`. Dans un environnement où React peut tourner sur un port différent de celui configuré, cette URL absolue peut envoyer l'utilisateur vers le mauvais serveur frontend.
- La route React `/checkout/virtual-payment` était placée dans le groupe protégé par `PublicShopRoute`. Cette garde peut attendre le bootstrap d'authentification ou rediriger selon le rôle, ce qui est inadapté pour une page de paiement accessible par référence `piece + paymentRef`.
- Le checkout invité avait historiquement un flux preview local Konnect. Il devait impérativement appeler `POST /api/payments/virtual/initiate/guest`.
- Le checkout connecté devait vérifier explicitement que `payUrl` existe avant de vider le panier et de naviguer.

Décision de correction :

- Le backend retourne désormais une URL relative : `/checkout/virtual-payment?piece=...&paymentRef=...`.
- Les routes `/checkout/virtual-payment` et `/checkout/virtual-payment/return` sont déclarées directement dans le layout principal, hors garde `PublicShopRoute`.
- Le paiement visible dans le checkout utilise la valeur technique `VIRTUAL`.
- Le checkout connecté appelle `initiateVirtualPayment`.
- Le checkout invité appelle `initiateVirtualGuestPayment`.
- L'ancien comportement de preview locale n'est plus utilisé pour le paiement virtuel.

## 17. Flux corrigé

Flux client connecté :

1. `CheckoutPage.tsx` sélectionne `paymentMethod === "VIRTUAL"`.
2. Le frontend appelle `POST /api/payments/virtual/initiate`.
3. Le backend crée la commande via `BonCommandeService`.
4. Le backend crée la ligne `B_PAIEMENT`.
5. Le backend retourne `payUrl = /checkout/virtual-payment?piece=...&paymentRef=...`.
6. React redirige vers la page de saisie carte.

Flux invité :

1. `GuestCheckoutPage.tsx` sélectionne `paymentMethod === "VIRTUAL"`.
2. Le frontend appelle `POST /api/payments/virtual/initiate/guest`.
3. Le backend crée une vraie commande invitée.
4. Le backend crée une vraie tentative `B_PAIEMENT`.
5. Le frontend redirige vers la même page dédiée de paiement virtuel.

## 18. Etat final des routes de paiement

- `/checkout/virtual-payment` affiche `VirtualPaymentPage`.
- `/checkout/virtual-payment/return` affiche `VirtualPaymentReturnPage`.
- `/checkout/konnect/return` reste conservée pour Konnect.

La page `VirtualPaymentPage` lit `piece` et `paymentRef`, interroge le statut backend, affiche le montant, la devise, la référence commande, la référence paiement, le fournisseur, le formulaire carte et les cartes de test.
