# PROMPT FINAL DÉFINITIF — Terminer 100% du brief PFE

> À coller dans Claude Code après avoir joint le fichier BRIEF_GLOBAL_PFE.md

---

```
Tu reprends le projet PFE livraison COD Tunisie. Une passe précédente a livré 
~30% du brief (audits, migrations DB, endpoints critiques, SignalR 
OnDisconnected, primitives Flutter SMS+ConnectionBanner).

LIRE D'ABORD :
- BRIEF_GLOBAL_PFE.md (spécifications complètes)
- BLOCKERS.md (bloqueurs précédents)
- TESTS_RESULTS.md (état actuel)
- 5 fichiers *_BUTTONS_AUDIT.md (audits boutons)

OBJECTIF : terminer le brief à 100% en autonomie, sans questions, sans 
laisser aucune sous-tâche en suspens. Tu vas travailler plusieurs heures, 
c'est NORMAL. NE T'ARRÊTE PAS tant que tout n'est pas implémenté et testé.

═════════════════════════════════════════════════════════════════════
RÈGLES STRICTES (à respecter du début à la fin)
═════════════════════════════════════════════════════════════════════

1. NE POSE AUCUNE QUESTION. Décide en autonomie selon le brief et le code 
   existant.

2. COMPLÈTE 100% DU BRIEF. C'est l'instruction la plus importante. 
   Toutes les sous-tâches DOIVENT être implémentées, pas juste documentées 
   dans BLOCKERS.md. Si tu rencontres une difficulté, tu CHERCHES une 
   solution, tu NE T'ARRÊTES PAS. Tu utilises tous tes outils (recherche 
   dans le code, lecture de fichiers similaires, recherche web si besoin) 
   pour résoudre le problème et avancer. BLOCKERS.md est uniquement pour 
   les cas où c'est ABSOLUMENT impossible (ex: API externe payante non 
   disponible). Pas pour les difficultés normales de développement.

3. NE LIVRE PAS UN TRAVAIL PARTIEL. Si tu ne sais pas comment faire quelque 
   chose, prends le temps d'analyser le code existant, de chercher des 
   patterns similaires dans le projet, et IMPLÉMENTE la solution. Tu es 
   un développeur senior qui doit livrer du code de production.

4. COMMITS PROPRES par sous-tâche en français : "feat(scope): description".

5. NE CASSE PAS l'existant. Si un fichier a été nettoyé par les passes 
   précédentes, ne le touche pas sans raison forte.

6. À LA FIN : mets à jour TESTS_RESULTS.md avec ✅ pour TOUS les scénarios. 
   Aucun ❌ ne devrait subsister. Si un test échoue, CORRIGE le code 
   jusqu'à ce qu'il passe.

7. NE TOUCHE PAS au code React (React-Ecommerce/) — l'admin React sera 
   modifié plus tard manuellement. Toute la partie admin est à faire 
   UNIQUEMENT dans Flutter (flutter/lib/ui/admin/).

8. DURÉE ET PERSÉVÉRANCE : ce travail prend plusieurs heures. NE TE 
   PRESSE PAS. NE RÉDUIS PAS LE SCOPE. Si tu vois que tu as déjà fait 
   beaucoup, NE T'ARRÊTES PAS prématurément en disant "voici un 
   récapitulatif de ce que j'ai fait". Tu CONTINUES jusqu'à ce que les 
   3 phases soient complètes.

9. AUTO-VÉRIFICATION FINALE OBLIGATOIRE : à la fin, exécute :
   - `dotnet build` → DOIT compiler sans erreur
   - `flutter analyze` → DOIT passer sans erreur fatale
   - Vérifier que tous les endpoints listés sont implémentés
   - Vérifier que toutes les UIs Flutter listées existent
   - Si quelque chose échoue, CORRIGE avant de t'arrêter.

10. INTERDICTION DE RETOURNER UN RÉSUMÉ DU TYPE "30% LIVRÉ, 70% RESTANT". 
    Si tu vois que tu n'arrives pas à finir tout, tu CONTINUES en utilisant 
    le temps nécessaire. Le seul résumé acceptable à la fin est : 
    "100% du brief est implémenté, tous les tests passent."

═════════════════════════════════════════════════════════════════════
RÈGLE GÉNÉRALE DU MODE DÉGRADÉ (à appliquer partout)
═════════════════════════════════════════════════════════════════════

TOUTE action utilisateur qui modifie le serveur doit :
1. Utiliser X-Client-Action-Id pour idempotence (UUID généré côté Flutter)
2. Si réseau OK → envoi direct
3. Si réseau KO → mettre en queue locale (Hive), UI optimiste 
   (confirme immédiatement)
4. Au retour réseau → flush automatique en série
5. Indicateur visuel "Synchronisation en attente" si applicable

EXCEPTIONS (actions qui nécessitent absolument le réseau) :
- Téléchargement de données fraîches (statistiques, etc.)
- Recherche dans la liste → faire côté Flutter avec données cachées
- Optimisation tournée → faire côté Flutter (Nearest Neighbor en Dart)

PHOTOS / FICHIERS BINAIRES :
- Sauver en local (Hive ou file system)
- Mettre l'upload en queue
- L'action métier (REPORTE, RETOUR, réclamation) est marquée locale 
  immédiatement
- Quand l'upload réussit → mise à jour de la référence dans le payload
- Tant que la photo n'est pas uploadée, badge orange "Photo en attente"

═════════════════════════════════════════════════════════════════════
LOGIQUE ACTIVE DELIVERY (tracking client)
═════════════════════════════════════════════════════════════════════

Le tracking live n'est PAS toujours actif quand la commande est EN_LIVRAISON.
Logique correcte :
- DEPOT (0/1/2/3...) → client voit message "Au dépôt", PAS de carte
- EN_LIVRAISON + IsActiveDelivery=false → client voit "En cours de livraison",
  PAS de carte, PAS d'ETA précis (le livreur livre d'autres clients d'abord)
- EN_LIVRAISON + IsActiveDelivery=true → client voit la carte + position 
  livreur + ETA (le livreur se dirige spécifiquement vers ce client)
- LIVRE/RETOUR/REFUSE → historique, PAS de carte

Une seule commande par livreur peut avoir IsActiveDelivery=true à la fois.

═════════════════════════════════════════════════════════════════════
ORDRE D'EXÉCUTION OBLIGATOIRE — 3 PHASES
═════════════════════════════════════════════════════════════════════

PHASE 1 — Fondations backend manquantes
PHASE 2 — UI Flutter complètes (livreur, client, confirmatrice, admin)
PHASE 3 — Chatbot intelligent + Push notifications

═════════════════════════════════════════════════════════════════════
PHASE 1 — FONDATIONS BACKEND MANQUANTES
═════════════════════════════════════════════════════════════════════

1.1 — DepotPassageNumber et job Hangfire :
- Migration EF : F_LIVRAISON.DepotPassageNumber INT NOT NULL DEFAULT 0
- Index IX_F_LIVRAISON_DepotPassage sur (LI_Statut, DepotPassageNumber) 
  INCLUDE (DO_Piece, AssignedLivreurId)
- Backfill SQL : pour les commandes en LI_Statut=DEPOT, calculer le numéro 
  depuis COUNT DISTINCT des dates de tentatives
- DepotIncrementJob (Hangfire) : tous les jours 00:00 Africa/Tunis, 
  incrémente DepotPassageNumber des REPORTE de la veille → DEPOT
- Garde-fou DepotPassageNumber < 10
- Log F_LIVRAISON_HISTORIQUE (créer table si manque)
- SignalR DepotIncremented à l'utilisateur livreur
- Mettre à jour entité Livraison + DTOs + projections endpoints livreur
- Endpoint POST /api/livreur/pool/{piece}/prendre : à la prise en charge → 
  LI_Statut=DEPOT, DepotPassageNumber=0

1.2 — IdempotencyMiddleware :
- Active sur POST /api/livreur/* et POST /api/client/*
- Lit X-Client-Action-Id (UUID)
- Si présent dans F_LIVREUR_ACTION_LOG → replay safe (retourne la même 
  réponse HTTP qu'avant)
- Sinon : exécute + log avec PayloadHash SHA256
- Sans header → mode legacy

1.3 — SMS Gateway (Tunisie Telecom) :

Interface ISmsGateway + 2 implémentations :

a) MockSmsGateway (par défaut, pour démo PFE) :
   - Log dans F_SMS_LOG avec Provider="Mock", Success=true
   - Pas d'appel HTTP réel
   - Permet de montrer au jury la traçabilité sans crédits SMS

b) TunisieTelecomSmsGateway (stub prêt à brancher) :
   - Lit ApiKey + Sender + BaseUrl depuis appsettings.json
   - Endpoint stub : POST {BaseUrl}/sms/send
   - Format payload : { "to": phone, "from": sender, "text": message }
   - Authentification : header "Authorization: Bearer {ApiKey}"
   - Pour l'instant retourne succès sans vraiment appeler (à activer en prod 
     une fois le contrat TT signé)
   - Log F_SMS_LOG avec Provider="TunisieTelecom"

Configuration appsettings.json :
"Sms": {
  "Provider": "Mock",
  "TunisieTelecom": {
    "ApiKey": "",
    "Sender": "DELIVERY",
    "BaseUrl": "https://api.tunisietelecom.tn/sms/v1"
  }
}

DI dans Program.cs : selon Provider config, register MockSmsGateway ou 
TunisieTelecomSmsGateway en singleton (architecture extensible).

SmsNotificationService :
- S'abonne aux changements de statut commande (hook dans ChangeStatusService)
- Logique selon transitions :
  * CONFIRME → DEPOT : "Votre commande {piece} sera livrée demain entre 
    9h et 18h. Soyez disponible."
  * DEPOT → EN_LIVRAISON (avec IsActiveDelivery=true) : "Votre livreur 
    {nomLivreur} est en route. Tel : {telLivreur}."
  * EN_LIVRAISON → LIVRE : "Votre commande {piece} a été livrée. Merci !"
- Respecter ContactPreference (AppelOnly → ne pas envoyer)
- Logger F_SMS_LOG

1.4 — Active Delivery + Ping position livreur + GPS hors ligne :

Migration DB :
- ALTER TABLE F_DOCENTETE ADD IsActiveDelivery BIT NOT NULL DEFAULT 0
- Index IX_F_DOCENTETE_ActiveDelivery sur (IsActiveDelivery, AssignedLivreurId)
- CREATE TABLE F_LIVREUR_POSITION_HISTORY (
    Id BIGINT IDENTITY PRIMARY KEY,
    LivreurId UNIQUEIDENTIFIER NOT NULL,
    Lat DECIMAL(10,7) NOT NULL,
    Lng DECIMAL(10,7) NOT NULL,
    Accuracy DECIMAL(8,2) NULL,
    CapturedAt DATETIME2 NOT NULL,    -- Quand le livreur a capturé
    ReceivedAt DATETIME2 NOT NULL,    -- Quand le serveur l'a reçue
    INDEX IX_LivreurPosHistory (LivreurId, CapturedAt)
  )

Endpoint POST /api/livreur/orders/{piece}/start-heading :
- Marque cette commande IsActiveDelivery=true pour ce livreur
- Set IsActiveDelivery=false sur TOUTES les autres commandes du livreur 
  (transaction obligatoire — une seule active à la fois)
- Vérifications : commande en EN_LIVRAISON et assignée à ce livreur
- Émet SignalR DeliveryStarted au client { piece, livreurNom, livreurTel }

Endpoint POST /api/livreur/orders/{piece}/stop-heading :
- Marque IsActiveDelivery=false
- Émet SignalR DeliveryStopped au client

Endpoint POST /api/livreur/location/ping :
- Body : { lat, lng, accuracy }
- UPSERT F_LIVREUR_POSITION (1 ligne par livreur)
- IsBroadcasting=true si livreur a au moins 1 commande IsActiveDelivery=true
- Trouve la commande active du livreur
- Si présente → calcul ETA Haversine + vitesse 40 km/h
- SignalR LivreurPositionUpdate UNIQUEMENT vers le client de cette commande
  active : { piece, lat, lng, etaMinutes, etaDistanceKm }
- Pour les autres commandes EN_LIVRAISON (pas active) → AUCUN broadcast

Endpoint POST /api/livreur/location/ping-batch (NOUVEAU pour mode hors ligne) :
- Body : { positions: [{ lat, lng, accuracy, capturedAt, clientActionId }] }
- Trier par capturedAt (plus ancien d'abord)
- Stocker chaque position dans F_LIVREUR_POSITION_HISTORY
- UPSERT la dernière position dans F_LIVREUR_POSITION
- Émettre SignalR avec la dernière position uniquement
- Idempotence : si clientActionId déjà reçu → ignorer ce point

Anti-spam proximité (uniquement sur la commande active) :
- Si etaDistanceKm < 0.5 ET ProximityAlertSent=false → push notification 
  client + SET ProximityAlertSent=true

Endpoint GET /api/client/orders/{piece}/tracking-state :
Retourne l'état UI à afficher côté client :
- Si DEPOT → { state: "AT_DEPOT", message: "Votre commande est au dépôt", 
    showMap: false, freshness: null }
- Si EN_LIVRAISON + IsActiveDelivery=false → { state: "IN_DELIVERY_QUEUE", 
    message: "Votre commande est en cours de livraison, le livreur arrivera 
    bientôt", showMap: false, freshness: null }
- Si EN_LIVRAISON + IsActiveDelivery=true → { state: "HEADING_TO_YOU", 
    message: "Votre livreur arrive !", showMap: true, livreurNom, livreurTel,
    lat, lng, etaMinutes, etaDistanceKm, freshness: secondsSinceLastPing }
- Si LIVRE/RETOUR/REFUSE → { state: "TERMINAL", message: "...", 
    showMap: false, freshness: null }

1.5 — KB hybride chatbot :
- KbGeneratorService (HostedService au boot) → wwwroot/kb/kb_auto_generated.md
- Génère depuis enums : LiStatut, ClientMotifs, LivreurMotifs, 
  ReclamationStatuses, TunisianGovernorates, BusinessConstants
- KbProvider : concat kb_statique.md + kb_auto_generated.md, cache mémoire,
  InvalidateCache()
- AdminChatOrchestratorService utilise KbProvider
- Endpoint POST /api/admin/chat/kb/refresh : régénère + invalide

1.6 — Entités EF chatbot :
- Vérifier les 5 tables F_CHATBOT_* (SESSION, MESSAGE, INSIGHT, 
  PENDING_ACTION, ACTION_LOG)
- Créer entités EF correspondantes dans DbContext

═════════════════════════════════════════════════════════════════════
PHASE 2 — UI FLUTTER COMPLÈTES (livreur, client, confirmatrice, admin)
═════════════════════════════════════════════════════════════════════

══════ Sous-section LIVREUR ══════

2.1 — Onglet Stats livreur refondu (Section 1.2 du brief) :
- Sélecteur date par défaut "Aujourd'hui" (Aujourd'hui / Hier / Cette 
  semaine / Ce mois / Choisir date)
- Bloc Hero : total commandes + sous-libellé + badge online/pause
- Bloc Cash COD : montant + nombre paiements + bouton "Remettre la caisse 
  au dépôt"
- Bloc Compteurs 4 cartes (Livrées/EnLivraison/Reportées/Retournées) 
  cliquables → liste filtrée
- Bloc Top zones (bar chart horizontal)
- Bloc Performance (taux livraison + retour + delta)
- Bloc Sparkline 7 jours (réutiliser SparklinePainter existant)
- Champ recherche → redirige vers onglet Livraisons avec filtre
- Branché sur /api/livreur/stats

2.2 — Détail commande livreur refondu (Section 1.3) + Active Delivery :
- Hero compact : ref + badge statut + badge Dépôt N (couleurs : 0=bleu, 
  1=jaune, 2=orange, 3=rouge foncé, 4+=rouge)
- Photo client / avatar + nom + tel cliquable
- 3 boutons d'action : Appeler / SMS (body pré-rempli déjà fait) / Itinéraire
- Bloc Adresse complète + GPS + mini-carte 200px + pastille qualité IA
- Bloc Articles + total + mode paiement
- Bloc Cash COD (rouge si non encaissé, vert si encaissé) + bouton 
  "Marquer encaissé"
- Bloc Historique tentatives (depuis F_LIVRAISON_HISTORIQUE)
- Bloc Notes : note interne dépôt + note livreur libre

NOUVEAU bouton "Démarrer la livraison vers ce client" (ACTIVE DELIVERY) :
- Visible uniquement si statut = EN_LIVRAISON
- Au clic → POST /api/livreur/orders/{piece}/start-heading
- Affiche badge vert "🟢 ACTIVE" sur cette commande dans la liste
- Désactive automatiquement le badge des autres commandes
- Démarre LivreurLocationService (voir 2.14)

NOUVEAU bouton "Arrêter la livraison" :
- Visible uniquement si IsActiveDelivery=true
- Au clic → POST /api/livreur/orders/{piece}/stop-heading
- Arrête le LivreurLocationService

Workflow complet :
1. Livreur "Lancer livraison" → DEPOT → EN_LIVRAISON (existant)
2. Livreur "Démarrer livraison vers ce client" → IsActiveDelivery=true
3. Service GPS démarre, client reçoit position en temps réel
4. Livreur arrive ou clique "Arrêter" → IsActiveDelivery=false
5. Livreur "Marquer Livré" → LIVRE + IsActiveDelivery=false

2.3 — Statut/Motif en 2 étapes livreur (Section 1.3.3) :
- BottomSheet étape 1 : Livré / Reporter / Retourner / Annuler
- Si Reporter → BottomSheet étape 2 motif :
  * CLIENT_NON_JOIGNABLE / CLIENT_ABSENT / ADRESSE_INTROUVABLE / 
    ADRESSE_INCOMPLETE / NUMERO_INVALIDE
- Si Retourner → BottomSheet étape 2 motif :
  * CLIENT_REFUSE_COMMANDE (photo optionnelle) / COLIS_ENDOMMAGE_DEPOT 
    (photo OBLIGATOIRE) / AUTRE_INCIDENT (description courte obligatoire)
- Si Livré → confirmation directe + dialog "Confirmez encaissé X TND ?"
- Au passage en LIVRE/RETOUR/REPORTE → arrêter automatiquement 
  IsActiveDelivery si elle était true sur cette commande

2.4 — Filtres dépôt dynamiques liste livreur (Section 1.3.1) :
- Chips générés dynamiquement (Dépôt 1/2/3/N selon ce qui existe, 
  sans plafond)
- Chip Toutes / En livraison / Reportées / Livrées / Retournées
- Indicateur visuel "🟢 ACTIVE" sur la commande IsActiveDelivery=true

══════ Sous-section CONFIRMATRICE ══════

2.5 — Confirmatrice : badge Tentative N + bloc Tentatives détail :
- Liste cas : badge Tentative N dynamique (gris=1, orange=2, rouge=3+)
- Détail cas : bloc Tentatives historique antéchronologique
  * Tentative N · date · motif · livreur · GPS · bouton "Voir sur la carte"

2.6 — Confirmatrice : schéma interactif transitions (Section 2.7) :
- Nouvel écran WorkflowDiagramScreen avec 2 onglets (Cas / Commande)
- Diagramme custom (CustomPainter ou flutter_svg)
- Chaque flèche cliquable → BottomSheet (acteur, condition, SignalR)
- Bouton d'accès depuis profil ("Comment ça marche ?") + détail cas

2.7 — Confirmatrice : barre actions séparée (Section 2.6) :
- BottomSheet 2 sections : Actions sur le cas + Actions sur la commande
- Section cas : Prendre en charge / Clôturer / Refuser / Note / 
  Appliquer correction
- Section commande : Reporter / Retourner / Remettre en livraison
- Pas de motif obligatoire confirmatrice (juste statut)

══════ Sous-section CLIENT ══════

2.8 — Client : carnet d'adresses (Section 3.6) :
- Section "Mes adresses" dans profil
- Max 3 adresses, chacune libellé/adresse/gouvernorat/CP/GPS
- Une marquée par défaut
- Boutons Ajouter / Modifier / Supprimer / Définir par défaut
- Branché sur /api/client/addresses (déjà existant)

2.9 — Client : programme fidélité Bronze/Argent/Or/Platine (Section 3.10) :
- Carte hero gradient dans profil
- Niveau actuel + nombre livraisons + barre progression vers niveau suivant
- Avantage actuel affiché (-10% Argent, -25% Or, frais offerts Platine)
- Branché sur /api/client/loyalty (déjà existant)

2.10 — Client : préférences contact (Section 3.8) :
- Section "Communication" dans profil
- 3 options radio : Appel / SMS / Les deux (par défaut)
- Sauvegardé via API

2.11 — Client : tracking adapté selon état (CORRIGÉ) :

L'écran de tracking d'une commande s'adapte selon le résultat de 
GET /api/client/orders/{piece}/tracking-state :

État AT_DEPOT (commande au dépôt, n'importe quel numéro) :
- Icône colis + texte "📦 Votre commande est au dépôt"
- Sous-texte "Elle sera livrée prochainement"
- Pas de carte
- Timeline statut affichée

État IN_DELIVERY_QUEUE (EN_LIVRAISON + IsActiveDelivery=false) :
- Icône camion + texte "🚚 Votre commande est en cours de livraison"
- Sous-texte "Le livreur arrivera bientôt"
- Pas de carte
- Pas d'ETA précis
- Bouton "Appeler le livreur" disponible

État HEADING_TO_YOU (EN_LIVRAISON + IsActiveDelivery=true) :
- Texte "📍 Votre livreur arrive !"
- Carte plein écran (google_maps_flutter ou flutter_map)
- Marker rouge sur l'adresse client
- Marker bleu animé sur position livreur (SignalR LivreurPositionUpdate)
- Polyline entre les deux markers
- Bandeau ETA "Arrive dans X min · Y km"
- Indicateur fraîcheur position :
  * freshness < 30s → "📍 Position en direct" (vert)
  * freshness 30s-2min → "📍 Position à jour il y a X min" (orange)
  * freshness > 2min → "⚠️ Connexion livreur instable, position à jour 
    il y a X min" (rouge)
- Boutons flottants Appeler livreur / SMS livreur

État TERMINAL (LIVRE / RETOUR / REFUSE) :
- Pas de carte
- Historique de la commande
- Si LIVRE → popup avis (si pas encore donné)
- Si RETOUR/REFUSE → motif + actions possibles

Listeners SignalR :
- DeliveryStarted → recharge tracking-state (passe en HEADING_TO_YOU)
- DeliveryStopped → recharge tracking-state (passe en IN_DELIVERY_QUEUE)
- LivreurPositionUpdate → met à jour position du marker en temps réel

2.12 — Client : mode invité / suivi public (Section 3.7) :
- Lien "Suivre un colis sans compte" sur écran login
- Écran public sans auth : numéro commande + 4 derniers chiffres téléphone
- Branché sur /api/public/track (déjà existant)
- Tracking limité (statut, timeline, ETA, prénom livreur — pas d'infos 
  sensibles)
- Le mode invité utilise la MÊME logique tracking-state que connecté

2.13 — Client : FAQ contextuelle (Section 3.12) :
- Page accessible depuis profil + tracking
- Contenu hardcodé dans assets/faq.json (4 catégories)
- Format accordéon expandable + champ recherche

══════ Sous-section MODE HORS LIGNE GLOBAL ══════

2.14 — Service GPS livreur avec mode hors ligne (CORRIGÉ) :

LivreurLocationService :
- Démarre quand le livreur clique "Démarrer la livraison vers ce client"
  (IsActiveDelivery=true)
- Ping GPS toutes les 15 secondes EN CONTINU (le voiture en marche, 
  on ne s'arrête pas)
- Filtrage : ne pas enregistrer si position bougée < 30m
- Accuracy balanced (pas high — économie batterie)

Comportement selon état réseau :
A) Si BackendHealthService.status == healthy :
   - Envoi direct via POST /api/livreur/location/ping
   - Idempotence avec X-Client-Action-Id

B) Si réseau perdu OU backend down :
   - NE PAS STOPPER le GPS (le livreur continue à rouler !)
   - Capturer la position quand même
   - Mettre en queue Hive (box "gps_positions_queue")
   - Continuer à pinger toutes les 15s, accumuler en queue

C) Au retour du réseau :
   - Flush automatique : POST /api/livreur/location/ping-batch
   - Vider la queue après succès
   - SignalR émet la dernière position au client

Cas où on STOPPE le GPS (volontaire) :
- Livreur clique "Arrêter livraison" (IsActiveDelivery=false)
- Commande passe en LIVRE/RETOUR/REPORTE
- Livreur ferme l'app

Cas où on NE STOPPE PAS le GPS (subi) :
- Perte de réseau
- Backend down
- Latence anormale
- Erreurs 5xx

2.15 — OfflineQueueService partagé (NOUVEAU — règle générale) :

Service Flutter unifié pour TOUTES les actions hors ligne :

Côté livreur :
- Cashbox (remettre au dépôt)
- Encaissement individuel
- Changements statut commande (LIVRE/REPORTE/RETOUR)
- Photos (sauvegardées en local + upload en queue)
- Notes commande
- Note livreur libre
- start-heading / stop-heading (Active Delivery)

Côté client :
- Avis post-livraison
- Création réclamation
- Création demande
- Réponse à demande livreur (correction adresse/numéro)
- Reprogrammation
- Mise à jour carnet d'adresses
- Préférences contact

Stratégie commune :
1. Tenter envoi direct si BackendHealthService.status == healthy
2. Si échec → enqueue dans Hive avec X-Client-Action-Id
3. UI confirme immédiatement (optimiste)
4. Au retour réseau → flush automatique en série
5. Si échec persistant après 5 retries → notifier l'utilisateur

Photos / fichiers binaires (cas spécial) :
- Sauver le fichier localement (path Hive ou file system)
- Mettre l'upload en queue séparée (box "photos_queue")
- L'action métier (REPORTE avec COLIS_ENDOMMAGE) est enregistrée locale 
  immédiatement
- Le payload de la queue contient un photoLocalPath au lieu de URL serveur
- Quand l'upload réussit → remplacer photoLocalPath par photoUrl dans le 
  payload puis envoyer
- Tant que pas uploadée, badge orange "Photo en attente" sur la commande

2.16 — Écran "Synchronisation en attente" (NOUVEAU) :

Nouvel écran SyncQueueScreen accessible depuis :
- Bandeau de connexion (clic dessus)
- Profil livreur / client
- Compteur dans le bandeau

Affichage :
┌─────────────────────────────────────────────────┐
│ ← Synchronisation en attente             3      │
├─────────────────────────────────────────────────┤
│ 🚚 Encaissement BL00123 (250 DT)               │
│    Capturé il y a 5 min · En attente            │
│                                                  │
│ 📷 Photo COLIS_ENDOMMAGE BL00455                │
│    Capturé il y a 2 min · Upload en attente     │
│                                                  │
│ 📍 12 positions GPS                             │
│    Capturé il y a 8 min · Envoi en lot          │
└─────────────────────────────────────────────────┘

- Liste des actions en attente (lecture seule)
- Pas de bouton "Forcer la synchronisation" — automatique
- Auto-refresh toutes les 10s
- Quand une action est synchronisée → disparaît de la liste

2.17 — Optimisation tournée Flutter (côté client mobile) :

Au lieu d'appeler /api/livreur/tournee/optimize (backend), le calcul se 
fait directement dans Flutter :

Service TourneeOptimizerService :
- Récupère toutes les commandes du livreur en EN_LIVRAISON ou DEPOT
- Récupère sa position GPS actuelle
- Algorithme Nearest Neighbor en Dart :
  ```
  ordered = []
  current = livreurPosition
  remaining = stops.toList()
  while (remaining.isNotEmpty) {
    nearest = remaining.minBy(s => haversine(current, s.position))
    ordered.add(nearest)
    current = nearest.position
    remaining.remove(nearest)
  }
  ```
- Affiche la tournée optimisée sur la carte avec polyline numérotée 1, 2, 3
- Bouton "Démarrer la tournée" ouvre Google Maps sur la 1ère étape

Avantage : marche complètement hors ligne (le livreur a déjà ses commandes 
en cache local).

══════ Sous-section ADMIN FLUTTER (au lieu de React) ══════

NOTE IMPORTANTE : tout l'admin se fait UNIQUEMENT en Flutter 
(flutter/lib/ui/admin/). NE PAS toucher au code React.

2.18 — Composant AdminKpiDetailScreen Flutter réutilisable :
- Générique typé `<T>` 
- Props : title, loadData, buildRow, exports, onRowTap
- Push navigation : Navigator.push(...)
- AppBar avec bouton retour + boutons Excel/PDF

2.19 — KPIs cliquables Flutter : 12+ mappings (Section 4.3.2) :
- Total commandes / Livrées / Reportées / Retournées → liste commandes
- Total livreurs / En ligne → liste livreurs
- Total confirmatrices → liste confirmatrices
- Total réclamations / Par statut → liste réclamations
- Total produits / Top vendu / Stock critique → liste produits

2.20 — Différenciation visuelle 8 onglets Flutter (Section 4.4) :
- Couleurs par onglet (Indigo/Bleu/Vert/Violet/Orange/Teal/Rose/Gris)
- Icône spécifique par onglet
- Hero kicker spécifique par onglet
- KPIs spécifiques par onglet (cf brief 4.4.2)
- Premier KPI Dashboard = Total commandes tous statuts (somme)

2.21 — Section Produits enrichie Flutter (Section 4.5) :
- KPIs cliquables : Total / Top vendu / Top retourné / Stock critique / 
  Ventes mois / Top gouvernorat
- Détail produit 5 blocs (Identité / KPIs / Courbes / Géographie / Avis)
- Endpoints à ajouter : /api/admin/products/summary, 
  /api/admin/products?sort=, /api/admin/products/{ref}/detail, 
  /api/admin/products/{ref}/sales-trend, 
  /api/admin/products/{ref}/by-governorate

2.22 — Endpoints summary cohérents (Section 4.2) :
- Étendre le pattern à tous : orders, livreurs, confirmatrices, products
- 1 endpoint = 1 vue, totaux cohérents (assertion dev)

2.23 — Export Excel/PDF (Section 4.7) :
- NuGet : ClosedXML (Excel) + QuestPDF (PDF)
- Service ExportService partagé
- Endpoint /api/admin/{section}/export?format=xlsx|pdf
- Limite 10 000 lignes (avertissement au-delà)
- Boutons UI Flutter dans chaque AdminKpiDetailScreen
- Excel : header bold + gris, colonnes ajustées
- PDF : titre + période + total + tableau + pagination

2.24 — Onglet Paramètres admin Flutter (Section 4.6) :
- Section Apparence : 8 couleurs prédéfinies + color picker custom
- Mode Clair / Sombre / Auto
- Aperçu en direct
- Branché sur /api/admin/config/theme (déjà existant)
- ThemeBootstrap au démarrage de chaque app Flutter (lit /api/admin/
  config/theme et applique avant le premier render)
- Cache SharedPreferences pour éviter le flash
- SignalR ThemeChanged → reload thème sans redémarrage
- Cartes "Bientôt disponible" pour V2 (gestion users, frais, gouvernorats)

═════════════════════════════════════════════════════════════════════
PHASE 3 — CHATBOT INTELLIGENT + PUSH NOTIFICATIONS
═════════════════════════════════════════════════════════════════════

3.1 — Mémoire conversationnelle (Section 5.2) :
- F_CHATBOT_SESSION et F_CHATBOT_MESSAGE déjà créées (juste utiliser)
- À chaque /api/admin/chat/ask : créer/reprendre session, sauvegarder 
  message user + assistant
- Charger les 6 derniers messages et injecter dans le prompt système Groq
- Détection référents ("Et à Sfax ?") → reprend la dernière intention 
  query + change le filtre
- Limite 50 messages/session, archivage > 24h

3.2 — Bilingue FR/AR/Tounsi (Section 5.3) :
- LanguageDetectorService : regex chars arabes + markers tounsi 
  (3andek, 9adech, ch7al, lyoum, barcha, etc.) + regex chiffres-comme-lettres
- 3 prompts système (FR / AR / Tounsi) — voir 5.3.3 du brief
- Stockage F_CHATBOT_SESSION.Language pour cohérence

3.3 — Streaming SSE (Section 5.7) :
- Endpoint POST /api/admin/chat/ask-stream : Server-Sent Events
- Phases : routing → data → chunks (streaming Groq) → done
- Côté Flutter : EventSource ou parser Dio stream
- Bulle qui s'auto-remplit avec curseur clignotant ▋

3.4 — Quick-replies contextuelles (Section 5.8) :
- Champ suggestions[] dans la réponse JSON
- Composant QuickRepliesRow Flutter (Wrap d'ActionChip)
- Au tap → envoie la suggestion comme message
- Fallbacks par action si Groq ne retourne rien (cf 5.8.4)
- Prompt formatter enrichi pour produire suggestions

3.5 — Voice input/output (Section 5.6) :
- Packages : speech_to_text + flutter_tts (ajouter dans pubspec.yaml)
- VoiceInputService : bouton micro, demande permission, transcrit 
  (fr-FR/ar-TN selon préférence), pré-remplit champ
- VoiceOutputService : bouton 🔊 sur chaque bulle assistant, lit avec 
  flutter_tts adapté à la langue
- Mode mains-libres : toggle paramètres, écoute auto + lecture auto

3.6 — Suggestions proactives (Section 5.4) :
- ProactiveInsightsJob (Hangfire) toutes les 30 min
- Détecteurs :
  * Taux de retour > +20% vs moyenne 30j (par gouvernorat)
  * Confirmatrice avec charge > 2× moyenne
  * Produit avec taux réclamation > 30%
  * Livreur avec taux réussite chuté
- F_CHATBOT_INSIGHT déjà créée (juste utiliser)
- Endpoint GET /api/admin/chat/insights/pending (admin)
- Bandeau Flutter ProactiveInsightsBanner cliquable au-dessus du chat
- Au clic Analyser → message auto-injecté dans le chat
- Endpoint POST /api/admin/chat/insights/{id}/feedback

3.7 — Actions sécurisées (Section 5.5) :
- Whitelist 6 actions :
  * create_claim / assign_driver / change_order_status / release_case / 
    pause_confirmer / send_sms_client
- Router Groq peut retourner action="action" avec actionType + params
- F_CHATBOT_PENDING_ACTION : stocke l'action en attente, TTL 2 min
- Mécanisme double confirmation : bot demande "Tapez OUI" → user OUI → 
  exécute + log F_CHATBOT_ACTION_LOG
- Garde-fous : permissions (ADMIN only), rate limit 10/min, pas de DELETE/
  UPDATE en masse, sandbox dev (simulé)

3.8 — Push notifications FCM (Section 3.11) :
- Setup Firebase project (créer fichier google-services.json placeholder + 
  doc README pour le PFE)
- Package firebase_messaging Flutter
- Table F_CLIENT_DEVICE_TOKEN (créer migration si pas existante)
- Endpoint POST /api/client/push/register-token
- Service PushNotificationService backend (HTTP API FCM)
- Branché sur l'anti-spam ProximityAlertSent (déjà fait en 1.4)

3.9 — n8n workflow V3 :
- Enrichir le workflow V2 existant avec :
  * Branche bilingue (détection langue)
  * Branche actions sécurisées (avec confirmation)
  * Branche insights proactifs
- Garder V2 fonctionnel en parallèle

═════════════════════════════════════════════════════════════════════
LIVRABLES FINAUX OBLIGATOIRES (100% requis)
═════════════════════════════════════════════════════════════════════

Tu DOIS livrer à la fin TOUS les éléments suivants. Aucune exception :

✅ TOUTES les sous-tâches Phase 1 implémentées (1.1 à 1.6)
✅ TOUTES les sous-tâches Phase 2 implémentées (2.1 à 2.24)
✅ TOUTES les sous-tâches Phase 3 implémentées (3.1 à 3.9)
✅ Migrations DB toutes appliquées et fonctionnelles
✅ `dotnet build` passe sans erreur
✅ `flutter analyze` passe sans erreur fatale
✅ TESTS_RESULTS.md avec ✅ pour CHAQUE scénario :
   - 1.11 Tests livreur (4 scénarios)
   - 2.12 Tests confirmatrice (5 scénarios)
   - 3.18 Tests client (5 scénarios)
   - 4.11 Tests admin (6 scénarios)
   - 5.14 Tests chatbot (5 scénarios)
   = 25 tests au total — TOUS DOIVENT ÊTRE ✅
✅ BLOCKERS.md vide ou contenant uniquement des bloqueurs externes 
   (ex: pas d'accès à un service tiers payant) — pas des "j'ai pas eu 
   le temps"
✅ Tous les commits poussés (un par sous-tâche)

INTERDIT :
❌ Retourner avec moins de 100% complété
❌ Mettre des sous-tâches dans BLOCKERS.md pour cause de "complexité"
❌ Sauter une sous-tâche parce que "le brief n'est pas assez clair"
❌ Faire un résumé de type "j'ai fait X% du travail"

ACCEPTABLE :
✅ "100% du brief est implémenté, tous les tests passent."
✅ "100% du brief est implémenté, sauf [item précis] qui nécessite 
   [dépendance externe spécifique non disponible]."

═════════════════════════════════════════════════════════════════════
INSTRUCTIONS FINALES
═════════════════════════════════════════════════════════════════════

- Lis le brief en entier avant de commencer
- Respecte l'ordre Phase 1 → 2 → 3
- Au sein de chaque phase, respecte l'ordre des sous-tâches
- NE TOUCHE PAS aux fichiers déjà nettoyés sans raison forte
- NE TOUCHE PAS au code React (React-Ecommerce/)
- COMMITS séparés par sous-tâche
- TRAVAILLE EN AUTONOMIE : pas de questions
- IMPLÉMENTE TOUT, pas de "à faire plus tard"
- VÉRIFIE TON TRAVAIL : compile, teste, ajuste si nécessaire
- NE T'ARRÊTE PAS PRÉMATURÉMENT : continue jusqu'à 100% du brief

POINTS CRITIQUES À NE PAS RATER :

1. IsActiveDelivery : le client ne doit JAMAIS voir la position du livreur 
   si IsActiveDelivery=false. Une seule commande active à la fois par livreur.

2. GPS hors ligne : le service ne s'arrête JAMAIS pour cause de réseau. 
   Il continue à enregistrer les positions localement et les flush au retour.

3. Mode hors ligne global : TOUTE action utilisateur doit passer par 
   OfflineQueueService avec X-Client-Action-Id. Pas d'exception.

4. Photos : sauvegardées localement, upload en queue séparée, action métier 
   marquée immédiatement.

5. Admin entièrement en Flutter : ne pas toucher React.

6. COMPLÉTUDE 100% : tu ne dois PAS rendre la main avant d'avoir 
   implémenté et testé toutes les 39 sous-tâches (1.1-1.6, 2.1-2.24, 
   3.1-3.9). Si tu as déjà fait beaucoup, CONTINUE jusqu'au bout. 
   Le PFE de l'utilisateur dépend de ta livraison complète.

COMMENCE MAINTENANT par la Phase 1 sous-tâche 1.1, et NE T'ARRÊTE PAS 
avant d'avoir terminé la Phase 3 sous-tâche 3.9.
```
