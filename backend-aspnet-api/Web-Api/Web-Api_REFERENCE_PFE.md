# Référence projet — Web-Api

## 1. But de ce fichier
Ce document est un **fichier maître de référence** pour le projet backend `Web-Api`.
Il sert à conserver en un seul endroit :
- l’architecture du backend,
- les controllers et endpoints,
- les services métier,
- les entités et DTO,
- les flux critiques,
- les dépendances vers Sage X3,
- les risques structurels,
- les points à revérifier après évolution.

Il est basé sur **l’état réel du code actuellement fourni** dans `Web-Api.zip`.

---

## 2. Identité globale du projet

### Rôle du projet
`Web-Api` est le **backend principal** du PFE.
Il expose les API utilisées par le frontend `React-Ecommerce` et sert de couche métier entre :
- la base locale SQL Server,
- les utilisateurs/authentification,
- les documents commerciaux,
- les référentiels article/stock/catalogue/dépôt,
- l’intégration Sage X3.

### Position dans l’ensemble PFE
C’est la **colonne vertébrale métier et technique** du projet.

### Lecture métier la plus crédible
Le backend gère une boutique connectée à un ERP, avec au minimum :
- comptes utilisateurs,
- profils clients,
- catalogue,
- stocks,
- commandes,
- workflow confirmateur,
- transformation BC → BL,
- synchronisation descendante depuis Sage X3.

---

## 3. Stack technique

### Stack principale
- **ASP.NET Core 8 Web API**
- **Entity Framework Core 8**
- **SQL Server**
- **ASP.NET Identity**
- **JWT Bearer Authentication**
- **Swagger / Swashbuckle**
- **OAuth externe** (Google / Facebook)
- **HttpClient** pour intégration Sage

### Lecture d’architecture
Le backend suit une logique de type :
- Controllers
- DTO
- Models/Entities
- Services
- DbContext
- Auth

C’est une architecture classique, fonctionnelle, correcte pour un PFE, mais encore partiellement industrialisée.

---

## 4. Structure du projet

### Dossiers importants
- `Auth/`
- `Controllers/`
- `DTO/`
- `Model/`
- `Services/`
- `data/`
- `Geo/`
- `Migrations/`

### Lecture des blocs
- `Auth` : rôles, identité, JWT, seed
- `Controllers` : exposition HTTP
- `DTO` : contrats d’entrée/sortie
- `Model` : entités métier / tables locales
- `Services` : logique transverse ou métier spécialisée
- `data` : `AppDbContext`
- `Geo` : logique gouvernorat / délégation Tunisie
- `Migrations` : évolution du schéma EF

---

## 5. Configuration globale et pipeline

Le point d’entrée est `Program.cs`.

### Configuration confirmée
- `AddControllers()`
- Swagger avec sécurité Bearer
- DbContext SQL Server
- Identity Core + rôles
- JWT options
- Auth JWT + cookies externes + Google/Facebook
- CORS dev autorisant `http://localhost:5173`
- `HttpClient<SageService>`

### Sécurité / pipeline
- `UseHttpsRedirection()`
- `UseCors("AllowDev")`
- `UseAuthentication()`
- `UseAuthorization()`
- `MapControllers()`

### Seed au démarrage
Un `IdentitySeeder` crée les rôles applicatifs au démarrage.

---

## 6. Rôles applicatifs

Les rôles définis dans `Auth/Constants/AppRoles.cs` sont :
- `CLIENT`
- `VENDEUR`
- `CONFIRMATEUR`
- `LIVREUR`
- `ADMIN`

### Lecture métier
Le backend a été pensé pour plusieurs profils internes et externes.

### Observation
La présence explicite de `VENDEUR` et `LIVREUR` indique un périmètre métier potentiellement plus large que ce qui est visible dans tous les écrans front.

---

## 7. Couche données et entités

## 7.1 DbContext
Le `AppDbContext` hérite de `IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>`.

### DbSet importants
- `ProfilsUtilisateurs`
- `F_DOCENTETES`
- `F_DOCLIGNES`
- `F_LIVRAISONS`
- `B_PAIEMENTS`
- `F_TAXES`
- `F_ARTICLES`
- `F_ARTSTOCKS`
- `F_CATALOGUES`
- `F_DEPOTS`
- `F_ARTICLE_IMAGES`

### Lecture générale
Le projet utilise une base locale servant à la fois :
- de base applicative,
- de stockage d’intégration,
- de miroir partiel des référentiels Sage.

---

## 7.2 Entités critiques

### `ApplicationUser`
Étend `IdentityUser<Guid>`.
Rôle : identité technique de l’utilisateur.

### `ProfilUtilisateur`
Entité métier riche contenant :
- type profil,
- type client B2C/B2B,
- identité,
- téléphone,
- société,
- fiscalité,
- adresse,
- gouvernorat / délégation,
- latitude / longitude,
- métadonnées Sage,
- audit.

#### Point important
Cette entité porte une vraie logique métier et pas seulement un profil superficiel.

### `F_DOCENTETE`
Entête documentaire avec :
- type document,
- pièce,
- tiers,
- dépôt,
- totaux,
- statut,
- mode livraison,
- mode paiement,
- snapshot adresse,
- coordonnées,
- audit.

#### Statuts documentaires
Le champ `DO_Valide` est traduit en :
- `0` → `EN_ATTENTE`
- `1` → `CONFIRME`
- `2` → `TENTATIVE`
- `3` → `REFUSE`

### `F_DOCLIGNE`
Lignes documentaires avec :
- article,
- quantité,
- prix unitaire,
- montant HT/TTC,
- pièce,
- audit.

### `F_ARTICLE`
Article produit, fortement aligné Sage.

### `F_ARTSTOCK`
Stock article / dépôt.

### `F_CATALOGUE`
Référentiel catalogue / famille.

### `F_DEPOT`
Référentiel dépôt.

### `F_ARTICLE_IMAGE`
Images associées aux articles.

---

## 8. Contrôleurs principaux

## 8.1 AuthController
Route de base : `api/auth`

### Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me/profile`

### Rôle
- créer le compte,
- générer le JWT,
- exposer l’utilisateur courant,
- mettre à jour le profil.

### Points notables
- rôle par défaut `CLIENT`
- création du `ProfilUtilisateur` dès l’inscription
- validation métier du profil
- mise à jour profil relativement riche

---

## 8.2 ExternalAuthController
Route de base : `api/auth`

### Endpoints
- `GET /api/auth/external/{provider}`
- `GET /api/auth/external/{provider}/callback`

### Rôle
Support de l’authentification externe Google / Facebook.

### Niveau de certitude
Présence technique confirmée dans le code, usage réel à vérifier en exécution.

---

## 8.3 ArticlesController
Route de base : `api/articles`

### Endpoints principaux
- `GET /api/articles`
- `GET /api/articles/{arRef}`

### Capacités identifiées
- pagination
- recherche textuelle
- filtres prix
- filtres stock
- filtres catalogue
- filtres dépôt
- tri
- enrichissement image principale
- calcul de disponibilité agrégée

### Rôle métier
Servir un catalogue produit exploitable par la boutique frontend.

### Point fort
Le controller est riche, utile et couvre un vrai besoin e-commerce.

### Point faible
Il concentre beaucoup de logique de sélection/agrégation dans la couche controller.

---

## 8.4 ArticleImagesController
Routes directement attributées.

### Endpoints visibles
- `GET /api/articles/{arRef}/images`
- `POST /api/articles/images/main`
- `GET /api/admin/articles/{arRef}/images`
- `POST /api/articles/{arRef}/images` (admin)
- `PUT /api/articles/images/{id}` (admin)
- `DELETE /api/articles/images/{id}` (admin)

### Rôle
Exposer et administrer les images d’articles.

### Point positif
Bonne séparation entre lecture publique et actions admin.

---

## 8.5 OrdersController
Route de base : `api/orders`

### Endpoints
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{piece}`

### Rôle métier
Créer un Bon de Commande côté client et exposer l’historique de ses commandes.

### Flux de création confirmé
1. vérification claims utilisateur,
2. validation du panier,
3. validation du mode de livraison,
4. validation dépôt si retrait,
5. validation adresse si livraison,
6. résolution du code client,
7. chargement des articles,
8. contrôle stock,
9. calcul des montants,
10. génération de la pièce BC,
11. création entête,
12. création lignes,
13. transaction base.

### Règles métier visibles
- frais livraison HOME = `8`
- timbre fiscal = `1`
- `PICKUP` nécessite un dépôt
- `HOME` impose une adresse
- le stock est vérifié avant persistance

### Point fort
Vrai flux métier cohérent, plus riche qu’un simple CRUD.

### Points faibles
- beaucoup de logique métier dans le controller,
- peu de mutualisation service,
- gestion d’erreurs encore basique.

---

## 8.6 ConfirmateurController
Route de base : `api/confirmateur`
Accès restreint au rôle `CONFIRMATEUR`.

### Endpoints visibles
- `GET /api/confirmateur/commandes`
- `GET /api/confirmateur/bc`
- `GET /api/confirmateur/commandes/{piece}`
- `GET /api/confirmateur/bc/{piece}`
- `PUT /api/confirmateur/commandes/{piece}/status`
- `PUT /api/confirmateur/bc/{piece}/status`
- `POST /api/confirmateur/commandes/{piece}/transform-to-bl`
- `POST /api/confirmateur/bc/{piece}/transform-to-bl`
- `GET /api/confirmateur/bl`
- `GET /api/confirmateur/bl/{piece}`

### Rôle métier
- lister les BC,
- consulter leur détail,
- modifier leur statut,
- transformer BC en BL,
- consulter les BL.

### Point très important
Le controller contient **une logique de transformation BC → BL**, alors qu’un service dédié `BcToBlService` existe aussi.
C’est une duplication structurelle importante.

---

## 8.7 BonLivraisonsController
Route de base : `api/bl`
Accès : `CONFIRMATEUR` ou `LIVREUR`.

### Endpoints
- `GET /api/bl`
- `GET /api/bl/{piece}`

### Rôle
Exposer les bons de livraison hors du périmètre strict du controller confirmateur.

### Observation importante
Ce controller est plus cohérent avec l’idée d’un accès livreur que le controller confirmateur. Il faudra garder cela en tête pour l’intégration front/back.

---

## 8.8 AdminUsersController
Route : `api/admin/users`
Accès : `ADMIN`.

### Endpoints
- `POST /api/admin/users`
- `GET /api/admin/users`
- `GET /api/admin/users/{userId}`
- `PUT /api/admin/users/{userId}/roles`

### Rôle
- créer utilisateurs internes ou clients,
- lister utilisateurs,
- consulter détail,
- remplacer les rôles.

### Point fort
La création admin crée aussi le profil métier.

### Limite
Beaucoup de travail est fait directement dans le controller.

---

## 8.9 Référentiels / support
### CataloguesController
- `GET /api/catalogues`
- `GET /api/catalogues/{clNo}`

### DepotsController
- `GET /api/depots`
- `GET /api/depots/{deNo}`

### StocksController
- `GET /api/stocks`
- `GET /api/stocks/{arRef}/{deNo}`

### GeoController
- `GET /api/geo/gouvernorats`
- `GET /api/geo/gouvernorats/{id}/delegations`

### DocEntetesController / DocLignesController
CRUD plus technique sur documents, probablement support ou tests avancés.

---

## 8.10 Synchronisation Sage
### Endpoints visibles
- `POST /api/sync/articles`
- `POST /api/sync/catalogues`
- `POST /api/sync/depots`
- `POST /api/sync/stocks`
- `POST /api/SyncAll`
- `GET /api/SyncAll/status`

### Rôle
Importer ou mettre à jour les référentiels Sage dans la base locale.

### Observation critique
Ces routes ne montrent pas de protection d’accès explicite dans le code vu. Cela constitue une faiblesse de sécurité potentielle.

---

## 9. Services

## 9.1 JwtTokenService
Rôle : générer les JWT des utilisateurs.

## 9.2 SageService
Service d’intégration externe principal.

### Endpoints Sage consommés
- `Article/GetArticles`
- `Article/GetStocks`
- `Catalogue/GetCatalogues`
- `Depot/GetDepots`

### Rôle
Récupérer les données distantes depuis Sage X3 via `HttpClient`.

### Comportement
- logs des appels,
- vérification du code HTTP,
- désérialisation de `SageResponseDto<T>`,
- retour d’une liste typée.

### Point fort
Centralisation claire des appels Sage.

### Point faible
La configuration HTTP accepte tout certificat via `DangerousAcceptAnyServerCertificateValidator`, ce qui est tolérable en dev mais pas en production.

## 9.3 BcToBlService
Service spécialisé pour confirmer et transformer un BC en BL avec davantage de rigueur métier.

### Capacités visibles
- validation pièce BC/BL,
- gestion idempotente,
- chargement BC et lignes,
- choix dépôt pour stock,
- transaction `Serializable`,
- contrôle de stock,
- décrément du stock,
- transformation du document,
- chargement DTO BL final.

### Lecture technique
C’est le composant le plus “service métier” du backend.

### Problème structurel majeur
Une logique similaire existe aussi directement dans `ConfirmateurController`.
Il faut éviter cette duplication.

---

## 10. DTO

Les DTO sont organisés par domaines :
- `DTO/Auth`
- `DTO/Admin`
- `DTO/Articles`
- `DTO/Orders`
- `DTO/Confirmateur`
- `DTO/BL`
- `DTO` racine pour Sage / stock / disponibilité

### Lecture
Le backend essaie de ne pas exposer uniquement les entités EF brutes.
C’est un point positif.

### Limite
La frontière DTO / entité n’est pas uniforme partout. Certaines parties restent encore proches du modèle interne.

---

## 11. Flux critiques à connaître

## 11.1 Flux Authentification
1. création ou validation utilisateur,
2. récupération des rôles,
3. génération JWT,
4. exploitation côté frontend,
5. accès protégé par rôle.

## 11.2 Flux Création commande
1. utilisateur authentifié,
2. envoi du panier,
3. validation livraison/retrait,
4. contrôle stock,
5. création BC,
6. retour DTO commande.

## 11.3 Flux Confirmateur
1. lecture BC,
2. mise à jour statut,
3. transformation éventuelle en BL,
4. consultation BL.

## 11.4 Flux Synchronisation Sage
1. appel d’un endpoint sync,
2. récupération des listes Sage via `SageService`,
3. recherche des correspondances locales,
4. insertion / mise à jour,
5. sauvegarde base locale.

---

## 12. Qualité structurelle

### Points positifs
- socle .NET moderne,
- Identity + JWT en place,
- Swagger configuré,
- rôles applicatifs clairs,
- DTO présents,
- service Sage clair,
- service BC→BL avancé,
- logique métier réelle autour des commandes.

### Points moyens
- controllers parfois trop riches,
- architecture service incomplète,
- pas de couche repository explicite,
- standardisation d’erreur encore limitée.

### Points faibles
- duplication BC→BL,
- endpoints sync possiblement non protégés,
- configuration HTTP externe permissive,
- structure encore partiellement orientée “dev local”.

---

## 13. Sécurité : points de vigilance

### 13.1 CORS
La policy est limitée à `http://localhost:5173`, ce qui est correct en dev mais devra être revue pour les environnements réels.

### 13.2 Certificats Sage
Le `HttpClientHandler` ignore la validation des certificats.
C’est une faiblesse majeure hors environnement contrôlé.

### 13.3 Secrets / configuration
Le projet dépend de JWT, OAuth et connexion SQL. Ces informations ne doivent jamais être exposées dans un dépôt public.

### 13.4 Endpoints sync
Les routes de synchronisation ne semblent pas protégées par rôle dans le code observé.

### 13.5 Gestion des erreurs
L’absence visible d’un middleware global d’exception uniformisé affaiblit la robustesse opérationnelle.

---

## 14. Incohérences et anomalies notables

### 14.1 Duplication de logique BC → BL
Le point le plus important.
- `BcToBlService` fait une transformation rigoureuse avec stock et transaction `Serializable`.
- `ConfirmateurController` contient une autre transformation plus directe.

Cette coexistence peut provoquer :
- divergence fonctionnelle,
- incohérence métier,
- maintenance difficile.

### 14.2 Fichiers avec nom anormal
Plusieurs fichiers de controllers de sync portent un nom avec espace avant `.cs`, par exemple :
- `SyncArticleController .cs`
- `SyncCatalogueController .cs`
- `SyncStockController .cs`

Ce n’est pas bloquant fonctionnellement si le projet compile, mais c’est une anomalie de qualité du dépôt.

### 14.3 Archive peu propre
Le projet contient :
- `bin/`
- `obj/`

Pour un livrable source propre, ces dossiers ne devraient pas être distribués dans l’archive principale.

---

## 15. Intégration avec le frontend

### Contrat attendu par React-Ecommerce
Le frontend consomme principalement :
- auth,
- me/profile,
- geo,
- articles,
- catalogues,
- depots,
- stocks,
- orders,
- confirmateur,
- bl,
- admin users,
- article images,
- sync.

### Sensibilités d’intégration
- les noms de propriétés JSON doivent rester cohérents,
- les rôles backend doivent rester alignés avec les guards frontend,
- le module livreur doit être clarifié,
- les transformations documentaires doivent être unifiées.

---

## 16. Scalabilité et maintenabilité

### Ce qui favorise l’évolution
- séparation en dossiers métiers,
- DTO présents,
- services déjà amorcés,
- EF Core et Identity standardisés,
- code suffisamment structuré pour être refactoré.

### Ce qui bloque ou ralentit l’évolution
- logique métier en controller,
- absence de couche application explicite,
- duplication de workflows,
- standardisation partielle seulement.

---

## 17. Recommandations d’évolution

### Priorité haute
1. choisir une seule implémentation officielle de BC → BL
2. déplacer davantage de logique métier vers des services
3. protéger les endpoints de synchronisation par rôle admin
4. supprimer l’acceptation non sécurisée des certificats hors dev
5. centraliser la gestion globale des exceptions

### Priorité moyenne
1. renforcer la documentation API
2. formaliser davantage les DTO de sortie
3. introduire des tests unitaires et intégration
4. harmoniser la structure des controllers
5. nettoyer les fichiers/dossiers parasites du dépôt

### Priorité basse mais utile
1. introduire une couche application/domain plus nette
2. améliorer la journalisation structurée
3. clarifier le rôle exact de `DocEntetesController` et `DocLignesController`

---

## 18. Ce qui est certain / probable / à vérifier

### Certain
- backend ASP.NET Core 8 + EF Core + Identity + JWT
- rôles applicatifs présents
- endpoints orders / confirmateur / bl réellement présents
- sync Sage articles/stocks/catalogues/dépôts réellement présente
- service `BcToBlService` réellement présent

### Probable
- la base locale sert de miroir partiel Sage + base applicative
- certaines fonctionnalités ont été développées par incréments successifs
- la zone confirmateur a évolué plus vite que la couche service officielle

### À vérifier à chaque évolution
- protection des routes sync
- cohérence BC→BL
- gestion des droits LIVREUR
- contrat JSON exposé au frontend
- stabilité des DTO auth / orders / confirmateur

---

## 19. Où placer ce fichier

### Emplacement recommandé
Place ce fichier **à la racine technique du backend**, idéalement au niveau où se trouvent :
- `Program.cs`
- `Web-Api.csproj`
- `Controllers/`
- `Services/`

### Emplacement concret recommandé
Si ton dossier backend est structuré comme l’archive actuelle, place-le ici :
`Web-Api/Web-Api/Web-Api_REFERENCE_PFE.md`

### Variante acceptable
Si tu préfères une vue solution, tu peux aussi le mettre au niveau supérieur de la solution, mais la meilleure place reste la racine du projet API exécutable.

---

## 20. Rappel d’usage
Ce fichier n’est **pas mis à jour automatiquement**.
Il doit être révisé quand :
- un controller change,
- un endpoint change,
- un DTO change,
- une règle métier change,
- la synchronisation Sage évolue,
- l’authentification / rôles évoluent.

