# PROMPT FINAL — Corrections logiques 9 points + 2 ajouts

> À coller dans Claude Code (même conversation que les sessions précédentes)
> Joindre ce fichier ou copier-coller le contenu entre les ``` ```

---

```
Session de corrections logiques sur l'app Flutter avant le merge des 2 
backends ASP.NET.

Le brief PFE est déjà à 100% (39 sous-tâches livrées, dotnet build OK, 
flutter analyze OK). Cette session vise UNIQUEMENT à corriger 9 points 
logiques + 2 ajouts que j'ai identifiés en testant l'app.

═══════════════════════════════════════════════════════════════════
RÈGLES STRICTES
═══════════════════════════════════════════════════════════════════

1. NE POSE AUCUNE QUESTION — décide en autonomie
2. NE TOUCHE PAS au code React (Web-Api-(Asp.net)v2-de-react reste intact)
3. NE TOUCHE PAS au backend Flutter (Web-Api(Asp.net)) sauf si vraiment 
   nécessaire pour les bugs
4. Travail principal sur les fichiers Flutter (flutter/lib/)
5. COMMITS séparés par sous-tâche en français
6. Travailler en autonomie, ne pas s'arrêter avant la fin

ORDRE D'EXÉCUTION : SECTION 1 d'abord (bugs rapides), puis SECTION 2 
(refontes UX). Si quelque chose plante en SECTION 2, la SECTION 1 reste 
acquise.

═══════════════════════════════════════════════════════════════════
SECTION 1 — BUGS ET NETTOYAGES (rapides, sans risque)
═══════════════════════════════════════════════════════════════════

1.A — Permission GPS au démarrage (livreur)
───────────────────────────────────────────
Problème : la carte ne demande pas la permission de localisation au 
démarrage. Le livreur clique sur l'onglet Map et rien ne se passe.

Correction :
- À l'ouverture de l'onglet Map (livreur) OU au démarrage de 
  LivreurLocationService, demander explicitement la permission GPS via 
  geolocator (Permission.location.request() ou Geolocator.requestPermission())
- Si refusé une fois → afficher un dialog avec bouton "Ouvrir les 
  paramètres" pour réessayer manuellement
- Si refusé définitivement → afficher message clair "Activez la 
  localisation pour utiliser le tracking en direct"
- Le service GPS ne doit jamais crasher si permission refusée

Fichiers concernés (chercher dans flutter/lib/) :
- LivreurLocationService.dart (ou équivalent)
- L'écran Map livreur (livreur/map_screen.dart)
- Demande permission AVANT tout appel Geolocator.getCurrentPosition

1.B — Bug erreur 4xx changement de thème admin
─────────────────────────────────────────────
Problème : quand l'admin change la couleur du thème, l'app affiche une 
erreur 4xx (probablement 401, 403 ou 404).

Diagnostic obligatoire :
1. Identifier l'endpoint appelé : probablement PUT /api/admin/config/theme
2. Lancer le backend, ouvrir l'admin Flutter, changer la couleur
3. Regarder dans le terminal backend l'erreur exacte
4. Causes probables à vérifier :
   - L'endpoint exige [Authorize(Roles="ADMIN")] mais le token envoyé 
     n'a pas ce rôle
   - Le header Authorization n'est pas envoyé depuis Flutter
   - L'endpoint n'existe pas dans le bon contrôleur
   - Le body envoyé n'a pas le bon format
5. Corriger côté backend ET/OU Flutter selon la cause réelle
6. Tester à nouveau : changer la couleur doit retourner 200 OK et 
   appliquer la couleur

1.C — Supprimer le filtre "par client / par livreur" dans Réclamations 
(confirmatrice)
─────────────────────────────────────────────
Problème : dans l'onglet Réclamations confirmatrice, il y a un filtre 
"sortir par client ou livreur". Inutile car par défaut une RÉCLAMATION 
vient toujours du CLIENT (les livreurs créent des DEMANDES, pas des 
réclamations).

Correction :
- Supprimer ce filtre dans l'UI Flutter confirmatrice
- Garder uniquement les filtres pertinents (statut, motif, date, gouvernorat)
- Vérifier que le backend filtre déjà par TypeCas="RECLAMATION" pour 
  l'onglet Réclamations

Fichier concerné : confirmatrice/reclamations_screen.dart ou équivalent

1.D — Corriger les onglets "À traiter / En attente / Historique" 
(confirmatrice)
─────────────────────────────────────────────
Problème actuel : la logique de filtrage par onglet ne correspond pas à 
ce qui devrait s'afficher.

Logique correcte à appliquer :
- Onglet "À traiter" : cas avec statut ENVOYEE (nouveaux, à prendre en 
  charge)
- Onglet "En attente" : cas avec statut EN_COURS_DE_TRAITEMENT 
  OU CLOTUREE (en cours de traitement ou clôturés récents)
- Onglet "Historique" : cas avec statut CLOTUREE ou REFUSEE (anciens)

À appliquer pour :
- L'onglet Réclamations
- L'onglet Demandes

Vérifier la méthode GetForStaffByTabAsync côté backend si nécessaire et 
adapter le mapping côté Flutter.

1.E — Ajouter les statuts manquants au changement de statut commande 
(confirmatrice)
─────────────────────────────────────────────
Problème : actuellement la confirmatrice ne peut changer que entre 
"En attente / Confirmé / Tentative".

Ajouter les statuts manquants accessibles depuis la barre d'actions 
confirmatrice :
- EN_ATTENTE (existant)
- CONFIRME (existant) 
- TENTATIVE (existant)
- EN_LIVRAISON (à ajouter)
- DEPOT (à ajouter)
- REPORTE (à ajouter)
- RETOUR (à ajouter)
- LIVRE (à ajouter)

Vérifier que le backend accepte toutes ces transitions sans bug, et que 
le mapping LI_Statut/DO_Valide est cohérent côté Flutter.

1.F — Nettoyer les sections "V2" du profil admin
─────────────────────────────────────────────
Problème : dans le profil admin, il y a des cartes "Bientôt disponible" 
qui font penser à des features V2 non implémentées.

Action :
- Identifier ces cartes "V2" dans admin/profile_screen.dart (ou équivalent)
- Pour chaque carte :
  * Si la feature peut être implémentée rapidement (< 30 min), l'implémenter
  * Sinon, la SUPPRIMER complètement de l'UI (pas juste cacher)
- Le profil admin doit avoir uniquement des fonctionnalités réelles 
  et fonctionnelles

1.G — Endpoint admin "Reset DB démo" (pour tester proprement)
─────────────────────────────────────────────
Problème : je veux pouvoir vider la DB pour faire des tests propres.

Création d'un endpoint admin sécurisé (uniquement en environnement 
development) :

Backend :
- Créer POST /api/admin/dev/reset-demo-data
- Vérifications obligatoires :
  * [Authorize(Roles="ADMIN")]
  * IsDevEnvironment check (sinon retourne 403)
- Logique : 
  * DELETE FROM F_DOCENTETE (commandes)
  * DELETE FROM F_RECLAMATION
  * DELETE FROM F_DEMANDE (ou table équivalente)
  * DELETE FROM F_LIVRAISON_HISTORIQUE
  * DELETE FROM F_TENTATIVE_LIVRAISON
  * DELETE FROM F_SMS_LOG
  * DELETE FROM F_LIVREUR_POSITION_HISTORY
  * DELETE FROM F_CHATBOT_MESSAGE
  * NE PAS toucher aux utilisateurs (F_UTILISATEUR / F_CLIENT / F_LIVREUR / 
    F_CONFIRMATEUR)
  * NE PAS toucher aux produits (F_ARTICLE)
- Retourner JSON { deleted: { commandes: X, reclamations: Y, ... } }

UI admin Flutter :
- Dans Paramètres admin, ajouter une carte "🧹 Réinitialiser les données 
  de démo"
- Bouton rouge avec dialog de confirmation : 
  "Cela va supprimer TOUTES les commandes, réclamations et historiques. 
  Tapez RESET pour confirmer."
- Champ texte obligatoire avec validation du mot "RESET"
- Au clic confirmé → appel API + toast de confirmation

1.H — Vérifier l'état du module SMS (NOUVEAU)
─────────────────────────────────────────────
Problème : je veux savoir si le module SMS marche pour la démo ou si je 
dois ajouter une clé API.

Action :
1. Vérifier dans appsettings.json que le Provider est bien "Mock" 
   (par défaut)
2. Tester l'envoi d'un SMS Mock :
   - Créer une commande qui passe par CONFIRME → DEPOT
   - Vérifier que SmsNotificationService est bien déclenché
   - Vérifier qu'une ligne est créée dans F_SMS_LOG avec Provider="Mock" 
     et Success=true
3. Si le Mock fonctionne → ÉCRIRE dans le rapport :
   "✅ SMS Mock fonctionne, pas besoin de clé API pour la démo. 
    Les SMS sont loggés dans F_SMS_LOG pour traçabilité jury."
4. Si le Mock ne fonctionne pas → diagnostiquer et corriger
5. Ne PAS configurer de vraie clé Tunisie Telecom (pas nécessaire 
   pour la démo PFE)

═══════════════════════════════════════════════════════════════════
SECTION 2 — REFONTES UX (plus complexes, plus de temps)
═══════════════════════════════════════════════════════════════════

2.A — Détail commande livreur complet
─────────────────────────────────────────────
Problème : le détail commande livreur n'affiche PAS toutes les infos 
nécessaires. Le livreur a besoin de voir la commande complète comme la 
voit le client.

Refonte du détail commande livreur :

Structure cible (inspirée de l'écran client) :

BLOC HERO (gradient violet en haut) :
- Référence commande #XXXX
- Statut (badge couleur)
- Total à encaisser en gros : "39.00 DT"
- Date de création
- Société de livraison (badge logo si applicable)
- Code-barre + numéro de tracking

BLOC CLIENT DETAILS (carte blanche) :
- Nom + nom arabe si présent (ex: "Sofiane سفيان")
- Adresse complète + ville + gouvernorat
- Téléphone (bouton VERT cliquable plein largeur : "📞 52442838")
- Bouton SMS pré-rempli (cohérent avec ce qui existe)

BLOC CART (panier) :
- Image principale du/des produits (carrousel si plusieurs)
- Liste des articles avec :
  * Photo
  * Désignation
  * Quantité (badge "علبة" ou "x2")
  * Prix unitaire
  * Sous-total
- Total final en grand
- Frais de livraison (badge)
- Note client si présente

BLOC HISTORIQUE (timeline verticale) :
- Date + heure
- Statut (badge couleur)
- Updated by (qui a changé le statut)
- Flèche descendante entre chaque étape

BLOC BOUTONS D'ACTION (sticky bottom) :
- Démarrer livraison (si DEPOT) / Arrêter livraison (si IsActiveDelivery)
- Marquer Livré
- Reporter
- Retourner

Le livreur DOIT voir au minimum ce que voit le client + des actions livreur.

Fichier concerné : livreur/order_details_screen.dart ou équivalent

2.B — Détail commande confirmatrice "style Converty"
─────────────────────────────────────────────
Problème : le détail commande dans l'onglet "Confirmation de commande" 
confirmatrice est peu professionnel.

Référence visuelle : style Converty (e-commerce tunisien premium).
Modèle : reprendre EXACTEMENT le layout style hero violet + carte client + 
barre verte tel + cart photo, adapté pour la confirmatrice avec ses 
actions spécifiques.

Structure cible :

BLOC HERO (gradient violet identique à l'écran client) :
- "Order Total"
- 39.00 DT en gros, accent jaune sur "00"
- Reference #1191
- Date Added
- Delivery company (logo)
- Delivery Price
- Status badge
- Code-barre

BLOC CLIENT DETAILS :
- Nom + nom arabe
- Address + City
- Bouton vert plein largeur "📞 52442838"
- En haut à droite : 2 icônes (liste + bloquer)

BLOC CART :
- Photo du/des produits
- Liste articles complète

BLOC STATUTS BOUTONS MULTICOLORES (NOUVEAU) :
Grille de boutons colorés par statut (un par statut accessible) :
- ✅ Confirmer (vert)
- 🚚 En livraison (bleu)
- 📦 Dépôt (orange)
- ⏰ Reporter (jaune)
- ↩️ Retourner (rouge)
- ✓ Livré (vert foncé)
- ❌ Refuser (gris foncé)

Devant chaque bouton de statut "tentative" : 
- Un badge **"Tentative N"** où N est incrémentable manuellement
- Boutons + / - pour incrémenter/décrémenter le compteur
- N s'affiche en gros
- Au clic sur le bouton statut, N est envoyé au backend

BLOC HISTORIQUE :
- Timeline avec couleurs par statut

Fichier concerné : confirmatrice/order_confirmation_details_screen.dart

2.C — Refonte détail réclamation confirmatrice
─────────────────────────────────────────────
Problème : le détail réclamation actuel est compliqué. À refaire 
premium / pro / simple.

Structure cible (style Converty) :

BLOC HERO (gradient orange ou rouge selon urgence) :
- Référence réclamation #RXXXX
- Type : RÉCLAMATION CLIENT
- Statut (badge couleur)
- Motif principal en gros
- Date de création

BLOC CLIENT (concis) :
- Nom + photo si dispo
- Téléphone (bouton vert)
- Commande liée (lien cliquable vers détail commande)

BLOC MOTIF DÉTAILLÉ :
- Motif principal
- Description courte du client
- Photos jointes (galerie zoomable)
- Si correction proposée → bloc spécial "Correction proposée par client" 
  avec bouton "Appliquer"

BLOC TENTATIVES (si applicable, depuis F_RECLAMATION_TENTATIVE) :
- Liste antéchronologique
- Tentative N · date · motif · livreur

BLOC ACTIONS (sticky bottom, 2 sections) :

Section 1 — Actions sur le CAS :
- Prendre en charge (si non assigné)
- Clôturer
- Refuser
- Note interne

Section 2 — Actions sur la COMMANDE :
- Reporter
- Retourner
- Remettre en livraison

Pas de motif obligatoire confirmatrice — elle décide.

Fichier concerné : confirmatrice/reclamation_details_screen.dart

2.D — KPI cliquables avec graphique premium + liste (NOUVEAU)
─────────────────────────────────────────────
Problème : actuellement quand on clique un KPI admin, on a juste une 
liste. Je veux une expérience premium avec graphique en haut + liste 
en bas.

Comportement cible (pour TOUS les KPI cliquables admin) :

Quand on clique un KPI (ex: "Commandes livrées", "Top livreurs", 
"Réclamations envoyées") :

1. Push navigation vers un écran plein-écran "KPI Detail Premium"
2. Structure de l'écran :

EN HAUT — GRAPHIQUE PREMIUM (sticky) :
- Header avec titre du KPI + filtre période (Aujourd'hui / Semaine / Mois)
- Graphique premium choisi automatiquement selon le type de KPI :
  * KPI temporel (commandes par jour, livraisons par jour, revenus 30j) 
    → Line chart avec gradient sous la courbe (fl_chart ou recharts-like)
  * KPI comparatif (top livreurs, top produits, top gouvernorats) 
    → Bar chart horizontal avec valeurs visibles
  * KPI répartition (statuts commande, types réclamation) 
    → Donut chart avec légende
  * KPI cumulatif (total cash COD, total ventes) 
    → Area chart avec gradient

EN BAS — LISTE DÉTAILLÉE :
- Cartes blanches modernes (pas un tableau austère)
- Chaque ligne avec : photo/avatar + titre + sous-titre + valeur + chevron
- Pull-to-refresh
- Recherche en haut de la liste
- Filtres rapides en chips (Statut, Date, etc.)
- Au clic sur une ligne → push vers le détail spécifique 
  (commande, livreur, réclamation, produit)

DESIGN PREMIUM :
- Animations fluides (slide + fade)
- Couleurs cohérentes avec le thème global de l'app
- Header avec gradient subtil
- Cartes avec ombres légères
- Typographie hiérarchisée (titre gros, valeurs en accent)
- Loading state élégant (shimmer/skeleton)
- Empty state avec illustration si liste vide

À APPLIQUER POUR :
- KPI Commandes (Total, Livrées, Reportées, Retournées, En livraison, etc.)
- KPI Livreurs (Total, En ligne, En pause, Top performer, etc.)
- KPI Confirmatrices (Total, En ligne, Charge moyenne, etc.)
- KPI Réclamations (Total, Par statut, Top motif, etc.)
- KPI Produits (Total, Top vendu, Top retourné, Stock critique, etc.)

Composant unique à créer : KpiDetailPremiumScreen<T>
- Props : title, kpiType (timeline/comparison/distribution/cumulative), 
  loadData, buildRow, exports

Réutilisation : si SparklinePainter existe déjà dans le projet, 
le réutiliser et l'enrichir pour ce nouveau composant.

Fichier concerné : flutter/lib/ui/admin/widgets/kpi_detail_premium_screen.dart 
(nouveau)

═══════════════════════════════════════════════════════════════════
LIVRABLES FINAUX
═══════════════════════════════════════════════════════════════════

À la fin de la session, produire un fichier CORRECTIONS_REPORT.md avec :

SECTION 1 (bugs) :
| # | Problème | Statut | Fichier modifié | Notes |
|---|----------|--------|-----------------|-------|
| 1.A | Permission GPS | ✅/❌ | ... | ... |
| 1.B | Bug 4xx thème | ✅/❌ | ... | Cause : ... |
| 1.C | Filtre client/livreur supprimé | ✅/❌ | ... | ... |
| 1.D | Logique onglets corrigée | ✅/❌ | ... | ... |
| 1.E | 5 statuts ajoutés confirmatrice | ✅/❌ | ... | ... |
| 1.F | Sections V2 nettoyées | ✅/❌ | ... | ... |
| 1.G | Endpoint reset-demo créé | ✅/❌ | ... | ... |
| 1.H | Module SMS vérifié | ✅/❌ | ... | État Mock + reco |

SECTION 2 (refontes) :
| # | Refonte | Statut | Fichier modifié | Notes |
|---|---------|--------|-----------------|-------|
| 2.A | Détail commande livreur | ✅/❌ | ... | ... |
| 2.B | Détail commande confirmatrice style Converty | ✅/❌ | ... | ... |
| 2.C | Détail réclamation refondu | ✅/❌ | ... | ... |
| 2.D | KPI graphique premium + liste | ✅/❌ | ... | ... |

Plus :
- dotnet build : statut + nombre d'erreurs
- flutter analyze : statut + nombre d'erreurs
- Tous les commits poussés
- Si bloqueurs → BLOCKERS.md mis à jour

INSTRUCTIONS FINALES :

- Commencer par SECTION 1 (bugs rapides)
- Tester chaque correction avant de passer à la suivante
- Pour SECTION 2 : prendre le temps de faire un beau design 
  (le jury PFE jugera l'UX)
- Pour 2.D : c'est la feature visuelle la plus importante de la session, 
  soigner les animations et la cohérence visuelle
- Ne pas casser ce qui marche déjà
- Annoncer à la fin : "X/8 bugs corrigés, Y/4 refontes terminées, Z bloqueurs"

COMMENCE MAINTENANT par 1.A (permission GPS).
```
