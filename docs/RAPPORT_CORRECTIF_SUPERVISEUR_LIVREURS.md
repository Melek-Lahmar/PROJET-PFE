# Rapport correctif — Superviseur, livreurs, zones et transit

## Objectif

Ce correctif applique la logique métier validée :

- le rôle `SUPERVISEUR` doit être visible dans la gestion des rôles admin React ;
- le superviseur gère les livreurs classiques et les livreurs-transit ;
- chaque livreur classique possède des zones exactes `gouvernorat + délégation` ;
- un BL ne s'affiche au livreur que si le BL appartient à une de ses zones exactes ;
- le backend refuse la prise d'un BL hors zone ;
- un livreur-transit reste un utilisateur avec rôle `LIVREUR` et `IsTransit = true` ;
- chaque livreur-transit est rattaché à un dépôt via `DepotRattacheNo` ;
- les candidats de réaffectation transit sont triés par nombre de transits en attente vers le même dépôt destination, puis par distance.

## Fichiers modifiés

### Backend

- `Web-Api(Asp.net)/Web-Api/Controllers/Refonte/SupervisorController.cs`
  - ajout création livreur depuis espace superviseur ;
  - ajout modification livreur classique/transit ;
  - gestion `IsTransit` et `DepotRattacheNo` ;
  - remplacement des zones `F_LIVREUR_ZONE` ;
  - endpoint candidats de réaffectation transit.

- `Web-Api(Asp.net)/Web-Api/Controllers/Refonte/TransitController.cs`
  - accès restreint au rôle `LIVREUR` uniquement ;
  - vérification obligatoire `IsTransit = true` et `DepotRattacheNo != null` avant pending/in-progress/history/stats/scan.

- `Web-Api(Asp.net)/Web-Api/Services/Livreur/CommandePoolService.cs`
  - filtrage du pool BL par zones exactes `F_LIVREUR_ZONE.Gouvernorat + F_LIVREUR_ZONE.Delegation` ;
  - suppression du fallback gouvernorat simple ;
  - un livreur sans zone ne voit aucun BL ;
  - un livreur-transit ne voit aucun BL client ;
  - contrôle backend avant prise de BL.

- `Web-Api(Asp.net)/Web-Api/DTO/Refonte/RefonteDtos.cs`
  - ajout DTO création/modification livreur superviseur.

### React

- `React-Ecommerce/src/features/adminUsers/types/adminUsers.ts`
  - ajout du rôle `SUPERVISEUR`.

- `React-Ecommerce/src/features/adminUsers/components/AdminEditRolesModal.tsx`
  - ajout du bouton rôle `SUPERVISEUR`.

- `React-Ecommerce/src/features/adminUsers/components/AdminCreateUserModal.tsx`
  - ajout du rôle `SUPERVISEUR` dans la création admin ;
  - mot de passe par défaut passé à `12345678`.

- `React-Ecommerce/src/features/adminUsers/pages/AdminUsersPage.tsx`
  - filtre `SUPERVISEUR` ajouté ;
  - badge rôle ajouté.

- `React-Ecommerce/src/features/supervisor/pages/SupervisorZonesPage.tsx`
  - remplacement du squelette par une vraie page de gestion livreurs ;
  - liste complète livreurs ;
  - distinction classique/transit ;
  - ajout livreur ;
  - modification livreur ;
  - ajout/suppression zones ;
  - affectation dépôt pour livreur-transit.

- `React-Ecommerce/src/features/auth/utils/postAuthRedirect.ts`
- `React-Ecommerce/src/app/guards/PublicShopRoute.tsx`
- `React-Ecommerce/src/shared/components/Navbar.tsx`
- `React-Ecommerce/src/shared/components/Footer.tsx`
  - redirection et détection du rôle `SUPERVISEUR`.

## Aucun changement de schéma

Aucune nouvelle migration n'est nécessaire pour ce correctif, car les tables nécessaires existent déjà :

- `F_LIVREUR_ZONE`
- `F_TRANSFERT`
- `ProfilsUtilisateurs.IsTransit`
- `ProfilsUtilisateurs.DepotRattacheNo`

## Tests à faire localement

1. Backend : `dotnet build`.
2. API : vérifier Swagger.
3. Admin React : vérifier que `SUPERVISEUR` s'affiche dans la modale rôles.
4. Login superviseur : vérifier redirection vers `/supervisor/zones`.
5. Page superviseur : ajouter un livreur classique avec zone.
6. Page superviseur : ajouter un livreur-transit avec dépôt rattaché.
7. Livreur classique : vérifier que seuls les BL de ses zones s'affichent.
8. Livreur hors zone : vérifier que la prise de BL est refusée côté API.
9. Livreur-transit : vérifier qu'il ne voit pas le pool BL client.
10. Transit : vérifier que les endpoints `/api/transit/*` refusent un livreur non-transit.
