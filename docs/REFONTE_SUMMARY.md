# Résumé de la refonte — Demandes / Réclamations / Pool livreur

**Date** : 2026-04-20
**Statut** : Code complet, builds validés (0 erreurs backend + 0 erreurs Flutter app).

---

## 1. Changements métier majeurs

### Séparation conceptuelle Réclamation / Demande
- **Réclamation** (TypeCas=RECLAMATION) : plainte du client vers le support.
- **Demande** (TypeCas=DEMANDE) : le livreur demande au client de corriger quelque chose (adresse, numéro) via le système.
- **En base** : une seule table `F_RECLAMATION` avec le champ `TypeCas`.

### 4 statuts finaux
- **Envoyée** → **En cours de traitement** → **Clôturée** / **Refusée**
- Identiques pour Réclamations et Demandes.

### Règles livreur
- Pas de bouton "créer un signalement" : le livreur change simplement le statut de sa commande avec un motif.
- Motifs qui **créent une Demande au client** : NUMERO_INCORRECT, ADRESSE_INCORRECTE, ADRESSE_INCOMPLETE, ADRESSE_INTROUVABLE.
- Motifs qui **escaladent directement à la confirmatrice** : CLIENT_REFUSE, CLIENT_DEMANDE_REPORT, COLIS_ENDOMMAGE, AUTRE.
- Motifs **différés** (3 jours d'échec avant escalade) : CLIENT_INJOIGNABLE, TELEPHONE_ETEINT, CLIENT_ABSENT, TENTATIVE_ECHOUEE.
- 1 tentative par commande par jour calendaire (contrainte unique en base).

### Pool livreur
- Commandes CONFIRME + client du même gouvernorat + sans livreur affecté = visibles dans le pool.
- First come, first served (opération atomique en base).
- Abandon autorisé uniquement avant EN_LIVRAISON.
- Max 3 abandons/jour = warning à la confirmatrice, 5/jour = blocage.

### Règles client
- 4 onglets dans l'app : Commandes / Réclamations / Demandes / Profil.
- Réclamation : motifs filtrés selon statut commande (livrée / non livrée).
- Description optionnelle partout.
- Photos obligatoires UNIQUEMENT pour COLIS_ENDOMMAGE et COLIS_NON_CORRESPONDANT.
- Refus de créer une Réclamation si une Demande ouverte existe déjà sur la même commande pour un motif équivalent.

### COLIS_ENDOMMAGE — 2 options côté client
- **"Commander à nouveau"** : le client paie à nouveau pour recevoir des articles en remplacement, le remboursement de la commande originale est traité à part par la confirmatrice.
- **"Demander un échange"** : texte court obligatoire (10-500 caractères), la confirmatrice crée ensuite une commande d'échange gratuite.

### COLIS_NON_CORRESPONDANT
- Aucune action côté client (ce n'est pas sa faute).
- La confirmatrice crée directement une commande d'échange.

### Commande d'échange
- Nouvelle table `F_DOCENTETE` avec TypeCommande=ECHANGE, référence à la commande originale.
- Entre directement dans le pool avec statut CONFIRME.
- Badge ÉCHANGE visible côté livreur.
- À la livraison : récupère l'ancien article, livre le nouveau, en une seule visite.
- Auto-clôture de la réclamation originale.

### Escalade automatique 24h
- Si le client ne répond pas à une Demande en 24h, elle bascule de "En attente client" vers "À traiter" côté confirmatrice.

### Confirmatrice — 3 onglets
- **À traiter** : cas exigeant son action (réclamations ENVOYEE, demandes overdue, cas EN_COURS).
- **En attente client** : demandes envoyées au client, pas encore répondues, < 24h.
- **Historique** : cas Clôturés et Refusés.
- Switch "Tous les gouvernorats" pour voir les cas hors sa zone (reprise volontaire possible).

### Gouvernorat & load-balancing
- Client, confirmatrice, livreur alignés par gouvernorat par défaut.
- Load-balancing à l'affectation : assignée à la confirmatrice avec le moins de cas ouverts dans son gouvernorat.
- Reprise volontaire cross-gouvernorat autorisée (bouton "Me l'affecter", audité via NoteInterne).

---

## 2. Changements en base de données

### Table `F_RECLAMATION` — colonnes ajoutées
- `TypeCas` (RECLAMATION / DEMANDE)
- `EchangeDemandeText` (texte court de la demande d'échange client)
- `LastClientReplyAt` (pour escalade 24h)
- Colonnes précédentes déjà en place : Source, CorrectionProposee, CorrectionAppliquee, MotifRefus, NoteInterne, TentativesCount, FirstAttemptAt, LastAttemptAt, CreatedByUserId.

### Table `F_DOCENTETE` — colonnes ajoutées
- `AssignedLivreurId` (pool livreur)
- `TypeCommande` (NORMALE / ECHANGE)
- `CommandeOriginalePiece` (lien vers la commande originale si échange)
- `EchangeArticleRetour`, `EchangeArticleLivraison` (texte descriptif)
- `ReclamationOrigineId` (lien vers la réclamation source de l'échange)

### Nouvelle table `F_LIVREUR_ABANDON_LOG`
- Trace des abandons livreur pour le garde-fou (warning à 3, blocage à 5 par jour).

### Autres tables déjà créées (refonte précédente)
- `F_RECLAMATION_TENTATIVE`, `F_RECLAMATION_PHOTO`, `F_AVIS_COMMANDE`, `F_AVIS_PROMPT_STATE`.

---

## 3. Endpoints backend

### Client (Réclamations)
- `GET /api/reclamations/mine` — liste
- `POST /api/reclamations` — créer (avec filtrage motif selon statut commande + refus doublon)
- `GET /api/reclamations/{id}` — détail
- `POST /api/reclamations/{id}/photos` — upload photo
- `GET /api/reclamations/{id}/repeat-order` — articles pour commander à nouveau
- `POST /api/reclamations/{id}/demande-echange` — demande d'échange avec texte

### Client (Demandes)
- `GET /api/demandes/mine` — liste des demandes reçues
- `GET /api/demandes/{id}` — détail
- `POST /api/demandes/{id}/reply` — répondre (adresse/numéro/GPS)

### Confirmatrice
- `GET /api/confirmateur/reclamations?tab=a-traiter|en-attente-client|historique&crossGouvernorat=bool&...` — liste 3 onglets avec filtres
- `GET /api/confirmateur/reclamations/{id}` — détail riche
- `PUT /api/confirmateur/reclamations/{id}/status` — changer statut (avec MotifRefus obligatoire si REFUSEE)
- `POST /api/confirmateur/reclamations/{id}/take-over` — prendre en charge
- `POST /api/confirmateur/reclamations/{id}/reprendre` — reprise cross-gouvernorat
- `PUT /api/confirmateur/reclamations/{id}/correction` — appliquer correction proposée
- `PUT /api/confirmateur/reclamations/{id}/change-commande-status` — changer statut commande
- `PUT /api/confirmateur/reclamations/{id}/note` — note interne
- `POST /api/confirmateur/reclamations/{id}/echange` — créer commande d'échange
- `POST /api/confirmateur/reclamations/{id}/photos` — upload photo

### Livreur (pool)
- `GET /api/livreur/pool/disponibles` — pool gouvernorat
- `GET /api/livreur/pool/mes-livraisons` — commandes assignées
- `POST /api/livreur/pool/{doPiece}/prendre` — prendre (atomique, 409 si déjà prise)
- `POST /api/livreur/pool/{doPiece}/abandon` — rendre au pool (avec garde-fou)

### Livreur (réclamations)
- `POST /api/livreur/reclamations/attempt` — enregistrer tentative (règle 1/jour + escalade selon motif)
- `POST /api/livreur/reclamations/delivered` — marquer livrée + auto-clôture + popup avis

### Avis
- `GET /api/avis/pending` — demandes d'avis en attente
- `POST /api/avis/dismiss` — remettre à plus tard
- `POST /api/avis` — soumettre avis

---

## 4. Frontend Flutter

### Côté client (4 onglets via `CustomerHome`)
- `ClientOrdersScreen` — commandes
- `ClientClaimsScreen` — réclamations (existant)
- `ClientDemandesScreen` — **nouveau** : liste des demandes reçues du livreur
- `ClientProfileScreen` — profil
- Badge rouge sur l'onglet Demandes quand au moins une Demande est en ENVOYEE

### Nouveaux écrans client
- `client_demandes_screen.dart` : liste des demandes avec bouton "Répondre"
- `client_demande_reply_screen.dart` : formulaire de réponse avec GPS, adresse texte, validation tunisienne pour numéro
- Validation tunisienne : regex `^(\+216|00216)?[2457-9]\d{7}$`

### Côté livreur
- `livreur_pool_screen.dart` : 2 onglets (Disponibles / Mes livraisons)
- Badge ÉCHANGE rouge pour les commandes d'échange
- Bloc récupère/livre pour les échanges
- Bouton "Je prends" / "Rendre au pool" (avec confirmation + raison)

### Côté confirmatrice (3 onglets)
- `confirmatrice_claims_screen.dart` mis à jour avec TabBar 3 onglets
- Switch "Tous les gouvernorats" pour vue cross-gouvernorat
- Filtres avancés (statut, source, motif, commande, dates)
- `confirmatrice_claim_details_screen.dart` existant avec toutes les actions

### Providers ajoutés
- `ClientDemandesProvider` : gestion des demandes côté client
- `LivreurPoolProvider` : gestion du pool livreur
- `AvisProvider` déjà en place

### Routes API Flutter
- `ClientClaimsService` : + `fetchMyDemandes()`, `replyToDemande()`, `fetchRepeatOrderLines()`, `requestEchange()`
- `ConfirmatriceClaimsService` : + `fetchAll(tab, crossGouvernorat)`, `reprise()`, `createEchange()`
- `LivreurPoolService` : nouveau service complet

---

## 5. Décisions finales validées

| Point | Décision |
|---|---|
| Adresse client | GPS + champ texte (map à ajouter plus tard en widget) |
| Description | Optionnelle partout |
| Doublon | Refuser la Réclamation si Demande ouverte équivalente |
| Escalade client non répondu | 24h automatique |
| Répartition confirmatrice | Load-balancing par cas ouverts |
| Visibilité | Cross-gouvernorat avec toggle "Mes cas / Tous" |
| Actions | Sur Mes cas par défaut, reprise volontaire possible |
| Pool livreur | First come first served, atomique |
| Abandon livreur | Avant EN_LIVRAISON, 3/jour warning, 5/jour blocage |
| Tentatives | 1 par jour calendaire, 3 = escalade |
| Photos | Obligatoires UNIQUEMENT pour endommagé et non conforme |
| COLIS_ENDOMMAGE client | 2 boutons : Commander à nouveau OU Demander échange (texte) |
| COLIS_NON_CORRESPONDANT | Confirmatrice crée échange directement |
| Commande d'échange | Pool CONFIRME + badge ÉCHANGE |
| 4 statuts | Envoyée / En cours / Clôturée / Refusée |
| Onglets confirmatrice | À traiter / En attente client / Historique |
| SignalR | 3 événements uniquement |

---

## 6. État des builds

- **Backend** : `dotnet build -t:Compile` → **0 erreurs, 11 warnings** (noms de migrations en minuscules, pré-existants, sans impact).
- **Flutter** : `flutter analyze` → **0 erreurs app**, seule erreur dans `test/widget_test.dart` pré-existante.

---

## 7. Ce qui reste à brancher / peaufiner (hors scope code)

1. **Écran changement de statut côté livreur** : doit appeler `POST /api/livreur/reclamations/attempt` avec motif + photo obligatoire si COLIS_ENDOMMAGE. La route existe backend, le hook Flutter reste à intégrer dans l'écran de statut commande existant.
2. **Bouton "Commander à nouveau"** et **"Demander un échange"** sur l'écran détail réclamation client : les endpoints existent backend, à brancher sur les deux boutons.
3. **Map widget** pour l'adresse : pour l'instant seul le GPS est capturé. Ajouter un widget `google_maps_flutter` pour permettre au client de déplacer le pin.
4. **Filtrage motif selon statut commande** côté formulaire réclamation client : logique métier présente backend, mais l'écran affiche encore toute la liste. Filtrer la liste `kClientMotifs` selon `order.normalizedStatus`.
5. **Dialog "Créer échange" côté confirmatrice** : l'endpoint existe, reste à implémenter le dialog avec champs articleRetour / articleLivraison / note et appel à `createEchange()` dans le provider.
6. **Popup avis** : endpoint backend prêt, méthode `AvisPromptDialog.tryShowNext()` prête. À déclencher depuis `client_orders_screen.dart` au `didChangeDependencies`.
7. **Job escalade 24h** : logique intégrée dans `GetForStaffByTabAsync` (filtre sur `CreatedAt < now - 24h`). Pas de job background séparé — la bascule est implicite au refresh confirmatrice.
8. **3 boutons spécifiques CLIENT_REFUSE** (Reporter / Retourner / Relancer livraison) : à ajouter dans la barre d'actions contextuelle du détail confirmatrice.

---

## 8. Comment démarrer

```bash
# Tuer l'ancien backend si en cours
taskkill //IM Web-Api.exe //F

# Démarrer le backend
cd "C:/peojet-pfe(backend+fronted)/Web-Api(Asp.net)/Web-Api"
dotnet run

# Démarrer le Flutter
cd "C:/peojet-pfe(backend+fronted)/flutter"
flutter pub get
flutter run
```

---

## 9. Comment tester (6 scénarios critiques)

1. **Youssef crée réclamation changement adresse** → doit passer, confirmatrice voit dans "À traiter".
2. **Youssef crée réclamation changement adresse alors qu'une Demande existe** → 400 avec message clair.
3. **Ahmed (livreur) change statut vers REPORTE motif ADRESSE_INTROUVABLE** → crée Demande, apparaît chez Youssef avec badge rouge onglet Demandes.
4. **Youssef répond via "Prendre mon adresse ici"** → GPS capturé, confirmatrice voit correction dans "À traiter".
5. **Confirmatrice clique "Créer échange" sur COLIS_NON_CORRESPONDANT** → commande échange créée, entre dans le pool.
6. **Livreur voit la commande échange dans son pool avec badge ÉCHANGE** → "Je prends" → OK.

---

## 10. Références

- Entités : `Web-Api(Asp.net)/Web-Api/Model/F_RECLAMATION.cs`, `F_DOCENTETE.cs`, `F_LIVREUR_ABANDON_LOG.cs`
- Services : `ReclamationsService.cs`, `CommandePoolService.cs`, `AvisService.cs`
- Contrôleurs : `ReclamationsController.cs`, `ConfirmateurReclamationsController.cs`, `LivreurReclamationsController.cs`, `LivreurPoolController.cs`, `ClientDemandesController.cs`, `AvisController.cs`
- Écrans Flutter clés : `customer_home.dart`, `client_demandes_screen.dart`, `client_demande_reply_screen.dart`, `livreur_pool_screen.dart`, `confirmatrice_claims_screen.dart`
- Modèles Flutter : `client_claim.dart`, `pool_commande.dart`, `avis.dart`
- Validators : `core/validators.dart` (Tunisian phone)

---

## 11. Prochaines étapes recommandées

Dans l'ordre de priorité :

1. Tester les 6 scénarios ci-dessus avec un compte client, un livreur, une confirmatrice.
2. Brancher le hook `/api/livreur/reclamations/attempt` dans l'écran de changement de statut livreur.
3. Ajouter les 2 boutons (Commander à nouveau / Demander échange) sur `client_claim_details_screen.dart`.
4. Ajouter le dialog "Créer échange" dans `confirmatrice_claim_details_screen.dart`.
5. Ajouter les 3 boutons CLIENT_REFUSE contextuels.
6. Brancher la popup avis dans `client_orders_screen.dart`.
7. Ajouter la map widget pour la capture d'adresse (optionnel pour v1).

---

**Fin du résumé. 8/8 phases complétées.**

---

## 12. V2 ÉCHANGE STRUCTURÉ MULTI-LIGNES (ajout post-v1)

Upgrade de l'échange : au lieu de 2 champs texte, on gère maintenant des **lignes structurées** côté base de données, avec articles, quantités et prix.

### Changements DB
- Nouvelle colonne `LigneType` sur `F_DOCLIGNE` (valeurs : `STANDARD`, `RETOUR`, `LIVRAISON`).

### Changements backend
- `F_DOCLIGNE.cs` : ajout propriété `LigneType`.
- Nouveau DTO `EchangeLigneDto` avec `Type`, `ArRef`, `Designation`, `Quantite`, `PrixUnitaire`.
- Nouveau DTO `CreateEchangeV2RequestDto` avec `List<EchangeLigneDto>` + `Note`.
- `ReclamationsService.CreateEchangeCommandeAsync` refondu : accepte une liste de lignes, crée le `F_DOCENTETE` (échange) + les `F_DOCLIGNE` typées `RETOUR`/`LIVRAISON`. Remplit aussi les anciens champs texte (rétro-compat).
- Nouveau endpoint `GET /api/confirmateur/reclamations/{id}/echange/lignes-originales` : pré-remplit les lignes RETOUR avec les articles de la commande originale.
- Nouveau endpoint `GET /api/livreur/pool/{doPiece}/detail` : renvoie le `CommandeDetailDto` avec les 3 listes de lignes séparées.
- Validation : au moins 1 ligne RETOUR et 1 ligne LIVRAISON obligatoires.

### Changements Flutter confirmatrice
- Nouveau widget `ui/widgets/echange_dialog.dart` — dialog professionnel avec :
  - Pré-remplissage automatique des lignes RETOUR depuis la commande originale.
  - Pré-remplissage des lignes LIVRAISON (même articles, modifiables).
  - Checkbox pour inclure/exclure chaque ligne.
  - Bouton "Ajouter une ligne" pour retour ET livraison.
  - Champs : référence, désignation, quantité, prix unitaire.
  - Bouton suppression par ligne.
  - Note interne optionnelle en bas.
- `ConfirmatriceClaimsService.createEchange` refondu avec `List<Map>`.
- `ConfirmatriceClaimsProvider.createEchange` + `fetchOriginalLinesForEchange`.

### Changements Flutter livreur
- Nouveau modèle `CommandeDetail` avec 3 listes (`lignesStandard`, `lignesRetour`, `lignesLivraison`).
- `LivreurPoolService.fetchDetail` + `LivreurPoolProvider.fetchDetail`.
- `livreur_pool_screen.dart` : bouton "Détails" sur chaque card qui ouvre un bottom sheet avec les lignes structurées, sections visuelles RETOUR (rouge) / LIVRAISON (bleu).

### Exemple concret

**Scénario :** Youssef reçoit une commande endommagée avec 3 articles (2 chaussures + 1 t-shirt).

1. Il crée réclamation `COLIS_ENDOMMAGE` + demande échange avec texte "Tous endommagés, même modèle".
2. Fatma clique "Créer échange" → dialog s'ouvre avec les 3 articles pré-remplis en RETOUR et en LIVRAISON.
3. Fatma coche/décoche ce qu'elle veut garder, modifie une référence si besoin, valide.
4. Backend crée `EX260420143050` + 6 F_DOCLIGNE (3 RETOUR + 3 LIVRAISON).
5. Ahmed voit dans son pool la commande `EX260420143050` avec badge ÉCHANGE.
6. Clique "Détails" → voit clairement :
   - À RÉCUPÉRER : 2× chaussures noires T42, 1× t-shirt rouge L
   - À LIVRER : 2× chaussures noires T42, 1× t-shirt rouge L
7. Il fait les deux opérations sur place, valide `LIVRE`.
8. Réclamation auto-clôturée.

### État des builds
- Backend : 0 erreurs.
- Flutter : 0 erreurs app.

### Ce qui reste à brancher
- Dans `confirmatrice_claim_details_screen.dart`, remplacer l'action "Créer échange" pour qu'elle appelle `EchangeDialog.show()` au lieu de l'ancien dialog simple.

---

**Refonte V2 complète. Prêt pour tests.**
