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
