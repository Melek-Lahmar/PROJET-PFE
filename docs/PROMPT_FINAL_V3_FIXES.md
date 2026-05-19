# PROMPT FINAL V3 — Corrections + ajouts confirmatrice premium

> À coller dans Claude Code (même conversation que les sessions précédentes)
> Joindre ce fichier OU copier-coller le contenu entre les ``` ```

---

```
Session de corrections logiques + refontes UX premium sur l'app Flutter.

Le brief PFE est déjà à 100% (39 sous-tâches livrées). La dernière session 
a corrigé 7 bugs sur 8 mais a mal interprété certaines refontes. Cette 
session vise à FINALISER les refontes UX premium avec précision.

═══════════════════════════════════════════════════════════════════
RÈGLES STRICTES
═══════════════════════════════════════════════════════════════════

1. NE POSE AUCUNE QUESTION — décide en autonomie
2. NE TOUCHE PAS au code React (Web-Api-(Asp.net)v2-de-react reste intact)
3. Travail principal sur Flutter (flutter/lib/) + backend si nécessaire
4. COMMITS séparés par sous-tâche en français
5. Travailler en autonomie, ne pas s'arrêter avant la fin
6. À la fin : produire FINAL_FIXES_REPORT.md avec tableau récap

═══════════════════════════════════════════════════════════════════
CONTEXTE — CE QUI A DÉJÀ MARCHÉ
═══════════════════════════════════════════════════════════════════

✅ Changement de thème admin fonctionne (1.B OK)
✅ Module SMS Mock fonctionne (1.H OK)
✅ Permission GPS livreur (1.A OK)
✅ Filtre client/livreur supprimé (1.C OK)
✅ Logique onglets corrigée (1.D OK)
✅ 5 statuts confirmatrice ajoutés (1.E OK)
✅ V2 nettoyés du profil admin (1.F OK)
✅ Endpoint reset-demo (1.G OK)

═══════════════════════════════════════════════════════════════════
SECTION A — CORRECTIONS URGENTES (commencer par ici)
═══════════════════════════════════════════════════════════════════

A.1 — Bug KPI admin : afficher les VRAIES lignes, pas que des stats
─────────────────────────────────────────────────────────────────
Problème : actuellement quand on clique un KPI admin (ex: "Liste des 
commandes"), l'écran qui s'ouvre affiche UNIQUEMENT des statistiques 
agrégées par période. Il manque la liste détaillée des lignes 
individuelles.

Correction obligatoire :

L'écran KpiDetailPremiumScreen doit afficher DEUX zones :

EN HAUT (1/3 de l'écran, sticky) :
- Graphique premium (line/bar/donut selon le type de KPI, déjà 
  partiellement implémenté)
- Filtre période : Aujourd'hui / Semaine / Mois / Personnalisé
- Stats résumées (3-4 chiffres clés)

EN BAS (2/3 de l'écran, scrollable) :
- LISTE DÉTAILLÉE des entités réelles (UNE LIGNE PAR ENTITÉ)
- Pour "Commandes" : une ligne = une commande avec ref, client, total, statut, date
- Pour "Livreurs" : une ligne = un livreur avec nom, tel, gouvernorat, online/pause, livraisons jour
- Pour "Confirmatrices" : une ligne = une confirmatrice avec nom, online, charge, performance
- Pour "Réclamations" : une ligne = une réclamation avec ref, motif, statut, client, date
- Pour "Produits" : une ligne = un produit avec ref, désignation, stock, ventes
- Au clic sur une ligne → push vers le détail de cette entité

Visuellement c'est : graphique premium + liste premium au-dessous.

Endpoints backend à utiliser (déjà existants) :
- GET /api/admin/orders?period=...&status=...&page=1&limit=50
- GET /api/admin/livreurs?...
- GET /api/admin/confirmatrices?...
- GET /api/admin/reclamations?...
- GET /api/admin/products?...

Si l'endpoint retourne juste des stats agrégées, il faut le compléter pour 
retourner aussi la LISTE des entités correspondantes.

Fichier concerné : flutter/lib/ui/admin/widgets/kpi_detail_premium_screen.dart 
ou équivalent.

A.2 — Onglet Confirmatrices admin : filtre période + temps de pause
─────────────────────────────────────────────────────────────────
Quand l'admin clique sur le KPI "Confirmatrices" :

EN HAUT :
- Courbe d'activité (sessions actives par heure sur la période choisie)

FILTRE PÉRIODE PREMIUM :
- 2 date pickers (date début + date fin)
- 2 time pickers (heure début + heure fin)
- Par défaut : aujourd'hui de 00:00 à 23:59
- Bouton "Appliquer le filtre"

EN BAS, LISTE DES CONFIRMATRICES :
Chaque ligne contient :
- Nom + photo/avatar
- Statut actuel (en ligne/en pause/hors ligne)
- Charge actuelle (nombre de cas ouverts)
- Performance (cas clôturés sur la période)
- TEMPS DE PAUSE TOTAL sur la période sélectionnée (en heures:minutes)
- Au clic → détail confirmatrice complet

Calcul du temps de pause :

Backend — créer/utiliser F_CONFIRMATRICE_SESSION pour tracer les 
connexions/déconnexions :

```sql
CREATE TABLE IF NOT EXISTS F_CONFIRMATRICE_SESSION (
    Id BIGINT IDENTITY PRIMARY KEY,
    ConfirmatriceId UNIQUEIDENTIFIER NOT NULL,
    StartedAt DATETIME2 NOT NULL,    -- Connexion SignalR
    EndedAt DATETIME2 NULL,           -- Déconnexion (null si toujours connectée)
    EndReason NVARCHAR(20) NULL,     -- 'manual_pause', 'disconnected', 'logout'
    INDEX IX_ConfirmatriceSession (ConfirmatriceId, StartedAt)
);
```

Brancher l'écriture dans ReclamationHub.OnConnectedAsync (INSERT) et 
OnDisconnectedAsync (UPDATE EndedAt + EndReason).

Endpoint backend :
GET /api/admin/confirmatrices/work-stats?from=2026-05-10T08:00&to=2026-05-11T17:00

Logique :
- Pour chaque confirmatrice :
  * expectedMinutes = (to - from) en minutes (durée totale de la période)
  * workMinutes = somme des sessions actives qui chevauchent la période
  * pauseMinutes = expectedMinutes - workMinutes

Réponse JSON :
```json
{
  "period": { "from": "...", "to": "..." },
  "confirmatrices": [
    {
      "id": "...",
      "nom": "Amira",
      "isOnline": true,
      "currentLoad": 5,
      "casCloturees": 12,
      "workMinutes": 380,
      "pauseMinutes": 160,
      "pauseRatePercent": 29.6
    }
  ]
}
```

UI Flutter : afficher pour chaque confirmatrice "Pause: 2h 40min (29.6%)" 
en orange si > 30%, en vert si < 10%.

═══════════════════════════════════════════════════════════════════
SECTION B — REFONTES UX CONFIRMATRICE (Style Converty)
═══════════════════════════════════════════════════════════════════

CONTEXTE VISUEL pour TOUTE la section B :
L'utilisateur veut un style "Converty" (e-commerce tunisien premium) avec :
- Hero violet en haut (gradient)
- Cartes blanches arrondies en dessous
- Boutons d'action multicolores
- Typographie hiérarchisée

B.1 — Détail commande "à confirmer" (style Converty complet)
─────────────────────────────────────────────────────────────────
Écran : confirmatrice/order_confirmation_details_screen.dart

Structure cible (AFFICHAGE COMPLET avec photo) :

[1] HERO (gradient violet plein largeur) :
- "Order Total"
- Montant en gros (39.00 DT) avec accent jaune sur ".00"
- 4 colonnes : Reference / Date Added / Delivery (logo) / Delivery Price
- Status badge à droite
- Barcode + numéro de tracking en bas du hero

[2] CARTE CLIENT DETAILS :
- Titre "Client Details" à gauche
- À DROITE sur la même ligne, 2 icônes :
  * ☰ Icône "3 barres" (NOUVEAU — voir B.4)
  * 🚫 Icône "bloquer client" (existant)
- Nom + nom arabe : "Sofiane سفيان"
- Email · Address · City
- Bouton VERT plein largeur : "📞 52442838" (lance intent tel:)

[3] CARTE CART (panier complet) :
- Titre "Cart"
- Photo principale du/des produits (grand format, carrousel si plusieurs)
- Liste articles avec :
  * Mini-photo
  * Désignation
  * Quantité (badge "علبة" ou "x2")
  * Prix unitaire
  * Sous-total

[4] BOUTONS D'ACTION MULTICOLORES (en grille 2 colonnes) :
- ✅ Confirmer (vert)
- 🔵 En livraison (bleu)
- 🟠 Dépôt (orange)
- 🟡 Reporter (jaune) — ouvre date picker
- 🔴 Retourner (rouge)
- ✓ Livré (vert foncé)
- ❌ Refuser (gris foncé)

Devant ces boutons : compteur "Tentative N" avec :
- Badge N en gros
- Bouton "+" et bouton "-" pour incrémenter/décrémenter manuellement
- N est envoyé au backend au clic d'un bouton statut

[5] CARTE HISTORIQUE :
- Titre "Order History"
- Timeline verticale (style image fournie)
- Chaque étape : date + heure + status badge + "Updated by: nom"
- Flèches descendantes entre étapes

B.2 — Détail réclamation (SANS photo/cart, AVEC contact et changer statut)
─────────────────────────────────────────────────────────────────
Écran : confirmatrice/reclamation_details_screen.dart

Structure cible (SANS la partie cart/photo, juste les infos) :

[1] HERO (gradient orange ou rouge selon urgence) :
- "Réclamation #RXXXX"
- Type réclamation (badge)
- Statut actuel (badge couleur)
- Motif principal en gros
- Date de création

[2] CARTE CLIENT DETAILS (simple, pas de cart) :
- Nom + nom arabe
- Adresse + ville
- Bouton vert plein largeur "📞 [téléphone]"

[3] CARTE MOTIF DÉTAILLÉ :
- Motif principal
- Description courte du client
- Photos jointes par le client (galerie zoomable avec preview)
- Si correction proposée → bloc "Correction proposée par client" 
  avec bouton "Appliquer"

[4] BOUTONS D'ACTION (2 sections) :

Section "Contact" :
- [📞 Livreur] [💬 Livreur] (côte à côte)
- [📞 Client]  [💬 Client] (côte à côte)

Section "Changer statut commande" :
- Bouton principal violet "🎨 Changer statut commande"
- AU CLIC → ouvre BottomSheet avec 4 options multicolores :
  * 🔴 Retourner (rouge)
  * 🟠 Reporter (orange) → ouvre date picker pour choisir nouvelle date
  * 🔵 Mettre en livraison (bleu)
  * 🟣 Mettre en dépôt (violet)
- BottomSheet a un bouton "Annuler" et "Appliquer"
- Au clic "Appliquer" → appel API + toast confirmation

Section "Actions cas" (à garder existant) :
- Prendre en charge
- Clôturer
- Refuser
- Note interne

[5] CARTE HISTORIQUE :
- Timeline de la réclamation (création, changements de statut, actions)
- Style identique à B.1 [5]

B.3 — Détail demande (IDENTIQUE à B.2 réclamation)
─────────────────────────────────────────────────────────────────
Écran : confirmatrice/demande_details_screen.dart

Structure cible : EXACTEMENT la même que B.2 mais adaptée à une demande :

[1] HERO (gradient différent, peut-être bleu) :
- "Demande #DXXXX"
- Type demande (correction adresse / numéro / autre)
- Statut actuel
- Motif principal

[2] CLIENT DETAILS — IDENTIQUE B.2

[3] MOTIF DÉTAILLÉ — IDENTIQUE B.2

[4] BOUTONS D'ACTION — IDENTIQUE B.2 :
- Contact Livreur + Client
- "Changer statut commande" avec BottomSheet 4 options multicolores
- Actions cas (existantes)

[5] HISTORIQUE — IDENTIQUE B.2

B.4 — NOUVEAU : Historique client via icône 3 barres
─────────────────────────────────────────────────────────────────
Comportement (intégré au détail commande B.1) :

Dans la carte "Client Details" du détail commande, ajouter une icône ☰ 
(3 barres horizontales) à droite du titre "Client Details", sur la même 
ligne.

AU CLIC sur cette icône → ouvre un BOTTOMSHEET (slide depuis le bas) :

Backend — endpoint à créer :
GET /api/confirmatrice/clients/{clientId}/orders-history?limit=50

Réponse :
```json
{
  "client": { 
    "id": "...", 
    "nom": "Sofiane", 
    "tel": "52442838",
    "totalCommandes": 12 
  },
  "stats": {
    "total": 12,
    "livrees": 8,
    "retours": 2,
    "refus": 2,
    "reportees": 0,
    "enCours": 0,
    "tauxLivraison": 67,
    "montantTotalLivre": 312
  },
  "orders": [
    { 
      "piece": "BL1191", 
      "date": "2026-05-02T21:10:00Z", 
      "statut": "LIVRE", 
      "montant": 39,
      "produits": "Huile prostate"
    },
    ...
  ]
}
```

Ordre : commandes les plus récentes en premier (chronologique inverse).

UI Flutter — composant ClientHistoryBottomSheet :

```
┌────────────────────────────────────────┐
│ ─── (drag handle)                       │
│                                         │
│ Historique client : Sofiane            │
│ Total: 12 commandes                    │
├────────────────────────────────────────┤
│ 📊 Stats rapides (cartes)              │
│ [Livrées: 8] [Retours: 2] [Refus: 2]  │
│ Taux livraison: 67%                    │
│ Montant total livré: 312 DT            │
├────────────────────────────────────────┤
│ Commandes (récent → ancien)            │
│                                         │
│ #1191 · 02/05/2026 · ✅ Livrée · 39 DT│
│ #1187 · 02/05/2026 · ✅ Livrée · 39 DT│
│ #1180 · 28/04/2026 · 🔴 Retour · 78 DT│
│ ...                                     │
│                                         │
│ [Voir plus]                             │
└────────────────────────────────────────┘
```

Hauteur BottomSheet : 80% écran, draggable.
Au clic sur une commande passée → push vers le détail de cette commande.

═══════════════════════════════════════════════════════════════════
SECTION C — TEST OBLIGATOIRE
═══════════════════════════════════════════════════════════════════

C.1 — Tester le flow "Photo colis endommagé" de bout en bout
─────────────────────────────────────────────────────────────────
Tester manuellement (lancer backend + Flutter, simuler le scénario) :

Scénario 1 — Client → Réclamation avec photo :
1. Se connecter en tant que CLIENT
2. Ouvrir une commande livrée
3. Créer une réclamation avec motif "COLIS_ENDOMMAGE"
4. Joindre une photo (vraie image depuis la galerie ou caméra)
5. Soumettre
6. Vérifier que la photo est uploadée (regarder les logs backend ou DB)
7. Se déconnecter

Scénario 2 — Confirmatrice voit la photo :
1. Se connecter en tant que CONFIRMATRICE
2. Ouvrir l'onglet Réclamations
3. Trouver la réclamation créée par le client
4. Ouvrir le détail
5. VÉRIFIER : la photo s'affiche dans la galerie de la carte "Motif détaillé"
6. Cliquer sur la photo → doit zoomer/agrandir

Scénario 3 — Livreur → Demande avec photo COLIS_ENDOMMAGE_DEPOT :
1. Se connecter en tant que LIVREUR
2. Sur une commande, faire "Retourner" → motif "COLIS_ENDOMMAGE_DEPOT"
3. Photo OBLIGATOIRE → prendre une photo
4. Soumettre
5. Vérifier upload backend

Scénario 4 — Confirmatrice voit la photo livreur :
1. Se connecter en tant que CONFIRMATRICE
2. Onglet Demandes
3. Ouvrir la demande
4. VÉRIFIER : photo livreur s'affiche

Si un de ces scénarios échoue :
- Identifier la cause (upload qui plante, photo pas stockée, URL mal 
  construite, photo pas affichée côté UI)
- CORRIGER le code immédiatement
- Re-tester

Documenter les résultats dans FINAL_FIXES_REPORT.md.

═══════════════════════════════════════════════════════════════════
ORDRE D'EXÉCUTION
═══════════════════════════════════════════════════════════════════

1. Section A (corrections urgentes) :
   - A.1 : KPI = graphique + LISTE (priorité absolue)
   - A.2 : Filtre période + temps de pause confirmatrice

2. Section B (refontes UX) :
   - B.1 : Détail commande confirmation complet (style Converty)
   - B.2 : Détail réclamation (sans cart, avec contact + changer statut)
   - B.3 : Détail demande (identique réclamation)
   - B.4 : Icône 3 barres + historique client BottomSheet

3. Section C (test) :
   - C.1 : Tester flow photo colis endommagé

4. Validation :
   - dotnet build → 0 erreur
   - flutter analyze → 0 erreur fatale
   - Tous les commits poussés

═══════════════════════════════════════════════════════════════════
LIVRABLES FINAUX
═══════════════════════════════════════════════════════════════════

Produire FINAL_FIXES_REPORT.md avec :

SECTION A — Corrections urgentes :
| # | Tâche | Statut | Fichiers modifiés | Notes |
|---|-------|--------|-------------------|-------|
| A.1 | KPI graphique + liste | ✅/❌ | ... | ... |
| A.2 | Filtre période + pause | ✅/❌ | ... | ... |

SECTION B — Refontes UX :
| # | Tâche | Statut | Fichiers modifiés | Notes |
|---|-------|--------|-------------------|-------|
| B.1 | Détail commande Converty | ✅/❌ | ... | ... |
| B.2 | Détail réclamation | ✅/❌ | ... | ... |
| B.3 | Détail demande | ✅/❌ | ... | ... |
| B.4 | Historique client BottomSheet | ✅/❌ | ... | ... |

SECTION C — Tests :
| Scénario | Résultat | Notes |
|----------|----------|-------|
| 1 — Client réclamation + photo | ✅/❌ | ... |
| 2 — Confirmatrice voit photo client | ✅/❌ | ... |
| 3 — Livreur photo COLIS_ENDOMMAGE_DEPOT | ✅/❌ | ... |
| 4 — Confirmatrice voit photo livreur | ✅/❌ | ... |

Plus :
- dotnet build : statut + nombre erreurs
- flutter analyze : statut + nombre erreurs
- Commits poussés
- BLOCKERS.md si bloqueurs

INSTRUCTIONS FINALES :

- Travailler en autonomie
- Ne pas s'arrêter avant la fin
- Pour les refontes UX : prendre le temps de faire un beau design 
  (le jury PFE jugera l'UX)
- Pour A.1 (KPI) : c'est LA priorité absolue, faut absolument que la liste 
  des lignes s'affiche en bas
- B.1 : utiliser la photo du produit côté Flutter (placeholder ou image 
  basique pour l'instant — les vraies images articles viendront du merge 
  React plus tard)

Annonce finale acceptable : 
"X/2 corrections section A faites, Y/4 refontes section B faites, 
Z/4 scénarios C testés, dotnet build OK, flutter analyze OK."

COMMENCE MAINTENANT par A.1 (bug KPI).
```
