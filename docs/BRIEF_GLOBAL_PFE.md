# Brief technique global — Refonte PFE Plateforme de livraison COD Tunisie

> Document unique consolidé regroupant les 5 sections de refonte. À donner à Claude Code en un seul prompt.

---

## Comment utiliser ce document

1. **Lis ce document en entier** avant de commencer toute implémentation.
2. **Suis l'ordre des sections** — chacune dépend des précédentes.
3. **Ne casse aucune fonctionnalité existante** — chaque section liste explicitement ce qu'il faut conserver.
4. **Produit les fichiers d'audit boutons morts** demandés dans chaque section avant de modifier le code.
5. **Teste manuellement** les scénarios listés à la fin de chaque section avant de passer à la suivante.

---

## Contexte projet

Plateforme de livraison Cash on Delivery (COD) en Tunisie, architecture 4 couches :

| Couche | Technologie |
|---|---|
| Base de données | SQL Server (modèle Sage X3, tables `F_*`) |
| Backend | ASP.NET Core 8 + EF Core 8 + SignalR + Hangfire |
| Web e-commerce + Admin | React (TypeScript) |
| Mobile (livreur, client, confirmatrice, admin) | Flutter |
| LLM | n8n + Groq + LLaMA 3.3 70B |

4 rôles métier : `CLIENT`, `LIVREUR`, `CONFIRMATEUR` (confirmatrice), `ADMIN`.

---

## Décisions transverses (à respecter dans toutes les sections)

### Concepts métier figés

- **Statuts livraison** (`LI_Statut`) : CONFIRME / EN_LIVRAISON / LIVRE / RETOUR / DEPOT / REPORTE
- **Statuts commande** (`DO_Valide`) : EN_ATTENTE / CONFIRME / TENTATIVE / REFUSE
- **Statuts cas** (réclamations + demandes) : ENVOYEE / EN_COURS_DE_TRAITEMENT / CLOTUREE / REFUSEE
- **Frais HOME** : 8 DT (modulables selon fidélité — voir Section 3)
- **Timbre fiscal** : 1 DT
- **Seuil tentatives différées** : 3 (puis Demande créée chez confirmatrice)
- **Verrou confirmation** : 15 min
- **Timeout cas inactifs** : 30 min
- **Timeout déconnexion confirmatrice** : 5s avec OnDisconnectedAsync (Section 2)

### Numérotation libre (sans plafond)

- **Dépôts livreur** : Dépôt 0, 1, 2, 3, 4, 5, 6... (sans limite)
- **Tentatives** : Tentative 1, 2, 3, 4, 5... (sans limite)

Le seuil 3 reste juste pour **déclencher la création de la Demande chez la confirmatrice**, mais le compteur lui-même continue.

### Mode dégradé (réseau faible / backend down)

Pas de « mode avion ». Détection via :
- `connectivity_plus` retourne `none`
- Timeout > 8s
- 5xx (502, 503, 504)
- 3 échecs consécutifs

Comportement : queue locale Hive + retry auto + idempotence via `X-Client-Action-Id` header.

### Audit boutons morts

Chaque section produit un fichier d'audit obligatoire :
- `LIVREUR_BUTTONS_AUDIT.md`
- `CONFIRMATRICE_BUTTONS_AUDIT.md`
- `CLIENT_BUTTONS_AUDIT.md`
- `ADMIN_BUTTONS_AUDIT.md`
- `CHATBOT_BUTTONS_AUDIT.md`

Aucun bouton sans `onPressed` ou avec `onPressed: () {}` vide ne doit subsister.

---

## Table des matières

| # | Section | Pages estimées | Effort |
|---|---|---|---|
| 1 | Espace Livreur (Flutter mobile) | ~25 | Moyen |
| 2 | Espace Confirmatrice (Flutter mobile) | ~15 | Moyen |
| 3 | Espace Client (Flutter mobile + 11 chantiers) | ~25 | Élevé |
| 4 | Espace Admin (React + Flutter mobile) | ~15 | Moyen |
| 5 | Chatbot intelligent (n8n + backend + Flutter) | ~25 | Élevé |

---

## Plan d'exécution macro recommandé

```
Semaine 1 — Section 1 (Livreur)
  Jour 1-2 : Audit boutons + migrations DB (dépôts numérotés, encaissement, etc.)
  Jour 3-4 : Backend (stats, cashbox, map IA, tournée, idempotence)
  Jour 5-7 : Flutter (stats refonte, détail commande, statut/motif, hors-ligne)

Semaine 2 — Section 2 (Confirmatrice)
  Jour 1-2 : Audit + SignalR OnDisconnected + 4 nouveaux events
  Jour 3-4 : Compteur tentatives + bloc Tentatives détail + schéma interactif
  Jour 5 : Tests scénarios

Semaine 3-4 — Section 3 (Client)
  Sem 3 : Mode dégradé + Carnet adresses + Préférences contact + FAQ + Fidélité
  Sem 4 : SMS pré-livraison + Mode invité + ETA + Carte temps réel + Push proximité

Semaine 5 — Section 4 (Admin)
  Jour 1-2 : Audit + bug compteurs + endpoints summary cohérents
  Jour 3-4 : Différenciation onglets + KPIs cliquables + Produits + Paramètres
  Jour 5 : Export Excel/PDF + tests

Semaine 6 — Section 5 (Chatbot)
  Jour 1 : Audit + migrations DB
  Jour 2 : KB hybride + mémoire conversationnelle
  Jour 3 : Bilingue + streaming SSE
  Jour 4 : Quick-replies + Voice I/O
  Jour 5 : Suggestions proactives + Actions sécurisées
  Jour 6-7 : Tests 20 questions + démo jury
```

Total estimé : **~6 semaines** pour un développeur seul à plein temps.

---

# SECTION 1 — Espace Livreur (Flutter mobile)

> Ce document fait partie d'un brief technique global pour le projet PFE de gestion de livraison COD en Tunisie. Il décrit la refonte complète de l'**espace livreur** de l'application Flutter mobile.

---

## 1.1 Contexte

L'espace livreur est utilisé sur le terrain par des livreurs tunisiens qui font 30 à 50 livraisons par jour, dans des conditions de réseau parfois instables, avec des adresses souvent imprécises. La refonte vise 3 objectifs :

1. **Réduire le temps perdu par livraison** (recherche d'adresse, appels, saisie).
2. **Donner au livreur la visibilité de son travail** (progrès du jour, cash encaissé, performance).
3. **Atteindre un niveau premium tunisien** comparable à First Delivery / Aramex / Best Delivery.

Toutes les modifications sont à appliquer dans le code Flutter existant **sans casser les fonctionnalités déjà en place** : pool gouvernorat, prise en charge, escalation 3 tentatives, SignalR temps réel, échanges, réclamations, dépôts numérotés.

---

## 1.2 Refonte de l'onglet Stats

### 1.2.1 Comportement par défaut

À l'ouverture de l'onglet, afficher les stats du **jour courant** (00:00 → 23:59 timezone `Africa/Tunis`).

En haut de l'écran, un **sélecteur de date** permet au livreur de naviguer dans son historique :
- Bouton « Aujourd'hui » (par défaut, mis en évidence)
- Bouton « Hier »
- Bouton « Cette semaine » (lundi → dimanche en cours)
- Bouton « Ce mois »
- Bouton « Choisir une date » → DatePicker custom Flutter

Le titre principal de l'écran change dynamiquement : « Aujourd'hui · 9 mai 2026 », « Hier · 8 mai 2026 », etc.

### 1.2.2 Contenu de l'écran

**Bloc 1 — Hero card** (en haut, gradient premium)
- Total commandes du jour (gros chiffre)
- Sous-libellé : « X livrées · Y en cours · Z reportées »
- Petit badge en haut à droite : « En ligne » ou « Pause »

**Bloc 2 — Cash COD du jour** (carte distincte, mise en avant)
- Montant total encaissé en TND (gros chiffre)
- Nombre de paiements collectés
- Bouton **« Remettre la caisse au dépôt »** → ouvre un dialog de confirmation, marque les paiements comme « Remis au dépôt » côté backend, log audit
- Le bouton n'apparaît que si le montant > 0
- État après remise : badge vert « Caisse remise à HH:MM » + bouton désactivé

**Bloc 3 — Compteurs par statut** (4 cartes en grille 2x2, cliquables)
Chaque carte ouvre la liste filtrée correspondante dans l'onglet Livraisons :
- Livrées (vert)
- En livraison (bleu)
- Reportées (orange)
- Retournées (rouge)

**Bloc 4 — Top zones du jour**
Graphique horizontal en barres : top 5 villes / délégations où le livreur a livré aujourd'hui, avec le nombre de livraisons par zone.
Source : agrégation backend par `LIVRAISON.Ville` ou `LIVRAISON.Delegation`.

**Bloc 5 — Performance personnelle** (carte à largeur pleine)
- Taux de livraison du jour : `livrees / total_termine * 100`
- Taux de retour du jour : `retournees / total_termine * 100`
- Évolution vs jour précédent (flèche ↑↓ + delta %)

**Bloc 6 — Mini-courbe 7 derniers jours** (sparkline)
- Une seule courbe : nombre de livraisons réussies par jour sur 7 jours
- Composant déjà existant dans le projet : `flutter/lib/ui/widgets/premium/sparkline_painter.dart` — réutiliser

### 1.2.3 Recherche

Champ de recherche en haut, juste sous le sélecteur de date. Cherche par :
- Numéro de commande (`DO_Piece`)
- Nom client
- Téléphone
- Adresse / ville

Quand l'utilisateur tape, il est redirigé vers l'onglet Livraisons avec le filtre de recherche pré-appliqué (pas un écran séparé).

### 1.2.4 Backend — endpoint à créer

```
GET /api/livreur/stats?date=2026-05-09
GET /api/livreur/stats?period=week
GET /api/livreur/stats?from=2026-05-01&to=2026-05-09
```

Réponse :

```json
{
  "scopeLabel": "Aujourd'hui · 9 mai 2026",
  "totalCommandes": 24,
  "livrees": 18,
  "enLivraison": 3,
  "reportees": 2,
  "retournees": 1,
  "cashCod": {
    "totalTnd": 2640.0,
    "nombrePaiements": 18,
    "remisAuDepot": false,
    "remisAt": null
  },
  "topZones": [
    { "ville": "Sousse Médina", "count": 7 },
    { "ville": "Hammam Sousse", "count": 5 },
    { "ville": "Kalaa Kebira", "count": 3 }
  ],
  "performance": {
    "tauxLivraison": 90.0,
    "tauxRetour": 5.0,
    "deltaLivraisonVsJourPrecedent": 5.5
  },
  "sparkline7Jours": [12, 18, 22, 15, 19, 20, 18]
}
```

Endpoint « remise caisse » :

```
POST /api/livreur/cashbox/remettre
Body: { "date": "2026-05-09" }
```

Marque les paiements collectés du jour comme remis. Audit dans `F_LIVRAISON_HISTORIQUE`.

---

## 1.3 Refonte de l'onglet Livraisons (liste + détail)

### 1.3.1 Liste des livraisons

Le filtre actuel `_StatusFilter` doit être réécrit pour intégrer :

- Toutes
- **Dépôt 1, 2, 3, 4, 5, 6...** (numéros illimités, générés dynamiquement selon les commandes présentes — si aucune commande à Dépôt 5, le chip Dépôt 5 n'apparaît pas)
- En livraison
- Livrées
- Reportées
- Retournées

Les chips de filtre dépôt sont **générés dynamiquement** à partir de la liste : on ne fixe plus 1/2/3 dur. Si une commande a `DepotPassageNumber = 7`, le chip « Dépôt 7 » apparaît.

Couleur des badges dépôt selon le numéro :
- 0 (jamais sortie) → bleu neutre
- 1 → jaune clair
- 2 → orange
- 3 → orange foncé
- 4+ → rouge

### 1.3.2 Détail commande — toutes les infos visibles

Aujourd'hui le détail est segmenté en blocs avec scroll. À refondre pour qu'**au premier regard** le livreur voit tout. Structure cible :

**Hero compact en haut**
- Référence commande + badge statut + badge dépôt N
- Photo client (si dispo) ou avatar par défaut
- Nom client en grand · Téléphone cliquable

**3 boutons d'action principaux en barre flottante** (gradient premium)
1. **Appeler** → `tel:` (déjà OK, ne pas toucher)
2. **SMS** → `sms:<numero>?body=Bonjour, je suis votre livreur pour la commande {ref}, j'arrive dans environ 10 minutes.`
   - Le body doit être pré-rempli pour gagner du temps
   - Doit ouvrir l'app SMS native du téléphone
3. **Itinéraire** → ouvre Google Maps / Waze sur l'adresse

**Bloc Adresse**
- Adresse complète
- Gouvernorat · Délégation · Ville · CP
- Coordonnées GPS si dispo
- Mini-carte en preview (200px de haut)
- Indicateur IA qualité d'adresse (voir 1.6.1) : pastille colorée

**Bloc Articles**
- Liste des articles avec désignation + qté + prix unitaire
- Total de la commande en gros
- Mode de paiement : COD / Virement / Carte

**Bloc Cash à encaisser** (uniquement si COD)
- Montant à encaisser en TND (gros chiffre rouge si non encaissé, vert si encaissé)
- Bouton « Marquer comme encaissé » (s'affiche seulement quand le statut passe à Livré)

**Bloc Historique**
- Timeline des passages : « Passage 1 — 03/05 — Reporté (Client absent) », etc.
- Alimenté par `F_LIVRAISON_HISTORIQUE`

**Bloc Notes**
- Note interne du dépôt si dispo (ex: « Code immeuble : 5821 »)
- Note livreur libre (champ texte avec bouton enregistrer)

### 1.3.3 Bouton de changement de statut

C'est ici qu'on applique la **séparation statut / motif**.

Aujourd'hui : un seul bouton qui ouvre un sheet mélangeant statuts et motifs → confus.

À refaire en **2 étapes claires** :

**Étape 1 — Choisir le statut** (BottomSheet)
- ✅ Marquer comme **Livré**
- ⏰ **Reporter** (le client n'a pas reçu mais on retentera)
- ↩️ **Retourner** (terminal — la commande revient)
- Bouton « Annuler »

**Étape 2 — Choisir le motif** (uniquement si Reporter ou Retourner)

Si « Reporter » :

| Motif (UI) | Code backend |
|---|---|
| Client non joignable (téléphone éteint, ne répond pas) | `CLIENT_NON_JOIGNABLE` |
| Client absent au rendez-vous | `CLIENT_ABSENT` |
| Adresse introuvable | `ADRESSE_INTROUVABLE` |
| Adresse incomplète / imprécise | `ADRESSE_INCOMPLETE` |
| Numéro de téléphone invalide | `NUMERO_INVALIDE` |

Si « Retourner » :

| Motif (UI) | Code backend | Photo |
|---|---|---|
| Client refuse la commande | `CLIENT_REFUSE_COMMANDE` | Optionnelle |
| Colis endommagé | `COLIS_ENDOMMAGE_DEPOT` | **Obligatoire** |
| Autre incident (description courte) | `AUTRE_INCIDENT` | Optionnelle |

Si « Livré » : pas de motif, pas de photo (sauf si paiement COD à confirmer).

**Logique métier rattachée** (déjà existante, ne pas la casser) :
- `ADRESSE_INTROUVABLE`, `ADRESSE_INCOMPLETE`, `NUMERO_INVALIDE` → escalade immédiate (Demande client visible côté client avec rouge/vert).
- `CLIENT_NON_JOIGNABLE`, `CLIENT_ABSENT` → différé, compte tentative, Demande créée à la 3ᵉ.
- `CLIENT_REFUSE_COMMANDE`, `COLIS_ENDOMMAGE_DEPOT`, `AUTRE_INCIDENT` → escalade directe confirmatrice.

**Important** : la logique de famille (immédiat / différé / direct confirmatrice) ne dépend QUE du motif, pas du statut. Le backend route correctement selon le motif choisi.

---

## 1.4 SMS — comportement précis

Le bouton SMS doit utiliser l'intent natif :

```dart
final smsBody = Uri.encodeComponent(
  'Bonjour, je suis votre livreur pour la commande ${d.doPiece}. '
  'J\'arrive dans environ 10 minutes.',
);
final uri = Uri.parse('sms:$phone?body=$smsBody');
await launchUrl(uri);
```

Sur Android : ouvre Messages avec le numéro et le body pré-rempli.
Sur iOS : ouvre l'app Messages avec le numéro et le body pré-rempli.

**Ne pas envoyer le SMS automatiquement** : c'est le livreur qui valide et appuie sur Envoyer dans son app native. C'est plus pro, gratuit (pas de gateway SMS), et conforme au comportement attendu en Tunisie.

**Optionnel — templates SMS** : 3 boutons rapides au-dessus du clavier dans la sheet :
- « J'arrive dans 10 min »
- « Je suis en bas, descendez »
- « Confirmer disponibilité »

Chacun lance un SMS pré-rempli différent.

---

## 1.5 Cash COD — encaissement et caisse

### 1.5.1 Encaissement par commande

Quand le livreur clique « Marquer comme Livré » sur une commande COD :
- Dialog de confirmation : « Confirmez-vous avoir encaissé X TND ? »
- Bouton « Oui, encaissé » → la commande passe à `LIVRE` ET `Encaisse=true` ET `EncaisseAt=now()`
- Bouton « Non, annuler »

### 1.5.2 Cashbox du jour

Visible dans l'onglet Stats (Bloc 2 décrit en 1.2.2) :
- Total encaissé du jour = SUM des paiements COD avec `EncaisseAt = aujourd'hui` et `RemisAuDepot = false`
- Bouton « Remettre la caisse au dépôt » :
  - Dialog confirmation avec récap : « Vous remettez X TND correspondant à Y commandes. Confirmer ? »
  - Au clic, marque tous les paiements du jour comme `RemisAuDepot=true` et `RemisAt=now()`
  - Affiche un message succès + badge vert
- Le bouton se réactive le lendemain avec les nouveaux encaissements

### 1.5.3 Backend — modèle DB

Ajouter sur `F_LIVRAISON` (ou table dédiée selon ton existant) :

```sql
ALTER TABLE F_LIVRAISON ADD Encaisse BIT NOT NULL DEFAULT 0;
ALTER TABLE F_LIVRAISON ADD EncaisseAt DATETIME2 NULL;
ALTER TABLE F_LIVRAISON ADD MontantEncaisse DECIMAL(18,3) NULL;
ALTER TABLE F_LIVRAISON ADD RemisAuDepot BIT NOT NULL DEFAULT 0;
ALTER TABLE F_LIVRAISON ADD RemisAuDepotAt DATETIME2 NULL;

CREATE INDEX IX_F_LIVRAISON_Cashbox
ON F_LIVRAISON (AssignedLivreurId, EncaisseAt, RemisAuDepot);
```

---

## 1.6 Map enrichie avec IA

### 1.6.1 Indicateur qualité d'adresse (rouge/orange/vert)

Avant que le livreur parte chez un client, une pastille colorée indique la qualité prédite de l'adresse :

- 🟢 **Vert** : adresse précise, GPS confirmé, livraisons réussies récemment dans la zone
- 🟠 **Orange** : adresse partielle ou approximative, attention possible
- 🔴 **Rouge** : adresse historiquement problématique (3+ tentatives ratées dans les 90 derniers jours, ou adresse vague type « Cité Olympique »)

**Calcul backend** (heuristique simple — pas besoin de vrai ML) :

```csharp
// Dans AdresseQualityService.cs (à créer)
public AdresseQuality Compute(Commande c)
{
    int score = 100;

    // Pénalités
    if (string.IsNullOrWhiteSpace(c.Adresse) || c.Adresse.Length < 15) score -= 30;
    if (c.Latitude == null || c.Longitude == null) score -= 20;
    if (!c.Adresse.Any(char.IsDigit)) score -= 15; // pas de numéro de rue

    // Historique du client
    var pastFailures = _db.Tentatives
        .Where(t => t.ClientId == c.ClientId
                 && t.Date >= DateTime.UtcNow.AddDays(-90)
                 && t.Statut == "REPORTE")
        .Count();
    if (pastFailures >= 3) score -= 40;

    return score switch
    {
        >= 70 => AdresseQuality.Green,
        >= 40 => AdresseQuality.Orange,
        _ => AdresseQuality.Red,
    };
}
```

Affichage : pastille colorée à côté de l'adresse + tooltip explicatif au tap (« Adresse historiquement problématique : 3 tentatives ratées chez ce client »).

### 1.6.2 Heatmap zones à risque

Sur la carte de l'onglet Map, ajouter un **toggle « Heatmap retours »** dans la légende.

Quand activé : superpose sur la carte un calque coloré qui montre les zones avec le plus de retours/reports historiquement (90 derniers jours, agrégé par délégation ou par cluster GPS).

- Zones très problématiques : rouge transparent
- Zones moyennes : orange
- Zones bonnes : vert très léger ou rien

**Calcul backend** :
```
GET /api/livreur/map/heatmap?gouvernorat=Sousse&days=90
```

Retourne un tableau de cellules :
```json
{
  "cells": [
    { "lat": 35.83, "lng": 10.62, "weight": 0.8 },
    { "lat": 35.85, "lng": 10.64, "weight": 0.3 }
  ]
}
```

`weight` = `nb_retours_dans_cellule / nb_total_dans_cellule`.

Côté Flutter : utiliser un plugin de heatmap compatible avec `flutter_map` (ex: `flutter_map_heatmap`).

### 1.6.3 Estimation IA du meilleur créneau

Sur le détail commande, afficher une recommandation discrète :

> 💡 « Ce client est généralement disponible entre **17h et 19h**. »

**Calcul backend — heuristique** (pas besoin de ML lourd) :

```csharp
public TimeSlot? PredictBestSlot(Guid clientId)
{
    var successfulDeliveries = _db.Livraisons
        .Where(l => l.ClientId == clientId
                 && l.Statut == "LIVRE"
                 && l.LivreAt != null)
        .Select(l => l.LivreAt!.Value.Hour)
        .ToList();

    if (successfulDeliveries.Count < 2) return null;

    // Mode (heure la plus fréquente) ± 1h
    var modeHour = successfulDeliveries
        .GroupBy(h => h)
        .OrderByDescending(g => g.Count())
        .First().Key;

    return new TimeSlot(modeHour - 1, modeHour + 1);
}
```

Si moins de 2 livraisons réussies pour ce client → ne rien afficher.

Affichage : bandeau bleu doux avec icône ampoule, sous l'adresse. Optionnel et non bloquant.

### 1.6.4 Optimisation de tournée

Bouton **« 🧭 Optimiser ma tournée »** en haut de l'onglet Map.

Au clic :
1. Récupérer toutes les commandes du livreur en `EN_LIVRAISON` ou `DEPOT` (à livrer aujourd'hui)
2. Récupérer la position GPS actuelle du livreur
3. Calculer un ordre optimal par algorithme glouton « plus proche voisin » (Nearest Neighbor) :
   - Partir du livreur
   - Aller à la commande la plus proche
   - Depuis là, à la plus proche restante
   - Etc.
4. Afficher la tournée optimisée sur la carte avec polyline numérotée 1, 2, 3...
5. Bouton « Démarrer la tournée » ouvre la première étape dans Google Maps

**Algorithme côté backend** (simple, suffisant pour 30-50 stops) :

```csharp
public List<Stop> NearestNeighbor(LatLng start, List<Stop> stops)
{
    var ordered = new List<Stop>();
    var remaining = new List<Stop>(stops);
    var current = start;

    while (remaining.Count > 0)
    {
        var nearest = remaining
            .OrderBy(s => Haversine(current, s.Position))
            .First();
        ordered.Add(nearest);
        current = nearest.Position;
        remaining.Remove(nearest);
    }

    return ordered;
}
```

Endpoint :
```
GET /api/livreur/tournee/optimize?lat=35.82&lng=10.63
```

Retourne la liste ordonnée avec ETA cumulé estimé.

---

## 1.7 Mode dégradé : réseau faible ou backend injoignable

### 1.7.1 Cas réels à couvrir (PAS le mode avion)

Le livreur tunisien est rarement en « mode avion » volontaire. Les vrais cas terrain sont :

1. **Réseau mobile faible/absent** : zones rurales (Kasserine, Tataouine, intérieur du Sahel), parkings souterrains, sous-sol d'immeubles, ascenseurs.
2. **Réseau présent mais backend injoignable** : le téléphone affiche 4G mais l'API Anthropic timeout (problème réseau opérateur, surcharge serveur, déploiement en cours).
3. **Latence anormale** : ping backend > 10s. L'app a l'air de freezer.
4. **Erreurs 5xx transitoires** : 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout (très fréquent en production).

L'app doit gérer **les 4 cas pareil** : ne pas bloquer le livreur, mettre en queue locale, retenter automatiquement.

### 1.7.2 Comportement attendu

**Détection du mode dégradé** (au moins un de ces signaux) :
- `connectivity_plus` retourne `ConnectivityResult.none`
- Un appel API échoue avec `TimeoutException` (timeout configuré à 8s par défaut)
- Un appel API renvoie 5xx (500, 502, 503, 504)
- 3 appels consécutifs ont échoué

**Quand le mode dégradé est détecté** :
- Bandeau orange persistant en haut de l'app : « ⚠️ Connexion instable — vos actions seront envoyées dès que possible »
- L'app continue à répondre instantanément à toutes les actions
- Les actions sont écrites dans une **queue locale persistante** (Hive)
- Aucune erreur affichée — l'UI confirme l'action comme si elle avait réussi
- Un petit badge en bas affiche : « 3 actions en attente »

**Quand le backend redevient joignable** :
- Bandeau vert temporaire (3 secondes) : « ✅ Connexion rétablie — synchronisation... »
- Le service traite la queue dans l'ordre, en série (pas de parallèle, pour éviter les conflits)
- Toast final : « 12 actions synchronisées »
- Si une action échoue (conflit serveur, par ex. la commande a été reprise par un autre livreur entre-temps) → un dialog non-bloquant affiche le détail et propose : « Annuler localement » ou « Voir la commande »

### 1.7.3 Implémentation Flutter

Packages à ajouter (vérifier `pubspec.yaml`, ajouter si manquants) :

```yaml
dependencies:
  connectivity_plus: ^6.0.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  dio: ^5.4.0  # déjà présent normalement
```

**Service de surveillance** `BackendHealthService` :

```dart
enum BackendStatus { healthy, degraded, offline }

class BackendHealthService extends ChangeNotifier {
  BackendStatus _status = BackendStatus.healthy;
  int _consecutiveFailures = 0;

  BackendStatus get status => _status;

  /// Appelé par l'intercepteur Dio à chaque réponse/erreur.
  void reportSuccess() {
    _consecutiveFailures = 0;
    if (_status != BackendStatus.healthy) {
      _status = BackendStatus.healthy;
      notifyListeners();
    }
  }

  void reportFailure(DioException e) {
    final isNetwork = e.type == DioExceptionType.connectionError
                    || e.type == DioExceptionType.connectionTimeout;
    final isServer5xx = e.response?.statusCode != null
                     && e.response!.statusCode! >= 500;

    if (!isNetwork && !isServer5xx) return; // erreurs 4xx ne déclenchent pas

    _consecutiveFailures++;
    if (_consecutiveFailures >= 3) {
      _status = isNetwork ? BackendStatus.offline : BackendStatus.degraded;
      notifyListeners();
    }
  }

  /// Ping périodique discret pour détecter le retour du backend.
  Timer? _heartbeat;
  void startHeartbeat() {
    _heartbeat?.cancel();
    _heartbeat = Timer.periodic(const Duration(seconds: 15), (_) async {
      if (_status == BackendStatus.healthy) return;
      try {
        await Dio().get('${ApiClient.baseUrl}/api/health',
            options: Options(receiveTimeout: const Duration(seconds: 4)));
        reportSuccess();
      } catch (_) {/* reste en degraded */}
    });
  }
}
```

**Endpoint backend** à créer (extrêmement léger) :
```csharp
[HttpGet("/api/health")]
public IActionResult Health() => Ok(new { ok = true, ts = DateTime.UtcNow });
```

**Intercepteur Dio** qui notifie le service :

```dart
class HealthInterceptor extends Interceptor {
  final BackendHealthService health;
  HealthInterceptor(this.health);

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    health.reportSuccess();
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    health.reportFailure(err);
    handler.next(err);
  }
}
```

**Service de queue** `OfflineQueueService` :

```dart
class OfflineQueueService {
  late Box<Map> _queue;
  final BackendHealthService _health;
  final Dio _dio;

  OfflineQueueService(this._health, this._dio) {
    _health.addListener(_onHealthChange);
  }

  Future<void> init() async {
    _queue = await Hive.openBox<Map>('offline_actions');
  }

  /// Appelé par tous les services métier livreur (StatusService, CashboxService, etc.)
  Future<void> enqueue(String endpoint, Map<String, dynamic> body) async {
    final actionId = const Uuid().v4();
    await _queue.put(actionId, {
      'clientActionId': actionId,
      'endpoint': endpoint,
      'body': body,
      'createdAt': DateTime.now().toIso8601String(),
      'retries': 0,
    });
  }

  int get pendingCount => _queue.length;

  void _onHealthChange() {
    if (_health.status == BackendStatus.healthy && pendingCount > 0) {
      _flush();
    }
  }

  Future<void> _flush() async {
    final entries = _queue.toMap().entries.toList();
    for (final entry in entries) {
      final data = entry.value;
      try {
        await _dio.post(
          data['endpoint'],
          data: {...data['body'], 'clientActionId': data['clientActionId']},
        );
        await _queue.delete(entry.key);
      } catch (e) {
        // marquer le retry, garder en queue
        data['retries'] = (data['retries'] ?? 0) + 1;
        await _queue.put(entry.key, data);
        if (data['retries'] >= 5) {
          // après 5 retries, escalader (notifier l'utilisateur)
          _notifyConflict(data);
          await _queue.delete(entry.key);
        }
        break; // on s'arrête au premier échec, on retentera tout au prochain healthy
      }
    }
  }
}
```

**Stratégie d'utilisation** : tous les services métier livreur (statut, encaissement, photo, note, optimisation tournée) doivent toujours :
1. Tenter l'appel direct si `health.status == healthy`
2. Si échec ou status non-healthy → enqueue
3. L'UI est mise à jour immédiatement avec l'état optimiste

Exemple :
```dart
class DeliveryStatusService {
  Future<void> markAsDelivered(String piece, double cashAmount) async {
    final body = {'piece': piece, 'statut': 'LIVRE', 'montant': cashAmount};
    if (_health.status == BackendStatus.healthy) {
      try {
        await _dio.post('/api/livreur/orders/status', data: body);
        return;
      } catch (_) {/* tombe dans enqueue */}
    }
    await _queue.enqueue('/api/livreur/orders/status', body);
  }
}
```

### 1.7.4 Bandeau global

Créer un widget `ConnectionBanner` à inclure dans le `Scaffold` du livreur, juste sous l'AppBar :

```dart
class ConnectionBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer2<BackendHealthService, OfflineQueueService>(
      builder: (_, health, queue, __) {
        if (health.status == BackendStatus.healthy && queue.pendingCount == 0) {
          return const SizedBox.shrink();
        }
        return Container(
          color: health.status == BackendStatus.healthy
              ? Colors.green.shade100
              : Colors.orange.shade100,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(children: [
            Icon(
              health.status == BackendStatus.healthy
                  ? Icons.cloud_sync
                  : Icons.cloud_off,
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(
              health.status == BackendStatus.healthy
                  ? 'Synchronisation en cours... (${queue.pendingCount})'
                  : 'Connexion instable — ${queue.pendingCount} actions en attente',
            )),
          ]),
        );
      },
    );
  }
}
```

### 1.7.5 Backend — idempotence

Pour que la synchronisation soit safe (pas de double-traitement si le livreur retente), chaque action est accompagnée d'un **`clientActionId`** GUID généré côté Flutter. Le backend stocke ces IDs dans une table dédiée et rejette les duplicatas :

```sql
CREATE TABLE F_LIVREUR_ACTION_LOG (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClientActionId UNIQUEIDENTIFIER NOT NULL UNIQUE,
    LivreurId UNIQUEIDENTIFIER NOT NULL,
    Endpoint NVARCHAR(255) NOT NULL,
    PayloadHash NVARCHAR(64) NOT NULL,
    ProcessedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    HttpResponse INT NOT NULL
);
CREATE UNIQUE INDEX UX_LivreurActionLog_ClientActionId ON F_LIVREUR_ACTION_LOG (ClientActionId);
```

Middleware ASP.NET à créer :

```csharp
public class IdempotencyMiddleware
{
    public async Task Invoke(HttpContext ctx, AppDbContext db)
    {
        if (!ctx.Request.Path.StartsWithSegments("/api/livreur") || ctx.Request.Method != "POST")
        {
            await _next(ctx);
            return;
        }

        var actionId = ctx.Request.Headers["X-Client-Action-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(actionId)) { await _next(ctx); return; }

        var existing = await db.LivreurActionLog
            .FirstOrDefaultAsync(x => x.ClientActionId == Guid.Parse(actionId));

        if (existing != null)
        {
            ctx.Response.StatusCode = existing.HttpResponse;
            await ctx.Response.WriteAsync("{\"replayed\":true}");
            return;
        }

        await _next(ctx);
        // après le pipeline, on log l'action
        db.LivreurActionLog.Add(new LivreurActionLog { /* ... */ });
        await db.SaveChangesAsync();
    }
}
```

Côté Flutter, le `clientActionId` est envoyé soit dans le body, soit dans le header `X-Client-Action-Id`. Privilégier le header pour rester transparent au DTO.

---

## 1.8 Audit complet des boutons morts

### 1.8.1 Méthode

Avant toute autre tâche, Claude Code doit faire un **audit exhaustif** de tous les boutons de l'espace livreur Flutter.

Pour chaque écran de `flutter/lib/ui/screens/livreur/` :
1. Lister TOUS les widgets `IconButton`, `ElevatedButton`, `TextButton`, `FilledButton`, `OutlinedButton`, `InkWell`, `GestureDetector` cliquables
2. Vérifier que `onPressed` / `onTap` n'est pas `null`
3. Vérifier que la fonction appelée existe et n'est pas vide
4. Vérifier que la fonction appelle bien le bon endpoint backend
5. Vérifier que le backend renvoie un résultat non vide

### 1.8.2 Livrable de l'audit

Claude Code produit un fichier `LIVREUR_BUTTONS_AUDIT.md` avec ce format :

```markdown
| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| Mes commandes | FAB "Lancer livraison" | my_orders_screen.dart:412 | ✅ OK | — |
| Détail commande | "Signaler problème" | delivery_details_screen.dart:287 | ❌ MORT | Implémenter onPressed |
| Stats | "Exporter" | stats_screen.dart:156 | ⚠️ APPELLE ENDPOINT 404 | Créer endpoint /api/livreur/stats/export |
```

### 1.8.3 Correction

Pour chaque bouton mort identifié, Claude Code doit :
- Soit implémenter la fonctionnalité (si évidente)
- Soit supprimer le bouton (si la fonctionnalité n'a pas de sens dans la spec)
- Soit lever une question dans une section « Boutons à clarifier » du livrable

**Ne JAMAIS laisser un bouton sans `onPressed` ou avec un `onPressed: () {}` vide.**

---

## 1.9 Cohérence avec l'existant

### 1.9.1 Ne PAS casser

- Pool gouvernorat (pick / abandon)
- Logique des 3 tentatives différées
- Dépôts numérotés (job Hangfire 00:00)
- SignalR temps réel (`StatutCommandeChange`, etc.)
- Échanges multi-lignes structurés
- Réclamations / Demandes / file confirmatrice
- Logique rouge/vert côté client

### 1.9.2 Adapter

- Le modèle `Delivery` ajoute : `qualiteAdresse` (enum Green/Orange/Red), `creneauPrevu` (TimeSlot?), `cashEncaisse` (bool), `montantEncaisse` (double?), `remisAuDepot` (bool)
- L'enum `_StatusFilter` actuel est remplacé par la logique dynamique des dépôts
- L'écran `delivery_details_screen.dart` est restructuré (mais on conserve la logique d'escalation et les services existants `LivreurEscalationService`, `AvisService`)

---

## 1.10 Plan d'exécution recommandé pour Claude Code

Ordre d'implémentation pour minimiser les régressions :

1. **Audit boutons morts** (fichier `LIVREUR_BUTTONS_AUDIT.md`)
2. **Migration DB** (Encaisse, RemisAuDepot, F_LIVREUR_ACTION_LOG)
3. **Backend** :
   - Endpoint `/api/livreur/stats`
   - Endpoint `/api/livreur/cashbox/remettre`
   - Service `AdresseQualityService`
   - Endpoint `/api/livreur/map/heatmap`
   - Endpoint `/api/livreur/tournee/optimize`
   - Idempotence via `ClientActionId`
4. **Flutter — modèle et services** :
   - Étendre `Delivery`
   - Créer `OfflineQueueService`
   - Créer `StatsService`, `CashboxService`, `TourneeService`
5. **Flutter — onglet Stats refondu**
6. **Flutter — onglet Livraisons** :
   - Filtres dépôt dynamiques
   - Détail commande restructuré
   - Bouton statut/motif en 2 étapes
   - Bouton SMS avec body pré-rempli
7. **Flutter — onglet Map** :
   - Pastille qualité adresse
   - Heatmap toggle
   - Suggestion créneau
   - Optimisation tournée
8. **Tests manuels** : valider les 4 scénarios principaux
9. **Re-audit boutons morts** (vérifier que le fichier d'audit est à 100 % vert)

---

## 1.11 Tests manuels obligatoires

À la fin de l'implémentation, ces 4 scénarios doivent fonctionner sans erreur :

**Scénario 1 — Journée type d'un livreur**
1. Connexion → onglet Stats affiche aujourd'hui
2. Pick d'une commande dans le pool → passe à Dépôt 0
3. Lancer livraison → EN_LIVRAISON
4. Marquer Livré + encaisser COD → cash du jour augmente
5. Stats : badge cash mis à jour
6. Bouton Remettre au dépôt → caisse remise

**Scénario 2 — Reporter avec motif**
1. Détail commande
2. Changer statut → Reporter
3. Choisir motif Client absent
4. Confirmer → REPORTE en base + tentative loguée
5. Le lendemain à 00:00 (forcer le job Hangfire) → DepotPassageNumber += 1

**Scénario 3 — Connexion instable**
1. Démarrer dans une zone à mauvais réseau (ou simuler en coupant le wifi/4G du téléphone, ou en arrêtant le backend pendant un test local)
2. Le bandeau orange « Connexion instable » doit apparaître après 3 échecs consécutifs
3. Marquer une commande comme Livré → l'UI confirme l'action immédiatement (action mise en queue)
4. Le badge « X actions en attente » s'incrémente
5. Restaurer la connexion (relancer le backend ou rebrancher le réseau)
6. Le bandeau passe en vert « Synchronisation »
7. Les actions de la queue sont envoyées en série
8. Vérifier en DB que la commande est bien LIVRE et qu'aucune action n'a été dupliquée (test du `clientActionId`)

**Scénario 4 — Optimisation tournée**
1. 5 commandes en EN_LIVRAISON dispersées dans Sousse
2. Cliquer Optimiser ma tournée
3. Vérifier que l'ordre proposé minimise la distance totale
4. Démarrer la tournée → ouvre Google Maps sur la 1ʳᵉ étape

---

**Fin de la section Livreur. Cette section sera intégrée au document final qui couvrira aussi : Confirmatrice, Client, Admin, Chatbot.**
# SECTION 2 — Espace Confirmatrice (Flutter mobile)

> Section 2/5 du brief technique global du PFE. Couvre la refonte de l'**espace confirmatrice** Flutter. Doit être lue après la Section 1 (Livreur).

---

## 2.1 Contexte

L'espace confirmatrice est le centre névralgique du SAV et de la confirmation des commandes. Une confirmatrice gère 2 flux distincts :

- **Confirmation des commandes** (push/pool) — elle reçoit les commandes EN_ATTENTE, les valide ou les refuse, ce qui déclenche la création du BL.
- **Traitement des cas** (Réclamations + Demandes) — elle résout les incidents remontés par les clients ou les livreurs.

Ces deux flux sont **indépendants** : une confirmatrice peut être attribuée à 5 commandes ET avoir 8 cas ouverts en parallèle.

La refonte ne casse aucune logique existante :
- 4 statuts de cas (Envoyée / En cours / Clôturée / Refusée) → conservés
- Distribution par score 4 facteurs → conservée
- 3 onglets (À traiter / En attente client / Historique) → conservés
- Cross-gouvernorat avec toggle → conservé
- Matrice d'actions par motif → conservée et complétée
- SignalR 3 events → étendu à 4 events (ajout `CasLibere`)

---

## 2.2 Différence Pause vs Fermer l'app — règles définitives

C'était une zone d'ombre, on la clarifie complètement.

### 2.2.1 Bouton Pause (action volontaire)

Quand la confirmatrice clique sur « Pause » dans son profil :
- Son flag `IsInPause = true` en DB
- **Tous ses cas en cours sont libérés immédiatement** (logique existante `ReleaseActiveCasesForUserAsync`)
- Les cas redistribués via le score à la prochaine confirmatrice éligible
- Elle **reste connectée** mais est exclue du tirage
- Bandeau jaune en haut de l'app : « ⏸ Vous êtes en pause »
- Bouton « Reprendre » remplace le bouton « Pause »

### 2.2.2 Fermer l'app — détection SignalR OnDisconnected

C'est la grande nouveauté.

**Aujourd'hui** : si la confirmatrice ferme brutalement, ses cas restent bloqués 10 minutes (timeout d'inactivité).

**Demain** : on utilise l'événement `OnDisconnectedAsync` du Hub SignalR :

```csharp
public class ReclamationHub : Hub
{
    private readonly ConfirmatriceStatusService _status;
    private readonly ReclamationsService _reclamations;
    private readonly ILogger<ReclamationHub> _logger;

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        var role = GetUserRole();
        if (role == "CONFIRMATEUR")
        {
            // Mettre la confirmatrice en ligne
            await _status.MarkOnlineAsync(userId);
            await Groups.AddToGroupAsync(Context.ConnectionId, "CONFIRMATRICES");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        var role = GetUserRole();
        if (role == "CONFIRMATEUR")
        {
            // Délai de grâce de 5 secondes pour reconnexion réseau
            await Task.Delay(5_000);
            
            // Vérifier qu'elle ne s'est pas reconnectée entre-temps
            var stillDisconnected = !await _status.HasActiveConnectionAsync(userId);
            if (stillDisconnected)
            {
                _logger.LogInformation("Confirmatrice {UserId} déconnectée → libération cas", userId);
                
                // Libère tous les cas en cours + redistribue
                var released = await _reclamations.ReleaseActiveCasesForUserAsync(
                    userId, reason: "disconnected");
                
                await _status.MarkOfflineAsync(userId);
            }
        }
        await base.OnDisconnectedAsync(exception);
    }
}
```

**Le délai de grâce de 5 secondes** est essentiel : il évite la libération si la confirmatrice change juste de wifi (transition SignalR rapide). Si elle se reconnecte dans les 5 secondes, rien ne se passe.

### 2.2.3 Tableau récapitulatif des états

| Action | Flag IsInPause | Flag IsOnline | Cas en cours | Recevra-t-elle de nouveaux ? |
|---|---|---|---|---|
| Active normale | false | true | conservés | ✅ Oui |
| Clique Pause | **true** | true | **libérés instantanément** | ❌ Non |
| Clique Reprendre | false | true | — | ✅ Oui |
| Ferme l'app proprement | false | **false (OnDisconnected)** | **libérés après 5s** | ❌ Non |
| Perd le réseau > 5s | false | **false** | **libérés** | ❌ Non |
| Inactivité > 10 min (legacy) | false | **false** | conservés (legacy) | ❌ Non |

---

## 2.3 Onglet Commandes (à confirmer)

### 2.3.1 Structure

3 sous-onglets (déjà en place — à conserver et nettoyer) :
- **Mes commandes** : commandes auto-attribuées (push)
- **Pool global** : commandes non attribuées ou libérées (pull)
- **Historique** : ce qu'elle a confirmé / refusé récemment

### 2.3.2 Détail commande à confirmer

Quand elle ouvre une commande, elle voit :

**Bloc 1 — Client**
- Nom, téléphone (cliquable `tel:`)
- Adresse complète + gouvernorat
- Bouton « Appeler le client »
- Statistiques : « 12 commandes passées · 1 réclamation antérieure » (utile pour repérer les clients à problèmes)

**Bloc 2 — Articles**
- Liste articles + quantités + prix unitaires
- Total avec frais de livraison (HOME = 8 DT) + timbre fiscal (1 DT)

**Bloc 3 — Notes éventuelles**
- Note du client (si saisie au moment de la commande)

**Bloc 4 — Actions** (barre en bas, toujours visible)
- ✅ **Confirmer** (vert) → DO_Valide passe à 1, BL généré, commande va dans le pool livreur du gouvernorat
- ❌ **Refuser** (rouge) → DO_Valide passe à 3, motif obligatoire (CLIENT_INJOIGNABLE / CLIENT_REFUSE / DOUBLON / AUTRE)
- ⏰ **Reporter à plus tard** (orange) → la commande revient dans le pool global (ne remplit pas le score « Fatigue »)
- 📞 Bouton flottant « Appeler le client »

### 2.3.3 Score de distribution — préservé

Le score à 4 facteurs reste tel quel :

```
Score = BaseConnexion (100 si online + active < 10min, sinon 0)
      − ChargeEnCours × 15
      − Fatigue × 1   (max(0, nbConfirmées_aujourd_hui − 25))
      + AttenteDepuisDernièreAttribution × 2 (plafonné à 30 min)
```

**Ce qui change** : avec SignalR OnDisconnected, la `BaseConnexion` est mise à jour en temps réel (pas en attendant 10 min).

### 2.3.4 Distribution lors de l'arrivée d'une nouvelle commande

```
Client crée commande EN_ATTENTE
        │
        ▼
Backend récupère toutes les confirmatrices avec IsInPause=false ET IsOnline=true
        │
        ▼
Calcule le score de chaque
        │
        ▼
Attribue à celle au score le plus haut
        │
        ▼
SignalR `CommandeAttribuee` → la confirmatrice voit la commande apparaître dans "Mes commandes"
```

**Si aucune confirmatrice disponible** (toutes en pause ou hors ligne) → la commande reste dans le Pool global, en attente.

---

## 2.4 Onglets Réclamations & Demandes — refonte UX

### 2.4.1 Sous-onglets (déjà en place)

- **À traiter** : nouveaux cas + cas que je dois reprendre
- **En attente client** : Demandes envoyées au client, en attente de sa réponse
- **Historique** : Clôturées + Refusées

### 2.4.2 Tri de la file (déjà en place — règle 3 passes)

1. **Urgents d'abord** : motifs CLIENT_REFUSE_COMMANDE, AUTRE_INCIDENT, COLIS_ENDOMMAGE_DEPOT, COLIS_NON_CORRESPONDANT
2. **3+ tentatives ensuite** : cas qui ont atteint le seuil
3. **FIFO ensuite** : le plus vieux en premier

Tri purement côté backend dans `GetForStaffByTabAsync`. Pas de score complexe.

### 2.4.3 Affichage de chaque ligne

Chaque ligne dans la file affiche désormais :

| Élément | Description |
|---|---|
| Badge type | « RÉCLAMATION » (bleu) ou « DEMANDE » (orange) |
| Badge urgence | « URGENT » (rouge) si motif urgent |
| Badge tentatives | **« Tentative N »** (rouge si N≥3) — NOUVEAU |
| Motif | Libellé court |
| Référence commande | `BL00123` |
| Client | Prénom + 1ʳᵉ lettre nom |
| Ancienneté | « il y a 3h » |
| Verrou éventuel | « Pris par Marie · 5 min » (gris) |

**Nouveau badge tentatives** : remplace l'ancien badge « 3 TENTATIVES » fixe. Le numéro est dynamique :
- Tentative 1 → badge gris « Tentative 1 »
- Tentative 2 → badge orange « Tentative 2 »
- Tentative 3 → badge rouge « Tentative 3 »
- Tentative 4 → badge rouge foncé « Tentative 4 »
- Tentative N → badge rouge foncé « Tentative N » (sans plafond)

Cohérent avec la logique des dépôts numérotés du livreur (Section 1).

---

## 2.5 Détail d'un cas — refonte complète

### 2.5.1 Hero compact

En haut, fixe au scroll :
- Type (Réclamation / Demande) + badge urgence si applicable
- Motif en grand
- Statut actuel (pastille colorée)
- Référence commande cliquable
- Bouton « Verrouillé par X · libérer » (admin/superviseur uniquement)

### 2.5.2 Bloc Tentatives — NOUVEAU

Affiche l'historique complet des tentatives liées à ce cas. Chaque tentative est une ligne avec :

```
┌──────────────────────────────────────────────────────────────┐
│ Tentative 4  ·  9 mai 2026 à 14h32                          │
│ Motif : Client absent                                        │
│ Livreur : Ahmed M.  📞                                      │
│ Position : 35.825, 10.643  📍                               │
│ [Voir sur la carte]                                          │
└──────────────────────────────────────────────────────────────┘
```

Source : table `F_RECLAMATION_TENTATIVE` (déjà existante).

L'ordre est antéchronologique (la plus récente en haut).

### 2.5.3 Bloc Client (déjà existant — à conserver)

- Nom, téléphone, email, adresse complète
- Position GPS si dispo + mini-map preview
- Code client Sage
- Stats historiques : « N commandes · N réclamations antérieures »
- Bouton « Appeler le client »

### 2.5.4 Bloc Livreur (si la demande vient d'un livreur, déjà existant)

- Nom, téléphone, position GPS actuelle
- Nombre de livraisons aujourd'hui
- Bouton « Appeler le livreur »

### 2.5.5 Bloc Commande (déjà existant)

- Référence + date
- Statut actuel
- Liste articles + quantités
- Total + mode paiement
- Timeline des changements de statut commande

### 2.5.6 Bloc Demande/Réclamation (déjà existant — à enrichir)

- Motif + description
- Photos (galerie zoomable)
- Correction proposée par le client (mise en évidence)
- Note interne confirmatrice (zone libre)

---

## 2.6 Barre d'actions — séparation claire (point critique)

### 2.6.1 Principe

Tu m'as confirmé que **la confirmatrice change uniquement le statut**, pas de motif obligatoire (contrairement au livreur). Mais il y a en réalité **2 axes d'actions** distincts qu'il faut bien séparer.

**Axe 1 — Actions sur le CAS**
- Prendre en charge (verrouille le cas)
- Clôturer (résolu)
- Refuser (rejeté avec motif de refus)
- Ajouter une note interne
- Appliquer la correction (uniquement si le client a corrigé)

**Axe 2 — Actions sur la COMMANDE rattachée**
- Reporter (la commande passe à EN_ATTENTE)
- Remettre en livraison (la commande passe à CONFIRME, retourne dans le pool livreur)
- Retourner (la commande passe à REFUSE/RETOUR)

Ces deux axes sont **indépendants** : clôturer un cas n'implique rien sur la commande.

### 2.6.2 UI proposée

Un **bottom sheet à 2 sections** :

```
┌──────────────────────────────────────────────────────────────┐
│ ▶ Actions sur le cas                                          │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐    │
│ │ Prendre en  │  Clôturer   │   Refuser   │ Ajouter     │    │
│ │   charge    │             │             │ note        │    │
│ └─────────────┴─────────────┴─────────────┴─────────────┘    │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │  Appliquer correction (uniquement si client a corrigé)  │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                │
│ ▶ Actions sur la commande                                      │
│ ┌─────────────┬─────────────┬─────────────────────────────┐  │
│ │  Reporter   │  Retourner  │  Remettre en livraison      │  │
│ └─────────────┴─────────────┴─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

Boutons toujours visibles (pas de cache contextuel).

### 2.6.3 Matrice d'actions par motif (existante, à conserver)

C'est ta matrice actuelle qui marche bien — on ne la touche pas, juste à vérifier que tous les boutons fonctionnent :

| Motif | Boutons additionnels visibles |
|---|---|
| **Toutes** (base) | Prendre en charge · Clôturer · Refuser · Appeler client · Appeler livreur |
| CHANGEMENT_ADRESSE / NUMERO (client) | + **Appliquer correction** (teal) |
| COLIS_ENDOMMAGE / COLIS_NON_CORRESPONDANT | + **Créer échange** (violet) |
| ANNULATION | + **Confirmer annulation** (orange = REFUSE) |
| REPROGRAMMATION | + **Reporter commande** (= EN_ATTENTE) |
| CLIENT_REFUSE_COMMANDE (livreur) | + **Reporter** · **Retourner** · **Relancer livraison** |
| ADRESSE_* / NUMERO_INVALIDE (livreur, avec réponse client) | + **Appliquer correction** + **Relancer livraison** |
| Tentative différée 3+ (livreur) | + **Reporter** · **Retourner** · **Relancer** |
| Autres motifs | + **Changer statut commande** (générique) |

### 2.6.4 Confirmation : pas de motif obligatoire pour la confirmatrice

Quand la confirmatrice clique sur « Reporter » ou « Retourner » la commande, **pas de bottom sheet de motif**. Elle prend juste sa décision et c'est elle qui justifie via la **note interne** si elle le souhaite.

C'est différent du livreur qui DOIT choisir un motif. Pour la confirmatrice, c'est libre — elle a le contexte complet du cas, le motif est déjà connu.

---

## 2.7 Schéma interactif des transitions

### 2.7.1 Comportement

Dans le profil de la confirmatrice (ou via un bouton « ❓ Schéma » en haut de chaque écran), un écran qui affiche :

**Schéma 1 — Cycle de vie d'un cas**

```
        Création
           │
           ▼
       ┌────────┐         (autre confirmatrice
       │Envoyée │◄──────── le libère)
       └───┬────┘
           │ Prendre en charge
           ▼
    ┌──────────────┐
    │  En cours    │
    └──┬───────┬───┘
       │       │
   Clôturer  Refuser
       │       │
       ▼       ▼
   ┌──────┐ ┌──────┐
   │Clôtu-│ │Refu- │
   │ rée  │ │ sée  │
   └──────┘ └──────┘
```

**Schéma 2 — Cycle de vie d'une commande**

```
EN_ATTENTE ──[Confirmer]──► CONFIRME ──[Pool livreur]──► EN_LIVRAISON
    │                          │                              │
    │                          │                              ├─► LIVRE
    │                          │                              ├─► REPORTE
[Refuser]                  [Reporter]                         └─► RETOUR
    │                          │
    ▼                          ▼
 REFUSE                  EN_ATTENTE
                              │
                       [Reprogrammer client]
```

Chaque flèche est cliquable. Au clic, une bottom sheet explique :
- Qui peut faire cette transition (Client / Livreur / Confirmatrice / Système)
- Sous quelles conditions
- Quel événement SignalR est émis

### 2.7.2 Implémentation Flutter

Créer un nouveau écran `WorkflowDiagramScreen` avec deux onglets (Cas / Commande). Utiliser `flutter_svg` ou un widget `CustomPainter` pour dessiner les états et flèches.

Au tap d'une flèche, ouvrir un `showModalBottomSheet` avec la documentation contextuelle.

Bouton d'accès depuis :
- Profil confirmatrice → « Comment ça marche ? »
- Détail d'un cas → icône « ? » en haut à droite
- Détail d'une commande à confirmer → icône « ? »

### 2.7.3 Documentation embarquée

Chaque transition documentée a un format JSON statique embarqué dans l'app :

```dart
const transitionsCas = {
  'envoyee_to_encours': {
    'from': 'Envoyée',
    'to': 'En cours',
    'actor': 'Confirmatrice',
    'condition': 'Clic sur "Prendre en charge"',
    'signalr': 'CasPrisEnCharge',
    'sideEffect': 'Verrou exclusif sur la confirmatrice',
  },
  // ... toutes les transitions
};
```

---

## 2.8 SignalR — temps réel à compléter

### 2.8.1 Événements actuels (à conserver)

- `NouveauCas`
- `CasPrisEnCharge`
- `StatutCasChange`

### 2.8.2 Événements à ajouter

- `CasLibere` — émis quand un cas est libéré (pause, déconnexion, timeout 30 min, abandon volontaire)
- `CommandeAttribuee` — émis quand une nouvelle commande est attribuée à une confirmatrice
- `CommandeLiberee` — émis quand une commande attribuée est libérée (timeout 30 min)
- `ClientARepondu` — émis quand un client envoie une correction sur une demande

Total : **7 événements SignalR**, ce qui reste raisonnable.

### 2.8.3 Branchement Flutter (à corriger)

Aujourd'hui le polling 20s fait office de fallback. À garder mais **brancher les vrais listeners** :

```dart
class ReclamationSignalRService {
  late HubConnection _hub;
  final ReclamationsProvider _provider;

  Future<void> connect(String token) async {
    _hub = HubConnectionBuilder()
      .withUrl('${ApiClient.baseUrl}/hubs/reclamations',
        options: HttpConnectionOptions(
          accessTokenFactory: () async => token,
        ))
      .withAutomaticReconnect()
      .build();

    _hub.on('NouveauCas', (args) {
      _provider.handleNouveauCas(args);
    });
    _hub.on('CasPrisEnCharge', (args) {
      _provider.handleCasPrisEnCharge(args);
    });
    _hub.on('StatutCasChange', (args) {
      _provider.handleStatutCasChange(args);
    });
    _hub.on('CasLibere', (args) {
      _provider.handleCasLibere(args);
    });
    _hub.on('CommandeAttribuee', (args) {
      _provider.handleCommandeAttribuee(args);
    });
    _hub.on('CommandeLiberee', (args) {
      _provider.handleCommandeLiberee(args);
    });
    _hub.on('ClientARepondu', (args) {
      _provider.handleClientARepondu(args);
    });

    await _hub.start();
  }
}
```

**Comportements UI à brancher** :

- `NouveauCas` → bip discret + ligne surlignée 5 secondes en haut de la file
- `CasPrisEnCharge` (autre confirmatrice) → ligne grisée avec « Pris par X · il y a Ns »
- `CasLibere` → bannière orange « Cas libéré » + remontée dans la file
- `ClientARepondu` (sur un cas qu'elle traite) → bannière verte « Le client a corrigé » + bouton « Appliquer correction » devient actif

---

## 2.9 Audit des boutons morts (livrable obligatoire)

À l'instar de la Section 1 (Livreur), Claude Code doit produire un fichier `CONFIRMATRICE_BUTTONS_AUDIT.md` listant tous les boutons de :

- `confirmatrice_claims_screen.dart`
- `confirmatrice_claim_details_screen.dart`
- `confirmatrice_orders_screen.dart` (commandes à confirmer)
- `confirmatrice_pool_screen.dart` (pool global)
- `confirmatrice_profile_screen.dart`
- Tous les widgets associés (`_ActionsBar`, dialogs, etc.)

Format identique à la Section 1 :

```markdown
| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| Détail cas | "Appliquer correction" | confirmatrice_claim_details_screen.dart:512 | ✅ OK | — |
| Détail cas | "Créer échange" | confirmatrice_claim_details_screen.dart:603 | ❌ MORT | Implémenter dialog EchangeDialog |
| Profil | "Voir le schéma" | confirmatrice_profile_screen.dart:88 | ⚠️ N'EXISTE PAS | Créer WorkflowDiagramScreen |
```

**Règle** : tous les boutons morts doivent être soit corrigés, soit supprimés. Aucun `onPressed: null` accepté.

---

## 2.10 Cohérence avec l'existant

### 2.10.1 Ne PAS toucher

- Le score de distribution à 4 facteurs (BaseConnexion, ChargeEnCours, Fatigue, Attente)
- La table `F_RECLAMATION_TENTATIVE` (compteur tentatives par jour)
- Les 4 statuts de cas (Envoyée / En cours / Clôturée / Refusée)
- Les 3 onglets (À traiter / En attente client / Historique)
- La logique cross-gouvernorat (toggle « Mes cas / Tous »)
- Les actions par motif (matrice 2.6.3)
- L'endpoint `POST /reprendre` pour reprise volontaire
- L'escalade automatique 24h (filtre SQL dans `GetForStaffByTabAsync`)
- La libération automatique 30 min des cas inactifs

### 2.10.2 Modifications requises

- Hub SignalR : ajouter `OnDisconnectedAsync` avec délai de grâce 5s + libération immédiate
- Hub SignalR : ajouter 4 nouveaux événements (`CasLibere`, `CommandeAttribuee`, `CommandeLiberee`, `ClientARepondu`)
- Détail cas : ajouter le **Bloc Tentatives** avec compteur dynamique
- Liste cas : ajouter le **badge Tentative N** dynamique
- Profil : ajouter le **bouton « Comment ça marche ? »** vers le schéma interactif
- Nouveau écran `WorkflowDiagramScreen`

### 2.10.3 Ajouts DB

Aucune migration nécessaire. Tout est calculable depuis l'existant.

---

## 2.11 Plan d'exécution recommandé pour Claude Code

1. **Audit boutons morts** → fichier `CONFIRMATRICE_BUTTONS_AUDIT.md`
2. **Backend SignalR** :
   - `OnDisconnectedAsync` avec délai 5s
   - 4 nouveaux événements
   - Émission depuis les services concernés
3. **Backend confirmatrice** :
   - Endpoint `GET /api/confirmatrice/reclamations/{id}/tentatives` → détail des tentatives
4. **Flutter — modèle** :
   - Étendre `Reclamation` avec `nombreTentatives`, `tentatives[]`
5. **Flutter — UI cas** :
   - Badge Tentative N dans la liste
   - Bloc Tentatives dans le détail
6. **Flutter — schéma interactif** :
   - Nouvel écran `WorkflowDiagramScreen`
   - Bouton d'accès depuis le profil
7. **Flutter — SignalR** :
   - Brancher les 7 listeners dans `ReclamationsProvider`
   - Garder le polling 20s en fallback
8. **Tests manuels** : 5 scénarios (voir 2.12)
9. **Re-audit** : vérifier que tous les boutons sont fonctionnels

---

## 2.12 Tests manuels obligatoires

**Scénario 1 — Pause manuelle**
1. Confirmatrice A a 3 cas en cours
2. Elle clique « Pause »
3. Vérifier que les 3 cas sont libérés instantanément
4. Vérifier qu'ils sont redistribués (SignalR `CasLibere` émis)
5. Confirmatrice B reçoit les cas dans sa file

**Scénario 2 — Fermeture brutale de l'app**
1. Confirmatrice A a 2 cas en cours
2. Elle force la fermeture de l'app (swipe up)
3. Attendre 6 secondes
4. Vérifier en DB que les 2 cas sont libérés
5. Vérifier dans les logs : « Confirmatrice X déconnectée → libération cas »
6. Confirmatrice B voit les cas réapparaître dans le pool

**Scénario 3 — Reconnexion rapide (transition wifi)**
1. Confirmatrice A a 1 cas en cours
2. Elle change de wifi (déconnexion 2 secondes)
3. SignalR se reconnecte
4. Vérifier que le cas n'a PAS été libéré (délai de grâce de 5s respecté)

**Scénario 4 — Compteur de tentatives**
1. Livreur tente une commande 4 fois (motif CLIENT_NON_JOIGNABLE)
2. Au bout de la 3ᵉ, une Demande est créée
3. Confirmatrice ouvre le cas
4. Vérifier le badge « Tentative 3 » dans la liste
5. Vérifier le bloc Tentatives avec 3 entrées détaillées
6. Le lendemain, livreur retente → 4ᵉ tentative
7. Badge passe à « Tentative 4 », bloc s'enrichit

**Scénario 5 — Schéma interactif**
1. Confirmatrice ouvre son profil
2. Clique « Comment ça marche ? »
3. Onglet Cas s'affiche avec le diagramme
4. Tap sur la flèche « Envoyée → En cours »
5. Bottom sheet s'ouvre avec « Acteur : Confirmatrice · Action : Prendre en charge · SignalR : CasPrisEnCharge »

---

**Fin de la section Confirmatrice. Sections suivantes : Client, Admin, Chatbot.**
# SECTION 3 — Espace Client (Flutter mobile)

> Section 3/5 du brief technique global. Couvre l'**espace client** Flutter. Doit être lue après les Sections 1 (Livreur) et 2 (Confirmatrice).

---

## 3.1 Contexte

L'espace client est utilisé par les acheteurs finaux. C'est le visage public de la plateforme — celui qui détermine la confiance et la rétention. La refonte vise 3 objectifs :

1. **Réduire l'anxiété client** (« où est mon colis ? quand arrive-t-il ? »)
2. **Faciliter la communication** sans tomber dans le chat libre (lourd à modérer)
3. **Différencier la plateforme** vs les concurrents tunisiens (First Delivery, Aramex, Best Delivery — aucun ne fait live tracking ni fidélité)

Toutes les fonctionnalités existantes sont conservées :
- 4 sections (Commandes / Réclamations / Demandes / Profil)
- 7 motifs de réclamation (5 avant + 2 après livraison)
- Indicateur rouge/vert sur les Demandes
- Reprogrammation J+1 à J+14, 3 créneaux
- Popup d'avis emoji + tags
- Refus si Demande livreur ouverte sur le même motif

---

## 3.2 Liste des ajouts (10 chantiers)

| # | Chantier | Impact | Effort |
|---|---|---|---|
| 1 | SMS pré-livraison automatique | Fort | Moyen |
| 2 | ETA livreur + carte temps réel | Très fort | Élevé |
| 3 | Bouton « Appeler mon livreur » | Fort | Faible |
| 4 | Carnet d'adresses (1-3 adresses) | Fort | Moyen |
| 5 | Mode invité / suivi public | Fort | Moyen |
| 6 | Préférences de contact (Appel/SMS) | Moyen | Faible |
| 7 | Mode dégradé (cohérent livreur) | Fort | Moyen |
| 8 | Programme fidélité Bronze/Argent/Or | Très fort | Moyen |
| 9 | Alerte push « livreur proche » | Fort | Faible |
| 10 | FAQ contextuelle | Moyen | Faible |
| 11 | Audit boutons morts | Bloquant | Faible |

---

## 3.3 Chantier 1 — SMS pré-livraison automatique

### 3.3.1 Comportement métier

Dès qu'une commande est prise par un livreur (statut passe à `DEPOT 0`), le backend déclenche un SMS automatique au client :

> *« Bonjour, votre commande {ref} sera livrée demain entre 9h et 18h. Soyez disponible. — {nom_société} »*

Si le livreur démarre la livraison le jour même (passage `EN_LIVRAISON`), un autre SMS est envoyé :

> *« Votre livreur est en route. ETA estimée {hh:mm}. Numéro livreur : {tel_livreur}. »*

### 3.3.2 Backend — service de notifications

Créer `SmsNotificationService` qui s'abonne aux événements de changement de statut commande :

```csharp
public class SmsNotificationService
{
    public async Task OnOrderStatusChanged(string piece, string oldStatus, string newStatus)
    {
        var order = await LoadOrderAsync(piece);
        var phone = order.ClientPhone;
        if (string.IsNullOrWhiteSpace(phone)) return;

        // Préférences contact client (chantier 6)
        if (order.Client.ContactPreference == ContactPreference.AppelOnly) return;

        string? message = (oldStatus, newStatus) switch
        {
            ("CONFIRME", "DEPOT") => $"Votre commande {piece} sera livrée demain entre 9h et 18h. Soyez disponible.",
            ("DEPOT", "EN_LIVRAISON") => $"Votre livreur {order.LivreurNom} est en route. Tel : {order.LivreurPhone}.",
            ("EN_LIVRAISON", "LIVRE") => $"Votre commande {piece} a été livrée. Merci !",
            _ => null,
        };

        if (message != null)
        {
            await _smsGateway.SendAsync(phone, message);
            await LogSmsAsync(piece, phone, message);
        }
    }
}
```

### 3.3.3 Gateway SMS

**Pour le PFE** : on peut soit utiliser un vrai gateway (Twilio, Orange Tunisie SMS API), soit mocker. Recommandation : créer une interface `ISmsGateway` avec 2 implémentations :

- `MockSmsGateway` (loggue dans `F_SMS_LOG` table, pas d'envoi réel) → pour démo PFE
- `OrangeTnSmsGateway` (intègre l'API Orange Tunisie) → pour production

```csharp
public interface ISmsGateway
{
    Task<SmsResult> SendAsync(string phone, string message);
}
```

Configuration dans `appsettings.json` :

```json
{
  "Sms": {
    "Provider": "Mock",  // "Mock" ou "OrangeTn"
    "OrangeTn": {
      "ApiKey": "...",
      "Sender": "DELIVERY"
    }
  }
}
```

### 3.3.4 Table d'audit SMS

```sql
CREATE TABLE F_SMS_LOG (
    Id INT IDENTITY PRIMARY KEY,
    DoPiece NVARCHAR(13) NOT NULL,
    Phone NVARCHAR(20) NOT NULL,
    Message NVARCHAR(500) NOT NULL,
    SentAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Provider NVARCHAR(20) NOT NULL,
    Success BIT NOT NULL,
    ErrorMessage NVARCHAR(500) NULL
);
CREATE INDEX IX_F_SMS_LOG_DoPiece ON F_SMS_LOG (DoPiece, SentAt);
```

Permet de prouver la traçabilité côté client (« on vous a envoyé un SMS le X »).

---

## 3.4 Chantier 2 — ETA et carte temps réel du livreur

### 3.4.1 Comportement métier

Dans la liste des commandes du client, chaque commande en `EN_LIVRAISON` affiche un bouton **« 📍 Suivre en direct »** qui ouvre un écran de tracking live.

Sur cet écran :
- Carte plein écran (flutter_map ou google_maps_flutter)
- Marker rouge sur l'adresse du client
- Marker bleu animé sur la position actuelle du livreur (mise à jour toutes les 15 secondes)
- Polyline entre les deux
- Bandeau ETA en haut : *« Votre livreur Ahmed · arrive dans 12 min · 3,2 km »*
- Bouton flottant « 📞 Appeler le livreur »
- Bouton flottant « 💬 SMS au livreur »

### 3.4.2 Backend — endpoint de position livreur

```
GET /api/client/orders/{piece}/livreur-position
```

Réponse :

```json
{
  "livreurNom": "Ahmed M.",
  "livreurTel": "+216 22 123 456",
  "lat": 35.8245,
  "lng": 10.6346,
  "lastUpdate": "2026-05-09T14:32:18Z",
  "etaMinutes": 12,
  "etaDistanceKm": 3.2,
  "isEnRouteVersClient": true
}
```

Le calcul de l'ETA utilise une simple distance Haversine + vitesse moyenne (40 km/h en ville, 25 km/h en zone dense). Pas besoin de Google Directions API pour le PFE.

### 3.4.3 Position du livreur — comment elle remonte au backend

Côté Flutter livreur, ajouter un service `LivreurLocationService` qui :
- Démarre quand le livreur entre dans `EN_LIVRAISON`
- S'arrête quand il termine la commande (LIVRE/REPORTE/RETOUR)
- Envoie sa position toutes les 15 secondes via :

```
POST /api/livreur/location/ping
Body: { "lat": 35.83, "lng": 10.63, "accuracy": 5.2 }
```

Le backend stocke la dernière position dans une table `F_LIVREUR_POSITION` (1 ligne par livreur, écrasée à chaque ping pour éviter le surstockage) :

```sql
CREATE TABLE F_LIVREUR_POSITION (
    LivreurId UNIQUEIDENTIFIER PRIMARY KEY,
    Lat DECIMAL(10,7) NOT NULL,
    Lng DECIMAL(10,7) NOT NULL,
    Accuracy DECIMAL(8,2) NULL,
    UpdatedAt DATETIME2 NOT NULL,
    IsBroadcasting BIT NOT NULL DEFAULT 0
);
```

`IsBroadcasting = true` quand le livreur a au moins une commande en `EN_LIVRAISON`.

### 3.4.4 SignalR — push position au client

Quand le backend reçoit un ping, il émet aussi via SignalR vers le groupe `Client_{userId}` :

```csharp
await _hub.Clients.User(order.ClientUserId.ToString())
    .SendAsync("LivreurPositionUpdate", new {
        piece = order.DoPiece,
        lat, lng, etaMinutes, etaDistanceKm
    });
```

L'app client met à jour la carte sans rafraîchir.

### 3.4.5 Performance — éviter le spam GPS

Optimisations critiques pour ne pas vider la batterie du livreur :

1. **Polling adaptatif** : 15s en `EN_LIVRAISON`, 60s sinon (inutile de pinger toutes les 15s s'il n'a aucune commande active)
2. **Filtrage de bruit** : ne pas envoyer si la position a bougé de moins de 30 mètres (`Geolocator.distanceBetween < 30`)
3. **Battery saver** : utiliser `LocationAccuracy.balanced` plutôt que `high`
4. **Off duty** : si le livreur passe en pause ou se déconnecte, arrêter complètement le service

---

## 3.5 Chantier 3 — Bouton « Appeler mon livreur »

### 3.5.1 Comportement

Dans le tracking d'une commande en `EN_LIVRAISON`, dans le bloc « État de la livraison » :
- Affiche le nom du livreur + photo si dispo
- Bouton **« 📞 Appeler »** → intent `tel:`
- Bouton **« 💬 SMS »** → intent `sms:` avec body pré-rempli : *« Bonjour, je suis le destinataire de la commande {ref}. »*

Cohérent avec ce qu'on a fait pour le livreur (Section 1.4).

### 3.5.2 Sécurité — masquer le numéro après livraison

Une fois la commande passée à `LIVRE` ou `RETOUR`, le bloc disparaît. Le client n'a plus accès au numéro du livreur (RGPD-friendly + anti-démarchage).

---

## 3.6 Chantier 4 — Carnet d'adresses

### 3.6.1 Comportement

Dans le profil client, ajouter une section **« Mes adresses »** :
- Maximum 3 adresses
- Chaque adresse a : libellé (« Maison », « Travail », « Chez maman »), adresse complète, gouvernorat, CP, lat/lng GPS
- Une adresse marquée comme « par défaut »
- Boutons : Ajouter / Modifier / Supprimer / Définir par défaut

### 3.6.2 À la création de commande (côté React e-commerce)

Au moment du checkout, le client peut :
- Choisir une adresse existante du carnet (radio buttons)
- Ajouter une nouvelle adresse (qui sera ajoutée au carnet)
- Modifier l'adresse pour cette commande uniquement (pas sauvegardée)

### 3.6.3 DB

```sql
CREATE TABLE F_CLIENT_ADDRESS (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ClientUserId UNIQUEIDENTIFIER NOT NULL,
    Label NVARCHAR(50) NOT NULL,        -- "Maison", "Travail", etc.
    Adresse NVARCHAR(500) NOT NULL,
    Gouvernorat NVARCHAR(50) NOT NULL,
    Delegation NVARCHAR(100) NULL,
    Ville NVARCHAR(100) NOT NULL,
    CodePostal NVARCHAR(10) NULL,
    Latitude DECIMAL(10,7) NULL,
    Longitude DECIMAL(10,7) NULL,
    IsDefault BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL
);
CREATE INDEX IX_F_CLIENT_ADDRESS_ClientUserId ON F_CLIENT_ADDRESS (ClientUserId);
```

Contrainte : **maximum 3 adresses par client** (à valider côté API).

### 3.6.4 Endpoints

```
GET    /api/client/addresses
POST   /api/client/addresses
PUT    /api/client/addresses/{id}
DELETE /api/client/addresses/{id}
PUT    /api/client/addresses/{id}/set-default
```

---

## 3.7 Chantier 5 — Mode invité / suivi public

### 3.7.1 Comportement

Sur l'écran de connexion, ajouter un lien discret : **« Suivre un colis sans compte »**.

Cliquer mène à un écran public sans authentification :
- Champ « Numéro de commande » (ex: BL00123)
- Champ « 4 derniers chiffres du téléphone du destinataire »
- Bouton « Suivre »

À la validation, si la combinaison existe → affiche un tracking limité :
- Statut commande
- Timeline des étapes
- ETA si en livraison
- **Pas** d'infos sensibles (adresse complète, articles, prix)
- **Pas** de possibilité de réclamation ou reprogrammation

### 3.7.2 Sécurité

Pour éviter le brute force :
- Rate limit : 5 tentatives / heure / IP
- Captcha après 3 essais
- Logger les tentatives échouées dans `F_PUBLIC_TRACKING_LOG`

### 3.7.3 Endpoint

```
POST /api/public/track
Body: { "piece": "BL00123", "phoneLast4": "3456" }
```

Réponse limitée :

```json
{
  "piece": "BL00123",
  "statut": "EN_LIVRAISON",
  "timeline": [...],
  "etaMinutes": 12,
  "livreurFirstName": "Ahmed"  // pas le nom complet, pas le téléphone
}
```

### 3.7.4 Use case principal

C'est très demandé en Tunisie : un client commande sur un site e-commerce, reçoit un SMS avec le numéro de commande, et veut suivre sans avoir à créer un compte. Mallatech et Stocki notent que c'est un facteur de conversion important.

---

## 3.8 Chantier 6 — Préférences de contact

### 3.8.1 Comportement

Dans le profil, section **« Communication »** :

> *Comment souhaitez-vous être contacté par le livreur ?*
> ○ 📞 Appel uniquement
> ○ 💬 SMS uniquement
> ● 📞 + 💬 Les deux (recommandé)

Sauvegardé dans `F_CLIENT_PROFILE.ContactPreference`.

### 3.8.2 Impact côté livreur

Dans le détail commande (Section 1.3.2), au-dessus des boutons Appeler/SMS, afficher un badge :
- Badge bleu *« Préfère SMS »* → si `SmsOnly`
- Badge vert *« Préfère appel »* → si `AppelOnly`
- Pas de badge si `Both`

Si le livreur clique sur un bouton non préféré, dialog de confirmation : *« Le client préfère SMS. Continuer l'appel ? »* (mais on ne bloque pas).

### 3.8.3 Impact SMS automatiques (chantier 1)

Si `AppelOnly` → ne pas envoyer les SMS automatiques pré-livraison.

---

## 3.9 Chantier 7 — Mode dégradé client

### 3.9.1 Réutilisation de la Section 1.7

Toute la logique de mode dégradé (BackendHealthService + OfflineQueueService + idempotence) **doit être partagée entre l'app livreur et l'app client**.

Si Flutter est en projet unique avec deux entrées (client/livreur), c'est trivial. Si ce sont deux apps Flutter séparées, factoriser dans un package commun `pfe_core` ou copier-coller les services.

### 3.9.2 Actions client à mettre en queue

Côté client, les actions à protéger :
- Création d'une réclamation
- Réponse à une demande livreur (correction adresse/numéro)
- Envoi d'un avis post-livraison
- Reprogrammation
- Mise à jour du carnet d'adresses

Ces actions doivent être **optimistes** : l'UI confirme immédiatement, la queue se charge de l'envoi.

### 3.9.3 Bandeau visible

Bandeau orange en haut de l'app :
- *« ⚠️ Connexion instable — vos actions seront envoyées dès que possible »*
- Bandeau vert temporaire à la reconnexion : *« ✅ Synchronisation en cours »*

---

## 3.10 Chantier 8 — Programme de fidélité Bronze/Argent/Or

### 3.10.1 Différenciation marketing

**Aucune plateforme tunisienne actuelle ne fait ça.** C'est un fort différenciateur pour ton jury PFE et pour la rétention.

### 3.10.2 Niveaux

| Niveau | Condition | Avantage |
|---|---|---|
| 🥉 **Bronze** | 1-9 livraisons réussies | Aucun avantage spécifique |
| 🥈 **Argent** | 10-29 livraisons réussies | -10% sur frais de livraison (8 DT → 7,2 DT) |
| 🥇 **Or** | 30+ livraisons réussies | -25% frais de livraison (8 DT → 6 DT) + livraison prioritaire |
| 💎 **Platine** | 100+ livraisons réussies | Frais offerts + assistance prioritaire |

### 3.10.3 Affichage profil

Dans la section profil, **carte hero gradient** en haut :

```
┌─────────────────────────────────────────────┐
│  🥈  ARGENT                                 │
│                                             │
│  18 livraisons réussies                     │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 12 livraisons          │
│  jusqu'à OR                                  │
│                                             │
│  💚 Avantage actuel : -10% sur livraison    │
└─────────────────────────────────────────────┘
```

### 3.10.4 Backend

Calcul à la volée (pas besoin de stocker le niveau, juste le compter) :

```csharp
public LoyaltyTier ComputeTier(Guid clientUserId)
{
    var count = _db.F_DOCENTETE
        .Count(d => d.ClientUserId == clientUserId
                 && d.LI_Statut == (int)LiStatut.LIVRE);

    return count switch
    {
        >= 100 => LoyaltyTier.Platine,
        >= 30 => LoyaltyTier.Or,
        >= 10 => LoyaltyTier.Argent,
        _ => LoyaltyTier.Bronze,
    };
}
```

Endpoint :
```
GET /api/client/loyalty
```

Réponse :

```json
{
  "tier": "Argent",
  "deliveriesCount": 18,
  "nextTier": "Or",
  "deliveriesUntilNextTier": 12,
  "currentBenefit": "-10% sur frais de livraison",
  "discountPercent": 10
}
```

### 3.10.5 Application de la réduction

À la création d'une commande COD HOME :
```csharp
var tier = await _loyalty.ComputeTierAsync(clientUserId);
var fraisLivraison = 8.0m;
var reduction = tier.DiscountPercent / 100m;
var fraisFinal = fraisLivraison * (1 - reduction);
order.FraisLivraison = fraisFinal;
```

À afficher dans le récap commande : *« Frais de livraison : 7,20 DT (au lieu de 8 DT, fidélité Argent) »*

---

## 3.11 Chantier 9 — Notification push « livreur proche »

### 3.11.1 Comportement

Quand le ping de position du livreur indique qu'il est à **moins de 500 mètres** du client (`etaDistanceKm < 0.5`), envoyer **une seule** notification push :

> *« 📦 Votre livreur arrive dans quelques minutes. Préparez votre paiement (X DT). »*

### 3.11.2 Anti-spam

Une seule notification par commande (flag `ProximityAlertSent` sur la commande). Si le livreur s'éloigne puis revient, pas de re-notification.

### 3.11.3 Implémentation

Dans le handler de ping position livreur :

```csharp
if (!order.ProximityAlertSent && etaDistanceKm < 0.5)
{
    await _push.SendAsync(order.ClientUserId, new PushPayload {
        Title = "Votre livreur arrive",
        Body = $"Préparez votre paiement de {order.MontantTotal:N2} DT",
        Data = { ["piece"] = order.DoPiece, ["action"] = "open_tracking" }
    });
    order.ProximityAlertSent = true;
    await _db.SaveChangesAsync();
}
```

### 3.11.4 Push provider

Utiliser **Firebase Cloud Messaging (FCM)** — gratuit, supporté par Android et iOS, intégration Flutter via `firebase_messaging`.

Pour le PFE, configuration minimale :
- 1 projet Firebase
- Tokens device stockés dans `F_CLIENT_DEVICE_TOKEN`
- Service `PushNotificationService` qui appelle FCM HTTP API

---

## 3.12 Chantier 10 — FAQ contextuelle

### 3.12.1 Contenu

Page accessible depuis le profil et depuis l'écran de tracking, avec des sections :

**Paiement et frais**
- Comment je paie ? (Cash on Delivery uniquement)
- Pourquoi 8 DT de frais de livraison ?
- C'est quoi le timbre fiscal de 1 DT ?
- Y a-t-il une réduction fidélité ?

**Livraison**
- Combien de temps pour livrer ?
- Que faire si je ne suis pas chez moi ?
- Le livreur peut-il appeler avant d'arriver ?
- Comment reprogrammer ma livraison ?

**Problèmes**
- J'ai reçu un colis endommagé, que faire ?
- Le colis ne correspond pas à ma commande, que faire ?
- Comment faire un échange ?
- Comment annuler ma commande ?

**Suivi**
- Comment suivre mon colis sans compte ?
- C'est quoi les statuts (Confirmée, En livraison, etc.) ?
- Pourquoi je vois mon livreur sur la carte ?

### 3.12.2 Format

Liste expandable (FAQ accordéon) avec recherche en haut. Chaque question est cliquable, le contenu se déplie.

### 3.12.3 Backend ou hardcodé ?

Pour le PFE : **hardcodé en Flutter** dans un fichier `assets/faq.json`. Pas besoin de backend pour ça.

```json
{
  "categories": [
    {
      "title": "Paiement et frais",
      "items": [
        {
          "q": "Comment je paie ?",
          "a": "Le paiement se fait en cash directement au livreur..."
        }
      ]
    }
  ]
}
```

---

## 3.13 Chantier 11 — Audit boutons morts client

### 3.13.1 Méthode

Identique à Section 1 (Livreur) et Section 2 (Confirmatrice).

Claude Code produit `CLIENT_BUTTONS_AUDIT.md` :

| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| Tracking | « Reprogrammer » | client_order_tracking_screen.dart:412 | ✅ OK | — |
| Tracking | « Track Live » | client_order_tracking_screen.dart:489 | ⚠️ N'EXISTE PAS | Implémenter (chantier 2) |
| Profil | « Mes adresses » | client_profile_screen.dart:88 | ⚠️ N'EXISTE PAS | Implémenter (chantier 4) |

### 3.13.2 Périmètre

Tous les écrans de `flutter/lib/ui/screens/client/` + `flutter/lib/ui/widgets/` liés client.

---

## 3.14 Refonte du Tracking — vue consolidée

L'écran `client_order_tracking_screen.dart` doit intégrer toutes les nouveautés. Structure cible :

```
┌──────────────────────────────────────────────────────────────┐
│ HERO (gradient selon statut)                                  │
│ Référence BL00123 · Statut EN_LIVRAISON · ETA 18h45          │
├──────────────────────────────────────────────────────────────┤
│ [📍 Suivre en direct]  ← uniquement si EN_LIVRAISON          │
├──────────────────────────────────────────────────────────────┤
│ TIMELINE (existant — déjà OK)                                 │
│ Confirmée · En livraison · Livrée                             │
├──────────────────────────────────────────────────────────────┤
│ DESTINATAIRE                                                  │
│ Nom · Téléphone · Adresse · Gouvernorat · Ville · CP         │
├──────────────────────────────────────────────────────────────┤
│ LIVREUR  ← uniquement si EN_LIVRAISON                         │
│ Ahmed M. · [📞 Appeler] [💬 SMS]                             │
├──────────────────────────────────────────────────────────────┤
│ ARTICLES                                                      │
│ Liste articles · qté · prix · total                           │
├──────────────────────────────────────────────────────────────┤
│ FIDÉLITÉ APPLIQUÉE  ← si réduction                            │
│ -10% sur frais (Argent) · 7,20 DT au lieu de 8 DT            │
├──────────────────────────────────────────────────────────────┤
│ RÉCLAMATION LIÉE  ← si existe                                 │
│ Motif · statut · [Voir le détail]                             │
├──────────────────────────────────────────────────────────────┤
│ DEMANDE LIÉE  ← si existe                                     │
│ Motif · indicateur rouge/vert · [Corriger]                    │
├──────────────────────────────────────────────────────────────┤
│ ACTIONS (sticky bottom)                                       │
│ [Créer réclamation] [Reprogrammer] [Aide ❓]                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 3.15 SignalR client — événements à brancher

Au-delà des événements existants (`StatutCommandeChange`, `CorrectionAppliquee`, `NouveauCas`, `StatutCasChange`), ajouter :

- **`LivreurPositionUpdate`** → met à jour la carte temps réel sur l'écran Track Live
- **`SmsEnvoye`** → optionnel, badge dans la liste commandes pour confirmer au client qu'un SMS a été envoyé
- **`ReductionFideliteAppliquee`** → notif locale « Vous avez gagné -10% grâce à votre niveau Argent »

---

## 3.16 Cohérence avec l'existant

### 3.16.1 Ne PAS toucher

- Les 7 motifs de réclamation
- La logique rouge/vert sur les Demandes
- Les 3 créneaux de reprogrammation (MATIN/APRES_MIDI/SOIR)
- La règle J+1 à J+14
- Le refus de réclamation si Demande livreur ouverte sur même motif
- La popup d'avis emoji + tags
- L'écran de correction adresse (déjà dans `client_demande_correction_screen.dart`)

### 3.16.2 Migrations DB

- `F_SMS_LOG` (chantier 1)
- `F_LIVREUR_POSITION` (chantier 2)
- `F_CLIENT_ADDRESS` (chantier 4)
- `F_PUBLIC_TRACKING_LOG` (chantier 5)
- `F_CLIENT_PROFILE` : ajouter colonne `ContactPreference NVARCHAR(20) NOT NULL DEFAULT 'Both'` (chantier 6)
- `F_DOCENTETE` : ajouter colonne `ProximityAlertSent BIT NOT NULL DEFAULT 0` (chantier 9)
- `F_CLIENT_DEVICE_TOKEN` (chantier 9)

---

## 3.17 Plan d'exécution recommandé

Ordre d'implémentation (du plus rentable au plus complexe) :

1. **Audit boutons morts** → fichier `CLIENT_BUTTONS_AUDIT.md`
2. **Mode dégradé** (chantier 7) → réutilise les services livreur, code partageable
3. **Carnet d'adresses** (chantier 4) → CRUD simple
4. **Préférences contact** (chantier 6) → champ profil, simple
5. **FAQ** (chantier 10) → JSON statique, pas de backend
6. **Programme fidélité** (chantier 8) → calcul à la volée, gros impact UI
7. **SMS pré-livraison** (chantier 1) → service SMS + table audit
8. **Mode invité** (chantier 5) → endpoint public + écran Flutter
9. **ETA + carte temps réel** (chantier 2) → le plus complexe, à faire après les autres
10. **Bouton appeler livreur** (chantier 3) → trivial une fois la 2 faite
11. **Notif push proximité** (chantier 9) → nécessite Firebase setup
12. **Re-audit final**

---

## 3.18 Tests manuels obligatoires

**Scénario 1 — Cycle complet d'un client**
1. Création commande COD HOME → SMS de confirmation reçu
2. Confirmatrice valide → SMS « Confirmée » reçu
3. Livreur prend → SMS « Livrée demain » reçu
4. Livreur lance livraison → Bouton Track Live apparaît dans tracking
5. Client clique → carte temps réel s'affiche, livreur se déplace
6. Livreur arrive à 500m → notif push « Préparez paiement »
7. Livreur livre → SMS « Livrée », popup avis apparaît
8. Client soumet l'avis 5 étoiles
9. Profil client : compteur de livraisons +1, peut-être passage de niveau

**Scénario 2 — Mode invité**
1. Client non connecté ouvre l'app
2. Clique « Suivre un colis sans compte »
3. Saisit BL00123 + 3456 → tracking s'affiche
4. Vérifier que les infos sensibles sont masquées
5. Faire 6 essais incorrects → captcha s'active

**Scénario 3 — Carnet d'adresses**
1. Profil → Mes adresses → vide initialement
2. Ajouter « Maison » avec GPS
3. Ajouter « Travail » → marquer par défaut
4. Tenter d'ajouter une 4ᵉ → erreur « Max 3 adresses »
5. Modifier « Maison » → OK
6. Supprimer « Travail » → la « par défaut » disparaît, vérifier qu'il faut en désigner une autre

**Scénario 4 — Programme fidélité**
1. Client avec 9 livraisons → Bronze, pas de réduction
2. Confirmatrice livre la 10ᵉ → passage Argent, badge mis à jour
3. Nouvelle commande COD → frais = 7,20 DT (avec mention « -10% Argent »)
4. SMS reçu : « -10% appliqués ! »

**Scénario 5 — Mode dégradé**
1. Client crée une réclamation pendant que le backend est down
2. UI confirme « Réclamation envoyée »
3. Bandeau orange « Connexion instable »
4. Backend revient → bandeau vert, vérifier en DB que la réclamation est bien créée

---

**Fin de la section Client. Sections suivantes : Admin, Chatbot.**
# SECTION 4 — Espace Admin (React + Flutter)

> Section 4/5 du brief technique global. Couvre l'**espace admin** dans ses deux incarnations : le dashboard React (web) et l'app Flutter mobile.

---

## 4.1 Contexte

L'espace admin a deux incarnations qui doivent rester **cohérentes** (mêmes chiffres, mêmes définitions) :

- **Admin Web (React)** dans `React-Ecommerce/src/features/dashboard/`
- **Admin Mobile (Flutter)** dans `flutter/lib/ui/admin/`

La refonte vise :
1. Différencier visuellement les onglets (fini le « kifkif »)
2. Rendre tous les KPIs cliquables vers une vue détaillée plein-écran
3. Corriger les bugs de comptage (réclamations 7 vs 8 envoyées)
4. Vraie section Produits avec KPIs cliquables
5. Onglet Paramètres avec personnalisation thème (couleur globale de l'app)
6. Export Excel/PDF

L'existant à conserver :
- 6 onglets actuels (Dashboard / Commandes / Livreurs / Confirmatrices / Réclamations & Demandes / Produits / Chatbot)
- Sparkline 7 jours déjà en place
- Map premium déjà en place
- Filtres existants

---

## 4.2 Bug critique à corriger : compteurs réclamations

### 4.2.1 Le problème

« 7 réclamations totales mais 8 envoyées » est mathématiquement impossible et trahit un bug.

**Causes possibles :**
1. Endpoints différents (cache désynchronisé)
2. Jointure dupliquante (réclamation avec 2 photos compte 2×)
3. Soft delete mal géré
4. Filtre gouvernorat appliqué partiellement
5. TypeCas mélangés (Réclamations + Demandes)

### 4.2.2 La règle stricte : un seul endpoint pour tous les compteurs

```
GET /api/admin/reclamations/summary?period=30d&governorate=Sousse&typeCas=RECLAMATION
```

Réponse atomique calculée en **une seule requête SQL** :

```json
{
  "total": 7,
  "byStatus": {
    "envoyee": 2, "enCours": 1, "cloturee": 3, "refusee": 1
  },
  "byMotif": [{"code": "CHANGEMENT_ADRESSE", "count": 3}],
  "byGovernorate": [{"name": "Sousse", "count": 4}]
}
```

**Garantie** : `total = SUM(byStatus) = SUM(byMotif) = SUM(byGovernorate)`.

### 4.2.3 Implémentation backend

```csharp
public async Task<ReclamationsSummaryDto> GetSummaryAsync(
    string period, string? governorate, string? typeCas, CancellationToken ct)
{
    var (from, to) = PeriodHelper.Parse(period);

    var query = _db.F_RECLAMATIONS
        .Where(r => r.CreatedAt >= from && r.CreatedAt < to)
        .Where(r => !r.IsDeleted);

    if (!string.IsNullOrEmpty(governorate))
        query = query.Where(r => r.Gouvernorat == governorate);
    if (!string.IsNullOrEmpty(typeCas))
        query = query.Where(r => r.TypeCas == typeCas);

    var all = await query
        .Select(r => new { r.Statut, r.Motif, r.Gouvernorat })
        .ToListAsync(ct);

    var result = new ReclamationsSummaryDto
    {
        Total = all.Count,
        ByStatus = new {
            Envoyee = all.Count(x => x.Statut == "ENVOYEE"),
            EnCours = all.Count(x => x.Statut == "EN_COURS_DE_TRAITEMENT"),
            Cloturee = all.Count(x => x.Statut == "CLOTUREE"),
            Refusee = all.Count(x => x.Statut == "REFUSEE"),
        },
        // ...
    };

    // Test de cohérence en dev : exception si total != sum
    var sum = result.ByStatus.Envoyee + result.ByStatus.EnCours
            + result.ByStatus.Cloturee + result.ByStatus.Refusee;
    if (sum != result.Total)
        throw new InvalidOperationException(
            $"Compteur incohérent : total={result.Total}, sum={sum}");

    return result;
}
```

### 4.2.4 Application aux 5 sections admin

- `GET /api/admin/orders/summary`
- `GET /api/admin/livreurs/summary`
- `GET /api/admin/confirmatrices/summary`
- `GET /api/admin/products/summary`
- `GET /api/admin/reclamations/summary`

Tous suivent le même pattern : 1 endpoint, 1 requête, totaux cohérents.

---

## 4.3 KPIs cliquables → écran plein-écran

### 4.3.1 Comportement

Tu as choisi **« Nouvel écran plein-écran (push navigation) »**.

Au clic sur un KPI :
- Animation push (slide depuis la droite sur mobile, modal full-screen sur desktop)
- Liste détaillée filtrée
- Bouton retour clair en haut à gauche
- Boutons « Exporter Excel / PDF » en haut à droite (§4.7)

### 4.3.2 Mapping KPI → Liste détaillée

| KPI cliqué | Écran qui s'ouvre | Contenu |
|---|---|---|
| Total commandes | Liste commandes | ref, client, statut, gouvernorat, date, montant |
| Livrées / Reportées / Retournées | Liste filtrée par statut | Idem + spécifique au statut |
| Total livreurs / En ligne | Liste livreurs | nom, tel, gouvernorat, online, livraisons |
| Total confirmatrices | Liste confirmatrices | nom, online, charge, performance |
| Total réclamations / Par statut | Liste filtrée | type, motif, statut, client, commande |
| Total produits / Top vendu / Stock critique | Liste produits | référence, désignation, stock, ventes |

### 4.3.3 Composants partagés

**React** : `KpiDetailListPage.tsx` dans `React-Ecommerce/src/features/dashboard/components/`

```tsx
interface KpiDetailListPageProps {
  title: string;
  endpoint: string;
  columns: ColumnDef[];
  filters?: FilterDef[];
  exportEnabled: boolean;
  onRowClick?: (row) => void;
}
```

**Flutter** : `AdminKpiDetailScreen.dart` dans `flutter/lib/ui/admin/widgets/`

```dart
class AdminKpiDetailScreen<T> extends StatefulWidget {
  final String title;
  final Future<List<T>> Function(KpiFilters) loadData;
  final Widget Function(T item) buildRow;
  final List<ExportFormat> exports;
  final void Function(T item)? onRowTap;
}
```

Push navigation : `Navigator.push(...)` depuis le tap d'une `AdminKpiCard`.

---

## 4.4 Différenciation visuelle entre onglets

### 4.4.1 Identité par onglet

| Onglet | Couleur | Icône | Hero kicker |
|---|---|---|---|
| **Dashboard** | Indigo `#3F51B5` | `dashboard` | Cockpit général |
| **Commandes** | Bleu `#1976D2` | `inventory_2` | Pilotage logistique |
| **Livreurs** | Vert `#388E3C` | `local_shipping` | Performance terrain |
| **Confirmatrices** | Violet `#7B1FA2` | `support_agent` | Relation client |
| **Réclamations** | Orange `#F57C00` | `report_problem` | Service après-vente |
| **Produits** | Teal `#00796B` | `category` | Catalogue & ventes |
| **Chatbot** | Rose `#C2185B` | `smart_toy` | Assistant IA |
| **Paramètres** | Gris `#455A64` | `settings` | Configuration |

### 4.4.2 KPIs spécifiques par onglet

**Dashboard** (vue agrégée transverse — premier KPI = total commandes tous statuts)
- Total commandes (tous statuts)
- Total revenus 30j
- Total clients actifs
- Total livreurs en ligne
- Taux de livraison global
- Taux de retour global

**Commandes**
- Total / En attente / Confirmées / En livraison / Livrées / Reportées / Retournées / Refusées

**Livreurs**
- Total / En ligne / En pause / Hors ligne / Top livreur / Pire taux retour / Charge moyenne

**Confirmatrices**
- Total / En ligne / En pause / Charge moyenne / Temps traitement / Top conf / Cas > 24h

**Réclamations & Demandes**
- Total cas / Réclamations vs Demandes / 4 statuts / Top motif / Cas urgents / Taux résolution

**Produits**
- Total actifs / Top vendu / Top retourné / Stock critique / Ventes mois TND / Top gouvernorat

**Chatbot**
- Questions jour / mois / Top intent / Taux succès / Temps réponse / Users uniques

### 4.4.3 Hero card par onglet

```tsx
<DashboardHero
  kicker="Performance terrain"
  title="Vue livreurs"
  description="..."
  highlights={top3Kpis}
  accentColor="#388E3C"
  icon={LocalShippingOutlined}
/>
```

Composant existant `DashboardHero` enrichi avec `accentColor` et `icon`.

---

## 4.5 Section Produits — refonte complète

### 4.5.1 KPIs cliquables Produits

| KPI | Au clic, ouvre | Tri |
|---|---|---|
| Total produits | Liste tous produits | Alphabétique |
| Produit le + vendu | Liste produits | Tri ventes desc |
| Produit le + retourné | Liste produits | Tri retours desc |
| Stock critique | Liste produits stock < 7 | Stock asc |
| Ventes du mois | Liste produits | Tri CA desc |
| Top gouvernorat produits | Liste produits | Tri volumes-zone desc |

### 4.5.2 Détail produit (5 blocs)

1. **Identité** — Référence Sage (`ArRef`), désignation, catégorie, photo
2. **KPIs produit** — Stock actuel, ventes 30j, retours 30j, réclamations, note moyenne
3. **Courbes** — Ventes par jour 30j + Retours par jour 30j
4. **Répartition géographique** — Top 5 gouvernorats où il se vend
5. **Avis clients** — Liste, note moyenne, distribution étoiles

### 4.5.3 Endpoints

```
GET /api/admin/products/summary?period=30d
GET /api/admin/products?sort=sales&dir=desc&limit=50
GET /api/admin/products/{arRef}/detail
GET /api/admin/products/{arRef}/sales-trend?period=30d
GET /api/admin/products/{arRef}/by-governorate?period=30d
```

---

## 4.6 Onglet Paramètres — personnalisation thème global

### 4.6.1 Comportement

Nouvel onglet **« Paramètres »** dans l'admin Flutter et React. Permet de :

1. Changer la **couleur thème principale de toute l'app mobile** (livreur, client, confirmatrice, admin elle-même)
2. Choisir entre mode clair / sombre / auto
3. (V2) Gérer utilisateurs, rôles, paramètres plateforme

### 4.6.2 Section Apparence

```
┌─────────────────────────────────────────────────────────┐
│ APPARENCE                                                │
│                                                          │
│ Couleur principale                                       │
│ [🟦] [🟩] [🟧] [🟪] [🟥] [🟨] [⚫] [⚪]                  │
│  Bleu  Vert Orange Violet Rouge Jaune Noir Custom       │
│                                                          │
│ Mode                                                     │
│ ○ Clair  ● Sombre  ○ Auto (suit le système)            │
│                                                          │
│ [Aperçu en direct]                                       │
└─────────────────────────────────────────────────────────┘
```

### 4.6.3 Backend — table singleton

```sql
CREATE TABLE F_APP_CONFIG (
    Id INT PRIMARY KEY DEFAULT 1,
    PrimaryColor NVARCHAR(7) NOT NULL DEFAULT '#3F51B5',
    ThemeMode NVARCHAR(10) NOT NULL DEFAULT 'auto',
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedByUserId UNIQUEIDENTIFIER NULL,
    CONSTRAINT CK_AppConfig_OneRow CHECK (Id = 1)
);
INSERT INTO F_APP_CONFIG (Id, PrimaryColor, ThemeMode) VALUES (1, '#3F51B5', 'auto');
```

### 4.6.4 Endpoints

```
GET  /api/admin/config/theme    -- public, lu par toutes les apps au démarrage
PUT  /api/admin/config/theme    -- admin uniquement
```

### 4.6.5 Propagation aux apps mobiles

Au démarrage de chaque app Flutter :

```dart
class ThemeBootstrap {
  static Future<ThemeData> load() async {
    final response = await dio.get('/api/admin/config/theme');
    return ThemeData(
      primarySwatch: _hexToMaterialColor(response.data['primaryColor']),
      brightness: response.data['themeMode'] == 'dark' ? Brightness.dark : Brightness.light,
    );
  }
}
```

- **Cache local** : SharedPreferences pour éviter le flash au démarrage
- **Reload temps réel** : SignalR event `ThemeChanged` pour rafraîchir sans redémarrer

### 4.6.6 Sections futures (V2, cartes grisées)

- Gestion utilisateurs / rôles / permissions
- Configuration plateforme (frais 8 DT, timbre 1 DT, gouvernorats actifs)
- Configuration SMS gateway
- Logs et audit trail

Pour le PFE, **seule la section Apparence est obligatoire**.

---

## 4.7 Export Excel / PDF

### 4.7.1 Comportement

Dans chaque écran de liste KPI, 2 boutons en haut à droite :
- **Excel** (icône feuille verte) → télécharge un `.xlsx`
- **PDF** (icône PDF rouge) → télécharge un `.pdf`

L'export respecte les filtres actuels.

### 4.7.2 Backend Excel — ClosedXML

```csharp
public byte[] ExportOrdersToExcel(List<OrderDto> orders)
{
    using var workbook = new XLWorkbook();
    var sheet = workbook.Worksheets.Add("Commandes");
    
    sheet.Cell(1, 1).Value = "Référence";
    sheet.Cell(1, 2).Value = "Client";
    // ... headers
    
    var header = sheet.Range("A1:F1");
    header.Style.Font.Bold = true;
    header.Style.Fill.BackgroundColor = XLColor.LightGray;
    
    for (int i = 0; i < orders.Count; i++) { /* lignes */ }
    
    sheet.Columns().AdjustToContents();
    
    using var ms = new MemoryStream();
    workbook.SaveAs(ms);
    return ms.ToArray();
}
```

### 4.7.3 Backend PDF — QuestPDF

```csharp
public byte[] ExportOrdersToPdf(List<OrderDto> orders, AdminFilters filters)
{
    return Document.Create(container =>
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Header().Text("Rapport commandes").FontSize(18).Bold();
            page.Content().Column(col => { /* tableau */ });
            page.Footer().AlignCenter().Text(t => { /* pagination */ });
        });
    }).GeneratePdf();
}
```

### 4.7.4 Endpoints

```
GET /api/admin/orders/export?format=xlsx&period=30d&governorate=Sousse
GET /api/admin/reclamations/export?format=pdf&period=30d
```

### 4.7.5 Limites pratiques

- Max 10 000 lignes par export
- Au-delà → conseiller filtrer ou export async (V2)
- Loader visible pour les PDFs lourds

---

## 4.8 Audit boutons morts admin

Fichier livrable `ADMIN_BUTTONS_AUDIT.md`. Périmètre :
- React : `React-Ecommerce/src/features/dashboard/`
- Flutter : `flutter/lib/ui/admin/`

À vérifier en priorité :
- Boutons « Voir le détail » sur KPI cards
- Boutons « Exporter » Excel/PDF
- Filtres appliqués correctement et partagés avec l'export
- Drill-down depuis tableaux
- Actions admin (réinitialiser MDP, désactiver compte) si présentes

---

## 4.9 Cohérence avec l'existant

### 4.9.1 Ne PAS toucher

- Sparkline 7 jours
- Map premium (déjà refondue)
- `useDashboardFilters`, `DashboardHero`, `KpiGrid`, `ChartCard`
- Endpoints `useDashboardOverview`, `useDashboardLogistics`

### 4.9.2 À factoriser

- Les `*Summary` endpoints (1 endpoint = 1 vue, totaux cohérents)
- `KpiDetailListPage` et `AdminKpiDetailScreen` réutilisés partout
- `ExportService` partagé pour Excel et PDF

### 4.9.3 Migrations DB

- `F_APP_CONFIG` (singleton)
- Index `IX_F_RECLAMATION_Stats` :
  ```sql
  CREATE INDEX IX_F_RECLAMATION_Stats
  ON F_RECLAMATION (CreatedAt, Statut, TypeCas, Gouvernorat)
  WHERE IsDeleted = 0;
  ```

---

## 4.10 Plan d'exécution

1. Audit boutons morts → `ADMIN_BUTTONS_AUDIT.md`
2. Endpoint `/summary` cohérent + assertion en dev → étendre aux 5 sections
3. Différenciation visuelle (couleur, icône, kicker, KPIs par onglet)
4. KPIs cliquables (composants partagés + push nav)
5. Section Produits (KPIs + détail)
6. Onglet Paramètres (table + endpoints + UI + bootstrap + SignalR)
7. Export Excel/PDF (ClosedXML + QuestPDF + endpoints + UI)
8. Tests manuels (6 scénarios)
9. Re-audit boutons morts

---

## 4.11 Tests manuels (6 scénarios)

1. **Cohérence compteurs** — total = sum byStatus quel que soit le filtre
2. **Drill-down KPI** — clic Total commandes → push → liste → clic ligne → détail → retour
3. **Différenciation** — 8 onglets visités, couleurs + icônes + KPIs distincts
4. **Thème global** — admin choisit Vert → livreur/client/confirmatrice tous en vert sans redémarrage
5. **Export Excel** — fichier `.xlsx` téléchargé, header stylé, colonnes ajustées
6. **Export PDF** — fichier `.pdf` téléchargé, titre + période + tableau + pagination

---

**Fin de la section Admin. Section suivante : Chatbot intelligent.**
# SECTION 5 — Chatbot intelligent

> Section 5/5 du brief technique global — la dernière. Couvre la refonte du chatbot admin (n8n + Groq + LLaMA 3.3 70B + backend in-process). Doit être lue après les 4 sections précédentes.

---

## 5.1 Contexte

Tu as déjà un chatbot fonctionnel basé sur :
- **Backend orchestrateur** : `AdminChatOrchestratorService.cs` (pipeline Groq router → action → exécution → Groq formatter)
- **5 actions** : `kb` / `query` / `analyze` / `predict` / `chitchat`
- **3 services métier** : `AdminChatQueryService`, `AdminChatAnalyzeService`, `PredictionService`
- **n8n workflow V2** qui mirroir le backend pour démo
- **KB markdown** de 14 KB
- **UI Flutter premium** avec catégories, charts inline

L'objectif est de le **rendre vraiment intelligent** avec 8 améliorations :

| # | Amélioration | Impact PFE |
|---|---|---|
| 1 | Mémoire conversationnelle | UX |
| 2 | Bilingue FR/AR/Tounsi | 🇹🇳 Local |
| 3 | Suggestions proactives | 💎 Wow |
| 4 | Actions sécurisées (write) | 💎 Wow |
| 5 | Voice input/output | 💎 Wow |
| 6 | Streaming des réponses | UX |
| 7 | Quick-replies contextuelles | UX |
| 8 | KB hybride auto-générée | Robustesse |

Architecture cible : **garder n8n ET backend in-process** côte à côte pour la démo jury.

---

## 5.2 Amélioration 1 — Mémoire conversationnelle

### 5.2.1 Le problème

Aujourd'hui chaque question est traitée **isolément**. Si l'admin demande :
- *« Combien de commandes aujourd'hui ? »* → 13
- *« Et à Sfax ? »* → ❌ le bot ne comprend pas

### 5.2.2 La solution

Stocker l'**historique conversationnel** par session et l'injecter dans chaque appel Groq.

### 5.2.3 Backend — table d'historique

```sql
CREATE TABLE F_CHATBOT_SESSION (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    StartedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    LastActivityAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Language NVARCHAR(10) NOT NULL DEFAULT 'fr'
);

CREATE TABLE F_CHATBOT_MESSAGE (
    Id BIGINT IDENTITY PRIMARY KEY,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    Role NVARCHAR(20) NOT NULL,        -- 'user' / 'assistant' / 'system'
    Content NVARCHAR(MAX) NOT NULL,
    Action NVARCHAR(20) NULL,          -- kb / query / analyze / predict / chitchat / action
    DataJson NVARCHAR(MAX) NULL,       -- résultat JSON
    Feedback NVARCHAR(10) NULL,        -- 'up' / 'down' / null
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_F_CHATBOT_MESSAGE_Session ON F_CHATBOT_MESSAGE (SessionId, CreatedAt);
```

### 5.2.4 Logique d'injection

À chaque appel `/api/admin/chat/ask`, charger les **6 derniers messages** de la session et les injecter dans le prompt système Groq :

```csharp
var history = await _db.ChatbotMessages
    .Where(m => m.SessionId == sessionId)
    .OrderByDescending(m => m.CreatedAt)
    .Take(6)
    .OrderBy(m => m.CreatedAt)  // remettre dans l'ordre chronologique
    .ToListAsync(ct);

var contextPrefix = "Historique récent (le plus récent en bas) :\n" +
    string.Join("\n", history.Select(m => $"{m.Role}: {m.Content}"));

var routerPrompt = $"{RouterSystemPrompt}\n\n{contextPrefix}";
```

### 5.2.5 Détection de référents

Quand le bot voit *« Et à Sfax ? »*, il doit reprendre la **dernière intention** et juste changer le filtre :

```csharp
if (_isFollowUp(question, history))
{
    var lastQuery = history.LastOrDefault(m => m.Action == "query");
    if (lastQuery != null)
    {
        // Réutilise l'entité + métrique précédente, ajoute le filtre extrait
        var extractedFilter = ExtractFilter(question); // gouvernorat, date...
        return MergeQueryWithFilter(lastQuery, extractedFilter);
    }
}
```

### 5.2.6 Limite et nettoyage

- **Max 50 messages** par session, après → archivage
- **Sessions > 24h sans activité** → archivées dans `F_CHATBOT_SESSION_ARCHIVE`
- **Job Hangfire quotidien** pour le nettoyage

---

## 5.3 Amélioration 2 — Bilingue FR / AR / Tounsi

### 5.3.1 Comportement

Le chatbot détecte automatiquement la langue de la question et **répond dans la même langue** :

| Question | Réponse |
|---|---|
| « Combien de commandes aujourd'hui ? » | « Il y a 13 commandes livrées aujourd'hui. » |
| « كم عدد الطلبات اليوم؟ » | « يوجد 13 طلبية مسلمة اليوم. » |
| « 9adech 3andna mn commande lyoum ? » | « 3andek 13 commande mselma lyoum. » |

### 5.3.2 Détection de langue

Service `LanguageDetectorService` simple basé sur des regex :

```csharp
public enum ChatLanguage { French, Arabic, Tounsi }

public ChatLanguage Detect(string text)
{
    // Caractères arabes
    if (Regex.IsMatch(text, @"[\u0600-\u06FF]"))
        return ChatLanguage.Arabic;

    // Tunisien : chiffres 3, 7, 9 utilisés comme lettres + mots fréquents
    var tounsiMarkers = new[] { 
        "3andek", "3andi", "3andna", "9adech", "ch7al", "lyoum", 
        "barcha", "marra", "wache", "kifech", "fama"
    };
    var lower = text.ToLowerInvariant();
    if (tounsiMarkers.Any(m => lower.Contains(m)) ||
        Regex.IsMatch(text, @"\b[a-z]*[3679][a-z]*\b", RegexOptions.IgnoreCase))
        return ChatLanguage.Tounsi;

    return ChatLanguage.French;
}
```

### 5.3.3 Adaptation du prompt système

Le `FormatterSystemPrompt` change selon la langue détectée :

```csharp
var systemPrompt = language switch
{
    ChatLanguage.French => FormatterPromptFr,
    ChatLanguage.Arabic => FormatterPromptAr,
    ChatLanguage.Tounsi => FormatterPromptTounsi,
    _ => FormatterPromptFr
};
```

**Prompt tunisien** :

```
Tu es l'assistant métier d'une plateforme de livraison COD en Tunisie.
Tu réponds en tunisien (darija) clair et naturel, en utilisant le code ASCII
courant : 3 pour ع, 7 pour ح, 9 pour ق, 5 pour خ.
Reste professionnel, ne mets pas d'emoji, 1 à 3 phrases maximum.
N'invente jamais de chiffres absents des données fournies.
```

### 5.3.4 Stockage de la préférence

Si l'utilisateur écrit 3 questions de suite en tunisien, marquer `F_CHATBOT_SESSION.Language = 'tounsi'` pour que les réponses suivantes soient cohérentes même sur des questions ambiguës comme « ok ».

---

## 5.4 Amélioration 3 — Suggestions proactives

### 5.4.1 Le concept

Au lieu de seulement répondre aux questions, le chatbot **détecte des anomalies** et alerte l'admin proactivement :

> *« 🔔 J'ai détecté une augmentation de 35% des retours à Sousse cette semaine vs la moyenne 30j. Voulez-vous voir le détail ? »*

### 5.4.2 Job Hangfire d'analyse

Un job qui tourne toutes les **30 minutes** :

```csharp
public class ProactiveInsightsJob
{
    public async Task RunAsync()
    {
        var insights = new List<ProactiveInsight>();

        // Anomalie 1 : taux de retour > +20% vs moyenne 30j sur un gouvernorat
        var returnAnomalies = await DetectReturnRateAnomalies();
        insights.AddRange(returnAnomalies);

        // Anomalie 2 : confirmatrice avec charge > 2× la moyenne
        var confOverload = await DetectConfirmatriceOverload();
        insights.AddRange(confOverload);

        // Anomalie 3 : produit avec taux de réclamation > 30%
        var productIssues = await DetectProductIssues();
        insights.AddRange(productIssues);

        // Anomalie 4 : livreur avec taux de réussite chuté
        var driverPerf = await DetectDriverPerformanceDrop();
        insights.AddRange(driverPerf);

        // Stocker les insights non encore présentés
        foreach (var insight in insights)
            await UpsertInsight(insight);
    }
}
```

### 5.4.3 Table des insights

```sql
CREATE TABLE F_CHATBOT_INSIGHT (
    Id BIGINT IDENTITY PRIMARY KEY,
    Type NVARCHAR(50) NOT NULL,           -- 'return_anomaly', 'overload', etc.
    Severity NVARCHAR(10) NOT NULL,       -- 'info', 'warning', 'critical'
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(500) NOT NULL,
    PayloadJson NVARCHAR(MAX) NULL,       -- pour drill-down
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ShownToAdminAt DATETIME2 NULL,
    DismissedAt DATETIME2 NULL,
    AdminFeedback NVARCHAR(10) NULL       -- 'useful' / 'not-useful'
);
```

### 5.4.4 Présentation à l'admin

Quand l'admin ouvre l'écran chatbot, le frontend récupère les insights non vus :

```
GET /api/admin/chat/insights/pending
```

Affichés en **bandeau cliquable** au-dessus du chat :

```
┌──────────────────────────────────────────────────────────────┐
│ 🔔 3 alertes pour vous                                        │
│                                                                │
│ ⚠️  Retours +35% à Sousse cette semaine          [Analyser]   │
│ ℹ️   Confirmatrice Amira surchargée (24 cas)     [Voir]       │
│ 🚨  Produit BICY-RED-42 — 8 réclamations          [Détail]    │
└──────────────────────────────────────────────────────────────┘
```

Au clic « Analyser » → message auto-injecté dans le chat : *« Pourquoi tant de retours à Sousse cette semaine ? »* → le bot répond avec l'analyse complète.

### 5.4.5 Endpoint feedback

```
POST /api/admin/chat/insights/{id}/feedback
Body: { "feedback": "useful" | "not-useful", "dismiss": true }
```

Permet d'ajuster les seuils de détection plus tard (ML léger sur quels insights sont utiles).

---

## 5.5 Amélioration 4 — Actions sécurisées (write)

### 5.5.1 Le concept

Le chatbot peut désormais **exécuter des actions**, pas juste lire. Avec **double confirmation obligatoire** pour éviter les erreurs.

### 5.5.2 Actions autorisées (whitelist)

Pour le PFE, on limite à 6 actions sûres :

| Action | Exemple de question |
|---|---|
| `create_claim` | « Crée une réclamation pour BL00123 motif COLIS_ENDOMMAGE » |
| `assign_driver` | « Assigne BL00123 au livreur Ahmed » |
| `change_order_status` | « Passe BL00123 en retournée » |
| `release_case` | « Libère le cas #245 » |
| `pause_confirmer` | « Mets Amira en pause » |
| `send_sms_client` | « Envoie un SMS au client de BL00123 pour confirmer disponibilité » |

Toute autre action → refus poli + lien vers les écrans admin appropriés.

### 5.5.3 Routing — nouvelle action `action`

Le router Groq peut désormais retourner :

```json
{
  "action": "action",
  "payload": {
    "actionType": "create_claim",
    "params": {
      "doPiece": "BL00123",
      "motif": "COLIS_ENDOMMAGE",
      "description": "Demande chatbot"
    }
  }
}
```

### 5.5.4 Mécanisme de double confirmation

Quand le router détecte une action :

**Étape 1** — Le bot répond avec une **demande de confirmation** :

```
Vous voulez créer une réclamation :
- Commande : BL00123
- Motif : COLIS_ENDOMMAGE
- Description : "Demande chatbot"

Tapez "OUI" pour confirmer ou "ANNULER" pour annuler.
```

L'action est stockée dans une table `F_CHATBOT_PENDING_ACTION` avec un TTL de 2 minutes.

**Étape 2** — L'admin tape « OUI » :

```csharp
if (question.Trim().ToUpperInvariant() == "OUI")
{
    var pending = await _db.PendingActions
        .Where(a => a.UserId == userId && a.ExpiresAt > DateTime.UtcNow)
        .OrderByDescending(a => a.CreatedAt)
        .FirstOrDefaultAsync();
    
    if (pending != null)
    {
        await ExecuteAction(pending.ActionType, pending.ParamsJson);
        return "✅ Action exécutée avec succès.";
    }
}
```

### 5.5.5 Audit trail obligatoire

Chaque action exécutée est loggée :

```sql
CREATE TABLE F_CHATBOT_ACTION_LOG (
    Id BIGINT IDENTITY PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    ActionType NVARCHAR(50) NOT NULL,
    ParamsJson NVARCHAR(MAX) NOT NULL,
    Result NVARCHAR(20) NOT NULL,  -- 'success' / 'failed'
    ErrorMessage NVARCHAR(500) NULL,
    OriginalQuestion NVARCHAR(500) NOT NULL,
    ExecutedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

L'admin peut voir tout son historique d'actions dans son profil ou dans une vue admin dédiée.

### 5.5.6 Garde-fous

- **Permissions** : seul un compte avec rôle `ADMIN` peut exécuter ces actions (les confirmatrices/livreurs n'ont pas accès au chatbot d'actions)
- **Rate limit** : max 10 actions/minute par utilisateur
- **Actions destructives bloquées** : pas de DELETE, pas de UPDATE en masse, pas de modification utilisateurs
- **Sandbox dev** : en environnement non-prod, les actions sont **simulées** (log mais pas exécutées) pour permettre les tests

---

## 5.6 Amélioration 5 — Voice input / output

### 5.6.1 Voice input (parler au chatbot)

Bouton micro à côté du champ de saisie. Au tap :
1. Demande permission micro (Android/iOS)
2. Enregistre la voix
3. Transcrit en texte avec **Speech-to-Text natif** (`speech_to_text` package Flutter)
4. Pré-remplit le champ
5. L'admin valide ou modifie avant envoi

```dart
class VoiceInputService {
  final SpeechToText _speech = SpeechToText();

  Future<String?> listen({String localeId = 'fr-FR'}) async {
    final available = await _speech.initialize();
    if (!available) return null;
    
    String? result;
    await _speech.listen(
      onResult: (r) => result = r.recognizedWords,
      localeId: localeId,
      listenFor: const Duration(seconds: 30),
    );
    return result;
  }
}
```

**Multilingue** : l'utilisateur peut choisir `fr-FR` / `ar-TN` dans les paramètres.

### 5.6.2 Voice output (le chatbot parle)

Bouton 🔊 dans chaque bulle assistant. Au tap, lit la réponse à voix haute.

Utilise `flutter_tts` (gratuit, supporte FR + AR) :

```dart
class VoiceOutputService {
  final FlutterTts _tts = FlutterTts();

  Future<void> speak(String text, ChatLanguage lang) async {
    await _tts.setLanguage(lang switch {
      ChatLanguage.French => 'fr-FR',
      ChatLanguage.Arabic => 'ar',
      ChatLanguage.Tounsi => 'ar-TN',
      _ => 'fr-FR',
    });
    await _tts.setSpeechRate(0.5);
    await _tts.speak(text);
  }
}
```

### 5.6.3 Mode mains-libres

Toggle dans paramètres : *« Mode mains-libres »*. Quand activé :
- Tap sur le micro = écoute
- Réponse lue automatiquement à voix haute
- À la fin, retour automatique en mode écoute

Utile pour un admin en voiture (cas Tunisie : « va de Tunis à Sousse, je suis au volant »).

---

## 5.7 Amélioration 6 — Streaming des réponses

### 5.7.1 Le problème

Aujourd'hui : l'admin attend 3-5 secondes que le LLM finisse → bulle apparaît d'un coup.

**Avec streaming** : les premiers mots apparaissent en 500ms, le texte s'écrit progressivement. Perception de rapidité ×3.

### 5.7.2 Backend — endpoint SSE

Nouveau endpoint :
```
POST /api/admin/chat/ask-stream
```

Retourne un flux **Server-Sent Events** :

```csharp
[HttpPost("ask-stream")]
public async Task AskStream([FromBody] ChatAskRequestDto req, CancellationToken ct)
{
    Response.Headers.Add("Content-Type", "text/event-stream");
    Response.Headers.Add("Cache-Control", "no-cache");

    // 1. Routing (rapide, non-streamé)
    var routed = await _orchestrator.RouteAsync(req.Question, ct);
    await SendEvent("routing", new { action = routed.Action });

    // 2. Exécution (data brute)
    var data = await _orchestrator.ExecuteAsync(routed, ct);
    await SendEvent("data", data);

    // 3. Formatter en streaming via Groq
    await foreach (var chunk in _groq.StreamCompleteAsync(formatterPrompt, ct))
    {
        await SendEvent("chunk", new { text = chunk });
    }

    await SendEvent("done", new { });
}
```

### 5.7.3 Flutter — affichage progressif

Côté Flutter, utiliser `EventSource` ou un parser SSE manuel sur Dio :

```dart
Stream<ChatChunk> askStream(String question) async* {
  final response = await _dio.post('/api/admin/chat/ask-stream',
    data: {'question': question},
    options: Options(responseType: ResponseType.stream));
  
  await for (final raw in response.data.stream) {
    final lines = utf8.decode(raw).split('\n');
    for (final line in lines) {
      if (line.startsWith('event: chunk')) {
        // Extraire le text du JSON suivant et yield
        yield ChatChunk(text: extractedText);
      }
    }
  }
}
```

L'UI ajoute progressivement chaque chunk à la bulle :

```dart
StreamBuilder<ChatChunk>(
  stream: chatService.askStream(question),
  builder: (context, snapshot) {
    final text = accumulatedChunks.join('');
    return Text(text, ...);
  },
)
```

### 5.7.4 Indicateur visuel

Pendant le streaming, afficher un curseur clignotant à la fin du texte :
```dart
Text(text + (isStreaming ? '▋' : ''))
```

---

## 5.8 Amélioration 7 — Quick-replies contextuelles

### 5.8.1 Le concept

Après chaque réponse du bot, afficher 2-4 boutons de **suivi pertinent** :

```
🤖 Il y a 13 commandes livrées aujourd'hui.

[ Voir le détail ]  [ Comparer avec hier ]  [ Par gouvernorat ]
```

Au tap sur un quick-reply, la question correspondante est envoyée comme si l'admin l'avait tapée.

### 5.8.2 Génération des quick-replies

Le **formatter Groq** retourne aussi des suggestions, dans un champ `suggestions` du JSON :

```json
{
  "message": "Il y a 13 commandes livrées aujourd'hui.",
  "action": "query",
  "data": {...},
  "suggestions": [
    "Voir le détail",
    "Comparer avec hier",
    "Par gouvernorat",
    "Exporter Excel"
  ]
}
```

### 5.8.3 Prompt formatter enrichi

```
Après ta réponse, propose 3-4 questions de suivi pertinentes
que l'admin pourrait poser. Format JSON strict :
{
  "message": "...",
  "suggestions": ["...", "...", "..."]
}
```

### 5.8.4 Mapping action → suggestions par défaut

Si Groq ne retourne pas de suggestions, fallback hardcodé par action :

```csharp
public List<string> DefaultSuggestions(string action) => action switch
{
    "query" => new() { "Comparer avec la période précédente", "Par gouvernorat", "Exporter Excel" },
    "analyze" => new() { "Voir le détail", "Prédire la suite", "Exporter PDF" },
    "predict" => new() { "Voir les facteurs", "Comparer avec données réelles", "Réentraîner" },
    "kb" => new() { "Voir un exemple", "Cas particuliers", "Procédure complète" },
    _ => new() { "Aide", "Liste des commandes", "Statistiques du jour" }
};
```

### 5.8.5 UI Flutter

Composant `QuickRepliesRow` :

```dart
Wrap(
  spacing: 8,
  runSpacing: 8,
  children: suggestions.map((s) => 
    ActionChip(
      label: Text(s),
      avatar: const Icon(Icons.bolt, size: 16),
      onPressed: () => _sendMessage(s),
    )
  ).toList(),
)
```

---

## 5.9 Amélioration 8 — KB hybride auto-générée

### 5.9.1 Problème

Aujourd'hui le `.md` de 14 KB est **maintenu à la main**. Si tu changes un statut dans le code, tu dois penser à mettre à jour le `.md`. Source de désynchronisation.

### 5.9.2 KB hybride

Tu as choisi : **statique pour le métier + générée pour les enums/statuts**.

Architecture :

```
KB finale = KB_statique.md (rédigée à la main)
          + KB_generee.md (auto à chaque démarrage)
```

### 5.9.3 Générateur de KB

Nouveau service `KbGeneratorService` qui s'exécute au démarrage backend :

```csharp
public class KbGeneratorService : IHostedService
{
    public async Task StartAsync(CancellationToken ct)
    {
        var sb = new StringBuilder();
        sb.AppendLine("# KB Auto-générée");
        sb.AppendLine($"Générée le : {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine();

        // 1. Statuts livraison
        sb.AppendLine("## Statuts livraison (LI_Statut)");
        foreach (var s in Enum.GetValues<LiStatut>())
            sb.AppendLine($"- {(int)s} : {s} — {GetDescription(s)}");

        // 2. Motifs client
        sb.AppendLine("\n## Motifs réclamation client");
        foreach (var m in ClientMotifs.All)
            sb.AppendLine($"- {m.Code} : {m.Label}");

        // 3. Motifs livreur
        sb.AppendLine("\n## Motifs demande livreur");
        foreach (var m in LivreurMotifs.All)
            sb.AppendLine($"- {m.Code} : {m.Label} (nature : {m.Nature})");

        // 4. Statuts cas
        sb.AppendLine("\n## Statuts des cas (réclamations + demandes)");
        foreach (var s in ReclamationStatuses.All)
            sb.AppendLine($"- {s}");

        // 5. Gouvernorats actifs
        sb.AppendLine("\n## Gouvernorats");
        foreach (var g in TunisianGovernorates.All)
            sb.AppendLine($"- {g}");

        // 6. Constantes métier
        sb.AppendLine("\n## Constantes métier");
        sb.AppendLine($"- Frais livraison HOME : {BusinessConstants.FraisLivraisonHome} DT");
        sb.AppendLine($"- Timbre fiscal : {BusinessConstants.TimbreFiscal} DT");
        sb.AppendLine($"- Seuil tentatives : {BusinessConstants.SeuilTentatives}");
        sb.AppendLine($"- Verrou confirmation : {BusinessConstants.VerrouMinutes} min");

        await File.WriteAllTextAsync(
            "wwwroot/kb/kb_auto_generated.md",
            sb.ToString(), ct);
    }
}
```

### 5.9.4 Concaténation au démarrage

Au boot, le service `KbProvider` charge :

```csharp
public class KbProvider
{
    private string? _cachedKb;

    public async Task<string> GetFullKbAsync()
    {
        if (_cachedKb != null) return _cachedKb;

        var statique = await File.ReadAllTextAsync("wwwroot/kb/kb_statique.md");
        var generee = await File.ReadAllTextAsync("wwwroot/kb/kb_auto_generated.md");

        _cachedKb = $"{statique}\n\n---\n\n{generee}";
        return _cachedKb;
    }

    public void InvalidateCache() => _cachedKb = null;
}
```

### 5.9.5 Endpoint admin pour rafraîchir

```
POST /api/admin/chat/kb/refresh
```

Régénère la KB auto et invalide le cache. Utile en démo si tu modifies un enum à chaud.

---

## 5.10 Refonte UI Flutter — assemblage

### 5.10.1 Structure de l'écran chatbot

```
┌──────────────────────────────────────────────────────────────┐
│ 🤖 Assistant Admin                              [⚙️] [📊]    │
├──────────────────────────────────────────────────────────────┤
│ 🔔 3 alertes pour vous                                        │
│ ⚠️  Retours +35% à Sousse                       [Analyser]    │
│ ℹ️   Confirmatrice surchargée                   [Voir]        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Bulles de chat (streaming, charts inline, voice 🔊)          │
│                                                                │
│ [ Voir le détail ] [ Comparer hier ] [ Par gouvernorat ]     │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│ [🎤] [Tapez votre question...                  ] [Envoyer ▶] │
└──────────────────────────────────────────────────────────────┘
```

### 5.10.2 Composants à créer/modifier

| Composant | Statut | Rôle |
|---|---|---|
| `admin_chat_screen.dart` | À enrichir | Container principal |
| `proactive_insights_banner.dart` | **À créer** | Bandeau alertes |
| `chat_bubble.dart` | À enrichir | Streaming + voice + suggestions |
| `quick_replies_row.dart` | **À créer** | Boutons suggestions |
| `voice_input_button.dart` | **À créer** | Bouton micro |
| `voice_output_button.dart` | **À créer** | Bouton 🔊 |
| `pending_action_card.dart` | **À créer** | Confirmation OUI/ANNULER |
| `chat_feedback_buttons.dart` | **À créer** | 👍/👎 sous chaque réponse |

### 5.10.3 Modèle `ChatMessage` enrichi

```dart
class ChatMessage {
  // existant
  final String id;
  final ChatMessageRole role;
  final String text;
  final DateTime timestamp;
  final String? action;
  final ChatChartType chartType;
  final List<ChatChartPoint> chartPoints;
  final List<ChatRowItem> rows;
  final bool isError;

  // nouveau
  final List<String> suggestions;        // quick-replies
  final ChatLanguage language;            // pour TTS
  final bool isStreaming;                 // streaming en cours
  final PendingAction? pendingAction;    // action en attente confirmation
  final String? feedback;                 // 'up' / 'down' / null
}
```

---

## 5.11 Audit logique chatbot

### 5.11.1 Périmètre

Claude Code produit `CHATBOT_BUTTONS_AUDIT.md` couvrant :

- **Flutter UI** : tous les boutons de `flutter/lib/ui/admin/screens/admin_chat_screen.dart` + composants liés
- **Backend services** : 
  - `AdminChatOrchestratorService` — pipeline complet
  - `AdminChatQueryService` — toutes les métriques retournent des chiffres
  - `AdminChatAnalyzeService` — toutes les analyses fonctionnent
  - `PredictionService` — toutes les prédictions retournent une valeur
- **n8n workflow V2** : tous les nœuds testés avec données réalistes
- **KB markdown** : pas de doublons, pas de sections obsolètes

### 5.11.2 Tests fonctionnels obligatoires

Liste de **20 questions test** que le chatbot doit traiter correctement :

```
1.  "Combien de commandes aujourd'hui ?" → query
2.  "Top 5 produits ce mois" → query
3.  "Tendance des retours sur 3 mois" → analyze
4.  "Risque de retour de BL00123" → predict
5.  "Bonjour" → chitchat
6.  "C'est quoi une réclamation ?" → kb
7.  "Et à Sfax ?" (après q1) → query (mémoire)
8.  "كم عدد الطلبات اليوم؟" → query (arabe)
9.  "9adech 3andna mn commande lyoum" → query (tounsi)
10. "Crée une réclamation pour BL00123" → action (puis OUI)
11. "Pourquoi tant de retours à Sousse ?" → analyze
12. "Volume prévu sur 7 jours" → predict
13. "Quelle est la météo ?" → refus poli (hors périmètre)
14. "Donne-moi le mot de passe admin" → refus
15. "Compare livreurs Ahmed et Mohamed" → analyze
16. "Anomalie cette semaine ?" → analyze
17. "Liste des cas urgents" → query
18. "Quel produit le plus retourné ?" → query
19. "Distribution des montants commandes" → analyze
20. "Top gouvernorat performant" → query
```

Pour chaque, vérifier : **action correcte** + **données plausibles** + **réponse claire**.

---

## 5.12 Cohérence avec l'existant

### 5.12.1 Ne PAS toucher

- Pipeline orchestrateur Groq router → action → formatter (architecture saine)
- Endpoints `/api/admin/chat/query`, `/analyze`, `/predict`
- KB statique métier (`admin-chatbot-knowledge.md`)
- UI premium des bulles + catégories de welcome
- n8n workflow V2 (juste l'enrichir, pas le réécrire)

### 5.12.2 Migrations DB

```sql
-- Mémoire conversationnelle
CREATE TABLE F_CHATBOT_SESSION (...);
CREATE TABLE F_CHATBOT_MESSAGE (...);

-- Insights proactifs
CREATE TABLE F_CHATBOT_INSIGHT (...);

-- Actions sécurisées
CREATE TABLE F_CHATBOT_PENDING_ACTION (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    ActionType NVARCHAR(50) NOT NULL,
    ParamsJson NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpiresAt DATETIME2 NOT NULL  -- 2 minutes
);

CREATE TABLE F_CHATBOT_ACTION_LOG (...);
```

### 5.12.3 Packages Flutter à ajouter

```yaml
dependencies:
  speech_to_text: ^7.0.0
  flutter_tts: ^4.2.0
  # dio: déjà présent
  # provider: déjà présent
```

### 5.12.4 NuGet à ajouter (backend)

- Pas de nouveau package, tout est faisable avec ce qui existe déjà

---

## 5.13 Plan d'exécution recommandé

Ordre d'implémentation pour minimiser le risque :

1. **Audit chatbot** → fichier `CHATBOT_BUTTONS_AUDIT.md`
2. **Migrations DB** : 5 tables nouvelles
3. **KB hybride** :
   - Service `KbGeneratorService` (HostedService au boot)
   - `KbProvider` avec cache et invalidation
   - Endpoint `POST /api/admin/chat/kb/refresh`
4. **Mémoire conversationnelle** :
   - Stockage sessions + messages
   - Injection des 6 derniers messages dans le router
   - Détection de référents (« Et à Sfax ? »)
5. **Bilingue FR/AR/Tounsi** :
   - `LanguageDetectorService`
   - 3 prompts système (FR/AR/Tounsi)
   - Stockage langue dans la session
6. **Streaming SSE** :
   - Endpoint `/ask-stream` côté backend
   - Parser Dio côté Flutter
   - Bulle qui s'auto-remplit avec curseur
7. **Quick-replies** :
   - Champ `suggestions` dans la réponse
   - Composant `QuickRepliesRow` Flutter
   - Fallbacks par action
8. **Voice I/O** :
   - `speech_to_text` + `flutter_tts`
   - Boutons micro / haut-parleur
   - Mode mains-libres
9. **Suggestions proactives** :
   - Job Hangfire 30 min
   - Détecteurs d'anomalies
   - Bandeau alertes Flutter
10. **Actions sécurisées** :
    - Whitelist 6 actions
    - Mécanisme double confirmation
    - Audit trail
    - Garde-fous (permissions, rate limit)
11. **n8n workflow V3** : enrichir le V2 avec les nouvelles branches
12. **Tests fonctionnels** : 20 questions test
13. **Re-audit final**

---

## 5.14 Tests manuels obligatoires (5 scénarios clés)

**Scénario 1 — Mémoire conversationnelle**
1. Question : « Combien de commandes aujourd'hui ? » → 13
2. Question : « Et à Sfax ? » → bot comprend → 4
3. Question : « Et hier ? » → bot comprend → 11

**Scénario 2 — Bilingue tunisien**
1. Question : « 9adech 3andna mn commande retourné lyoum ? »
2. Bot répond en tunisien : « Lyoum 3andek 3 commande mra33da. »
3. Continuer en tunisien → conversation cohérente

**Scénario 3 — Action sécurisée avec confirmation**
1. Question : « Crée une réclamation pour BL00123 motif COLIS_ENDOMMAGE »
2. Bot demande : « Tapez OUI pour confirmer »
3. Taper « OUI »
4. Vérifier en DB que `F_RECLAMATION` contient bien l'enregistrement
5. Vérifier `F_CHATBOT_ACTION_LOG` contient l'audit

**Scénario 4 — Suggestion proactive**
1. Forcer manuellement une anomalie (insérer 10 retours à Sousse en 1h)
2. Lancer le job `ProactiveInsightsJob`
3. Recharger l'écran chatbot
4. Vérifier que le bandeau « Retours +X% à Sousse » apparaît
5. Cliquer « Analyser » → message auto envoyé → bot répond

**Scénario 5 — Voice + Streaming**
1. Tap sur micro → dire « combien de commandes livrées cette semaine »
2. Texte transcrit dans le champ
3. Envoyer
4. Vérifier que la réponse arrive en streaming (mots par mots)
5. Tap sur 🔊 → la réponse est lue à voix haute

---

## 5.15 Démo jury — script suggéré (5 minutes)

Pour ta soutenance, voici un script qui montre le maximum de valeur :

```
1. (30s) Ouverture : « Voici l'assistant intelligent de la plateforme. »
   → Montrer le bandeau d'alerte proactif (préparé en amont)

2. (1 min) Question simple en français
   → « Combien de commandes livrées cette semaine ? »
   → Montrer le streaming + le chart inline

3. (1 min) Question de suivi (mémoire)
   → « Et à Sfax ? »
   → Montrer que le bot comprend le contexte

4. (1 min) Question en tunisien (effet wow local)
   → « 9adech 3andna mn reclamation lyoum ? »
   → Réponse en tunisien

5. (1 min) Action sécurisée
   → « Crée une réclamation pour BL00123 motif COLIS_ENDOMMAGE »
   → Confirmation OUI/ANNULER
   → Taper OUI → action exécutée

6. (30s) Voice
   → Tap micro → « risque de retour de BL00045 »
   → Réponse vocale lue

7. (30s) Conclusion : montrer l'architecture (n8n + backend)
   → 2 implémentations parallèles, montrer la traçabilité et la sécurité
```

---

**Fin de la section Chatbot. C'est la dernière des 5 sections. Le brief technique global est complet.**
