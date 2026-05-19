# Référence projet — React-Ecommerce

## 1. But de ce fichier
Ce document est un **fichier maître de référence** pour le projet frontend `React-Ecommerce`.
Il sert à éviter une réanalyse complète à chaque fois et à garder une vision stable de :
- l’architecture frontend,
- les modules métier,
- les pages et routes,
- la communication avec l’API,
- les composants critiques,
- les limites et risques techniques,
- les points à revérifier après évolution.

Il est basé sur **l’état réel du code actuellement fourni** dans l’archive `React-Ecommerce.zip`.

---

## 2. Identité globale du projet

### Rôle du projet
`React-Ecommerce` est le **frontend web principal** du PFE. Il fournit :
- la partie boutique/catalogue pour les clients,
- la gestion du panier et du checkout,
- l’authentification et le profil,
- des écrans d’administration,
- des écrans de traitement des commandes pour le rôle confirmateur,
- des vues liées aux bons de livraison.

### Position dans l’ensemble PFE
Le frontend consomme le backend `Web-Api` et représente la couche de présentation de la plateforme e-commerce intégrée à Sage X3.

### Hypothèse métier la plus crédible
Le projet vise une plateforme de vente en ligne B2C/B2B connectée à l’ERP Sage X3, avec :
- consultation d’articles,
- création de commandes,
- gestion de profils client,
- back-office partiel,
- workflow interne de confirmation et transformation BC → BL.

---

## 3. Stack technique

### Outils principaux
- **React 19**
- **TypeScript**
- **Vite**
- **React Router v7**
- **@tanstack/react-query**
- **Axios**
- **Zustand**
- **Tailwind CSS 4**
- **Leaflet / React-Leaflet**
- **open-location-code**

### Lecture architecturale
La stack est moderne, cohérente et adaptée à un frontend SPA structuré par fonctionnalités.

---

## 4. Structure du projet

### Racine utile
Le projet utile se trouve au niveau où sont présents :
- `package.json`
- `vite.config.ts`
- `src/`
- `public/`

### Dossiers importants sous `src/`
- `app/` : bootstrap, routes, guards, providers
- `core/` : configuration, HTTP, endpoints, types API
- `features/` : logique métier par domaine
- `shared/` : composants UI partagés, layout, utilitaires
- `styles/` : styles globaux
- `types/` : déclarations spécifiques

### Features identifiées
- `admin`
- `adminArticles`
- `adminUsers`
- `auth`
- `bl`
- `cart`
- `catalog`
- `checkout`
- `compare`
- `confirmateur`
- `geo`
- `orders`
- `static`

### Lecture générale
Le projet suit une organisation **feature-based** plutôt saine, avec une séparation correcte entre :
- couches transverses,
- logique métier,
- composants partagés.

---

## 5. Routage principal

Le routage est centralisé dans `src/app/routes.tsx`.

### Routes publiques boutique
- `/articles`
- `/articles/:arRef`
- `/cart`
- `/compare`

### Routes d’accès générales
- `/login`
- `/register`
- `/about`
- `/contact`
- `/privacy`
- `/terms`

### Routes protégées authentifiées
- `/checkout`
- `/orders`
- `/orders/:piece`
- `/profile`

### Routes Admin
- `/admin`
- `/admin/users`
- `/admin/personnel`
- `/admin/clients`
- `/admin/orders`
- `/admin/stats`
- `/admin/sync`
- `/admin/articles`
- `/admin/articles/:arRef/images`

### Routes Confirmateur
- `/confirmateur/commandes`
- `/confirmateur/commandes/:piece`
- `/confirmateur/bl`
- `/confirmateur/bl/:piece`

### Routes Livreur
- `/livreur/bl`
- `/livreur/bl/:piece`

### Contrôle d’accès
Les guards identifiés sont :
- `ProtectedRoute`
- `PublicShopRoute`
- `RoleRoute`

Le modèle d’autorisation côté frontend est donc basé sur :
- authentification requise pour certaines zones,
- restriction explicite par rôles,
- séparation entre boutique publique et espace interne.

---

## 6. Modules métier importants

### 6.1 Catalogue
Le module `catalog` gère :
- la liste paginée des articles,
- la recherche,
- les filtres par prix, catalogue, dépôt, stock,
- le détail article,
- les images principales.

#### Points visibles
- appels API via `articlesApi.ts`
- fallback de recherche si le détail article direct échoue
- normalisation front des articles
- enrichissement avec image principale

#### Rôle métier
Permet au client de naviguer dans le catalogue produit, d’évaluer le stock et d’ajouter au panier.

---

### 6.2 Authentification / Profil
Le module `auth` couvre :
- login,
- register,
- récupération de l’utilisateur courant,
- mise à jour du profil,
- stockage du token et des rôles.

#### Particularités fonctionnelles
- gestion de client **B2C** et **B2B**
- formulaire d’inscription relativement riche
- intégration des données de localisation/adresse
- redirection post-auth selon rôle

#### Rôle métier
Créer le compte client, maintenir le profil et contextualiser la commande.

---

### 6.3 Panier
Le module `cart` repose sur Zustand.

#### Données stockées
- lignes panier
- quantité
- mode de livraison (`HOME` ou `PICKUP`)

#### Calculs disponibles
- sous-total
- frais de livraison
- timbre fiscal
- total
- quantité totale

#### Rôle métier
Préparer la commande avant passage au checkout.

---

### 6.4 Checkout
Le module `checkout` est l’un des plus importants.

#### Ce qu’il gère
- sélection du mode de livraison
- sélection du dépôt en mode retrait
- mode de paiement
- adresse de livraison
- latitude / longitude
- récapitulatif du panier
- création du Bon de Commande côté API

#### Observations
- les totaux sont visibles côté front,
- mais le backend recalculera le résultat final,
- le frontend gère un volume important de logique de formulaire,
- le fichier `CheckoutPage.tsx` est volumineux, donc sensible à la maintenance.

#### Rôle métier
Transformer un panier en commande exploitable côté backend.

---

### 6.5 Commandes client
Le module `orders` couvre :
- la liste des commandes du client,
- le détail d’une commande,
- la consultation du statut.

#### Rôle métier
Permettre au client de suivre ses BC / BL selon ce qui est exposé par l’API.

---

### 6.6 Administration
La partie admin est répartie entre plusieurs features :
- `admin`
- `adminUsers`
- `adminArticles`

#### Capacités visibles
- dashboard admin
- gestion utilisateurs
- gestion rôles
- création utilisateurs via modal riche
- synchronisation Sage
- gestion des images d’articles

#### Lecture métier
L’admin pilote les référentiels techniques et certaines opérations métier.

---

### 6.7 Confirmateur
Le module `confirmateur` est un bloc métier central.

#### Capacités visibles
- liste des commandes à confirmer
- détail d’une commande
- changement de statut
- transformation BC → BL
- consultation liste BL
- consultation détail BL

#### Rôle métier
Ce module incarne le workflow interne de traitement après commande.

---

### 6.8 Géolocalisation / adresse
Le module `geo` couvre :
- gouvernorats,
- délégations,
- géocodage / reverse geocoding,
- interfaces d’adresse sur carte.

#### Rôle métier
Fiabiliser la saisie adresse/livraison en contexte tunisien.

---

## 7. Gestion d’état

### 7.1 Zustand
Deux stores principaux sont visibles :
- `authStore`
- `cartStore`

#### `authStore`
Contient :
- token
- durée d’expiration
- userId
- email
- rôles
- profile
- état de bootstrap

Il est persistant (`persist`) avec la clé `melek-auth`.

#### `cartStore`
Contient :
- items
- mode de livraison
- opérations CRUD panier
- calculs métiers

Il est persistant avec la clé `melek-cart`.

### 7.2 React Query
Utilisé pour :
- chargement serveur,
- cache,
- refetch,
- mutations,
- synchronisation d’état distant.

### Évaluation
Le duo **Zustand + React Query** est bien choisi.
- Zustand pour l’état local durable,
- React Query pour l’état serveur.

---

## 8. Couche HTTP et communication backend

### Axios partagé
Le client HTTP principal est `src/core/http/axiosClient.ts`.

#### Fonctionnement
- baseURL alimentée par `VITE_API_BASE_URL`
- fallback sur `https://localhost:7178`
- ajout automatique du header `Authorization: Bearer <token>`

### Endpoints centralisés partiellement
Le fichier `core/http/endpoints.ts` centralise plusieurs routes utiles.

### Incohérence importante
Le module de synchronisation admin (`features/admin/api/syncApi.ts`) n’utilise pas le client partagé et fixe directement :
- `const API_BASE = "https://localhost:7178"`

#### Conséquences
- contournement de la configuration d’environnement,
- risque de divergence entre environnements,
- possibilité d’oublier l’authentification si elle devient obligatoire.

---

## 9. Appels API principaux identifiés

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `PUT /api/auth/me/profile`

### Catalogue
- `GET /api/articles`
- `GET /api/articles/{arRef}`
- `GET /api/catalogues`
- `GET /api/depots`
- `GET /api/stocks`

### Commandes
- `GET /api/orders`
- `GET /api/orders/{piece}`
- `POST /api/orders`

### Confirmateur
- `GET /api/confirmateur/commandes`
- `GET /api/confirmateur/commandes/{piece}`
- `PUT /api/confirmateur/commandes/{piece}/status`
- `POST /api/confirmateur/commandes/{piece}/transform-to-bl`
- `GET /api/confirmateur/bl`
- `GET /api/confirmateur/bl/{piece}`

### Admin
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}/roles`
- routes de gestion images article
- routes de sync Sage

---

## 10. Pages et écrans critiques

### Très importants côté métier
- `features/catalog/pages/ArticlesPage.tsx`
- `features/catalog/pages/ArticleDetailsPage.tsx`
- `features/checkout/pages/CheckoutPage.tsx`
- `features/orders/pages/ClientOrderDetailsPage.tsx`
- `features/confirmateur/pages/ConfirmateurOrderDetailsPage.tsx`
- `features/confirmateur/pages/ConfirmateurBlDetailsPage.tsx`
- `features/auth/pages/ProfilePage.tsx`
- `features/auth/pages/RegisterPage.tsx`

### Très importants côté transversal
- `shared/components/Navbar.tsx`
- `app/routes.tsx`
- `core/http/axiosClient.ts`
- `features/auth/store/authStore.ts`
- `features/cart/store/cartStore.ts`

### Fichiers volumineux = zones sensibles
Quelques fichiers sont particulièrement gros, donc plus exposés aux régressions :
- `CheckoutPage.tsx`
- `Navbar.tsx`
- `ConfirmateurOrderDetailsPage.tsx`
- `ArticlesPage.tsx`
- `ProfilePage.tsx`
- `ArticleDetailsPage.tsx`
- `RegisterPage.tsx`

---

## 11. Parcours utilisateur probables

### Parcours Client
1. ouverture du catalogue,
2. recherche/filtrage,
3. consultation fiche article,
4. ajout au panier,
5. choix livraison ou retrait,
6. validation checkout,
7. création BC,
8. consultation de l’historique de commande,
9. mise à jour du profil.

### Parcours Admin
1. accès espace admin,
2. gestion des utilisateurs,
3. ajustement des rôles,
4. synchronisation des données Sage,
5. gestion images articles.

### Parcours Confirmateur
1. consultation des commandes,
2. lecture détail,
3. mise à jour du statut,
4. transformation BC → BL,
5. consultation des BL.

### Parcours Livreur
Il existe des routes dédiées, mais elles réutilisent les pages du confirmateur.
Cela suggère un parcours **présent mais partiellement inachevé ou non spécialisé**.

---

## 12. Qualité de code et conventions

### Points positifs
- TypeScript présent partout sur la couche utile,
- organisation par features,
- composants partagés,
- séparation raisonnable des responsabilités,
- mapping / normalisation des réponses API,
- utilisation pertinente de React Query,
- routing clair.

### Points plus fragiles
- certaines pages embarquent trop de logique UI + métier,
- validation encore très manuelle,
- conventions parfois non homogènes,
- mélange de stratégies pour les appels API,
- certaines features semblent coexister avec des versions antérieures ou parallèles.

---

## 13. Forces techniques

### Forces majeures
- architecture moderne,
- bonne lisibilité globale,
- système de rôles côté front,
- intégration API concrète,
- parcours e-commerce complet jusqu’au BC,
- espace admin réel,
- espace confirmateur utile métier,
- prise en compte du contexte géographique tunisien.

### Forces secondaires
- persistance auth/panier,
- filtre catalogue avancé,
- gestion images article,
- effort visible sur l’expérience utilisateur.

---

## 14. Limites, incohérences et risques

### 14.1 Incohérence de configuration API
Le module sync admin utilise une URL backend codée en dur.
C’est une faiblesse claire.

### 14.2 Rôle Livreur peu spécialisé
Les routes livreur réutilisent les vues confirmateur, ce qui peut indiquer :
- une mutualisation provisoire,
- ou une implémentation incomplète.

### 14.3 Validation encore dispersée
Le front dépend de validations manuelles dans plusieurs pages au lieu d’une couche unifiée.

### 14.4 Grosse concentration de logique
Certaines pages sont trop volumineuses, donc moins testables et moins maintenables.

### 14.5 Archive peu propre
L’archive contient :
- `dist/`
- `node_modules/`

Ce n’est pas idéal pour un livrable source.

### 14.6 Risque de divergence front/back
Le front prévoit parfois plusieurs variantes de nommage de propriétés JSON, ce qui montre une intégration pragmatique mais aussi un contrat API pas totalement rigide.

---

## 15. Intégration avec le backend

### Front ↔ Back
Le frontend dépend fortement du backend `Web-Api`.

### Contrats principaux partagés
- auth
- article
- commande
- profil
- confirmateur
- BL
- sync admin

### Données critiques échangées
- JWT / identité / rôles
- article / stock / catalogue / dépôt
- lignes panier → BC
- statuts documentaires
- coordonnées de livraison

### Point sensible
Le front suppose une cohérence forte des objets documentaires (`BC`, `BL`, `status`, `piece`, `tiers`, `lignes`).
Toute modification backend sur ces objets peut casser plusieurs écrans.

---

## 16. Correspondance métier probable

### Ce qui semble réellement abouti
- consultation catalogue
- recherche et filtrage
- ajout panier
- checkout
- commande client
- profil
- administration utilisateurs
- synchronisation de référentiels
- validation confirmateur

### Ce qui semble partiel
- parcours livreur
- spécialisation fine des rôles internes
- industrialisation de l’admin
- homogénéisation du contrat API

---

## 17. Recommandations d’évolution

### Priorité haute
1. unifier tous les appels API via `axiosClient`
2. supprimer les URLs codées en dur
3. clarifier définitivement le module livreur
4. découper les grosses pages métier
5. centraliser la validation formulaire

### Priorité moyenne
1. formaliser des schémas DTO frontend plus stricts
2. créer une documentation de contrat API partagée
3. ajouter davantage de tests unitaires / d’intégration UI
4. factoriser certaines logiques d’affichage status / document

### Priorité basse mais utile
1. nettoyer l’archive source
2. harmoniser les conventions de nommage
3. mieux distinguer composants purement UI et composants métier

---

## 18. Ce qui est certain / probable / à vérifier

### Certain
- React + TypeScript + Vite
- routing structuré avec guards
- Zustand pour auth et panier
- React Query pour la donnée serveur
- backend attendu sur `https://localhost:7178`
- module confirmateur réellement présent
- module admin réellement présent

### Probable
- projet pensé pour B2C et B2B
- parcours livreur encore non finalisé
- structure conçue pour un MVP évolutif plus large

### À vérifier à chaque évolution
- cohérence des routes API
- spécialisation rôle LIVREUR
- maintien des contrats JSON côté confirmateur / BL
- stabilité de `CheckoutPage`
- stabilité de `Navbar`
- compatibilité des pages admin avec les nouvelles règles d’auth

---

## 19. Où placer ce fichier

### Emplacement recommandé
Place ce fichier **à la racine du projet frontend**, au même niveau que :
- `package.json`
- `vite.config.ts`
- `src/`

### Emplacement concret recommandé
`React-Ecommerce/React-Ecommerce_REFERENCE_PFE.md`

### Pourquoi ici
Parce que c’est l’emplacement le plus logique pour :
- retrouver rapidement la documentation interne du projet,
- l’ouvrir en même temps que le code frontend,
- garder le fichier synchronisé avec la vraie racine technique du projet.

---

## 20. Rappel d’usage
Ce fichier n’est **pas mis à jour automatiquement**.
Il doit être révisé quand :
- la structure change,
- des routes changent,
- les modules métier évoluent,
- la couche API frontend est modifiée.

