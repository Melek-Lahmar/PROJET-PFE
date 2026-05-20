# Cartographie Frontend React

## Stack détectée

- React 19.2, Vite 7.3, TypeScript 5.9.
- React Router DOM 7, TanStack React Query 5, Zustand 5, Axios.
- Tailwind CSS 4, Recharts, Leaflet/React-Leaflet, SignalR, i18next, dnd-kit.
- Scripts: `dev`, `build`, `lint`, `preview`.

## Structure

- `src/app`: providers, routes, navigation/guards.
- `src/pages`: pages publiques et pages par rôle.
- `src/features`: modules métier et composants par domaine.
- `src/shared`: API, UI, layout, types, hooks partagés.
- `src/store`: stores Zustand.
- `public/locales`: traductions FR/EN/AR.

## Routes

- Source principale: `frontend-react/src/app/routes.tsx`.
- Routes publiques: boutique, articles, panier, comparaison, checkout, paiement retour, login/register/reset.
- Routes client protégées: compte, commandes, suivi, réclamations, avis, profil.
- Routes vendeur: articles, panier vendeur, checkout, commandes.
- Routes admin: dashboard, utilisateurs/personnel/clients, commandes, stocks, dépôts, zones, sync, articles, homepage, B2B, settings, chatbot.
- Routes confirmateur: dashboard, commandes, BL.
- Routes livreur: dashboard, BL, transit.
- Routes superviseur/admin: supervisor dashboard, zones, alerts, audit.

## Pages principales

- Boutique/client: `HomePage`, `ArticlesPage`, `CartPage`, `Checkout*`, `Client*`.
- Admin: dashboard, orders, products, users, drivers, confirmatrices, claims, settings, homepage, chatbot.
- Confirmateur: dashboard commandes/BL.
- Livreur: dashboard, livraison, transit.
- Superviseur: dashboard, zones, alertes, audit.

## Composants principaux

- Guards: `ProtectedRoute`, `RoleRoute`, `PublicShopRoute`.
- Layouts: admin/client/livreur/confirmateur/supervisor layouts.
- UI partagée dans `src/shared/ui`.
- Cartes/tableaux/charts par feature.

## Services API

- Client central: `src/shared/api/axiosClient.ts`.
- Endpoints centralisés: `src/shared/api/endpoints.ts`.
- Base URL via `VITE_API_BASE_URL`.
- Token JWT lu depuis `authStore`; 401 déclenche nettoyage auth.
- Plusieurs modules utilisent encore des chaînes route directes en plus de `endpoints.ts`.

## State management

- Zustand: auth, cart, comparaison, panier vendeur, layout.
- TanStack Query pour cache et appels serveur.
- Persistance auth sous clé `melek-auth`.
- Layout persistant sous clé `layout-ui`.

## Authentification

- Login/register/reset côté pages auth.
- Token bearer injecté automatiquement par `axiosClient`.
- Guards par rôle alignés sur rôles backend: `ADMIN`, `CLIENT`, `VENDEUR`, `LIVREUR`, `CONFIRMATEUR`, `SUPERVISEUR`.

## Dashboard

- Dashboards admin, livreur, confirmateur, superviseur et client détectés.
- Graphiques via Recharts, cartes/geo via Leaflet.
- Certaines pages semblent encore statiques ou explicatives, notamment audit/coverage map selon inspection.

## Mode clair/sombre

- Géré par `layoutStore`.
- Thème par défaut sombre.
- Présence d'un module admin thème côté routes/services.

## Appels backend

- Groupes API alignés globalement: auth, articles, commandes, paiements, client, livreur, confirmateur, admin, supervisor, transit, geo.
- **Risque**: endpoints frontend admin homepage `sections/reorder` et `images` ne sont pas clairement retrouvés côté backend extrait.
- **Risque**: absence de contrats partagés TypeScript générés depuis OpenAPI.

## Problèmes détectés

- `.env.local` présent dans le workspace; vérifier qu'il n'est pas suivi Git.
- README frontend encore proche du boilerplate Vite.
- Documentation de référence React partiellement obsolète.
- `dist` présent comme artefact généré.
- Plusieurs appels API hors registre central.
- Mismatch possible entre certaines routes admin homepage et backend.
- Tests frontend non détectés.
- Pages/composants placeholder probables: supervisor audit, coverage map, picker map.
- Risque de typage faible dans certains services avec réponses normalisées manuellement.

## Améliorations proposées

- Générer/typesafe API client depuis Swagger ou centraliser strictement `endpoints.ts`.
- Vérifier automatiquement toutes les routes critiques par test Playwright ou équivalent.
- Supprimer/ignorer artefacts générés et mettre à jour README.
- Remplacer placeholders par fonctionnalités réelles ou les masquer avant soutenance.
- Ajouter tests ciblés: auth, checkout, paiement, dashboard admin, livreur, réclamations.
- Auditer `.env.local` et documenter `.env.example`.
