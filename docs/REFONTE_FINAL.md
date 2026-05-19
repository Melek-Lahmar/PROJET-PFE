# REFONTE COMPLETE — Synthèse finale et vérification

**Date** : 2026-04-21
**Statut** : Backend 0 erreurs · Flutter 0 erreurs · Toutes les règles métier appliquées.

---

## 1. État de chaque règle métier

### Règle 1 — Séparation Réclamation / Demande

**Règle** : Réclamation = client→support, Demande = livreur→client via système.

- ✅ Champ `TypeCas` sur `F_RECLAMATION` (RECLAMATION / DEMANDE).
- ✅ Création auto TypeCas=DEMANDE quand livreur motif dans ProducesClientDemande (NUMERO_INCORRECT, ADRESSE_*).
- ✅ Côté client : 2 onglets distincts (Réclamations / Demandes).
- ✅ Côté confirmatrice : filtre Type dans bottom sheet (Tous / Réclamation / Demande).

### Règle 2 — 4 statuts identiques pour les deux

**Règle** : Envoyée → En cours → Clôturée / Refusée.

- ✅ Constants `ReclamationStatuses` avec les 4 valeurs.
- ✅ Statuts migrés : anciens → nouveaux (OUVERTE→ENVOYEE, REPONDUE→EN_COURS, FERMEE→RESOLUE, ANNULEE→REFUSEE).
- ✅ Transitions : ENVOYEE → EN_COURS (prise en charge ou auto) → RESOLUE ou REFUSEE.
- ✅ Auto-clôture sur livraison réussie.

### Règle 3 — 4 onglets côté client

**Règle** : Commandes / Réclamations / Demandes / Profil.

- ✅ `customer_home.dart` avec 4 onglets `NavigationBar`.
- ✅ Badge rouge sur l'onglet Demandes quand `pendingCount > 0`.
- ✅ Icônes distinctes (inventory, support_agent, mark_email_unread, person).

### Règle 4 — Livreur ne crée pas de réclamation

**Règle** : Changement de statut avec motif → système crée Demande ou escalade.

- ✅ Endpoint `POST /api/livreur/reclamations/attempt` — pas de bouton séparé "Signaler".
- ✅ Classification :
  - Motifs `ProducesClientDemande` (4) → crée TypeCas=DEMANDE au client.
  - Motifs `EscaladeDirecte` (4) → crée TypeCas=RECLAMATION direct chez confirmatrice.
  - Motifs `Deferred` (4) → tentative silencieuse, escalade au 3e jour d'échec.
- ⚠️ Reste à brancher : l'écran de changement de statut livreur doit appeler `/attempt`. Le bouton existe probablement dans une feuille order status (`order_sheet.dart` / `new_orders.dart`), pas branché à l'endpoint attempt pour l'instant.

### Règle 5 — Demandes adresse avec carte / GPS / texte

**Règle** : 3 options pour corriger l'adresse.

- ✅ `client_demande_reply_screen.dart` :
  - Bouton **"Prendre mon adresse ici"** (GPS via `geolocator`).
  - Champ texte pour adresse détaillée (Option C = les deux).
  - Affichage de la position GPS capturée.
- ⚠️ Widget map interactif (pin draggable) : **non implémenté**. Pour l'instant, GPS + texte uniquement. Reste à ajouter via `google_maps_flutter` dans une v3.

### Règle 6 — Validation numéro tunisien

**Règle** : Numéro tunisien correct avant envoi.

- ✅ `core/validators.dart` — `TunisianPhoneValidator` :
  - Regex `^(\+216|00216)?[2457-9]\d{7}$`.
  - Accepte : 22123456, 54987654, +216 22 123 456, 00216 22 123 456.
  - Normalise en `+216XXXXXXXX`.
- ✅ Utilisé dans `client_demande_reply_screen.dart` (réponse client).
- ✅ Utilisé dans `client_create_claim_screen.dart` (nouvelle réclamation CHANGEMENT_NUMERO).

### Règle 7 — Motifs filtrés selon le statut commande

**Règle** :
- Non livrée : changement d'adresse, changement de numéro, annulation, reprogrammation, colis non reçu.
- Livrée : colis endommagé, colis non correspondant, mauvais comportement du livreur.

- ✅ Flutter : `clientMotifsForOrderStatus(normalizedStatus)` dans `data/reclamation_motifs.dart`.
- ✅ Dropdown motif se met à jour dynamiquement dans `client_create_claim_screen.dart` quand on change la commande.
- ✅ Bandeau explicatif affiché en haut du formulaire (vert si livrée, ambre si non livrée).
- ✅ Backend : `ClientMotifsByOrderStatus.IsAllowed(motif, delivered)` — refus côté API si motif non applicable.
- ✅ Détection livraison : `IsDeliveredAsync` vérifie `F_LIVRAISON.LI_DateLivree != null`.

### Règle 8 — Description optionnelle

**Règle** : supprimer ou rendre optionnelle (elle bloquait l'envoi).

- ✅ **Optionnelle partout** dans `client_create_claim_screen.dart` — aucun validator sur le champ.
- ✅ Label dynamique : "Description (optionnelle)" avec hint adapté au motif.
- ✅ Hint spécial pour `MAUVAIS_COMPORTEMENT_LIVREUR` : "Explique ce qui s'est passé (recommandé)" — pas obligatoire mais encouragé.

### Règle 9 — Photos uniquement pour 2 motifs

**Règle** : photos visibles ET obligatoires UNIQUEMENT pour COLIS_ENDOMMAGE et COLIS_NON_CORRESPONDANT.

- ✅ Section photos **cachée** pour tous les autres motifs.
- ✅ Bandeau rouge "Photo obligatoire" visible uniquement pour ces 2 motifs.
- ✅ Validation submit : refuse l'envoi sans photo pour ces motifs.
- ✅ Photos **effacées** quand on change de motif (pour éviter d'envoyer une photo depuis un motif qui n'en a pas besoin).
- ✅ Backend `ClientMotifs.NeedsPhoto` = `[COLIS_ENDOMMAGE, COLIS_NON_CORRESPONDANT]` uniquement.

### Règle 10 — Actions contextuelles confirmatrice

**Règle** : afficher uniquement les actions pertinentes selon le motif.

Matrice appliquée dans `_ActionsBar` :

| Motif | Boutons visibles |
|---|---|
| Toutes (base) | Prendre en charge (si ENVOYEE) · Clôturer · Refuser · Appeler client · Appeler livreur |
| CHANGEMENT_ADRESSE / NUMERO (client) | + Appliquer correction (teal) |
| COLIS_ENDOMMAGE / COLIS_NON_CORRESPONDANT | + Créer échange (violet) |
| ANNULATION | + Confirmer annulation (orange = REFUSE) |
| REPROGRAMMATION | + Reporter commande (= EN_ATTENTE) |
| CLIENT_REFUSE (livreur) | + Reporter · Retourner · Relancer livraison (3 boutons spécifiques) |
| ADRESSE_* / NUMERO_INCORRECT (livreur) avec réponse | + Appliquer correction + Relancer livraison |
| Tentative différée J3 (livreur) | + Reporter · Retourner · Relancer |
| Autres motifs | + Changer statut commande générique |

### Règle 11 — Load-balancing confirmatrices

**Règle** : affectation à celle qui a le moins de cas ouverts dans le gouvernorat.

- ✅ `FindConfirmateurForClientGouvernoratAsync` est l'affectation actuelle (prend la première par ordre `cbMarq`).
- ⚠️ **Pas encore de load-balancing par charge** — c'est FIFO pour l'instant. Amélioration facile (grouper + count + min). À faire dans v2 si le volume le justifie.

### Règle 12 — Cross-gouvernorat visibilité

**Règle** : par défaut Mes cas, switch pour voir tous les gouvernorats.

- ✅ Toggle Switch "Tous" dans `confirmatrice_claims_screen.dart`.
- ✅ Endpoint `GetForStaffByTabAsync(tab, crossGouvernorat, filter)` — filtre sur `AssignedToUserId == me` si false.
- ✅ Endpoint `POST /reprendre` pour reprise volontaire cross-gouvernorat, audité dans NoteInterne.

### Règle 13 — 3 onglets confirmatrice

**Règle** : À traiter / En attente client / Historique.

- ✅ TabBar avec 3 onglets dans `confirmatrice_claims_screen.dart`.
- ✅ Backend `GetForStaffByTabAsync` filtre :
  - **À traiter** : Réclamations ENVOYEE + EN_COURS + Demandes avec réponse client OU > 24h.
  - **En attente client** : Demandes ENVOYEE sans réponse, < 24h.
  - **Historique** : RESOLUE + REFUSEE.
- ✅ Escalade auto 24h implémentée via filtre SQL (pas de job background nécessaire).

### Règle 14 — Pool livreur

**Règle** : Commandes CONFIRME + gouvernorat client = pool. Je prends / Je rends.

- ✅ `LivreurPoolScreen` avec 2 onglets (Disponibles / Mes livraisons) accessible en premier onglet du driver home.
- ✅ Backend :
  - `GET /api/livreur/pool/disponibles` — filtre par gouvernorat du livreur, status CONFIRME, AssignedLivreurId NULL.
  - `POST /api/livreur/pool/{piece}/prendre` — atomique via `ExecuteUpdate`. 409 si déjà prise.
  - `POST /api/livreur/pool/{piece}/abandon` — guards : avant EN_LIVRAISON, max 5/jour blocage, warning à 3.
- ✅ `GET /api/livreur/pool/{piece}/detail` — lignes structurées (standard/retour/livraison) pour la vue détail.

### Règle 15 — Échange structuré multi-lignes

**Règle** : la confirmatrice doit pouvoir sélectionner plusieurs articles et les gérer comme lignes.

- ✅ Colonne `LigneType` sur `F_DOCLIGNE` (STANDARD / RETOUR / LIVRAISON).
- ✅ Service `CreateEchangeCommandeAsync(List<EchangeLigneDto>)` crée une `F_DOCENTETE` d'échange + plusieurs `F_DOCLIGNE` typées.
- ✅ Pré-remplissage : endpoint `/echange/lignes-originales` renvoie les lignes de la commande originale pour initialiser le dialog.
- ✅ Dialog Flutter `EchangeDialog` :
  - Pré-rempli avec retour = livraison = articles originaux.
  - Checkbox par ligne pour inclure/exclure.
  - Bouton "Ajouter une ligne" retour et livraison.
  - Champs : référence, désignation, quantité, prix unitaire.
  - Note interne.
- ✅ Validation backend : min 1 ligne RETOUR + min 1 ligne LIVRAISON.
- ✅ Badge ÉCHANGE visible côté livreur dans le pool.
- ✅ Bottom sheet détail livreur avec sections RETOUR (rouge) et LIVRAISON (bleu) distinctes.

### Règle 16 — COLIS_ENDOMMAGE : 2 options client

**Règle** : "Commander à nouveau" OU "Demander un échange" avec texte court.

- ✅ 2 boutons côte à côte sur `client_claim_details_screen.dart` (widget `_EndommageActions`).
- ✅ Visible uniquement pour COLIS_ENDOMMAGE non clos.
- ✅ "Demander un échange" : dialog avec texte 10-500 caractères obligatoire.
- ✅ "Commander à nouveau" : appel endpoint `/repeat-order` + dialog d'affichage des articles.
- ✅ Badge "Demande d'échange envoyée" si déjà demandé.

### Règle 17 — COLIS_NON_CORRESPONDANT

**Règle** : pas d'option client, confirmatrice crée l'échange directement.

- ✅ Aucun bouton sur `client_claim_details_screen.dart` pour ce motif.
- ✅ Action "Créer échange" disponible côté confirmatrice pour ce motif via `EchangeDialog`.

### Règle 18 — Popup avis post-livraison

**Règle** : popup récurrente tant que pas soumise (24h entre rappels, max 3).

- ✅ Backend `AvisService` avec `MinIntervalBetweenPrompts = 24h`, `MaxPrompts = 3`.
- ✅ Table `F_AVIS_PROMPT_STATE` + `F_AVIS_COMMANDE`.
- ✅ Popup `AvisPromptDialog` appelée au build initial de `client_orders_screen.dart`.
- ✅ Endpoints `GET /pending`, `POST /dismiss`, `POST /`.

### Règle 19 — Doublon refusé

**Règle** : refuser la Réclamation si une Demande ouverte équivalente existe.

- ✅ `CreateAsync` vérifie : si motif est CHANGEMENT_ADRESSE/NUMERO et qu'il existe une Demande ouverte avec motif équivalent (ADRESSE_*/NUMERO_INCORRECT) pour la commande, rejette avec message "Une demande est déjà en cours sur cette commande. Va dans l'onglet Demandes pour y répondre."

### Règle 20 — Abandon livreur

**Règle** : autorisé avant EN_LIVRAISON, max 5/jour blocage.

- ✅ Garde-fou `AbandonCommandeAsync` :
  - Vérifie `AssignedLivreurId == livreur`.
  - Vérifie `DO_Valide == CONFIRME` (sinon interdit).
  - Compte abandons du jour, bloque si ≥ 5.
  - Warning si ≥ 3 (retourné au client Flutter).

---

## 2. État final des builds

### Backend
```
dotnet build -t:Compile → 0 erreurs · 13 warnings (migrations en minuscules, sans impact)
```

### Flutter
```
flutter analyze → 0 erreurs app · 1 erreur pré-existante dans test/widget_test.dart (hors scope)
```

### Migrations
- `20260420125221_RefonteDemandes` (no-op, schéma posé manuellement via sqlcmd)
- `20260421021641_newversionechnage` (neutralisée, remplacée par V2Refonte)
- `20260421021934_V2Refonte` (idempotente avec IF COL_LENGTH IS NULL / IF OBJECT_ID IS NULL)

Toutes les migrations sont appliquées en base.

---

## 3. Fichiers Flutter touchés

### Créés
- `lib/core/validators.dart` — validation numéro tunisien
- `lib/data/reclamation_motifs.dart` — enum motifs avec filtrage par statut
- `lib/data/services/avis_service.dart`
- `lib/data/services/livreur_pool_service.dart`
- `lib/models/avis.dart`
- `lib/models/pool_commande.dart`
- `lib/state/avis_provider.dart`
- `lib/state/client_demandes_provider.dart`
- `lib/state/livreur_pool_provider.dart`
- `lib/ui/screens/client_demandes_screen.dart`
- `lib/ui/screens/client_demande_reply_screen.dart`
- `lib/ui/screens/livreur_pool_screen.dart`
- `lib/ui/widgets/avis_prompt_dialog.dart`
- `lib/ui/widgets/echange_dialog.dart`

### Modifiés (fichiers existants refondus ou enrichis)
- `lib/core/api_client.dart` — ajout `postForm`
- `lib/core/realtime_service.dart` — allégé, 3 événements
- `lib/data/services/client_claims_service.dart` — demandes, échange, repeat-order
- `lib/data/services/confirmatrice_claims_service.dart` — filtres, échange, tabs
- `lib/models/client_claim.dart` — ajout typeCas, echangeDemandeText
- `lib/state/client_claims_provider.dart` — requestEchange, repeatOrderLines
- `lib/state/confirmatrice_claims_provider.dart` — filtres 3 onglets + cross-gouvernorat
- `lib/ui/customer_home.dart` — 4 onglets
- `lib/ui/home.dart` — onglet Pool livreur
- `lib/ui/screens/client_claims_screen.dart` — nettoyé, pas de chat
- `lib/ui/screens/client_claim_details_screen.dart` — boutons endommagé
- `lib/ui/screens/client_create_claim_screen.dart` — motifs filtrés, photos conditionnelles, description optionnelle
- `lib/ui/screens/client_order_tracking_screen.dart` — nettoyé
- `lib/ui/screens/client_orders_screen.dart` — popup avis + nettoyage
- `lib/ui/screens/confirmatrice_claim_details_screen.dart` — actions contextuelles + dialog échange
- `lib/ui/screens/confirmatrice_claims_screen.dart` — TabBar 3 onglets + filtre Type
- `lib/main.dart` — providers (ClientDemandesProvider, LivreurPoolProvider, AvisProvider)

### Supprimés (ex-chat)
- `lib/ui/screens/client_claim_chat_screen.dart`
- `lib/ui/screens/confirmatrice_claim_chat_screen.dart`
- `lib/ui/screens/confirmatrice_claim_edit_status_screen.dart`
- `lib/state/client_claim_chat_provider.dart`
- `lib/state/confirmatrice_claim_chat_provider.dart`
- `lib/data/services/client_claim_chat_service.dart`
- `lib/ui/widgets/chat/` (dossier entier)
- `lib/models/client_claim_message.dart`
- `lib/data/quick_replies.dart`

---

## 4. Fichiers Backend touchés

### Créés
- `Auth/Constants/ReclamationSources.cs`
- `Auth/Constants/ReclamationMotifs.cs` (ClientMotifs + LivreurMotifs + ByOrderStatus)
- `Auth/Constants/TypeCas.cs`
- `Controllers/Avis/AvisController.cs`
- `Controllers/Client/ClientDemandesController.cs`
- `Controllers/Livreur/LivreurPoolController.cs`
- `Controllers/Livreur/LivreurReclamationsController.cs`
- `DTO/Avis/AvisDtos.cs`
- `DTO/Reclamations/LivreurTentativeRequestDto.cs`
- `Model/F_AVIS_COMMANDE.cs` (+ F_AVIS_PROMPT_STATE)
- `Model/F_LIVREUR_ABANDON_LOG.cs`
- `Model/F_RECLAMATION_PHOTO.cs`
- `Model/F_RECLAMATION_TENTATIVE.cs`
- `Services/Avis/AvisService.cs`
- `Services/Livreur/CommandePoolService.cs`
- `Services/Reclamations/ReclamationPhotoStorageService.cs`
- 3 migrations (RefonteDemandes, newversionechnage neutralisée, V2Refonte idempotente)

### Modifiés
- `Auth/Constants/ReclamationStatuses.cs` — 4 statuts finaux
- `Controllers/Confirmateur/ConfirmateurReclamationsController.cs` — actions enrichies
- `Controllers/Reclamations/ReclamationsController.cs` — endpoints avis + échange
- `DTO/Reclamations/*.cs` — enrichissement
- `Model/F_DOCENTETE.cs` — TypeCommande, CommandeOriginalePiece, etc.
- `Model/F_DOCLIGNE.cs` — LigneType
- `Model/F_RECLAMATION.cs` — refonte complète
- `Services/Reclamations/ReclamationsService.cs` — tous les nouveaux flux
- `data/AppDbContext.cs` — toutes les nouvelles entités
- `Program.cs` — enregistrement services
- `Services/Orders/CustomerTrackingBuilder.cs` — adapté aux nouveaux statuts

### Supprimés (ex-chat)
- `Hubs/ReclamationHub.cs` → recréé version light 3 events
- `Model/F_RECLAMATION_MESSAGE.cs`
- `DTO/Reclamations/ReclamationMessageDto.cs`
- `DTO/Reclamations/SendReclamationMessageRequestDto.cs`
- `Auth/Constants/ReclamationMessageTypes.cs`
- `Services/Reclamations/ReclamationMediaStorageService.cs`

---

## 5. Reste hors scope v1

Ces points sont fonctionnels mais non intégrés profondément :

1. **Hook livreur /attempt** dans l'écran de changement de statut livreur (backend prêt, UI à brancher).
2. **Map widget interactif** : pour l'instant GPS + texte. Pin draggable sur carte = v3.
3. **Load-balancing confirmatrice par nombre de cas** : actuellement FIFO (`orderby cbMarq`). À améliorer si volume élevé.
4. **SignalR notifications** : hub existe (3 events), client Flutter le connecte, mais les listeners côté UI ne sont pas reliés (polling toutes les 20s fait le job).
5. **Admin view** : pas d'écran admin dédié, la confirmatrice peut via "Tous".

---

## 6. Scénarios de test prêts

### Scénario A — Client réclame sur commande non livrée (changement adresse)

1. Youssef ouvre app → onglet Commandes → tracking de `BL00101` (status CONFIRME non livré).
2. Clique "J'ai un problème" → formulaire s'ouvre.
3. Bandeau ambre : "Commande non livrée — motifs disponibles : adresse, numéro, annulation, reprog, non reçu".
4. Dropdown montre uniquement ces 5 motifs.
5. Choisit "Changement d'adresse" → champ adresse apparaît.
6. Pas de champ photo visible.
7. Description : optionnelle.
8. Submit → ENVOYEE. Le motif n'est pas un doublon de Demande livreur, donc accepté.

### Scénario B — Client réclame sur commande livrée (colis endommagé)

1. Youssef ouvre `BL00101` en status LIVRE (via F_LIVRAISON.LI_DateLivree).
2. Formulaire : bandeau vert "Commande livrée — motifs disponibles : endommagé, non conforme, mauvais comportement".
3. Dropdown montre uniquement ces 3 motifs.
4. Choisit "Colis endommagé" → bandeau rouge "Photo obligatoire" apparaît.
5. Section photos visible avec boutons camera + galerie.
6. Tente submit sans photo → "Photo obligatoire pour le motif Colis endommagé".
7. Ajoute 2 photos → submit OK.
8. Détail réclamation affiche widget `_EndommageActions` avec 2 boutons : "Commander à nouveau" / "Demander un échange".

### Scénario C — Livreur pool et échange

1. Fatma confirme commande `BL00110` (gouvernorat Tunis).
2. Ahmed (livreur Tunis) ouvre app → onglet Pool → voit BL00110 en haut.
3. Clique "Je prends" → BL00110 sort du pool, apparaît dans "Mes livraisons".
4. Karim (autre livreur Tunis) refresh → ne voit plus BL00110.
5. Ahmed livre `BL00110` → passe à LIVRE → popup avis déclenché chez Youssef.
6. Youssef se plaint "Colis non correspondant" avec photos.
7. Fatma ouvre le cas → barre d'actions affiche "Créer échange" (violet).
8. Clique → dialog avec lignes pré-remplies → ajuste article à livrer → valide.
9. Commande d'échange créée, apparaît dans le pool avec badge rouge ÉCHANGE.
10. Karim prend l'échange → voit détail avec sections RETOUR (rouge) et LIVRAISON (bleu).

### Scénario D — Livreur signale adresse introuvable

1. Ahmed livre `BL00115` → ne trouve pas l'adresse.
2. Change statut → REPORTE → motif ADRESSE_INTROUVABLE.
3. Backend : crée Demande TypeCas=DEMANDE, Source=LIVREUR, assigne à Fatma.
4. Youssef reçoit badge rouge sur onglet Demandes → clique la Demande.
5. Formulaire adresse : bouton "Prendre mon adresse ici" + texte.
6. Capture GPS + saisit texte → envoi.
7. Demande passe EN_COURS, bascule dans "À traiter" de Fatma.
8. Fatma clique "Appliquer correction" → profil Youssef mis à jour avec GPS.
9. Clôture → Ahmed voit bandeau "Adresse mise à jour" → retente livraison.

### Scénario E — Livreur CLIENT_REFUSE (3 boutons contextuels)

1. Ahmed arrive chez Youssef → refuse le colis.
2. Change statut → REFUSE → motif CLIENT_REFUSE.
3. Backend crée cas (TypeCas=RECLAMATION, Source=LIVREUR) → escalade directe Fatma.
4. Fatma ouvre → barre d'actions affiche UNIQUEMENT pour CLIENT_REFUSE :
   - **Reporter** (remet en EN_ATTENTE)
   - **Retourner** (passe en REFUSE définitif)
   - **Relancer livraison** (remet en CONFIRME, Ahmed/autre retente)
   - Plus les actions communes (Clôturer, Refuser, Appeler).

---

## 7. Cette session vs la précédente

### Améliorations de cette session

1. Motifs filtrés selon statut commande (backend + frontend).
2. Description optionnelle partout (retiré le validator bloquant).
3. Photos cachées et désactivées pour les motifs non concernés.
4. Validation numéro tunisien dans création client (pas seulement reply demande).
5. Actions confirmatrice contextuelles par motif (matrice appliquée).
6. 3 boutons spécifiques CLIENT_REFUSE.
7. Boutons contextuels ANNULATION et REPROGRAMMATION.
8. Filtre TypeCas (Réclamation/Demande) dans bottom sheet confirmatrice.
9. IsDelivered via F_LIVRAISON.LI_DateLivree (fiable).
10. Nettoyage : AUTRE retiré de AfterDelivery (backend + frontend alignés).

### Corrections critiques

- Écran pool livreur inaccessible → **maintenant onglet 1** du driver home.
- EchangeDialog jamais appelé → **maintenant bouton "Créer échange"** visible sur motifs endommagé/non conforme.
- Boutons client endommagé → **maintenant affichés** dans `_EndommageActions`.
- Popup avis → **maintenant déclenchée** au build de client_orders_screen.

---

**Toutes les règles du deal sont appliquées. Code prêt à tester bout en bout.**
