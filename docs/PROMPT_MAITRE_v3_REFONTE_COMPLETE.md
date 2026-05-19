# PROMPT MAÎTRE — Refonte Zones / Livraison / Transit / Photos / Réclamations

> **Version** : 3.0 — 2026-05-17
> **Projet** : PFE — Monorepo `Web-Api(Asp.net)/Web-Api/` + `flutter/` + `React-Ecommerce/`
> **Contexte géographique** : Tunisie (24 gouvernorats, ~264 délégations)
> **Changelog v3** : Plateformes corrigées, règle d'or de vérification, intelligence contextuelle Tunisie, GPS au checkout, gestion hors-zone

---

## 0. PROTOCOLE D'EXÉCUTION (à respecter sans exception)

### 0.1 Lecture préalable obligatoire

Avant TOUTE écriture de code, tu dois lire dans cet ordre :
1. `CLAUDE.md` (racine) — conventions globales
2. `AGENTS.md` (racine) — règles pour agents
3. `Web-Api(Asp.net)/Web-Api/Web-Api_REFERENCE_PFE.md` — référence backend
4. `BRIEF_GLOBAL_PFE.md` (racine) — vue d'ensemble projet
5. `DOCUMENTATION_TECHNIQUE.md` (racine) — détails techniques
6. `CHANTIER_1_GEO_REPORT.md` (racine) — état du Chantier 1 (déjà commencé)

### 0.2 Mode de travail obligatoire

- Tu traites les chantiers **UN PAR UN**, dans l'ordre numérique strict.
- **AVANT** chaque chantier, tu réponds avec :
  1. Liste des fichiers que tu vas créer
  2. Liste des fichiers que tu vas modifier
  3. Questions ouvertes (s'il y en a)
  4. Risques identifiés (s'il y en a)
- Puis tu **ATTENDS la validation** de l'utilisateur. Tu n'écris pas de code avant.
- **APRÈS** chaque chantier, tu produis un rapport `CHANTIER_N_<TOPIC>_REPORT.md` à la racine et tu **T'ARRÊTES**.
- Tu n'enchaînes **JAMAIS** deux chantiers sans validation explicite de l'utilisateur.

### 0.3 Conventions de chemin

| Élément | Chemin |
|---|---|
| Backend | `"Web-Api(Asp.net)/Web-Api/"` — **TOUJOURS QUOTÉ** (parenthèses) |
| Frontend mobile | `flutter/` |
| Frontend web | `React-Ecommerce/` |
| Migrations EF | `dotnet ef migrations add <Name> -p "Web-Api(Asp.net)/Web-Api"` |
| Tests backend | `Web-Api(Asp.net)/Web-Api.Tests/` |

### 0.4 Marges de liberté accordées

- Si tu identifies une approche **meilleure** que celle décrite ici (perf, sécurité, maintenabilité) : tu la **PROPOSES** dans tes 4 points préliminaires. Tu n'agis pas unilatéralement.
- Si tu identifies une **incohérence** dans ce document : tu la signales. Tu n'agis pas.
- Si tu identifies un **risque** (sécurité, casse de l'existant, perf) : tu le signales en premier.
- Si une feature serait mieux adaptée à la **Tunisie** (langue, offline, compression, etc.) et que ce n'est pas couvert ici : tu le proposes.

### 0.5 — RÈGLE D'OR : VÉRIFIER L'EXISTANT AVANT DE CRÉER

> ⚠ Cette règle est **non négociable** et s'applique à chaque chantier, sans exception.

Avant de créer tout fichier, toute migration, tout endpoint, tout service, tout composant React, tout widget Flutter, tu dois :

1. **Chercher** dans tout le repo si un élément similaire existe déjà (`grep`, lecture des controllers, screens, services, migrations, entités, DTOs, composants).
2. **Comparer en détail** : si tu trouves quelque chose qui ressemble, liste les différences ligne par ligne.
3. **Décider** :
   - Si **> 70% de recouvrement** → **modifier l'existant** au lieu de créer. Signale ce que tu modifies et pourquoi.
   - Si **< 70%** → tu peux créer, mais **justifie** explicitement dans tes 4 points préliminaires pourquoi tu ne réutilises pas l'existant.
4. **Rapporter** dans le rapport de chantier : pour chaque fichier, indiquer `CRÉÉ` ou `MODIFIÉ` avec le motif.

Cette règle s'applique à : entités EF, DTOs, controllers, services, migrations, écrans Flutter, widgets Flutter, pages React, composants React, hooks, stores Zustand, packages NuGet/pub/npm.

> **Exemple** : avant de créer `GpsValidatorWidget.dart`, cherche si `location_picker`, `map_picker`, ou tout widget lié au GPS existe déjà dans `flutter/lib/widgets/`. Si oui, enrichis-le plutôt que de dupliquer.

### 0.6 — INTELLIGENCE CONTEXTUELLE TUNISIE

> ⚠ Cette spec ne couvre pas tous les cas tunisiens. Quand tu identifies un cas non documenté mais évident dans ce contexte, tu le **signales, proposes, attends validation** — tu n'imposes pas.

**Cas tunisiens à anticiper activement dans chaque chantier** :

#### Téléphone
- Format : `+216 XX XXX XXX` (8 chiffres après l'indicatif).
- Validation : regex `^\+216[2-9]\d{7}$` pour numéros mobiles, ou `^\+216[7]\d{7}$` pour fixes.
- Ne jamais afficher un numéro sans l'indicatif `+216`.

#### Calendrier et horaires
- **Weekend tunisien** : samedi + dimanche (pas vendredi).
- **Ramadan** : heures d'ouverture des dépôts réduites (ex. 9h-14h). Prévoir un champ `RamadanSchedule` configurable par dépôt, même si non utilisé dans la démo PFE.
- **Fuseau horaire** : `Africa/Tunis` (UTC+1, pas de changement d'heure). Forcer dans `Program.cs` + `appsettings.json`.
- **Stocker en UTC** en base, **convertir en Africa/Tunis** à l'affichage.

#### Adresses
- Les adresses tunisiennes n'ont souvent pas de numéro de rue. Le champ `AdresseLigne1` est libre (ex. "Résidence El Fath, Bloc B, Appt 12").
- Ne jamais rendre le format strict (pas de regex sur le format d'adresse).
- Toujours proposer un champ de **point de repère** (`Landmark`) : "à côté de la mosquée X", "face à l'épicerie Y".

#### Paiement
- **COD (Cash on Delivery)** : mode dominant en Tunisie. Ne jamais le supprimer ou le rétrograder dans l'UX.
- **Konnect** : déjà intégré, ne pas casser.
- **TND avec millimes** : 3 décimales (ex. `29.990 TND`, pas `29.99 TND`). Utiliser `decimal(18,3)` en base, format `{0:F3}` en affichage.

#### Connectivité
- **3G/4G variable** : beaucoup de zones ont une bande passante faible, surtout les dépôts en dehors des grandes villes.
- **Photos** : toujours compresser côté client avant upload (max 1920px, JPEG q=80). Ne jamais uploader en full HD.
- **Timeouts** : Dio 30s par défaut, 60s pour les uploads de photos.
- **Retry exponentiel** : 3 tentatives (1s → 3s → 8s) sur les requêtes critiques.
- **Offline queue** : toutes les actions livreur (scan, COD, photos) doivent fonctionner hors connexion et se synchroniser au retour réseau.

#### Langue
- **UI en français** pour le PFE entier.
- **Préparer la structure i18n** dès maintenant (clés dans `Resources.fr.resx` côté backend, fichiers `fr.json` côté front) pour pouvoir ajouter l'arabe plus tard sans refactor majeur.
- Noms de délégations : utiliser les noms officiels INKN (Institut National de Statistique Tunisien) en français.

#### UX confirmatrice
- La confirmatrice travaille sur **ordinateur ET téléphone** en même temps (dual screen fréquent).
- Sur React : optimiser pour une validation rapide au clavier (raccourcis, focus automatique, Enter pour confirmer).
- Sur Flutter : notifications push prioritaires pour les nouvelles commandes.

### 0.7 — PLATEFORMES PAR INTERFACE (TABLEAU DE RÉFÉRENCE)

> Ce tableau est la **source de vérité**. En cas de doute sur quelle plateforme implémenter, consulter ce tableau en premier.

| Interface | React (web) | Flutter (mobile) | Notes |
|---|---|---|---|
| **CLIENT** — Achat, panier, checkout, tracking, réclamation | ✅ Oui | ❌ Non | Le client commande uniquement depuis le navigateur web |
| **ADMIN** — Gestion utilisateurs, dépôts, mapping zones, audit complet | ✅ Oui | ❌ Non | Interface bureau uniquement |
| **CONFIRMATRICE** — Validation commandes, photos, réclamations | ✅ Oui | ✅ Oui | React = bureau (grand écran, clavier), Flutter = mobile (notifications push) |
| **LIVREUR CLASSIQUE** — Livraison domicile, COD, photos incident | ❌ Non | ✅ Oui | Toujours en déplacement, pas d'interface web |
| **LIVREUR-TRANSIT** — Scan articles inter-dépôts | ✅ Oui | ✅ Oui | Flutter = scan mobile principal, React = consultation/historique bureau |
| **SUPERVISEUR** — Monitoring transits, override, zones livreurs | ✅ Oui | ✅ Oui | React = bureau (monitoring principal), Flutter = mobile (alertes urgentes + override rapide) |

**Identification au login** : après authentification, le backend retourne `{ role, isTransit, interfaces: ['react', 'flutter'] }`. Le front redirige vers le bon shell selon le rôle.

### 0.8 Conventions de code

- Backend : C# 12, async/await partout, EF Core, FluentValidation, MediatR si pertinent (pas obligatoire)
- Flutter : Provider + go_router + dio + offline queue (existants)
- React : Vite + TS strict + Tailwind + Zustand + TanStack Query
- Tous les textes UI : **français**, ton professionnel
- Commits : `feat(scope)` / `fix(scope)` / `chore(scope)` / `test(scope)`
- Migrations : un script `Up()` et un `Down()` réversibles, toujours

---

## 1. VUE D'ENSEMBLE — Ce qu'on construit

Une refonte profonde du flow de commande tunisien pour gérer :

1. **Zones livreur fines** (multi-délégations, plus juste par gouvernorat)
2. **Mode retrait au dépôt** en plus de la livraison à domicile
3. **Carnet d'adresses 4 max** côté client + adresse temporaire
4. **Validation géographique** par polygones offline (264 délégations tunisiennes)
5. **Transit inter-dépôt** quand un article manque dans le dépôt cible
6. **Rôle superviseur** indépendant pour monitorer/débloquer les transits
7. **Photos** : livreur (colis endommagé) + client (réclamation)
8. **Tracking enrichi** côté client incluant les phases de transit
9. **Gestion d'erreurs globale** uniformisée
10. **Tests de logique** transverses pour éviter les régressions

---

## 2. DÉCISIONS VERROUILLÉES (D1 à D26)

Ne plus discuter, appliquer telles quelles.

| # | Sujet | Décision |
|---|---|---|
| D1 | Validation géo | Polygones GeoJSON offline (NetTopologySuite). **Pas** Google API. |
| D2 | UX validation GPS | Voyant **vert/rouge** uniquement. Pas de lat/lng visibles au client. |
| D3 | Pilote géographique | Délégation = donnée principale (dropdown). Polygone = garde-fou. |
| D4 | Voyant rouge GPS | Bouton « Acheter » **désactivé** (blocage dur). |
| D5 | Carnet d'adresses | **4 maximum**. Au-delà, le client choisit laquelle remplacer. |
| D6 | Adresse temporaire | Possible, **non sauvegardée**, juste pour la commande en cours. |
| D7 | Mode retrait | Pas de GPS requis. Dropdown de villes → dépôt assigné selon ville. |
| D8 | Article hors stock partout | Achat **bloqué** + noms des articles affichés au client. |
| D9 | Code-barres | Niveau **article**. Utiliser colonne existante `AR_CodeBarre`. |
| D10 | Granularité transit | Articles isolés. Un transit peut grouper N articles de N commandes (consolidation). |
| D11 | Place confirmatrice | **Conservée** dans le flow. Le transit ne se déclenche qu'**après** confirmation. |
| D12 | Choix dépôt source | **Dépôt qui a le plus d'articles en attente de transit**. Si égalité → km le plus court. |
| D13 | Choix livreur-transit | **Celui qui a le plus de commandes EN_COURS_DE_TRANSIT** (actives). Si égalité → km. |
| D14 | Délai bascule auto | 24h sans scan pickup → bascule auto vers 2ème dépôt source candidat. |
| D15 | Échec total | Si bascule échoue aussi → alerte superviseur + override manuel. |
| D16 | Rôle superviseur | **Rôle indépendant**. Pas un livreur. Ne livre/transit/confirme jamais. |
| D17 | Nombre superviseurs | Architecture **N superviseurs globaux**. Démo PFE : 1 seul user au seed. |
| D18 | Missions superviseur | 2 uniquement : (1) gérer zones livreurs, (2) monitorer/débloquer transits. |
| D19 | Override manuel | En cascade : dépôt source d'abord, livreur-transit ensuite. |
| D20 | Stock après scan transit | Source `-1`, destination `+1` (déplacement, pas création). |
| D21 | Lock + audit | Lock optimiste sur tous les overrides. Audit log complet. |
| D22 | Photo colis endommagé | Livreur prend **jusqu'à 5 photos** au moment de la livraison si incident. |
| D23 | Réclamation client | Motifs : « Colis endommagé », « Colis non correspondant », « Retard », « Autre ». Photos 1-5. |
| D24 | Visibilité photos | Confirmatrice voit toutes les photos (livreur + client) dans un viewer galerie. |
| D25 | GPS au checkout — adresse du carnet | **Sélection/coche obligatoire**. GPS déjà validé à la création de l'adresse. Bouton "Confirmer la commande" reste désactivé tant qu'aucune adresse n'est sélectionnée. |
| D26 | GPS au checkout — adresse temporaire | Bouton GPS **obligatoire**. Deux modes proposés : (A) Détection automatique, (B) Pin sur carte. Si GPS refusé par l'OS, bascule automatique vers le mode pin. Bouton "Confirmer la commande" désactivé tant que la position n'est pas validée (voyant vert). |

---

## 3. ACTEURS ET RÔLES — Définitions complètes

### 3.1 CLIENT (existant — enrichi)

**Plateformes** : React (web) uniquement

**Actions principales** :
- Naviguer le catalogue
- Gérer son carnet d'adresses (max 4 — ajouter/supprimer/modifier)
- Saisir une adresse temporaire (non sauvegardée)
- Choisir entre livraison à domicile et retrait au dépôt
- Valider sa position GPS au checkout (D25/D26)
- Suivre sa commande via tracking enrichi
- Déposer une réclamation avec motif + photos
- Recevoir notifications (confirmé, en transit, prêt, livré)

**Restrictions** :
- Ne voit pas l'organisation interne (dépôts, livreurs)
- Ne voit pas lat/lng — uniquement voyant vert/rouge
- Ne peut pas dépasser 4 adresses

### 3.2 CONFIRMATRICE (existante — enrichie)

**Plateformes** : React (web, bureau) + Flutter (mobile, notifications push)

**React** : interface bureau pour traitement rapide — validation commandes au clavier, liste des réclamations, galerie photos, actions rapides (raccourcis Enter/Tab).

**Flutter** : notifications push pour nouvelles commandes, consultation rapide, actions basiques (confirmer/refuser).

**Actions principales** :
- Recevoir nouvelles commandes (`EN_ATTENTE_CONFIRMATION`)
- Appeler le client, vérifier disponibilité, confirmer
- Convertir BC → BL (push Sage X3)
- Annuler commande si client injoignable / refus
- **NOUVEAU** : Consulter les photos jointes aux réclamations clients et aux livraisons endommagées dans un viewer galerie
- **NOUVEAU** : Traiter les réclamations (accepter / refuser / escalader admin)

**Restrictions** :
- Ne gère pas les transits (rôle superviseur)
- Ne modifie pas les zones livreurs

### 3.3 LIVREUR CLASSIQUE (existant — zones enrichies)

**Plateformes** : Flutter (mobile) uniquement

**Actions principales** :
- Voir pool de commandes filtré par ses délégations affectées (`F_LIVREUR_ZONE`)
- Accepter une commande, livrer
- Encaisser COD si applicable
- **NOUVEAU** : Marquer une livraison comme « avec incident » et joindre jusqu'à 5 photos
- Marquer livré / retourné

**Restrictions** :
- Voit uniquement les commandes de ses délégations
- Ne transite jamais des articles entre dépôts

### 3.4 LIVREUR-TRANSIT (NOUVEAU)

**Plateformes** : Flutter (mobile, principal — scan) + React (web, secondaire — consultation/historique)

**Identification** : flag `IsTransit: bool` sur `ProfilUtilisateur` + rôle `LIVREUR`. Au login, si `IsTransit = true`, le shell Flutter monte l'interface transit (pas l'interface livreur classique). Sur React, le shell détecte `isTransit` et affiche l'espace transit.

**Flutter — 3 onglets (usage terrain)** :

**Onglet « À PRENDRE »** : articles affectés par le système, à scanner au dépôt source.
- Chaque carte affiche : nom article, code-barres, quantité, dépôt source → dépôt destination, km, n° commande, ancienneté
- Bouton « Scanner pour prise en charge »
- Caméra → scan code-barres `AR_CodeBarre`
- Si correspondance + article affecté à ce livreur → bip vert + statut `EN_TRANSIT`
- Sinon → toast d'erreur clair

**Onglet « EN COURS »** : articles déjà pris, à livrer au dépôt destination.
- Chaque carte affiche les mêmes infos + bouton navigation Google Maps vers dépôt destination
- Bouton « Scanner à l'arrivée »
- **Géoloc obligatoire** : le livreur doit être à moins de 500m du dépôt destination pour valider
- Scan réussi → bip vert + stock source `-1` + stock destination `+1` + statut `RECU_AU_DEPOT`

**Onglet « HISTORIQUE »** : 30 derniers articles transités. Lecture seule. Groupé par date.

**Profil minimaliste** : nom, photo, dépôt rattaché, téléphone, compteurs jour/mois, déconnexion.

**React — Interface consultation (secondaire)** :
- Tableau de bord personnel : articles en attente, en cours, historique complet (pas limité à 30)
- Statistiques personnelles (km totaux, articles transités, temps moyen)
- Aucune action de scan (le scan reste mobile uniquement)

**Restrictions** :
- Ne livre jamais à un client final
- Ne voit pas les commandes complètes (juste les articles à transiter)
- Ne décide rien (le système affecte automatiquement)

### 3.5 SUPERVISEUR (NOUVEAU)

**Plateformes** : React (web, principal — monitoring) + Flutter (mobile, secondaire — alertes urgentes + override rapide)

**Identification** : rôle `SUPERVISEUR` indépendant. Compte créé par l'admin via invitation email.

**React — Interface principale (bureau)** :

**Écran A — Tableau de bord transits** (page d'accueil)
- 4 cartes stats : `EN_ATTENTE_TRANSIT`, `EN_TRANSIT`, `RECU_AU_DEPOT` aujourd'hui, ⚠ Bloqués (>24h sans pickup)
- Tableau live de tous les transits, filtrable par statut/dépôt/livreur/ancienneté
- Rafraîchissement temps réel SignalR

**Écran B — Gestion des zones livreurs** (mission 1)
- Liste des livreurs classiques avec leurs zones actuelles
- Tap → édition multi-select des délégations affectées
- Sauvegarde instantanée + recalcul du pool en temps réel

**Écran C — Alertes**
- File chronologique 🔴 (urgent) / 🟡 (info) / 🟢 (audit)
- Acquittement (mark as read) — bouton visible sur chaque alerte
- Alertes archivées (jamais supprimées), filtrables par sévérité et date
- Lien direct vers le transit concerné

**Écran D — Historique audit**
- Toutes les actions overrides passées
- Filtrable par date / superviseur / type d'action
- Lecture seule

**Action principale — Override d'un transit (modal 2 étapes)** :
1. **Étape 1 — Choisir le dépôt source** : liste de tous les dépôts ayant l'article en stock suffisant, triée par algo D12. Badge ✨ **Recommandé** sur le premier de la liste. Le dépôt actuel est marqué.
2. **Étape 2 — Choisir le livreur-transit** : liste des livreurs-transit du dépôt sélectionné, avec charge en cours + statut online/offline + dernier scan. Badge ✨ **Recommandé** sur le premier. Le livreur actuel est marqué.

Confirmation modale obligatoire avec motif texte libre. Audit log mis à jour. Notifications SignalR à l'ancien livreur (article retiré) et au nouveau (article affecté).

**Flutter — Interface secondaire (mobile)** :
- Notifications push pour alertes 🔴 (urgentes uniquement)
- Vue rapide du dashboard (stats uniquement, pas le tableau complet)
- Modal override simplifié accessible depuis une alerte push (même 2 étapes, format mobile)
- Onglet alertes avec acquittement

**Restrictions** :
- Ne livre / transit / confirme jamais
- Ne crée / supprime pas d'utilisateurs
- Ne voit pas les données financières (CA, marges, paiements)
- Ne touche pas aux articles, prix, dépôts
- Ne gère pas les réclamations clients (rôle confirmatrice/admin)

### 3.6 ADMIN (existant — enrichi)

**Plateformes** : React (web) uniquement

**Actions principales (existantes)** + nouvelles :
- Créer un compte superviseur (invitation email)
- Activer/désactiver `IsTransit` sur un livreur
- Configurer le mapping `F_DEPOT_ZONE` (délégation → dépôt)
- Voir l'audit log complet (superviseurs et système)
- Tout le reste (utilisateurs, articles, dépôts, finances, etc.)

---

## 4. GESTION DES ZONES ET DU HORS-ZONE

### 4.1 Périmètre de démarrage (PFE)

Pour la démo PFE, on démarre avec **3 dépôts** uniquement :

| Dépôt | Gouvernorats couverts (approximatif) |
|---|---|
| **TUNIS** | Tunis, Ariana, Ben Arous, Manouba, Bizerte, Zaghouan, Nabeul |
| **SOUSSE** | Sousse, Monastir, Mahdia, Kairouan, Siliana, Le Kef |
| **SFAX** | Sfax, Sidi Bouzid, Gabes, Médenine, Tataouine, Gafsa, Tozeur, Kébili |

Le mapping fin délégation → dépôt est géré dans `F_DEPOT_ZONE` et configurable par l'admin.

**Architecture** : 1 dépôt par ville pour le PFE. La table `F_DEPOT_ZONE` supporte plusieurs dépôts par ville pour l'évolution future sans refactoring.

### 4.2 Comportement hors-zone

Si la délégation sélectionnée par le client n'a **pas d'entrée dans `F_DEPOT_ZONE`** :

1. **Pas de blocage dur** : on ne refuse pas la commande.
2. **Bascule automatique** vers le mode retrait au dépôt.
3. L'UI affiche un message clair :

```
⚠ Livraison non disponible dans votre zone pour le moment.
Vous pouvez retirer votre commande dans l'un de ces dépôts :
  ✨ Recommandé  · Dépôt de Tunis  (85 km)
                 · Dépôt de Sousse (120 km)
                 · Dépôt de Sfax   (200 km)
```

4. Les 3 dépôts les plus proches sont triés par distance Haversine sur les centroïdes des dépôts.
5. Le badge **✨ Recommandé** va systématiquement sur le plus proche.

**Endpoint** : `GET /api/geo/pickup-options?gouvernorat=X&delegation=Y`

Réponse :
```json
{
  "isCovered": false,
  "nearestDepots": [
    { "depotNo": 1, "name": "Dépôt de Tunis", "city": "Tunis", "distanceKm": 85.2, "isRecommended": true },
    { "depotNo": 2, "name": "Dépôt de Sousse", "city": "Sousse", "distanceKm": 120.7, "isRecommended": false },
    { "depotNo": 3, "name": "Dépôt de Sfax", "city": "Sfax", "distanceKm": 200.1, "isRecommended": false }
  ]
}
```

### 4.3 Page admin — Carte de couverture

Dans le panneau admin :
- Carte visuelle de la Tunisie avec délégations colorées :
  - 🟢 vert : délégation mappée dans `F_DEPOT_ZONE`
  - ⚫ gris : délégation non couverte
- Clic sur une délégation grise → modal rapide pour assigner un dépôt
- Wizard « Ouvrir un nouveau dépôt » (3 étapes) :
  1. Informations du dépôt (nom, ville, adresse, centroïde lat/lng, heures d'ouverture)
  2. Délégations à couvrir (multi-select)
  3. Livreurs initiaux à rattacher

---

## 5. GPS AU CHECKOUT — Règles complètes

### 5.1 Vue d'ensemble des 3 cas

| Cas | GPS requis | Comportement |
|---|---|---|
| **Mode retrait au dépôt** | ❌ Non | Le client sélectionne un dépôt dans la liste (dropdown). Aucun GPS. |
| **Adresse du carnet** | Sélection obligatoire | GPS validé à la création. Cocher/sélectionner une adresse active le bouton "Confirmer". |
| **Adresse temporaire** | ✅ Oui — bouton GPS obligatoire | Bouton "Confirmer la commande" désactivé tant que position non validée (voyant vert). |

### 5.2 Composant `<GpsValidator>`

**Principe** : un seul composant React (`GpsValidatorSection.tsx`) et son équivalent Flutter (`GpsValidatorSection`) qui orchestre les deux modes de validation GPS.

**Deux modes proposés en parallèle (pas de fallback caché)** :

```
┌─────────────────────────────────────────────┐
│  📍 Confirmez votre position                 │
│                                              │
│  [ 🛰 Détecter automatiquement ]             │
│  [ 🗺 Placer sur la carte ]                  │
│                                              │
│  Status : ⏳ En attente                      │
└─────────────────────────────────────────────┘
```

**Mode A — Détection automatique** :
- Appel `navigator.geolocation.getCurrentPosition()` (React) / `Geolocator.getCurrentPosition()` (Flutter)
- Si permission accordée → lat/lng → appel `POST /api/geo/validate-point` → voyant vert ou rouge
- Si permission refusée → toast informatif + basculement automatique vers le Mode B (pin sur carte)

**Mode B — Pin sur carte** :
- `@react-google-maps/api` (React) / `google_maps_flutter` (Flutter)
- Carte centrée sur le **centroïde de la délégation déclarée** (moins de déplacement pour le client)
- Marker déplaçable (drag & drop)
- À chaque déplacement → appel debounced (300ms) `POST /api/geo/validate-point`
- Voyant vert : position OK → bouton "Confirmer" activé
- Voyant rouge : position hors délégation → message d'explication + bouton "Confirmer" désactivé
- Bouton **"Réessayer la détection automatique"** toujours visible

**Cas extrêmes** :
- Pin en mer → `HardError OUT_OF_TUNISIA` → voyant rouge + message "Position invalide (hors Tunisie)"
- Pin dans une autre délégation → `Warning` → voyant rouge + suggestion "Le pin semble être à Hammam Sousse, pas Sousse Médina. Modifier le pin ou changer la délégation."
- Pas de connexion au moment de la validation → toast "Validation impossible hors ligne — réessayez dans un instant"

### 5.3 Ce que le backend reçoit

Que la position soit obtenue par GPS auto ou par pin manuel, le résultat est **identique** côté backend :
- `latitude` + `longitude` stockés dans `F_DOCENTETE`
- `GeoValidationStatus` calculé uniformément
- Pas de champ "source" (GPS vs pin) — non pertinent côté business

---

## 6. SCHÉMA DE DONNÉES

### 6.1 Tables existantes — modifications

#### `ProfilUtilisateur` (ajout colonnes)
```sql
ALTER TABLE ProfilUtilisateur ADD IsTransit BIT NOT NULL DEFAULT 0;
-- Note : pas de IsSupervisor — le superviseur est un rôle à part (table AspNetRoles)
ALTER TABLE ProfilUtilisateur ADD DepotRattacheNo INT NULL;  -- Pour les livreurs et livreurs-transit
ALTER TABLE ProfilUtilisateur ADD CONSTRAINT FK_ProfilUtilisateur_Depot 
    FOREIGN KEY (DepotRattacheNo) REFERENCES F_DEPOT(DE_No);
```

#### `F_DOCENTETE` (ajout colonnes)
```sql
ALTER TABLE F_DOCENTETE ADD DeliveryMode NVARCHAR(20) NOT NULL DEFAULT 'HOME_DELIVERY';
-- Valeurs : HOME_DELIVERY | DEPOT_PICKUP
ALTER TABLE F_DOCENTETE ADD PickupDepotNo INT NULL;
ALTER TABLE F_DOCENTETE ADD GeoValidationStatus NVARCHAR(20) NULL;
-- Valeurs : Ok | Warning | HardError | Unknown
ALTER TABLE F_DOCENTETE ADD HasDeliveryIncident BIT NOT NULL DEFAULT 0;
ALTER TABLE F_DOCENTETE ADD GeoLat DECIMAL(9,6) NULL;
ALTER TABLE F_DOCENTETE ADD GeoLng DECIMAL(9,6) NULL;
```

#### `F_CLIENT_ADDRESS` (vérifier limite 4 max via contrainte applicative)
Pas de modification de schéma — l'application impose la limite, mais on ajoute un index utile :
```sql
CREATE INDEX IX_F_CLIENT_ADDRESS_Client ON F_CLIENT_ADDRESS(ClientId);
```

#### `Roles` (ASP.NET Identity) — seed du rôle SUPERVISEUR
À effectuer dans `Data/Seeds/RoleSeed.cs` :
```csharp
new IdentityRole { Name = "SUPERVISEUR", NormalizedName = "SUPERVISEUR" }
```

### 6.2 Nouvelles tables

#### `F_DEPOT_ZONE` — Mapping délégation → dépôt
```sql
CREATE TABLE F_DEPOT_ZONE (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DepotNo INT NOT NULL,
    Gouvernorat NVARCHAR(50) NOT NULL,
    Delegation NVARCHAR(100) NOT NULL,
    IsPrimary BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT FK_DepotZone_Depot FOREIGN KEY (DepotNo) REFERENCES F_DEPOT(DE_No),
    CONSTRAINT UQ_DepotZone UNIQUE (DepotNo, Gouvernorat, Delegation)
);
CREATE INDEX IX_DepotZone_Delegation ON F_DEPOT_ZONE(Gouvernorat, Delegation);
CREATE UNIQUE INDEX IX_DepotZone_Primary ON F_DEPOT_ZONE(Gouvernorat, Delegation) 
    WHERE IsPrimary = 1;
```

#### `F_LIVREUR_ZONE` — Délégations affectées à un livreur classique
```sql
CREATE TABLE F_LIVREUR_ZONE (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LivreurUserId UNIQUEIDENTIFIER NOT NULL,
    Gouvernorat NVARCHAR(50) NOT NULL,
    Delegation NVARCHAR(100) NOT NULL,
    AssignedByUserId UNIQUEIDENTIFIER NOT NULL,
    AssignedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_LivreurZone_User FOREIGN KEY (LivreurUserId) REFERENCES AspNetUsers(Id),
    CONSTRAINT UQ_LivreurZone UNIQUE (LivreurUserId, Gouvernorat, Delegation)
);
CREATE INDEX IX_LivreurZone_User ON F_LIVREUR_ZONE(LivreurUserId);
CREATE INDEX IX_LivreurZone_Delegation ON F_LIVREUR_ZONE(Gouvernorat, Delegation);
```

#### `F_TRANSFERT` — Un transit d'article entre dépôts
```sql
CREATE TABLE F_TRANSFERT (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DoPiece NVARCHAR(20) NOT NULL,           -- FK F_DOCENTETE
    ArRef NVARCHAR(50) NOT NULL,             -- FK F_ARTICLE
    Quantite DECIMAL(18,4) NOT NULL,
    SourceDepotNo INT NOT NULL,
    DestinationDepotNo INT NOT NULL,
    TransitLivreurUserId UNIQUEIDENTIFIER NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE_TRANSIT',
    -- Statuts : EN_ATTENTE_TRANSIT / EN_TRANSIT / RECU_AU_DEPOT / ANNULE
    AffectedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PickedUpAt DATETIME2 NULL,
    DeliveredAt DATETIME2 NULL,
    EscalatedAt DATETIME2 NULL,              -- Si bascule auto déclenchée
    PickupGpsLatitude DECIMAL(9,6) NULL,
    PickupGpsLongitude DECIMAL(9,6) NULL,
    DeliveryGpsLatitude DECIMAL(9,6) NULL,
    DeliveryGpsLongitude DECIMAL(9,6) NULL,
    AlgoReasoning NVARCHAR(500) NULL,        -- Explication algo affectation
    Version INT NOT NULL DEFAULT 1,          -- Pour lock optimiste
    CONSTRAINT FK_Transfert_DocEntete FOREIGN KEY (DoPiece) REFERENCES F_DOCENTETE(DO_Piece),
    CONSTRAINT FK_Transfert_SourceDepot FOREIGN KEY (SourceDepotNo) REFERENCES F_DEPOT(DE_No),
    CONSTRAINT FK_Transfert_DestDepot FOREIGN KEY (DestinationDepotNo) REFERENCES F_DEPOT(DE_No)
);
CREATE INDEX IX_Transfert_Status ON F_TRANSFERT(Status);
CREATE INDEX IX_Transfert_Livreur ON F_TRANSFERT(TransitLivreurUserId);
CREATE INDEX IX_Transfert_Source ON F_TRANSFERT(SourceDepotNo, Status);
```

#### `F_TRANSFERT_AUDIT_LOG` — Trace des actions sur transferts
```sql
CREATE TABLE F_TRANSFERT_AUDIT_LOG (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TransfertId UNIQUEIDENTIFIER NOT NULL,
    ActionType NVARCHAR(50) NOT NULL,
    -- AUTO_AFFECT / AUTO_ESCALATE / SUPERVISOR_OVERRIDE / SUPERVISOR_CANCEL / SCAN_PICKUP / SCAN_DELIVERY
    ActorUserId UNIQUEIDENTIFIER NULL,       -- NULL si action système auto
    SnapshotBefore NVARCHAR(MAX) NULL,       -- JSON
    SnapshotAfter NVARCHAR(MAX) NULL,        -- JSON
    Motif NVARCHAR(500) NULL,
    OccurredAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Audit_Transfert FOREIGN KEY (TransfertId) REFERENCES F_TRANSFERT(Id)
);
CREATE INDEX IX_Audit_Transfert ON F_TRANSFERT_AUDIT_LOG(TransfertId, OccurredAt DESC);
```

#### `F_SUPERVISOR_ALERT` — Alertes pour superviseurs
```sql
CREATE TABLE F_SUPERVISOR_ALERT (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Severity NVARCHAR(10) NOT NULL,          -- INFO | WARNING | URGENT
    AlertType NVARCHAR(50) NOT NULL,
    -- TRANSIT_STUCK_24H / TRANSIT_NO_LIVREUR / TRANSIT_AUTO_ESCALATED / LIVREUR_OFFLINE
    RelatedTransfertId UNIQUEIDENTIFIER NULL,
    Message NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    AcknowledgedByUserId UNIQUEIDENTIFIER NULL,
    AcknowledgedAt DATETIME2 NULL,
    CONSTRAINT FK_Alert_Transfert FOREIGN KEY (RelatedTransfertId) REFERENCES F_TRANSFERT(Id)
);
CREATE INDEX IX_Alert_Unacknowledged ON F_SUPERVISOR_ALERT(AcknowledgedAt, Severity) 
    WHERE AcknowledgedAt IS NULL;
```

#### `F_DELIVERY_INCIDENT_PHOTO` — Photos d'incident livraison (livreur)
```sql
CREATE TABLE F_DELIVERY_INCIDENT_PHOTO (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DoPiece NVARCHAR(20) NOT NULL,
    LivreurUserId UNIQUEIDENTIFIER NOT NULL,
    CloudinaryUrl NVARCHAR(500) NOT NULL,
    CloudinaryPublicId NVARCHAR(200) NOT NULL,
    PhotoOrder INT NOT NULL,                 -- 1 à 5
    Comment NVARCHAR(1000) NULL,
    UploadedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_IncidentPhoto_DocEntete FOREIGN KEY (DoPiece) REFERENCES F_DOCENTETE(DO_Piece),
    CONSTRAINT FK_IncidentPhoto_User FOREIGN KEY (LivreurUserId) REFERENCES AspNetUsers(Id),
    CONSTRAINT CK_IncidentPhoto_Order CHECK (PhotoOrder BETWEEN 1 AND 5)
);
CREATE INDEX IX_IncidentPhoto_DocEntete ON F_DELIVERY_INCIDENT_PHOTO(DoPiece);
```

#### `F_RECLAMATION` — Modification (ajout colonnes)
```sql
-- Si la table existe déjà, ajouter uniquement la colonne manquante :
ALTER TABLE F_RECLAMATION ADD Motif NVARCHAR(50) NOT NULL DEFAULT 'AUTRE';
-- Motifs : COLIS_ENDOMMAGE | COLIS_NON_CORRESPONDANT | RETARD_LIVRAISON | AUTRE
```

#### `F_RECLAMATION_PHOTO` — Photos jointes aux réclamations clients
```sql
CREATE TABLE F_RECLAMATION_PHOTO (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ReclamationId UNIQUEIDENTIFIER NOT NULL,
    CloudinaryUrl NVARCHAR(500) NOT NULL,
    CloudinaryPublicId NVARCHAR(200) NOT NULL,
    PhotoOrder INT NOT NULL,
    UploadedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ReclamationPhoto_Reclamation FOREIGN KEY (ReclamationId) 
        REFERENCES F_RECLAMATION(Id) ON DELETE CASCADE,
    CONSTRAINT CK_ReclamationPhoto_Order CHECK (PhotoOrder BETWEEN 1 AND 5)
);
CREATE INDEX IX_ReclamationPhoto_Reclamation ON F_RECLAMATION_PHOTO(ReclamationId);
```

---

## 7. ALGORITHMES CLÉS

### 7.1 Validation polygone d'une adresse

```
Entrée : latitude, longitude, gouvernoratDéclaré, délégationDéclarée
Sortie : Status ∈ {Ok, Warning, HardError, Unknown}

1. Si polygones non chargés → Unknown, "Validation indisponible"
2. Normaliser noms (trim, lowercase, retirer accents, retirer espaces/tirets)
3. Construire buffer 200m autour du polygone (gouvernoratDéclaré, délégationDéclarée)
4. Tester si point ∈ buffer :
   - Oui → Ok
   - Non → continuer
5. Tester quelle délégation contient réellement le point (parcours STRtree)
   - Aucune (point hors Tunisie) → HardError, "Position hors Tunisie"
   - Délégation X du même gouvernorat → Warning, suggère X
   - Délégation Y d'un autre gouvernorat → HardError, suggère Y et son gouvernorat
```

### 7.2 Choix du DÉPÔT SOURCE pour un transit (D12)

```
Entrée : articleRef, quantitéRequise, dépôtDestinationNo
Sortie : DépôtSourceNo OU null si impossible

1. SELECT DepotNo FROM F_ARTSTOCK 
   WHERE AR_Ref = articleRef AND AS_QteSto >= quantitéRequise 
     AND DepotNo != dépôtDestinationNo
   → candidats[]
   
2. Pour chaque candidat, calculer :
   - nbArticlesEnAttenteTransit (count F_TRANSFERT où SourceDepotNo = candidat.DepotNo 
                                 ET Status = 'EN_ATTENTE_TRANSIT')
   - distanceKmVersDestination (Haversine sur centroïdes des dépôts)
   
3. Trier candidats DESC par nbArticlesEnAttenteTransit, puis ASC par distanceKm
4. Retourner le premier candidat (ou null si liste vide)

5. Si liste vide → article indisponible partout → bloquer la commande
```

### 7.3 Choix du LIVREUR-TRANSIT (D13)

```
Entrée : dépôtSourceNo
Sortie : LivreurUserId OU null

1. SELECT u.Id FROM AspNetUsers u 
   JOIN UserRoles ur ON ur.UserId = u.Id 
   JOIN ProfilUtilisateur p ON p.UserId = u.Id
   WHERE ur.RoleName = 'LIVREUR' 
     AND p.IsTransit = 1 
     AND p.DepotRattacheNo = dépôtSourceNo
     AND u.IsActive = 1
   → livreurs[]

2. Pour chaque livreur, calculer :
   - nbCommandesEnCoursTransit (count F_TRANSFERT où TransitLivreurUserId = livreur.Id 
                                ET Status = 'EN_TRANSIT')
   - distanceVersDestination (centroïde dépôt source — ou position GPS si dispo)
   
3. Trier livreurs DESC par nbCommandesEnCoursTransit, puis ASC par distance
4. Retourner le premier (ou null si liste vide)
```

### 7.4 Job Hangfire — Bascule automatique 24h (D14)

```
Toutes les 30 minutes :

Pour chaque transfert avec Status = 'EN_ATTENTE_TRANSIT' :
  Si AffectedAt < now() - 24h :
    1. Trouver le 2ème dépôt source candidat (algo 7.2 avec exclusion du dépôt actuel)
    2. Si trouvé :
       - Choisir un livreur-transit dans ce nouveau dépôt (algo 7.3)
       - Si livreur trouvé :
         a. Mettre à jour transfert : SourceDepotNo = nouveau, TransitLivreurUserId = nouveau
         b. EscalatedAt = now()
         c. Créer entrée audit AUTO_ESCALATE
         d. Notifier ancien livreur (SignalR) : "article retiré"
         e. Notifier nouveau livreur (push + SignalR) : "nouvel article"
         f. Créer alerte 🟡 superviseurs : "Transfert auto-escaladé"
       - Si aucun livreur :
         → Créer alerte 🔴 superviseurs : "Transfert sans livreur après bascule"
    3. Si aucun 2ème dépôt :
       → Créer alerte 🔴 superviseurs : "Article indisponible pour transfert"
```

### 7.5 Workflow scan transit (D9, D20)

```
SCAN PICKUP (au dépôt source) :
  Entrée : codeBarre (AR_CodeBarre), livreurId, gpsLat, gpsLng

  1. Trouver F_TRANSFERT.id où :
     - F_TRANSFERT.ArRef.AR_CodeBarre = codeBarre
     - TransitLivreurUserId = livreurId
     - Status = 'EN_ATTENTE_TRANSIT'
  2. Si introuvable → 404 "Article non affecté"
  3. Vérifier géoloc : distance(gpsLivreur, centroïdeDépôtSource) < 500m
     - Sinon → 400 "Vous devez être au dépôt source"
  4. Transaction :
     a. F_TRANSFERT.Status = 'EN_TRANSIT'
     b. F_TRANSFERT.PickedUpAt = now()
     c. F_TRANSFERT.PickupGpsLat/Lng = gpsLivreur
     d. Audit log SCAN_PICKUP
  5. SignalR notifier superviseurs (rafraîchissement dashboard)

SCAN DELIVERY (au dépôt destination) :
  Entrée : codeBarre, livreurId, gpsLat, gpsLng

  1. Trouver F_TRANSFERT où ArRef.AR_CodeBarre = codeBarre, 
     TransitLivreurUserId = livreurId, Status = 'EN_TRANSIT'
  2. Vérifier géoloc : distance(gpsLivreur, centroïdeDépôtDestination) < 500m
  3. Transaction :
     a. F_TRANSFERT.Status = 'RECU_AU_DEPOT'
     b. DeliveredAt, DeliveryGps* renseignés
     c. F_ARTSTOCK[SourceDepotNo][ArRef].AS_QteSto -= Quantite
     d. F_ARTSTOCK[DestDepotNo][ArRef].AS_QteSto += Quantite
     e. Vérifier si la commande a maintenant tous ses articles au dépôt destination :
        - Si oui : F_DOCENTETE.Status passe à 'CONFIRME_PRET_LIVRAISON' (mode HOME) 
                  OU 'DISPONIBLE_AU_DEPOT' (mode PICKUP)
        - Sinon : commande reste EN_ATTENTE_TRANSIT
     f. Audit log SCAN_DELIVERY
  4. SignalR notifier : superviseurs + client (tracking) + livreurs classiques (si pool changé)
```

---

## 8. CHANTIERS — Ordre d'implémentation

### Chantier 1 — Géo + polygones ✅ (en cours)

**Statut** : déjà commencé, en attente du dépôt de `tunisia_delegations.geojson` par l'utilisateur.

**Reste à faire** :
- Vérifier que `polygonsLoaded: true` après dépôt du fichier
- Vérifier que les 5 tests SkippableFact passent
- Si noms ne matchent pas : ajuster la fonction de normalisation
- Cleanup : retirer le doublon `Enfida`/`Enfidha` dans `TunisieDecoupage.cs` (garder `Enfidha`)

**Acceptation** : `GET /api/geo/health` → `polygonsLoaded:true, polygonCount:>=200`.

**Rapport** : `CHANTIER_1_GEO_REPORT.md` (déjà créé)

### Chantier 2 — Mapping délégation ↔ dépôt + hors-zone

**Objectif** : créer `F_DEPOT_ZONE` + page admin React pour le configurer + endpoint hors-zone.

**Backend** :
- Migration `Add_DepotZone`
- Entité `F_DEPOT_ZONE.cs` + DbContext
- Service `IDepotZoneService` : `GetDepotForDelegation`, `GetAllDepotsForDelegation`, `FindClosestDepots`
- Endpoints admin `/api/admin/depot-zones/*` (CRUD + import CSV)
- Endpoint public `GET /api/geo/pickup-options?gouvernorat=X&delegation=Y` (retourne `isCovered` + liste dépôts proches)
- Seed : 3 dépôts initiaux (Tunis, Sousse, Sfax) avec mapping minimal

**React** :
- Page `AdminDepotZonesPage.tsx` : tableau + modal de création + bouton import CSV
- Page `AdminCoverageMapPage.tsx` : carte Tunisie avec délégations colorées (🟢/⚫) + wizard "Ouvrir un nouveau dépôt"
- Route admin dans le shell existant

**Tests xUnit** :
- T2.1 : créer un mapping principal → OK
- T2.2 : créer un 2ème principal sur même délégation → 400
- T2.3 : `FindClosestDepots` retourne les 3 plus proches triés par distance
- T2.4 : délégation mappée → `isCovered: true`
- T2.5 : délégation non mappée → `isCovered: false` + 3 dépôts proches
- T2.6 : import CSV de 264 lignes → 264 mappings

**Rapport** : `CHANTIER_2_DEPOTZONE_REPORT.md`

### Chantier 3 — Carnet d'adresses + GPS au checkout

**Objectif** : refonte du carnet client (React) avec limite 4 max, adresse temporaire, composant `GpsValidator` et voyant GPS.

**Backend** :
- Vérifier que la limite 4 max est imposée côté application (avec retour 409 + liste des 4 actuelles)
- Endpoint `POST /api/client/addresses/replace?addressIdToReplace=...`
- Réutiliser `POST /api/geo/validate-point` (Chantier 1)
- Endpoint `POST /api/orders/preview-address` (adresse temporaire → validation géo + dépôt cible)

**React** :
- Page `AddressBookPage.tsx` (onglet « Mes adresses »)
  - Liste des 4 cartes + bouton « + Ajouter » désactivé si 4
  - Modal d'ajout avec composant `<GpsValidatorSection />`
  - Si carnet plein : modal de remplacement avec 4 boutons
- Composant `<GpsValidatorSection />` (réutilisable dans le checkout) :
  - Deux boutons : "Détecter automatiquement" et "Placer sur la carte"
  - `<MapPinPicker />` (google maps, marker draggable)
  - Voyant vert/rouge + message contextuel
- Composant `<AddressTempForm />` pour adresse temporaire au checkout (non sauvegardée)
- Composant `<DepotPickerSection />` pour le mode retrait (dropdown ville + dépôt recommandé)

**Tests xUnit** :
- T3.1 : ajouter 4 adresses → OK
- T3.2 : ajouter une 5ème → 409 avec payload `{currentAddresses: [...]}`
- T3.3 : replace : ancienne supprimée, nouvelle insérée en transaction
- T3.4 : preview-address avec lat/lng Sfax pour délégation Sousse → `HardError`
- T3.5 : validate-point sur frontière délégation (tolérance 200m) → `Ok`

**Rapport** : `CHANTIER_3_ADRESSES_REPORT.md`

### Chantier 4 — Rôle superviseur (création du rôle + permissions + mission 1)

**Objectif** : créer le rôle `SUPERVISEUR`, sa mission 1 (gestion zones livreurs), les shells React et Flutter.

**Backend** :
- Seed du rôle `SUPERVISEUR`
- Policy ASP.NET `RequireSupervisor`
- Endpoints :
  - `POST /api/admin/users/invite-supervisor`
  - `GET /api/supervisor/livreurs`
  - `PUT /api/supervisor/livreurs/{id}/zones` (transaction)
  - `GET /api/livreur/zones/mine`
- Migration `Add_LivreurZone_And_DepotRattache`
- Modifier `GET /api/livreur/pool/disponibles` : filtrer par `F_LIVREUR_ZONE`. Fallback gouvernorat si aucune zone.

**React** :
- Shell superviseur (header + sidebar + authentification rôle)
- Page `SupervisorZonesPage.tsx` (mission 1)
- Squelette `SupervisorDashboardPage.tsx` (à compléter Chantier 6)

**Flutter** :
- Shell superviseur (bottom nav, 4 onglets)
- Écran `supervisor/zones_screen.dart` (mission 1)
- Squelette dashboard

**Tests xUnit** :
- T4.1 : créer user superviseur → claim Role = SUPERVISEUR
- T4.2 : `/api/supervisor/*` accessible avec rôle SUPERVISEUR
- T4.3 : `/api/supervisor/*` refusé pour rôle LIVREUR (403)
- T4.4 : remplacer zones d'un livreur → ancienne liste effacée, nouvelle en transaction
- T4.5 : pool livreur respecte les nouvelles zones
- T4.6 : pool livreur sans zone → fallback gouvernorat

**Rapport** : `CHANTIER_4_SUPERVISEUR_REPORT.md`

### Chantier 5 — Livreur-transit + scan code-barres

**Objectif** : créer le flag `IsTransit`, l'interface Flutter 3 onglets, l'interface React consultation, et les endpoints scan.

**Backend** :
- Migration `Add_IsTransit_And_Transfert_Tables`
- Entité `F_TRANSFERT.cs` + audit log
- Service `IStockTransferService` : `ScanPickupAsync`, `ScanDeliveryAsync` (transactionnel)
- Endpoints :
  - `GET /api/transit/pending`
  - `GET /api/transit/in-progress`
  - `POST /api/transit/scan-pickup`
  - `POST /api/transit/scan-delivery`
  - `GET /api/transit/history`
  - `GET /api/transit/stats/personal` (stats React)
  - `PUT /api/admin/users/{id}/transit-flag`

**Flutter** :
- Packages : `mobile_scanner`, `audioplayers`, `geolocator`
- Shell transit (si `isTransit = true` au login)
- 3 onglets : À prendre / En cours / Historique
- Mode offline : queue locale + sync au retour réseau

**React** :
- Shell transit-web (détection `isTransit` au login)
- Page `TransitDashboardPage.tsx` : tableau complet + statistiques personnelles
- Pas de scan (consultation seulement)

**Tests xUnit** :
- T5.1 : `scan-pickup` barcode inconnu → 404
- T5.2 : `scan-pickup` livreur trop loin (> 500m) → 400
- T5.3 : `scan-delivery` avant pickup → 409
- T5.4 : `scan-delivery` par un autre livreur → 403
- T5.5 : `scan-delivery` complet : stock source -1, dest +1, statut RECU_AU_DEPOT
- T5.6 : `scan-delivery` 2× même article → 409 (idempotence)
- T5.7 : audit log écrit pour chaque scan

**Rapport** : `CHANTIER_5_TRANSIT_REPORT.md`

### Chantier 6 — Dispatch auto + mission 2 du superviseur

**Objectif** : implémenter les algos D12/D13/D14, le job Hangfire, les écrans superviseur (React + Flutter).

**Backend** :
- Service `IDispatchPlannerService` (algos 7.2 et 7.3)
- Intégration dans `OrdersController.CreateOrderAsync` : après confirmation, si articles manquants → créer `F_TRANSFERT` + statut `EN_ATTENTE_TRANSFERT`
- Job Hangfire `TransitAutoEscalateJob` (toutes les 30 min)
- Service `ISupervisorAlertService`
- Endpoints superviseur :
  - `GET /api/supervisor/dashboard/stats`
  - `GET /api/supervisor/transferts` (filtres)
  - `GET /api/supervisor/transferts/{id}/reassign-candidates`
  - `POST /api/supervisor/transferts/{id}/reassign` (lock optimiste `Version`)
  - `POST /api/supervisor/transferts/{id}/cancel`
  - `GET /api/supervisor/alerts`
  - `PUT /api/supervisor/alerts/{id}/acknowledge`
- Hub SignalR `SupervisorHub`

**React** :
- `SupervisorDashboardPage.tsx` (4 cartes stats + tableau live SignalR)
- Modal `<TransfertOverrideModal />` (étape 1 + étape 2, badge ✨ Recommandé)
- `SupervisorAlertsPage.tsx` (🔴/🟡/🟢 + acquittement)
- `SupervisorAuditLogPage.tsx` (lecture seule)

**Flutter** :
- `supervisor/dashboard_screen.dart` (vue compacte — stats seulement)
- Notifications push FCM pour alertes 🔴
- Modal override simplifié accessible depuis notification

**Tests xUnit** :
- T6.1 : commande tous articles dispos → pas de transfert
- T6.2 : commande 1 article manquant → 1 F_TRANSFERT créé
- T6.3 : algo D12 : dépôt avec le plus d'articles en transit gagne
- T6.4 : algo D13 : livreur avec le plus de transits actifs gagne
- T6.5 : job Hangfire : >24h → bascule + audit + alerte 🟡
- T6.6 : override : ancien transfert mis à jour + audit + notifs
- T6.7 : 2 overrides simultanés → 2ème reçoit 409 (version mismatch)
- T6.8 : annulation : transfert ANNULE + commande ANNULEE + client notifié
- T6.9 : article indispo partout → 400 + noms des articles

**Rapport** : `CHANTIER_6_DISPATCH_REPORT.md`

### Chantier 7 — Tracking enrichi client

**Objectif** : timeline visuelle complète côté client incluant les phases de transit.

**Backend** :
- Modifier `GET /api/client/orders/{piece}/tracking-state` : steps détaillés avec infos transit

**React** :
- Composant `<OrderTimeline />` avec icônes
- Page `OrderDetailPage.tsx` enrichie (mini-carte transit)

**Tests xUnit** :
- T7.1 : commande HOME_DELIVERY sans transfert → 4 steps
- T7.2 : commande avec 1 transfert → 6 steps avec transitFrom/transitTo
- T7.3 : commande DEPOT_PICKUP → 5 steps (5e = "Retirée")
- T7.4 : labels en français, codes techniques absents

**Rapport** : `CHANTIER_7_TRACKING_REPORT.md`

### Chantier 8 — Photos + réclamations enrichies

**Objectif** : livreur → photos colis endommagé (≤5). Client → réclamation avec motif + photos. Confirmatrice → galerie complète.

**Backend** :
- Migration `Add_Photos_Tables`
- Service `IPhotoUploadService` (Cloudinary)
- Endpoints :
  - `POST /api/livreur/orders/{piece}/incident-photos`
  - `DELETE /api/livreur/orders/{piece}/incident-photos/{photoId}`
  - `POST /api/livreur/orders/{piece}/finalize-incident`
  - `GET /api/confirmatrice/orders/{piece}/incident-photos`
  - `POST /api/client/reclamations`
  - `POST /api/client/reclamations/{id}/photos`
  - `GET /api/confirmatrice/reclamations/{id}/photos`

**Flutter (livreur)** :
- Bouton "⚠ Colis endommagé" dans l'écran de livraison
- Modal : compteur 0/5 + compression (`flutter_image_compress`) + upload séquentiel

**React (client)** :
- Onglet "Mes réclamations" dans l'espace client
- Formulaire : motif (radio) + description + photos (max 5)

**React + Flutter (confirmatrice)** :
- Page "Réclamations en attente"
- Galerie zoomable photos incident + réclamation
- Actions : Accepter / Refuser / Demander plus d'infos / Escalader admin

**Tests xUnit** :
- T8.1 : upload 5 photos → OK
- T8.2 : tentative 6ème photo → 400
- T8.3 : finalize sans photo → 400
- T8.4 : fichier non-image → 400
- T8.5 : fichier > 10 Mo → 400
- T8.6 : confirmatrice peut lire photos d'incident

**Rapport** : `CHANTIER_8_PHOTOS_REPORT.md`

### Chantier 9 — Gestion d'erreurs globale

**Objectif** : standardiser tous les retours d'erreur backend + affichages côté clients.

**Backend** :
- Hiérarchie `AppException` → `NotFoundException`, `ConflictException`, `ValidationException`, `ForbiddenException`
- Middleware `GlobalExceptionMiddleware` → JSON normalisé :
```json
{
  "errorCode": "...",
  "errorMessage": "...",
  "details": {},
  "httpStatus": 400,
  "timestamp": "...",
  "traceId": "..."
}
```
- Fichier `ERROR_CODES.md` listant tous les codes d'erreur

**Flutter** :
- Intercepteur `dio_error_interceptor.dart`
- Factory de toasts français par type
- Bandeau offline persistant + queue hors-ligne

**React** :
- `axios-error-interceptor.ts` + hook `useErrorToast`
- `<ErrorBoundary />` global + bandeau réseau

**Tests** :
- T9.1 : NotFoundException → 404 normalisé
- T9.2 : validation → 400 avec détails par champ
- T9.3 : exception non typée → 500 stack masquée en prod
- T9.4 : coupure réseau → bandeau + queue
- T9.5 : 401 token expiré → redirection login

**Rapport** : `CHANTIER_9_ERRORS_REPORT.md`

### Chantier 10 — Tests de logique transverses

**Objectif** : 16 scénarios d'intégration end-to-end pour vérifier la cohérence globale.

| # | Scénario | Vérification |
|---|---|---|
| T10.1 | Client crée 4 adresses, tente la 5ème, remplace la 2ème | Exactement 4 adresses en DB après |
| T10.2 | Voyant rouge GPS → POST /api/orders forcé | Requête refusée 400 |
| T10.3 | Race condition : 2 livreurs-transit scannent le même article | Un réussit, l'autre reçoit 409 |
| T10.4 | Stock underflow : scan delivery avec stock source à 0 | Transaction rollback, erreur claire |
| T10.5 | Override superviseur, livreur original scanne l'ancien dépôt | Erreur : article réaffecté |
| T10.6 | Hangfire bascule un transfert, livreur original revient et scanne | Erreur : article réaffecté |
| T10.7 | Pin exactement sur la frontière entre 2 délégations (tolérance 200m) | Ok |
| T10.8 | Pin en mer | HardError, code `OUT_OF_TUNISIA` |
| T10.9 | Commande 2 articles, 1 transit | Timeline : 1 step transit, pas 2 |
| T10.10 | Confirmatrice annule commande en cours de transit | Tous transferts ANNULE + livreur notifié |
| T10.11 | Client tente réclamation avec 6 photos | Backend refuse, frontend ne devrait pas l'envoyer |
| T10.12 | Article hors stock tous dépôts → checkout | Achat bloqué + nom article affiché |
| T10.13 | Livreur-transit perd réseau pendant scan | Queue locale + sync + idempotent |
| T10.14 | 2 superviseurs ouvrent même override simultanément | 2ème reçoit 409 Version |
| T10.15 | Adresse temporaire utilisée | F_DOCENTETE rempli, F_CLIENT_ADDRESS reste ≤ 4 |
| T10.16 | Confirmatrice consulte photos d'une commande livrée il y a 6 mois | URLs Cloudinary toujours valides |

**Rapport** : `CHANTIER_10_LOGIC_TESTS_REPORT.md`

---

## 9. RECOMMANDATIONS SPÉCIFIQUES TUNISIE

### 9.1 Connectivité
- **Offline-first sur Flutter** : queue locale persistante pour toutes les actions critiques (scan, photos, COD, livraison)
- **Compression photos** côté client systématique (1920px, JPEG q=80) avant upload
- **Timeouts** : Dio 30s par défaut, 60s pour uploads photos
- **Retry exponentiel** : 3 tentatives (1s → 3s → 8s)

### 9.2 Langue
- **UI en français** pour le PFE
- **Préparer la structure i18n** (clés `Resources.fr.resx` backend, `fr.json` front) pour ajout arabe sans refactor
- **Noms officiels INKN** pour les délégations

### 9.3 Carte
- **Google Maps API** : limiter le quota (cache des géocodages côté serveur)
- **Centroïdes des dépôts** précalculés en seed (pas calculés à chaque requête Haversine)

### 9.4 Notifications
- **Firebase Cloud Messaging** pour push Flutter
- Préparer deep links WhatsApp pour relances futures (non PFE)

### 9.5 Paiement
- **Konnect déjà intégré** : ne pas casser
- **COD reste le mode par défaut** dans l'UX
- **TND avec 3 décimales** : `decimal(18,3)` en base

### 9.6 Fuseau horaire
- **Africa/Tunis (UTC+1)** : forcer dans `Program.cs`
- **Stocker en UTC**, convertir en local pour l'affichage
- **Heures dépôts** : 8h-18h semaine, 8h-13h samedi (configurable, champ Ramadan prévu)

### 9.7 Sécurité
- **JWT + refresh token** (déjà en place)
- **Rate limiting** sur login, reset password, validate-point
- **Validation côté serveur systématique**
- **Audit log** sur tous les overrides et actions admin

---

## 10. CRITÈRES D'ACCEPTATION GLOBAUX (à chaque chantier)

- [ ] `dotnet build "Web-Api(Asp.net)/Web-Api/Web-Api.sln"` — **0 erreur**
- [ ] `dotnet test` — **100% des tests** existants passent + nouveaux passent
- [ ] `flutter analyze` — **0 issue** dans le code nouveau (warnings tiers tolérés)
- [ ] `cd React-Ecommerce && npm run lint` — **0 erreur**
- [ ] `cd React-Ecommerce && npm run build` — **build production OK**
- [ ] Migrations EF Core : `Up()` et `Down()` testées et réversibles
- [ ] **Pas de régression** sur les endpoints existants
- [ ] **Vérification existant** documentée dans le rapport (CRÉÉ / MODIFIÉ + motif)
- [ ] Rapport `CHANTIER_N_<TOPIC>_REPORT.md` à la racine avec :
  - Liste des fichiers créés et modifiés (avec motif CRÉÉ/MODIFIÉ)
  - Migrations ajoutées
  - Tests : nombre + résultats
  - Difficultés rencontrées + comment résolues
  - Cas tunisiens identifiés et traités (ou signalés)
  - TODO restants

---

## 11. SI TU DÉTECTES UN PROBLÈME

Tu **N'AGIS PAS** unilatéralement. Tu signales et tu attends.

| Cas | Action |
|---|---|
| Incohérence dans ce document | Lister les contradictions, demander arbitrage |
| Risque de casse de l'existant | Lister les endpoints/écrans impactés, demander confirmation |
| Approche meilleure que celle décrite | La proposer avec pour/contre, demander validation |
| Dépendance manquante | Lister + version recommandée + justification |
| Donnée seed nécessaire | Demander un CSV ou proposer un seed minimal |
| Test qui révèle un bug pré-existant | Le signaler, ne pas le corriger silencieusement |
| Cas tunisien non couvert | Proposer, ne pas imposer |
| Fichier similaire existant (règle §0.5) | Montrer la comparaison, demander si modifier ou créer |

---

## 12. FIN DU DOCUMENT

Ce document est la **source de vérité unique** pour tous les chantiers à venir.

Quand tu reçois ce document :
1. Tu le lis **intégralement**.
2. Tu lis aussi `CLAUDE.md`, `AGENTS.md`, `Web-Api_REFERENCE_PFE.md`, `BRIEF_GLOBAL_PFE.md`, `CHANTIER_1_GEO_REPORT.md`.
3. Tu confirmes la lecture + tu listes les 10 chantiers (1 ligne chacun) + tu signales tout élément déjà implémenté détecté.
4. Tu demandes quel chantier attaquer.

**Tu ne fais AUCUNE ligne de code avant l'accord explicite de l'utilisateur sur un chantier précis.**
