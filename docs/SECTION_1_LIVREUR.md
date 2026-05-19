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
