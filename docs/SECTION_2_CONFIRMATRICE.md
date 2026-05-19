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
