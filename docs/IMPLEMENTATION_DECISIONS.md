# IMPLEMENTATION DECISIONS — Master Prompt v2

> Ce document trace les décisions prises pour les choix ambigus du master prompt, afin que tout puisse être audité plus tard. Les choix retenus sont les options "les plus standards / les plus professionnelles" pour la stack du projet.

Date de démarrage : 2026-05-15
Stack effective : React 19 + TS 5.9 + Tailwind 4 + Vite 7 + TanStack Query 5 + Zustand 5 + axios + react-router-dom 7 + recharts + Asp.Net Core 8 + EF Core 8 + SQL Server.

---

## Décisions transverses

| # | Question | Décision | Justification |
|---|----------|----------|---------------|
| D1 | Devise affichée | **TND** (dinar tunisien, format `1 234,56 TND`) | Projet PFE Tunisie, déjà utilisé en COD côté Flutter. |
| D2 | UI kit React | **Tailwind 4 + composants custom** (déjà en place) | Pas de MUI/AntD installé, kit "premium" maison déjà existant (`src/shared/components/premium/`). |
| D3 | Lib graphique | **Recharts** (déjà installée) | Pas besoin d'ajouter une autre lib (Chart.js exclu). |
| D4 | Icônes | **Heroicons inline en SVG** ou symboles unicode (existant) | Pas de paquet ajouté pour réduire le surface. |
| D5 | Toast | **Custom mini-store Zustand** + composant `<ToastHost />` | Évite d'ajouter `react-hot-toast`; cohérent avec le reste. |
| D6 | Forms | **Composants custom + validation manuelle** ou `react-hook-form` si formulaire complexe (>10 champs) | Évite d'ajouter `zod` partout, déjà beaucoup de forms ad-hoc dans le projet. Module 12 IntentEditor reste sur composants custom. |
| D7 | Drag & drop (Module 7) | **`@dnd-kit/core` + `@dnd-kit/sortable`** | Spec du master prompt, paquet ajouté à `package.json`. |
| D8 | i18n | **`react-i18next` + `i18next-browser-languagedetector` + `i18next-http-backend`** | Spec du master prompt; locales servies depuis `public/locales/{lng}/{ns}.json`. |
| D9 | SignalR client | **`@microsoft/signalr`** | Spec du master prompt; ajouté à `package.json`. |
| D10 | Persistance compare/cart | **Zustand `persist` middleware (localStorage)** | Compare déjà en place; pas de sync compte (D11). |
| D11 | Compare synchronisé compte | **Non** (localStorage uniquement) | Question marquée optionnelle; choix le plus simple/standard. |
| D12 | Adresse multi : géocodage | **Manuel uniquement** (pas d'API tierce auto) | Évite Google Places fees ; lat/lng renseignés via picker carte si user veut, sinon `null`. |
| D13 | Adresse admin DTO | **DTO dédié `ClientAddressAdminDto` SANS Lat/Lng** | Sécurité explicite. |
| D14 | Remise B2B | **Sur HT (subtotal HT)** | Standard B2B en Tunisie/Europe : "remise commerciale" appliquée avant TVA. Cohérent avec OrderCalculator du master prompt qui calcule `subtotal - discountAmount`. |
| D15 | Snapshot remise B2B | **Stocké dans `Order.DiscountPercentSnapshot`** | Évite que la remise change rétroactivement si l'admin modifie le taux client. |
| D16 | Verrou commande timeout | **5 minutes** (spec master prompt) | OK. |
| D17 | Cleanup verrou | **HostedService toutes les 60s** | Spec master prompt. |
| D18 | Homepage templates | **Max 5, 1 actif, JSON `BlocksJson` stocké en `nvarchar(max)`** | Spec master prompt; Sql Server supporte JSON path queries. |
| D19 | Stats CA | **Basé sur F_DOCENTETE BL (DocType BL)** | Spec master prompt; le BL est la pièce de référence comptable côté Sage. |
| D20 | Chatbot admin endpoints | **Préfixe `/api/admin/chatbot/...`** ; créés s'ils manquent | Spec master prompt; audit dans `docs/CHATBOT_API_AUDIT.md`. |
| D21 | Settings cache | **`IMemoryCache` 5 min, invalidation sur PUT** | Spec master prompt. |
| D22 | Locale par défaut | **`fr`** | Projet francophone tunisien. |
| D23 | Langues activées | **`fr`, `en`, `ar`** (RTL pour ar) | Spec master prompt. |
| D24 | Theme tokens source | **`src/theme/tokens.ts`** importé par Tailwind config | Spec master prompt. Mode dark non présent côté Flutter actuel → on prépare le terrain mais on ne livre pas un thème dark complet. |
| D25 | Migration EF naming | **`AddXxx`, `AddYyyToZzz`** Conventional | Spec master prompt. |
| D26 | Conventional commits | **`feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`** | Spec master prompt. Scope = nom court module ou domaine. |
| D27 | Auth admin endpoints | **`[Authorize(Roles="ADMIN")]`** | Cohérent avec `AppRoles.cs` existant. |
| D28 | Codes statuts | **`OrderStatus` enum côté backend (1-4)**, mapping explicite vers `Statut` Flutter (1-6) au boundary | Évite de casser le mobile en prod. |

---

## Décisions par module (cas particuliers)

### Module 1 — Bouton add-to-cart
- **Localisation** : `src/features/catalog/components/ArticleCard.tsx` (audit révèle ce fichier comme carte produit principale, pas `ProductCard.jsx`).
- **Hook** : réutilise `useCart` / `addToCart` existants si présents.
- **Spinner** : SVG custom inline pour éviter dépendance.

### Module 2 — Comparateur
- **Existant** : module compare déjà partiellement présent (`src/features/compare/`). Travail = polir, pas reconstruire.

### Module 3 — Adresses
- **Compatibilité avec `ProfilUtilisateur` existant** : on ajoute la table `ClientAddresses` reliée à `AspNetUsers.Id` (pas à `Client` qui n'existe pas comme entité dédiée). Le modèle CLAUDE.md confirme qu'il n'y a pas d'entité `Client` séparée.
- **Champ `Label`** : libre (`Maison`, `Bureau`, ...).

### Module 4 — Remise B2B
- **Pas d'entité `Client` séparée** → champ `DiscountPercent` ajouté à `ProfilUtilisateur`.
- **Distinction B2B/B2C** : `ProfilUtilisateur` n'a pas encore de `Type` enum. On ajoute `ClientType` (`B2C=1, B2B=2`) ou on s'appuie sur le rôle `VENDEUR` ? → On ajoute `ClientType` sur `ProfilUtilisateur` car le rôle `VENDEUR` est différent (vendeur du B2B est un *client* pro, le rôle VENDEUR est un agent de vente). Migration ajoute `ClientType` (default `B2C`) + `DiscountPercent` (`null`).
- **Historique** : table `B2BDiscountHistory`.

### Module 5 — États commande
- **Modèle existant** : `F_DOCENTETE.DO_Valide` (0-3) selon CLAUDE.md, mais aussi `Statut` Flutter (1-6). Pour ne pas tout casser, on ajoute la *nouvelle* table de verrou + colonnes (LockedBy, LockedAt) sur `F_DOCENTETE`, et un mapping clair. L'historique va dans `OrderStatusHistory` (nouvelle table).
- **SignalR Hub** : un nouveau `OrdersHub` à `/hubs/orders` (séparé du `ChatbotHub` éventuel).

### Module 6 — Mobile GPS
- **DTO mobile confirmateur** : audit du Flutter, retrait éventuel du modèle.

### Module 7 — Homepage Builder
- **Existant** : un module `homepage` est déjà présent côté React (HomepageRenderer, AdminHomepagePage). On vérifie s'il gère déjà le cap 5 + activate; sinon on ajoute.

### Module 8 — Dashboard
- **Existant** : `AdminLogisticsDashboardPage.tsx` déjà là. On *complète* avec les nouveaux endpoints stats si manquants.
- **Export CSV** : généré côté front (Blob + a.download).

### Module 9 — i18n
- **Volumes** : on crée des bundles initiaux (FR complet, EN/AR avec strings essentielles + fallback FR pour le reste). Migration totale "zéro hardcodé" est un chantier multi-jours indépendant ; on documente le pattern et on couvre les pages clés (header/login/cart/checkout/profile).

### Module 10 — Settings
- **Cache** : MemoryCache.

### Module 11 — Tokens
- **Récupération palette Flutter** : depuis `flutter/lib/ui/theme/` (à explorer).
- **Pas de breaking change Tailwind** : on étend la config, on ne renomme pas les classes existantes.

### Module 12 — Chatbot admin
- **Audit** automatiquement sans validation utilisateur (consigne explicite "tu fais l'audit automatiquement et tu continues").
- **Si endpoints manquants** : créer en mode admin uniquement, sans toucher au moteur de matching ni aux endpoints existants Flutter.
