# Knowledge Base — Chatbot Admin

> Document injecté comme contexte système dans le prompt Groq (n8n).
> Il décrit l'application complète pour permettre au chatbot de répondre
> aux questions générales, métier, et conceptuelles sans appeler la DB.
> Les questions chiffrées passent par l'endpoint `/api/admin/chat/query`.

---

## 1. Vue d'ensemble du projet

**Nom interne :** PFE — plateforme de livraison COD (Cash on Delivery) en Tunisie.

**Mission métier :** orchestrer le cycle complet d'une commande e-commerce avec
paiement à la livraison, depuis la création par le client jusqu'à la livraison
ou le retour, avec un workflow humain (confirmatrice + livreur) et une
intégration vers l'ERP Sage X3.

**Acteurs en présence :**
- les **clients** finaux (B2C ou B2B), qui passent commande
- les **confirmatrices** (rôle interne), qui valident chaque commande par appel
- les **livreurs**, qui se déplacent sur le terrain
- les **administrateurs**, qui pilotent l'ensemble
- l'ERP **Sage X3**, qui détient la vérité sur articles, stocks, dépôts

**Particularité métier :** la livraison COD impose un appel humain avant toute
expédition (la confirmatrice) et un workflow d'incidents riche (réclamations
client + signalements livreur).

---

## 2. Architecture technique

| Couche | Technologie |
|---|---|
| Backend | ASP.NET Core 8 Web API + EF Core 8 + SQL Server |
| Auth | ASP.NET Identity (clés Guid) + JWT Bearer + OAuth Google/Facebook |
| Temps réel | SignalR (hub `ReclamationHub`) |
| Frontend | Flutter (Android + Web + Windows) |
| Routing client | shell par rôle (Driver app / Confirmatrice app / Customer app / Admin app) |
| ERP externe | Sage X3 via `SageService` (HttpClient) |
| Chatbot admin | n8n + Groq + endpoints `/api/admin/chat/*` |

Le backend expose des contrôleurs REST groupés par domaine. Toutes les tables
préfixées `F_` sont des miroirs d'entités Sage. La table `ProfilUtilisateur`
porte les données métier riches côté application (gouvernorat, délégation,
géolocalisation, code Sage, type B2B/B2C).

---

## 3. Rôles applicatifs

| Rôle | Fait quoi |
|---|---|
| `CLIENT` | passe commandes, ouvre des **réclamations**, répond aux demandes du livreur, suit ses livraisons |
| `VENDEUR` | rôle réservé (pas d'écran dédié actif en V1) |
| `CONFIRMATEUR` (féminin : confirmatrice) | confirme les BC par appel, transforme BC → BL, traite les réclamations et demandes, gère son état actif/pause |
| `LIVREUR` | prend des livraisons dans son pool géo, marque tentatives/livraisons, déclenche des **demandes** quand un incident se produit |
| `ADMIN` | accès dashboard global, statistiques, supervision, peut tout faire des autres rôles |

Le rôle est porté par un `ApplicationUser` (Identity), et le profil métier
(nom, téléphone, adresse, gouvernorat, etc.) est dans `ProfilUtilisateur`.

---

## 4. Cycle de vie d'une commande

### 4.1 Documents : BC, BL, BR

- **BC** (Bon de Commande) — créé par le client. Préfixe pièce `BC*`.
- **BL** (Bon de Livraison) — créé par la confirmatrice après confirmation. Préfixe `BL*`.
- **BR** (Bon de Retour) — pas de workflow autonome en V1.

La transformation **BC → BL** est un acte métier critique. Elle se produit
dans une transaction `Serializable` qui décrémente le stock et marque le
document comme transformé.

### 4.2 Statuts d'une commande (`F_DOCENTETE.DO_Valide`)

| Code | Libellé | Sens |
|---|---|---|
| 0 | `EN_ATTENTE` | BC créé, pas encore confirmé |
| 1 | `CONFIRME` | confirmatrice a confirmé, BL généré |
| 2 | `TENTATIVE` | tentative de livraison ratée (au moins une) |
| 3 | `REFUSE` | refusé par le client ou la confirmatrice |

Ces 4 valeurs sont stockées dans `DO_Valide` côté backend.

### 4.3 Statuts de livraison (table `F_LIVRAISON.LI_Statut`)

| Code | Libellé |
|---|---|
| 0 | `CONFIRME` |
| 1 | `EN_LIVRAISON` |
| 2 | `LIVRE` |
| 3 | `RETOUR` |
| 4 | `DEPOT` |
| 5 | `REPORTE` |

**Important :** `DO_Valide` (entête commande) et `LI_Statut` (livraison) sont
**deux dimensions différentes**. Une commande `CONFIRME` (DO_Valide=1) peut
avoir plusieurs `F_LIVRAISON` successives avec des statuts différents.

### 4.4 Frais et règles de calcul

- Frais de livraison à domicile (`HOME`) : **8 DT**
- Timbre fiscal sur chaque BC : **1 DT**
- Mode `PICKUP` (retrait au dépôt) : pas de frais de livraison, dépôt obligatoire
- Mode `HOME` : adresse + gouvernorat + délégation obligatoires

---

## 5. Réclamations (RECLAMATION) — initiées par le CLIENT

### 5.1 Définition
Une **réclamation** est ouverte par le client depuis l'écran de tracking
d'une commande. Une commande peut générer **plusieurs réclamations**
indépendantes au cours de son cycle de vie.

### 5.2 Statuts d'une réclamation

| Statut | Sens |
|---|---|
| `ENVOYEE` | nouvelle, pas encore prise en charge |
| `EN_COURS_DE_TRAITEMENT` | une confirmatrice s'en occupe |
| `CLOTUREE` | résolue |
| `REFUSEE` | rejetée par la confirmatrice |

`ENVOYEE` et `EN_COURS_DE_TRAITEMENT` = ouvertes ; `CLOTUREE` et `REFUSEE` = fermées.

### 5.3 Motifs client (7 motifs)

**Avant livraison (5 motifs) :**
- `CHANGEMENT_ADRESSE` — correction obligatoire
- `CHANGEMENT_NUMERO` — correction obligatoire
- `REPROGRAMMATION`
- `ANNULATION`
- `COLIS_NON_RECU`

**Après livraison (2 motifs, photo obligatoire) :**
- `COLIS_ENDOMMAGE`
- `COLIS_NON_CORRESPONDANT`

Le filtrage motifs est fait selon que la commande est livrée ou non.

### 5.4 Types de réclamation (catégories)
`LIVRAISON`, `PRODUIT`, `PAIEMENT`, `SERVICE`, `AUTRE`.

---

## 6. Demandes (DEMANDE) — initiées par le LIVREUR

### 6.1 Définition
Une **demande** est créée automatiquement quand le livreur enregistre une
tentative ratée. Selon le motif, elle apparaît côté client (motifs A) ou
seulement côté confirmatrice (motifs B et C escaladés).

`TypeCas = RECLAMATION` (déclenché par client) ou `TypeCas = DEMANDE` (déclenché par livreur).

### 6.2 Motifs livreur (7 motifs, 3 groupes)

**Groupe A — escalation immédiate, demande visible client :**
- `NUMERO_INCORRECT` — le client doit corriger son numéro
- `ADRESSE_INCORRECTE` — le client doit corriger son adresse

**Groupe B — escalation immédiate, directement à la confirmatrice :**
- `CLIENT_REFUSE` — refus client (label UI : "Refus client")
- `AUTRE` — autre incident, **description ≥ 10 caractères obligatoire**

**Groupe C — escalation différée (3 tentatives avant escalade) :**
- `CLIENT_INJOIGNABLE` — label UI : "Client non joignable"
- `TELEPHONE_ETEINT` — label UI : "Téléphone fermé"
- `CLIENT_ABSENT` — label UI : "Client absent"

### 6.3 Règle d'escalation

- **Motifs A et B** : 1 seule occurrence → demande créée immédiatement.
- **Motifs C** : la demande n'est créée qu'à la **3e tentative ratée** sur la même commande.
- Seuil : `LivreurMotifs.DeferredThreshold = 3`.

### 6.4 Visibilité
- Motifs A → `VisibleClient = true` → le client voit la demande et peut
  répondre via `/api/demandes/{id}/reply` (nouvelle adresse / nouveau numéro).
- Motifs B et C → `VisibleClient = false` → le client ne sait pas que la demande
  existe. Seule la confirmatrice traite.

---

## 7. Confirmatrice — workflow et règles

### 7.1 État de la confirmatrice
La confirmatrice peut être :
- **active** (online + pas en pause) — éligible à recevoir des cas
- **en pause** (`IsInPause = true`) — bouton pause/reprendre
- **déconnectée** (basé sur `LastActivityAt`)

Au-delà de **30 minutes** sans activité, le système la considère déconnectée
et **réattribue ses cas en cours** à d'autres confirmatrices éligibles.

### 7.2 Attribution automatique des cas
Quand une réclamation arrive, l'algorithme choisit la confirmatrice selon
**3 critères en cascade** :
1. **Éligibilité** (active, pas en pause, pas déconnectée)
2. **Charge de travail** (la moins chargée en cas ouverts)
3. **Ancienneté de la dernière attribution** (`LastAssignmentAt` le plus ancien)

### 7.3 Hosted Service de redistribution
Un service en arrière-plan tourne **toutes les 5 minutes** :
- détecte les confirmatrices déconnectées (>30 min) ou en pause prolongée
- redistribue leurs cas en cours
- émet `CasReattribue` via SignalR

### 7.4 Pool de commandes à confirmer (lock 15 min)
Les BC en attente de confirmation sont dans un **pool** consultable par toutes
les confirmatrices. Pour éviter les doubles appels :
- Quand une confirmatrice ouvre une BC → elle pose un **verrou de 15 minutes**
  (`CommandeConfirmationLockService.LockTimeoutMinutes = 15`).
- Les autres confirmatrices voient la ligne **grisée**.
- Le verrou est libéré : transformation, unlock manuel, ou expiration.

### 7.5 Onglets de l'app confirmatrice
- **Pool** (commandes à confirmer)
- **Mes commandes** (en cours de transformation)
- **Réclamations** + **Demandes** (split visuel)
- **Profil** (état, stats personnelles)

### 7.6 Transformation BC → BL
Endpoint : `POST /api/confirmateur/commandes/{piece}/transform-to-bl`.
Implémentation rigoureuse dans `BcToBlService` :
- transaction `Serializable`
- contrôle stock par dépôt
- décrément du stock
- création du BL
- libération du lock

---

## 8. Livreur — workflow et règles

### 8.1 Pool géographique
Le livreur ne voit que les BL **dans son gouvernorat (ou délégation)** et
non encore assignés. Endpoint : `GET /api/livreur/pool/disponibles`.

### 8.2 Prendre une livraison
`POST /api/livreur/pool/{doPiece}/prendre` — atomique, le premier qui prend
gagne. Crée une `F_LIVRAISON` liée au livreur (`LivreurId = ProfilUtilisateur.cbMarq`).

### 8.3 Marquer une tentative
`POST /api/livreur/reclamations/attempt` (multipart) :
- `doPiece`, `motif` obligatoires
- `description` obligatoire si motif = `AUTRE` (≥ 10 caractères)
- GPS et photo optionnels

Selon le motif, le système :
- crée une **demande immédiate** (motifs A, B)
- attend la **3e tentative** (motifs C)

### 8.4 Reprogrammation
Statut intermédiaire `REPORTE` (`LI_Statut = 5`). Le livreur peut reprogrammer
une livraison à `J+1` à `J+14`, dans un créneau parmi :
- `MATIN` (9h–13h)
- `APRES_MIDI` (13h–18h)
- `SOIR` (18h–20h)

À la date de replanification, le statut repasse automatiquement à
`EN_LIVRAISON`.

### 8.5 Onglets de l'app livreur
- **Nouvelles** (pool disponible)
- **Mes livraisons**
- **Carte** (vue OSRM)
- **Stats**
- **Profil**

---

## 9. SignalR — 9 événements temps réel

Le hub `ReclamationHub` diffuse 9 événements vers 2 groupes (`confirmateurs`,
`livreurs`) et vers les utilisateurs ciblés.

| # | Événement | Trigger | Destinataires |
|---|---|---|---|
| 1 | `NouveauCas` | Création réclamation/demande | conf attribuée + client (si visible) |
| 2 | `StatutCasChange` | Changement statut réclamation | client + conf assignée |
| 3 | `CommandePriseEnCharge` | Conf pose un verrou sur une BC | groupe confirmateurs |
| 4 | `CommandeLiberee` | Verrou libéré (unlock/transform/stale) | groupe confirmateurs |
| 5 | `ClientARepondu` | Client répond à une demande A | conf attribuée |
| 6 | `SeuilTentativesAtteint` | 3e tentative motif différé atteinte | conf attribuée |
| 7 | `StatutCommandeChange` | `DO_Valide` change | client + livreur assigné |
| 8 | `CorrectionAppliquee` | Client applique correction (adresse/numéro) | livreur + client |
| 9 | `CasReattribue` | Redistribution 3C | ancienne conf + nouvelle conf |

---

## 10. Intégration Sage X3

### 10.1 Tables miroir
- `F_ARTICLE` — catalogue produits (synchronisé depuis Sage)
- `F_ARTSTOCK` — stocks par article × dépôt
- `F_CATALOGUE` — familles produits
- `F_DEPOT` — dépôts physiques
- `F_DOCENTETE` — entêtes documentaires (BC, BL, BR)
- `F_DOCLIGNE` — lignes documentaires

### 10.2 Endpoints de sync
- `POST /api/sync/articles`
- `POST /api/sync/catalogues`
- `POST /api/sync/depots`
- `POST /api/sync/stocks`
- `POST /api/SyncAll`
- `GET /api/SyncAll/status`

Service responsable : `SageService`. Endpoints Sage consommés :
`Article/GetArticles`, `Article/GetStocks`, `Catalogue/GetCatalogues`, `Depot/GetDepots`.

---

## 11. Endpoints publics importants (pour répondre aux questions techniques)

### Auth
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me/profile`

### Articles / Catalogue
- `GET /api/articles` (recherche + filtres + pagination)
- `GET /api/articles/{arRef}`

### Commandes (CLIENT)
- `POST /api/orders`, `GET /api/orders`, `GET /api/orders/{piece}`
- `GET /api/client/orders/{piece}/tracking` (6 blocs)

### Confirmatrice
- `GET /api/confirmateur/commandes`, `GET /api/confirmateur/bc`, `GET /api/confirmateur/bl`
- `POST /api/confirmateur/commandes/{piece}/lock`, `unlock`
- `POST /api/confirmateur/commandes/{piece}/transform-to-bl`
- `POST /api/confirmateur/status/pause`, `resume`, `me`, `me/stats`
- `GET /api/confirmateur/reclamations` (filtres par statut/source/typeCas/motif)

### Livreur
- `GET /api/livreur/pool/disponibles`
- `POST /api/livreur/pool/{doPiece}/prendre`
- `POST /api/livreur/reclamations/attempt`

### Réclamations / Demandes (CLIENT)
- `GET /api/reclamations/mine`, `POST /api/reclamations`
- `GET /api/demandes/mine`, `POST /api/demandes/{id}/reply`

### Admin
- `GET /api/admin/dashboard/overview`
- `GET /api/admin/orders`, `GET /api/admin/claims/overview`
- `GET /api/admin/products/overview`, `GET /api/admin/drivers`, `GET /api/admin/confirmatrices`
- `GET /api/admin/users`, `PUT /api/admin/users/{id}/roles`

---

## 12. Glossaire métier

| Terme | Définition |
|---|---|
| **COD** | Cash on Delivery — paiement à la livraison |
| **BC** | Bon de Commande, document initial du client |
| **BL** | Bon de Livraison, généré après confirmation |
| **BR** | Bon de Retour |
| **B2C** | client particulier (CIN) |
| **B2B** | client société (matricule fiscal, plafond crédit, remise) |
| **Réclamation** | cas ouvert par le **client** sur sa commande |
| **Demande** | cas ouvert par le **livreur** suite à un incident terrain |
| **Tentative** | enregistrement d'une livraison ratée par le livreur |
| **Pool** | liste de commandes en attente, FIFO partagée entre confirmatrices ou livreurs |
| **Lock** | verrou visuel 15 min posé par une confirmatrice sur une BC |
| **Escalation immédiate** | demande créée à la 1ère tentative ratée (motifs A et B) |
| **Escalation différée** | demande créée à la 3e tentative ratée (motifs C) |
| **Pause confirmatrice** | état où la confirmatrice ne reçoit plus de nouveaux cas |
| **Reprogrammation** | livreur replanifie une livraison à J+1..J+14 sur un créneau |
| **Sage X3** | ERP externe, source de vérité pour articles/stocks/dépôts |
| **Tiers** | code client Sage (`CodeClientSage`) qui apparaît dans `DO_Tiers` |

---

## 13. FAQ rapide (pour réponses directes du chatbot)

**Q : Combien de rôles dans le système ?**
R : 5 — CLIENT, VENDEUR, CONFIRMATEUR, LIVREUR, ADMIN.

**Q : Différence entre réclamation et demande ?**
R : Une **réclamation** est ouverte par le client. Une **demande** est créée
par le livreur suite à une tentative ratée. Une commande peut avoir plusieurs
réclamations indépendantes.

**Q : Quand une demande est-elle escaladée à la 3e tentative ?**
R : Pour les motifs livreur du **groupe C** (`CLIENT_INJOIGNABLE`,
`TELEPHONE_ETEINT`, `CLIENT_ABSENT`). Les motifs A et B escaladent dès la
1ère tentative.

**Q : Comment une commande est-elle attribuée à une confirmatrice ?**
R : Algorithme à 3 critères : éligibilité (active, pas en pause, pas
déconnectée) → charge de travail (la moins chargée) → ancienneté de la
dernière attribution.

**Q : Quel est le timeout du verrou de confirmation ?**
R : 15 minutes, après quoi le verrou est considéré stale et une autre
confirmatrice peut le reprendre.

**Q : Quelle est la durée maximum de pause d'une confirmatrice ?**
R : Au-delà de 30 minutes sans activité, ses cas sont redistribués
automatiquement.

**Q : Une commande livrée peut-elle déclencher une réclamation ?**
R : Oui, sur les motifs `COLIS_ENDOMMAGE` et `COLIS_NON_CORRESPONDANT`,
photo obligatoire.

**Q : C'est quoi un BC, un BL ?**
R : BC = Bon de Commande (créé par le client). BL = Bon de Livraison
(généré par la confirmatrice après confirmation, en transformant le BC).

**Q : Combien de motifs côté client / livreur ?**
R : 7 motifs client (5 avant livraison + 2 après) et 7 motifs livreur
(3 différés + 2 immédiats visibles client + 2 immédiats internes).

**Q : Comment fonctionne la reprogrammation ?**
R : Le livreur replanifie une livraison entre J+1 et J+14 sur un créneau
parmi MATIN (9–13h), APRES_MIDI (13–18h), SOIR (18–20h). Le statut passe à
REPORTE puis revient à EN_LIVRAISON à la date prévue.

**Q : Quel est le rôle de Sage X3 dans le projet ?**
R : Sage X3 est l'ERP qui détient la vérité sur les articles, stocks, dépôts
et catalogues. Le backend synchronise ces données dans des tables miroir
(`F_ARTICLE`, `F_ARTSTOCK`, etc.) via `SageService`.

**Q : Combien d'événements SignalR temps réel ?**
R : 9 événements diffusés via le hub `ReclamationHub` (NouveauCas,
StatutCasChange, CommandePriseEnCharge, CommandeLiberee, ClientARepondu,
SeuilTentativesAtteint, StatutCommandeChange, CorrectionAppliquee,
CasReattribue).

---

## 14. Règles métier figées (récap)

- 3 tentatives ratées avec motif différé → demande créée
- 15 min : durée du verrou de confirmation
- 30 min : seuil de déconnexion d'une confirmatrice
- 5 min : intervalle du hosted service de redistribution
- J+1 à J+14 : horizon de reprogrammation
- 8 DT : frais de livraison à domicile
- 1 DT : timbre fiscal sur chaque BC
- 10 caractères : minimum description du motif `AUTRE`
- B2C → CIN, B2B → matricule fiscal + plafond crédit + remise

---

## 15. Périmètre du chatbot

Le chatbot peut répondre :
- **Questions conceptuelles / générales** sur le projet (cf. sections 1 à 14)
- **Questions chiffrées / statistiques** via `/api/admin/chat/query`
- **Questions analytiques** (tendance, comparaison, anomalie, corrélation) via `/api/admin/chat/analyze`
- **Questions prédictives** (probabilité, prévision, score de risque) via `/api/admin/chat/predict`
- **Petit talk** ("bonjour", "merci") — réponse polie de Groq

Le chatbot **ne peut pas** :
- modifier des données (lecture seule, jamais d'écriture)
- répondre à des questions hors périmètre métier (météo, actualités, etc.)
- garantir une prédiction si l'historique est insuffisant (il dit explicitement
  "données insuffisantes" plutôt que d'inventer un chiffre)
- divulguer les secrets de configuration (mots de passe, tokens, JWT key, clés API)

Quand la question dépasse son périmètre, il propose poliment de reformuler
sur une question métier.

---

## 16. Capacités prédictives et analytiques

### 16.1 Architecture en 3 couches

Pour répondre à n'importe quelle question chiffrée / analytique / prédictive
dans le périmètre projet, le bot s'appuie sur 3 endpoints complémentaires :

| Couche | Endpoint | Rôle | Exemples de questions |
|---|---|---|---|
| **A. Query** | `POST /api/admin/chat/query` | Agrégation directe sur les données existantes | "combien de commandes à Sfax la semaine dernière ?" |
| **B. Analyze** | `POST /api/admin/chat/analyze` | Analyse statistique on-demand (tendance, comparaison, anomalie, corrélation) | "tendance des retours sur 3 mois ?", "y a-t-il une anomalie cette semaine ?" |
| **C. Predict** | `POST /api/admin/chat/predict` | Modèles ML.NET pré-entraînés | "risque de retour de BC0042 ?", "volume prévu la semaine prochaine ?" |

Pour les questions très ouvertes ("pourquoi tant de retours ce mois ?"), Groq
combine plusieurs appels (`/query` pour les data + raisonnement) et formule une
hypothèse — toujours en restant grounded sur les chiffres réels.

### 16.2 DSL `/query` (couche A)

Body de la requête :
```json
{
  "entity": "orders" | "claims" | "drivers" | "products" | "governorates" | "confirmatrices",
  "metric": "count" | "sum" | "avg" | "list" | "top",
  "filters": {
    "from": "2026-04-25", "to": "2026-05-02",
    "status": "CONFIRME", "governorate": "Sfax",
    "driverId": "...", "confirmatriceId": "...",
    "motif": "ADRESSE_INCORRECTE", "typeCas": "DEMANDE",
    "productRef": "...", "clientId": "..."
  },
  "groupBy": "governorate" | "status" | "driver" | "day" | "week" | "month" | null,
  "limit": 10,
  "orderBy": "count_desc" | "amount_desc" | "date_desc"
}
```

Réponse type :
```json
{
  "label": "Nombre de commandes livrées à Sfax la semaine dernière",
  "value": 42,
  "rows": [...],          // si metric=list ou top
  "series": [...],        // si groupBy=day/week/month
  "filtersApplied": {...},
  "warnings": []          // si filtre ignoré, échantillon faible, etc.
}
```

### 16.3 DSL `/analyze` (couche B)

Body :
```json
{
  "operation": "trend" | "compare" | "anomaly" | "correlation" | "distribution",
  "subject": {
    "entity": "orders|claims|...",
    "metric": "count|sum_amount|return_rate|delivery_rate|claim_rate",
    "filters": { ... }
  },
  "options": {
    "granularity": "day|week|month",   // pour trend
    "groupBy": "governorate|driver",    // pour compare
    "baselineWindow": 90,                // pour anomaly (jours)
    "secondMetric": "..."                // pour correlation
  }
}
```

Réponse type :
- **trend** : `{ slope, intercept, r2, direction: "up|down|flat", series: [...] }`
- **compare** : `{ groups: [{label, value}, ...], topN, bottomN }`
- **anomaly** : `{ anomalies: [{date, value, zscore, context}, ...] }`
- **correlation** : `{ pearson, samples }`
- **distribution** : `{ p25, p50, p75, p95, mean, std }`

### 16.4 DSL `/predict` (couche C)

Body :
```json
{
  "task": "return_risk" | "delivery_first_attempt" | "volume_forecast" | "stock_shortage_risk",
  "input": {
    "doPiece": "BC0042",        // pour return_risk / delivery_first_attempt
    "horizonDays": 7,            // pour volume_forecast
    "articleRef": "ART001"       // pour stock_shortage_risk
  }
}
```

Réponse type :
```json
{
  "task": "return_risk",
  "prediction": 0.78,
  "confidence": 0.85,
  "explanation": "Basé sur gouvernorat (Sfax), montant (>200 DT), historique client (1 retour précédent).",
  "factors": [
    { "name": "governorate", "weight": 0.32, "value": "Sfax" },
    { "name": "amount_bucket", "weight": 0.28, "value": "high" },
    { "name": "client_history", "weight": 0.22, "value": "1 prior return" }
  ],
  "warnings": []
}
```

### 16.5 Modèles ML.NET disponibles (V1)

| Task | Type | Features principales | Précision cible |
|---|---|---|---|
| `return_risk` | classification binaire (logistic regression) | gouvernorat, montant, type client, jour de la semaine, historique client | ~75% accuracy |
| `delivery_first_attempt` | classification binaire | gouvernorat, créneau, montant, livreur historique | ~70% accuracy |
| `volume_forecast` | time series SSA (Singular Spectrum Analysis) | série journalière 90+ jours | ±15% MAPE sur 7 jours |
| `stock_shortage_risk` | regression sur stock projeté | stock courant, ventes 30j, saisonnalité | binaire (risque oui/non) |

Les modèles sont **entraînés au démarrage** depuis l'historique de la DB
(table `F_DOCENTETE` + `F_LIVRAISON`) et sauvegardés en `.zip` ML.NET.

### 16.6 Stratégie de routing par Groq

Groq parse la question de l'utilisateur et choisit l'action :

| Indice dans la question | Action | Endpoint |
|---|---|---|
| "combien", "liste", "top", "moyenne", date passée | `query` | `/query` |
| "tendance", "évolution", "comparer", "anomalie", "corrélation" | `analyze` | `/analyze` |
| "probabilité", "risque", "prévoir", "estimer", date future | `predict` | `/predict` |
| "pourquoi", "expliquer", "qu'en penses-tu" | `query` + raisonnement | `/query` puis Groq analyste |
| "qu'est-ce que", "comment marche", concepts | `kb` | KB statique (ce doc) |
| "bonjour", "merci", "qui es-tu" | `chitchat` | réponse polie |

### 16.7 Garde-fous

Le bot **dit explicitement** quand :
- l'échantillon est trop petit (< 10 occurrences) → "données insuffisantes"
- la prédiction porte sur un horizon trop lointain (> 30 jours) → "marge d'erreur élevée"
- une feature critique est manquante (ex: client sans historique) → "modèle limité, je donne une fourchette"
- la question est ambiguë → demande de clarification au lieu de deviner
