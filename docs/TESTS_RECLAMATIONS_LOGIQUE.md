# Tests sur papier — Logique réclamations & demandes

**Date** : 2026-05-12
**Scope** : Backend `Web-Api(Asp.net)/Web-Api/` + Flutter `flutter/lib/`
**Objectif** : permettre au user (PFE) de valider la logique métier sans device Android.

---

## 1. Vue d'ensemble

### 1.1 Deux types de cas

| Type | Créateur | Visibilité |
|------|----------|-----------|
| **RECLAMATION** | CLIENT (depuis tracking) | Client + Confirmatrice |
| **DEMANDE** | LIVREUR (auto à l'enregistrement d'une tentative ou retour) | Confirmatrice toujours ; Client si motif "Groupe A" (`VisibleClient=true`) |

> Source : `Web-Api(Asp.net)/Web-Api/Auth/Constants/TypeCas.cs`, `LivreurMotifs.IsVisibleClient()` ligne 185 de `ReclamationMotifs.cs`.

### 1.2 Statuts (cycle de vie)

```
ENVOYEE
   │  (confirmatrice clique "Prendre en charge")
   ▼
EN_COURS_DE_TRAITEMENT
   │
   ├──► CLOTUREE   (résolu : correction appliquée OU échange créé OU statut commande changé)
   └──► REFUSEE    (refus avec motifRefus obligatoire)
```

**Transition automatique** : Quand le client `Apply` sur une Demande livreur visible (motif Groupe A), le statut passe de `ENVOYEE` → `EN_COURS_DE_TRAITEMENT` sans intervention confirmatrice (`ReclamationsService.cs:1591-1593`).

**Libération auto** : Si la confirmatrice se met en pause (`IsInPause=true`) ou inactif 30 min, le cas est libéré et réassigné au prochain refresh.

> Source : `Web-Api(Asp.net)/Web-Api/Auth/Constants/ReclamationStatuses.cs`

### 1.3 Attribution automatique des cas

Score = `(cas EN_COURS de la confirmatrice) + (cas RECLAMATION/DEMANDE assignés)` → la confirmatrice avec le score min reçoit. En cas d'égalité, `LastAssignmentAt DESC` (la plus ancienne attribution gagne).

> Source : `ReclamationsService.FindEligibleConfirmatriceAsync` ligne ~170.

---

## 2. Tous les motifs

### 2.1 Motifs CLIENT (7 motifs)

> Source : `Auth/Constants/ReclamationMotifs.cs:7-65` + `flutter/lib/data/reclamation_motifs.dart`

| Code | Label UI FR | Disponible quand | Photo | Correction | Autre champ obligatoire |
|------|-------------|-----------------|-------|-----------|------------------------|
| `CHANGEMENT_ADRESSE` | Changement d'adresse | Avant livraison | ❌ | ✅ adresse + lat/lng | — |
| `CHANGEMENT_NUMERO` | Changement de numéro | Avant livraison | ❌ | ✅ numéro 8 chiffres TN | — |
| `REPROGRAMMATION` | Demande de reprogrammation | Avant livraison | ❌ | ❌ | ✅ date J+1..J+14 + créneau MATIN/APRES_MIDI/SOIR |
| `ANNULATION` | Demande d'annulation | Avant livraison | ❌ | ❌ | — |
| `COLIS_NON_RECU` | Colis non reçu | Avant livraison | ❌ | ❌ | description libre |
| `COLIS_ENDOMMAGE` | Colis endommagé | **Après livraison uniquement** | ✅ | ❌ | description |
| `COLIS_NON_CORRESPONDANT` | Colis non correspondant | **Après livraison uniquement** | ✅ | ❌ | description |

**Règle de filtrage** : l'écran client appelle `clientMotifsForOrderStatus(status)` (`reclamation_motifs.dart:55`). Si le statut est `LIVRE`, seuls les 2 motifs post-livraison apparaissent. Sinon, les 5 pré-livraison.

### 2.2 Motifs LIVREUR (8 motifs en 3 groupes)

> Source : `Auth/Constants/ReclamationMotifs.cs:101-229`

#### Groupe A — Demande visible côté client (le client doit répondre)

| Code | Label UI | Escalade | Photo | Description min |
|------|----------|----------|-------|----------------|
| `ADRESSE_INCORRECTE` | Adresse incorrecte | Immédiate | ❌ | — |
| `NUMERO_INCORRECT` | Numéro incorrect | Immédiate | ❌ | — |

→ La Demande créée a `VisibleClient=true`. Le client voit la Demande, peut répondre via `POST /api/demandes/{id}/reply` avec la correction (adresse / numéro / repère / instructions). Le statut passe alors auto à `EN_COURS_DE_TRAITEMENT`.

#### Groupe B — Escalade directe confirmatrice (client ne voit rien)

| Code | Label UI | Escalade | Photo | Description min |
|------|----------|----------|-------|----------------|
| `CLIENT_REFUSE` | Refus client | Immédiate | ❌ | — |
| `AUTRE` | Autre incident | Immédiate | ❌ | **✅ 10 caractères** |
| `COLIS_ENDOMMAGE_DEPOT` | Colis endommagé (retour dépôt) | Immédiate | **✅ obligatoire** | — |

> ⚠️ `COLIS_ENDOMMAGE_DEPOT` est utilisé côté Flutter dans `flutter/lib/ui/widgets/livreur/status_motif_sheet.dart:147` (flow de retour dépôt) — pas dans `kLivreurMotifs` qui couvre le flow standard tentatives.

#### Groupe C — Escalade différée (3 tentatives sur 3 jours distincts)

| Code | Label UI | Escalade | Photo | Description |
|------|----------|----------|-------|-------------|
| `CLIENT_INJOIGNABLE` | Client non joignable | Après 3 tentatives | ❌ | optionnelle |
| `TELEPHONE_ETEINT` | Téléphone fermé | Après 3 tentatives | ❌ | optionnelle |
| `CLIENT_ABSENT` | Client absent | Après 3 tentatives | ❌ | optionnelle |

> **Règle 3 jours distincts** : index unique sur `(F_RECLAMATION_TENTATIVE.ReclamationId, DateJour)` → 2 tentatives le même jour comptent pour 1. Le `TentativesCount` compte les jours différents.

---

## 3. Cas de test — Motifs CLIENT

> **Format** : Préconditions → Action UI → Résultat attendu (DB + UI + SignalR).

### 🧪 Cas C.1 — Changement d'adresse (avant livraison)

**Préconditions** :
- Une commande `EN_ATTENTE` ou `CONFIRME` ou `EN_LIVRAISON` existe pour le client connecté (pas `LIVRE`).

**Action client** :
1. Écran tracking commande → bouton "Signaler un problème"
2. Sélectionne motif `CHANGEMENT_ADRESSE` (label "Changement d'adresse")
3. Saisit la nouvelle adresse + récupère lat/lng (auto-géocodage Mapbox dispo dans le code)
4. Description libre (optionnelle)
5. Submit

**Résultat attendu** :
- `POST /api/reclamations` → 201 Created avec `{ id, code, statut: "ENVOYEE" }`
- Ligne créée dans `F_RECLAMATION` : `TypeCas=RECLAMATION`, `Source=CLIENT`, `Motif=CHANGEMENT_ADRESSE`, `CorrectionAdresse=...`, `CorrectionLatitude=...`, `CorrectionLongitude=...`
- Auto-assignée à la confirmatrice avec le score min (cf. règle attribution)
- Event SignalR `NouveauCas` broadcasté à la confirmatrice cible
- UI confirmatrice : nouvelle ligne dans la liste avec badge `ENVOYEE` (jaune)

**Cas d'erreur** :
- Si adresse vide → 400 `"Adresse de correction obligatoire."`
- Si lat/lng manquants → 400 `"Coordonnées GPS obligatoires."`

**Sortie nominale** : Confirmatrice clique "Prendre en charge" → `EN_COURS_DE_TRAITEMENT` → applique correction sur `F_DOCENTETE` (champs `DO_AdresseLivraison`, `DO_LatitudeLivraison`, etc.) → `CLOTUREE`.

---

### 🧪 Cas C.2 — Changement de numéro

**Préconditions** : Commande non livrée.

**Action client** : motif `CHANGEMENT_NUMERO` + nouveau numéro (validé en regex 8 chiffres TN dans l'UI).

**Résultat attendu** : pareil que C.1 mais champ `CorrectionTelephone` rempli. La confirmatrice applique → met à jour `ProfilUtilisateur.Telephone` du profil livraison.

**Cas d'erreur** : numéro vide ou format invalide → 400.

---

### 🧪 Cas C.3 — Reprogrammation (Phase 7)

**Préconditions** : Commande non livrée.

**Action client** :
1. Motif `REPROGRAMMATION`
2. Date picker : **J+1 minimum, J+14 maximum** (calendaires)
3. Radio créneau : `MATIN` (9h-13h) / `APRES_MIDI` (13h-18h) / `SOIR` (18h-20h)
4. Submit

**Résultat attendu** :
- `F_RECLAMATION.ReprogrammationDate` + `ReprogrammationCreneau` remplis
- Confirmatrice peut clore en validant → côté commande, déclenche `LI_DateReplanification` au jour choisi (la commande passera en `REPORTE` puis `EN_LIVRAISON` à la date).

**Cas d'erreur** :
- Date < J+1 → 400 (validation `ReprogrammationCreneaux.IsValidDate`)
- Date > J+14 → 400
- Créneau invalide → 400
- L'un des deux manque → 400 `"Date ou créneau de reprogrammation obligatoires."`

---

### 🧪 Cas C.4 — Annulation

**Préconditions** : Commande non livrée.

**Action client** : motif `ANNULATION` + description libre.

**Résultat attendu** :
- Cas créé en `ENVOYEE`
- Confirmatrice traite : soit clôture (annule la commande côté F_DOCENTETE → `DO_Valide=3 REFUSE`), soit refuse (commande continue).

---

### 🧪 Cas C.5 — Colis non reçu (avant livraison)

**Préconditions** : Commande en cours (pas encore `LIVRE`).

**Action client** : motif `COLIS_NON_RECU` + description.

**Résultat attendu** : cas créé. Confirmatrice enquête → soit relance le livreur, soit clôture si déjà livré et l'a manqué.

---

### 🧪 Cas C.6 — Colis endommagé (après livraison) 📸

**Préconditions** : Commande `LIVRE`.

**Action client** :
1. Motif `COLIS_ENDOMMAGE` (apparaît uniquement si statut `LIVRE`)
2. **Photo obligatoire** (sinon submit bloqué côté UI + 400 côté backend)
3. Description libre

**Résultat attendu** :
- `F_RECLAMATION.PhotoUrl` rempli (multipart upload `POST /api/reclamations/{id}/photos`, 10 MB max)
- Le client a accès au bouton "Demander échange" → `POST /api/reclamations/{id}/demande-echange` qui ouvre un sous-flow côté confirmatrice (create commande échange via `POST /api/confirmateur/reclamations/{id}/echange`)

**Cas d'erreur** :
- Tente le motif avant que la commande soit `LIVRE` → 400 `"Motif non autorisé pour le statut courant de la commande."`
- Soumet sans photo → 400 `"Photo obligatoire pour ce motif."`

---

### 🧪 Cas C.7 — Colis non correspondant (après livraison) 📸

**Identique à C.6** sauf motif = `COLIS_NON_CORRESPONDANT`. Photo obligatoire. Description doit préciser l'écart entre ce qui a été commandé et ce qui a été livré.

---

## 4. Cas de test — Motifs LIVREUR

### 🧪 Cas L.1 — Adresse incorrecte (Groupe A, visible client)

**Préconditions** : Le livreur a une commande active en `EN_LIVRAISON`.

**Action livreur** :
1. Ouvre détail commande → bouton "Reporter" / "Signaler problème"
2. Sélectionne motif `ADRESSE_INCORRECTE`
3. Description libre

**Résultat attendu** :
- `POST /api/livreur/reclamations/attempt` multipart → 200
- Création immédiate d'une `F_RECLAMATION` `TypeCas=DEMANDE`, `VisibleClient=true`, `Statut=ENVOYEE`, `Motif=ADRESSE_INCORRECTE`
- Le client voit une nouvelle Demande dans son tracking → `GET /api/demandes/mine`
- Event SignalR `NouvelleDemande` → client + `NouveauCas` → confirmatrice
- Le livreur ne peut plus retenter cette commande tant qu'il n'a pas de réponse client

**Sortie nominale** : Client répond avec nouvelle adresse via `POST /api/demandes/{id}/reply` → statut auto-bascule en `EN_COURS_DE_TRAITEMENT`, event `ClientARepondu` → confirmatrice valide → applique correction sur la commande → statut `CLOTUREE` → livreur peut reprendre la livraison.

---

### 🧪 Cas L.2 — Numéro incorrect (Groupe A)

Identique à L.1 mais motif `NUMERO_INCORRECT`. La réponse client fournit le nouveau numéro téléphone.

---

### 🧪 Cas L.3 — Refus client (Groupe B, direct confirmatrice)

**Action livreur** : motif `CLIENT_REFUSE`, description optionnelle.

**Résultat attendu** :
- Création immédiate `TypeCas=DEMANDE`, `VisibleClient=false`
- Le client ne voit PAS cette demande dans son tracking
- La confirmatrice voit le cas et décide : commande `RETOUR` (renvoyer au dépôt) ou clôture après échange téléphonique.

---

### 🧪 Cas L.4 — Autre incident (Groupe B, description obligatoire ≥ 10 car)

**Action livreur** : motif `AUTRE` + description ≥ 10 caractères.

**Résultat attendu** :
- Si description < 10 chars → 400 `"Une description (≥ 10 caractères) est obligatoire pour ce motif."`
- Sinon → cas créé direct confirmatrice.

---

### 🧪 Cas L.5 — Colis endommagé au dépôt 📸 (Groupe B, photo obligatoire)

> ⚠️ Ce motif est utilisé côté Flutter dans le flow **"retour dépôt"** (`status_motif_sheet.dart:147`), pas dans le flow standard tentatives. C'est quand le livreur ramène le colis au dépôt parce qu'il est physiquement abîmé.

**Action livreur** :
1. Va sur sa commande → bouton "Retour" → écran `LivreurStatusMotifSheet`
2. Sélectionne `COLIS_ENDOMMAGE_DEPOT`
3. **Photo obligatoire** (image_picker → multipart)

**Résultat attendu** :
- Si photo absente → 400 `"Une photo est obligatoire pour ce motif."` (vérification stricte ligne 276-277 du service)
- Si photo OK → cas créé direct confirmatrice + commande passe en `RETOUR`

---

### 🧪 Cas L.6 — Client injoignable (Groupe C, escalade différée)

**Action livreur** : motif `CLIENT_INJOIGNABLE` (le livreur a essayé d'appeler, pas de réponse).

**Résultat attendu** :
- **Première tentative** : ligne dans `F_RECLAMATION_TENTATIVE` (date du jour). Pas de Demande créée. Commande passe en `REPORTE` (le livreur la replanifie à J+1 08:00).
- **Tentative jour suivant (J+1)** : 2e ligne tentative. `TentativesCount=2`. Toujours pas de Demande.
- **3e tentative (J+2 ou plus tard)** : `TentativesCount=3` atteint le seuil → **création automatique d'une `F_RECLAMATION` `TypeCas=DEMANDE`, `VisibleClient=false`, statut `ENVOYEE`**, broadcast `NouveauCas` à la confirmatrice.

**Cas d'erreur / particularité** :
- Si le livreur retente le même jour (par exemple 14h puis 17h), la 2e tentative met juste à jour la ligne existante (index unique). Le compteur n'augmente pas.
- Si la confirmatrice clôture la demande avant la 3e tentative (rare), nouvelle escalade au prochain seuil.

---

### 🧪 Cas L.7 — Téléphone éteint (Groupe C)

Identique à L.6 mais motif `TELEPHONE_ETEINT`. Mêmes règles d'escalade.

---

### 🧪 Cas L.8 — Client absent (Groupe C)

Identique à L.6 mais motif `CLIENT_ABSENT`. Mêmes règles d'escalade.

> **Particularité Groupe C** : Si plusieurs tentatives ont des motifs différents (jour 1 = absent, jour 2 = téléphone éteint, jour 3 = injoignable), elles s'agrègent toutes dans le même compteur `TentativesCount`. C'est l'ESCALADE qui compte (3 jours distincts), pas le motif précis.

---

## 5. Cas de test — Flow confirmatrice (traitement)

### 🧪 Cas F.1 — Prise en charge d'un cas

**Préconditions** : Un cas `ENVOYEE` lui est assigné.

**Action** : Clique "Prendre en charge".

**Résultat attendu** :
- `POST /api/confirmateur/reclamations/{id}/take-over` → 200
- Statut passe à `EN_COURS_DE_TRAITEMENT`
- `AssignedAt` mis à jour
- Event SignalR `CasPrisEnCharge` à tous les autres rôles

---

### 🧪 Cas F.2 — Application d'une correction (motifs Groupe A ou C.1/C.2)

**Préconditions** : Cas en `EN_COURS_DE_TRAITEMENT` avec une correction proposée (par client ou livreur).

**Action** :
1. Ouvre détail
2. Vérifie la correction proposée
3. Clique "Appliquer correction"

**Résultat attendu** :
- `PUT /api/confirmateur/reclamations/{id}/correction` → 200
- Champs `F_DOCENTETE.DO_AdresseLivraison` / `DO_LatitudeLivraison` / `DO_LongitudeLivraison` / `DO_NumeroTelephone` mis à jour selon le motif
- Statut cas passe à `CLOTUREE`
- Event `CorrectionAppliquee` à client + livreur

---

### 🧪 Cas F.3 — Refus avec motif

**Action** :
1. Clique "Refuser"
2. Saisit motif de refus (obligatoire)
3. Confirme

**Résultat attendu** :
- `PUT /api/confirmateur/reclamations/{id}/status` body `{ statut: "REFUSEE", motifRefus: "..." }` → 200
- Si `motifRefus` vide → 400 `"Motif de refus obligatoire."`
- Statut → `REFUSEE`
- Event `StatutCasChange`

---

### 🧪 Cas F.4 — Création d'une commande échange (motif COLIS_ENDOMMAGE)

**Préconditions** : Cas client `COLIS_ENDOMMAGE` en `EN_COURS_DE_TRAITEMENT`, et client a cliqué "Demander échange".

**Action confirmatrice** :
1. Ouvre détail
2. Voit la liste des lignes commande originale (via `GET /api/confirmateur/reclamations/{id}/echange/lignes-originales`)
3. Sélectionne les articles à renvoyer (V2 multi-lignes)
4. Confirme création

**Résultat attendu** :
- `POST /api/confirmateur/reclamations/{id}/echange` → 201 avec nouvelle pièce `BC*`
- Nouvelle entête `F_DOCENTETE` `TypeCas=ECHANGE` créée
- Statut cas → `CLOTUREE`
- Client voit la nouvelle commande échange dans sa liste

**Cas d'erreur** : si motif ≠ `COLIS_ENDOMMAGE` → 400.

---

### 🧪 Cas F.5 — Auto-libération sur pause

**Action** : Confirmatrice se met en pause (`POST /api/confirmateur/me/pause`).

**Résultat attendu** :
- Tous ses cas `EN_COURS_DE_TRAITEMENT` repassent à `ENVOYEE`
- `AssignedToUserId` mis à null
- Les cas sont réassignés au prochain refresh / login d'une autre confirmatrice
- Event `CasLibere`

---

## 6. Cas de test — Écrans premium récents (sprint 2026-05-12)

### 🧪 Cas U.1 — KPI admin couleurs par statut

**Préconditions** : Connecté ADMIN. Au moins 1 commande dans chaque statut (LIVRE, EN_LIVRAISON, REPORTE, etc.).

**Action** : Dashboard admin → tape sur KPI "Commandes" ou "Commandes Livrées".

**Résultat attendu** :
- Écran `KpiDetailPremiumScreen` s'ouvre
- Chaque ligne (`KpiPremiumRow`) a :
  - **Bordure gauche 4px** de la couleur du statut
  - **Fond très subtilement teinté** de la même couleur
  - **Pill statut** (`Livrée`, `Au dépôt`, `Reportée`…) sous le piece
  - **Montant à droite** dans la couleur du statut
- Couleurs : 🟢 LIVRE · 🔵 EN_LIVRAISON · 🟣 CONFIRME · 🟡 TENTATIVE · 🟠 REPORTE · 🔴 RETOUR · 🟣 DEPOT · 🟥 REFUSE

> Source : `flutter/lib/ui/admin/widgets/kpi_detail_premium_screen.dart` + `kpi_drill_down_resolver.dart`

---

### 🧪 Cas U.2 — Timeline historique d'une commande (3 rôles)

#### U.2.a — Livreur
1. Connecté livreur → ouvre une commande dans **Mes commandes**
2. Scroll en bas → Bloc 5 "Historique" → bouton **"Voir l'historique complet"**
3. → Ouvre `OrderHistoryScreen` avec :
   - Hero gradient + piece + statut actuel + montant
   - Mini-map Mapbox Static centrée sur destination
   - Timeline verticale avec :
     - Création commande (gris)
     - Acceptation livreur (indigo)
     - En livraison (bleu)
     - Tentative(s) si reportée (orange)
     - Livraison (vert) ou retour (rouge)
   - Chaque event a : pastille colorée + ligne liaison + date+heure + acteur si dispo

> Source de données : `LivreurOrderDetails.history` (backend retourne déjà liste typée). Fallback synthèse depuis `Delivery` si pas chargé.

#### U.2.b — Client
1. Connecté client → tracking d'une commande
2. Sous le bloc "Progression" → bouton **"Voir l'historique complet"**
3. → Même écran, source `ClientOrderTracking.events`

#### U.2.c — Confirmatrice
1. Connecté confirmatrice → ouvre une commande
2. Section "Historique" → bouton **"Voir l'historique complet"**
3. → Même écran, events synthétisés (création + statut actuel) car le modèle confirmatrice n'expose pas la timeline complète

---

### 🧪 Cas U.3 — Map live livreur côté client (HEADING_TO_YOU)

**Préconditions** :
- Une commande client en `EN_LIVRAISON`
- Le livreur a été marqué `IsActiveDelivery=true` pour cette commande
- Le livreur ping sa position GPS récemment (`F_LIVREUR_POSITIONS.UpdatedAt < 2 min`)

**Action client** :
1. Ouvre le tracking de sa commande
2. La carte "Votre livreur arrive !" doit afficher (gradient bleu)
3. Sous la card → bouton gradient bleu **"Voir mon livreur sur la carte"**
4. Tape

**Résultat attendu** :
- Bottom sheet 88% écran s'ouvre
- Google Map avec :
  - **Marker bleu** = position livreur (lat/lng issus de `/tracking-state`)
  - **Marker rouge** = destination client
  - **Polyline multicolore Mapbox** (vert/jaune/orange/rouge selon trafic temps réel)
- Header : nom livreur + pastille fraîcheur (🟢 < 30s, 🟠 < 2min, 🔴 > 2min)
- Chips : ETA (ex. "12 min") + distance (ex. "4.3 km") + "Trafic live"
- FAB recenter (loupe)
- Bouton vert plein "Appeler le livreur" (utilise `tel:` via `url_launcher`)
- Auto-refresh position toutes les **8 secondes**
- Auto-close si le statut sort de `HEADING_TO_YOU` (livraison terminée)

**Cas où le bouton ne s'affiche pas** (comportement attendu) :
- Commande `AT_DEPOT` / `IN_DELIVERY_QUEUE` / `TERMINAL` → pas d'activité tracking, pas de bouton
- Coordonnées destination manquantes côté `CustomerOrder` (cas où la commande n'a pas de lat/lng valides) → bouton masqué

---

### 🧪 Cas U.4 — Trafic Mapbox sur map livreur

**Préconditions** : Livreur connecté avec position GPS active, ≥ 1 stop EN_LIVRAISON.

**Action** : Onglet Carte.

**Résultat attendu** :
- Badge en haut "Calcul du trajet…" pendant 200-500ms
- Puis badge vert "⚡ Trafic en direct"
- Polylines de la tournée suivent les **vraies rues** (Mapbox `driving-traffic`)
- Couleurs trafic temps réel par tronçon
- Si Mapbox quota dépassé ou réseau KO → fallback lignes droites avec couleur horaire

**Test du token** : ouvrir https://account.mapbox.com/statistics → vérifier que le compteur Directions API augmente après ouverture de la map.

---

## 7. Endpoints à tester via curl/Postman

> Backend dev URL : `http://localhost:5123` (HTTP) ou `https://localhost:7178` (HTTPS).
> Authentification : `Authorization: Bearer <JWT>` obtenu via `POST /api/auth/login`.

### 7.1 Auth (préparer un token)

```bash
curl -X POST http://localhost:5123/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client1@test.tn","password":"123456"}'
```
→ Récupère `accessToken`. À mettre en var `$T` pour les calls suivants.

### 7.2 Client — créer réclamation simple

```bash
curl -X POST http://localhost:5123/api/reclamations \
  -H "Authorization: Bearer $T" \
  -H "Content-Type: application/json" \
  -d '{
    "doPiece": "BL00001",
    "motif": "REPROGRAMMATION",
    "description": "Je suis absent demain",
    "reprogrammationDate": "2026-05-15",
    "reprogrammationCreneau": "APRES_MIDI"
  }'
```
→ Attendu : 201 avec `{ id, code, statut: "ENVOYEE" }`.

### 7.3 Client — créer avec photo (multipart)

```bash
curl -X POST http://localhost:5123/api/reclamations \
  -H "Authorization: Bearer $T" \
  -F "doPiece=BL00001" \
  -F "motif=COLIS_ENDOMMAGE" \
  -F "description=Le carton est éventré" \
  -F "photo=@./test_photo.png"
```
→ Si commande pas `LIVRE` → 400. Si pas de photo → 400.

### 7.4 Client — voir mes réclamations

```bash
curl http://localhost:5123/api/reclamations/mine \
  -H "Authorization: Bearer $T"
```

### 7.5 Client — répondre à une demande (motif Groupe A livreur)

```bash
curl -X POST http://localhost:5123/api/demandes/{id}/reply \
  -H "Authorization: Bearer $T" \
  -H "Content-Type: application/json" \
  -d '{
    "adresse": "Rue de la République 12",
    "latitude": 36.8065,
    "longitude": 10.1815
  }'
```

### 7.6 Livreur — enregistrer tentative

```bash
curl -X POST http://localhost:5123/api/livreur/reclamations/attempt \
  -H "Authorization: Bearer $T_LIVREUR" \
  -F "doPiece=BL00001" \
  -F "motif=CLIENT_INJOIGNABLE" \
  -F "description=Pas de réponse au 3 appels"
```
→ Première fois : 200 sans création de demande. À la 3e (jours distincts) : création auto.

### 7.7 Livreur — colis endommagé dépôt (photo obligatoire)

```bash
curl -X POST http://localhost:5123/api/livreur/reclamations/attempt \
  -H "Authorization: Bearer $T_LIVREUR" \
  -F "doPiece=BL00001" \
  -F "motif=COLIS_ENDOMMAGE_DEPOT" \
  -F "photo=@./degat.png"
```
→ Sans photo → 400 `"Une photo est obligatoire pour ce motif."`.

### 7.8 Confirmatrice — prendre en charge + clôturer

```bash
curl -X POST http://localhost:5123/api/confirmateur/reclamations/{id}/take-over \
  -H "Authorization: Bearer $T_CONF"

curl -X PUT http://localhost:5123/api/confirmateur/reclamations/{id}/status \
  -H "Authorization: Bearer $T_CONF" \
  -H "Content-Type: application/json" \
  -d '{"statut": "CLOTUREE"}'
```

### 7.9 Confirmatrice — refuser avec motif obligatoire

```bash
curl -X PUT http://localhost:5123/api/confirmateur/reclamations/{id}/status \
  -H "Authorization: Bearer $T_CONF" \
  -H "Content-Type: application/json" \
  -d '{"statut": "REFUSEE", "motifRefus": "Demande non recevable"}'
```
→ Sans `motifRefus` → 400.

### 7.10 Tracking live livreur (client)

```bash
curl http://localhost:5123/api/client/orders/BL00001/tracking-state \
  -H "Authorization: Bearer $T"
```
→ Si livreur actif + ping récent → `state: "HEADING_TO_YOU"` + lat/lng/ETA. Sinon état dégradé.

---

## 8. Anomalies / incohérences détectées

### 8.1 ⚠️ `COLIS_ENDOMMAGE_DEPOT` absent de `kLivreurMotifs` Flutter

> Fichier : `flutter/lib/data/reclamation_motifs.dart:80-91`

`kLivreurMotifs` liste **7 motifs** (3 groupes A/B/C) mais **omet** `COLIS_ENDOMMAGE_DEPOT` qui existe côté backend (8 motifs).

**Impact** : Le motif est utilisé seulement dans `status_motif_sheet.dart:147` (flow "retour dépôt"), pas dans le flow tentatives standard. Si un livreur veut faire un retour dépôt depuis une tentative ratée plutôt que via le menu "Retour", il ne trouvera pas le motif.

**Action recommandée** : Soit ajouter dans `kLivreurMotifs`, soit documenter explicitement que c'est un motif "retour" et pas "tentative".

### 8.2 ⚠️ Confirmatrice timeline = synthèse minimale

L'écran `OrderHistoryScreen` côté confirmatrice ne consomme pas un endpoint dédié — il synthétise depuis `ConfirmatriceOrder` (date création + statut actuel).

**Impact** : La timeline confirmatrice est moins riche que livreur/client. Pas de motif/note/acteur visible.

**Action recommandée** : Ajouter un endpoint `/api/confirmateur/orders/{piece}/history` qui retourne le même type de structure que `LivreurOrderHistoryItem` mais accessible à la confirmatrice.

### 8.3 ⚠️ Bug pré-existant : `apiBaseUrl` typo

> Fichier : `flutter/lib/core/constants.dart:9`

```dart
const String apiBaseUrl = "http://192.168.100.19d:5123";
                                          // ^^ "d" en trop
```

→ Connexion impossible depuis device LAN.

**Action recommandée** : Corriger `192.168.100.19d` → `192.168.100.19` (ou l'IP réelle).

---

## 9. Matrice de couverture (qui peut faire quoi)

| Action | CLIENT | LIVREUR | CONFIRMATRICE | ADMIN |
|--------|:------:|:-------:|:-------------:|:-----:|
| Créer réclamation (7 motifs) | ✅ | ❌ | ❌ | ❌ |
| Voir ses réclamations | ✅ | ❌ | ❌ | ✅ (toutes) |
| Enregistrer tentative livreur (8 motifs) | ❌ | ✅ | ❌ | ❌ |
| Répondre à une Demande groupe A | ✅ | ❌ | ❌ | ❌ |
| Prendre en charge un cas | ❌ | ❌ | ✅ | ❌ |
| Appliquer une correction | ❌ | ❌ | ✅ | ❌ |
| Refuser un cas | ❌ | ❌ | ✅ | ❌ |
| Créer commande d'échange | ❌ | ❌ | ✅ (motif COLIS_ENDOMMAGE) | ❌ |
| Changer statut commande via Demande | ❌ | ❌ | ✅ | ❌ |
| Voir tracking live livreur | ✅ | ❌ | ❌ | ❌ |
| Voir KPI drill-down | ❌ | ❌ | ❌ | ✅ |

---

## 10. Checklist test express (15 min)

Si tu peux faire tourner le backend + Postman sur ton PC (sans Android), valide ce minimum :

- [ ] `POST /api/auth/login` retourne un token
- [ ] `GET /api/client/orders/{piece}/tracking-state` retourne un objet `state`
- [ ] `POST /api/reclamations` avec motif `ANNULATION` → 201
- [ ] `POST /api/reclamations` avec motif `COLIS_ENDOMMAGE` mais commande non `LIVRE` → 400
- [ ] `POST /api/reclamations` avec motif `COLIS_ENDOMMAGE` mais sans photo → 400
- [ ] `POST /api/reclamations` avec motif `CHANGEMENT_ADRESSE` sans `correctionAdresse` → 400
- [ ] `POST /api/reclamations` avec motif `REPROGRAMMATION` mais date < J+1 → 400
- [ ] `POST /api/livreur/reclamations/attempt` avec motif `COLIS_ENDOMMAGE_DEPOT` sans photo → 400
- [ ] `POST /api/livreur/reclamations/attempt` avec motif `AUTRE` description < 10 char → 400
- [ ] `PUT /api/confirmateur/reclamations/{id}/status` avec `statut=REFUSEE` sans `motifRefus` → 400
- [ ] Après 3 tentatives `CLIENT_INJOIGNABLE` jours distincts → une `F_RECLAMATION` `TypeCas=DEMANDE` `VisibleClient=false` est créée

Tous ces cas peuvent être testés depuis Postman sur ton PC sans téléphone.
