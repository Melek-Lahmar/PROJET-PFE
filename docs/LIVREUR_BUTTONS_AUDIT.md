# LIVREUR_BUTTONS_AUDIT.md

> Audit exhaustif des boutons cliquables de l'espace livreur Flutter.
> Périmètre : `flutter/lib/ui/screens/livreur/*.dart` + widgets associés.
> Date : 2026-05-09

## Résultat

| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| Détail livraison | IconButton (Rafraîchir) | delivery_details_screen.dart:235 | ✅ OK | provider.refresh() + _loadEscalation() |
| Détail livraison | FloatingActionButton (Démarrer navigation) | delivery_details_screen.dart:247 | ✅ OK | _openNavigation(d) → url_launcher Maps |
| Détail livraison | ActionTile (Appeler client) | delivery_details_screen.dart:274 | ✅ OK | _call(d.clientPhone) |
| Détail livraison | ActionTile (SMS) | delivery_details_screen.dart:283 | ✅ OK | _sms(d.clientPhone) |
| Détail livraison | ActionTile (Ouvrir Maps) | delivery_details_screen.dart:292 | ✅ OK | _openMaps(d) |
| Détail livraison | ActionTile (Navigation) | delivery_details_screen.dart:301 | ✅ OK | _openNavigation(d) |
| Détail livraison | FilledButton (Changer statut) | delivery_details_screen.dart:336 | ✅ OK | _openStatusSheet(d) |
| Détail livraison | OutlinedButton (Retour sheet) | delivery_details_screen.dart:944 | ✅ OK | retour liste options |
| Détail livraison | FilledButton (Confirmer option) | delivery_details_screen.dart:951 | ✅ OK | _applyStatus() → PUT /api/livreur/orders/{doPiece}/status |
| Détail livraison | InkWell (Choisir date) | delivery_details_screen.dart:981 | ✅ OK | _pickReplanned() |
| Détail livraison | PremiumCard (Option carte) | delivery_details_screen.dart:1055 | ✅ OK | sélection option statut |
| Profil livreur | ActionTile (Notifications) | livreur_profile_screen.dart:56 | ✅ OK | Switch NotificationPreferences |
| Profil livreur | Switch (Son notifications) | livreur_profile_screen.dart:65 | ✅ OK | setSoundEnabled(v) |
| Profil livreur | ActionTile (Thème) | livreur_profile_screen.dart:73 | ✅ OK | ThemeProvider.setThemeMode() |
| Profil livreur | PopupMenuButton (Mode thème) | livreur_profile_screen.dart:77 | ✅ OK | 3 options système/clair/sombre |
| Profil livreur | ActionTile (Actualiser données) | livreur_profile_screen.dart:93 | ✅ OK | DeliveriesProvider.refresh() |
| Profil livreur | OutlinedButton (Déconnexion) | livreur_profile_screen.dart:106 | ✅ OK | dialog → logout() |
| Profil livreur | TextButton (Annuler déco) | livreur_profile_screen.dart:115 | ✅ OK | Navigator pop |
| Profil livreur | FilledButton (Confirmer déco) | livreur_profile_screen.dart:119 | ✅ OK | logout() AuthProvider |
| Mes commandes | TextButton (Annuler batch) | my_orders_screen.dart:206 | ✅ OK | Navigator pop |
| Mes commandes | FilledButton (Confirmer batch) | my_orders_screen.dart:210 | ✅ OK | setStatusBatch() → PUT /api/livreur/orders/batch-status |
| Mes commandes | IconButton (Effacer recherche) | my_orders_screen.dart:328 | ✅ OK | _searchCtrl.clear() |
| Mes commandes | InkWell (Filtre chip) | my_orders_screen.dart:512 | ✅ OK | setState filter |
| Mes commandes | TextButton (Sélectionner tout) | my_orders_screen.dart:701 | ✅ OK | _selectAllReady(filtered) |
| Mes commandes | IconButton (Fermer sélection) | my_orders_screen.dart:710 | ✅ OK | _exitSelection() |
| Mes commandes | InkWell (FAB livraison) | my_orders_screen.dart:935 | ✅ OK | _launchSelected() |
| Mes commandes | PremiumCard (Carte commande) | my_orders_screen.dart:765 | ✅ OK | toggle sélection ou ouvre détail |
| Nouvelles cmds | IconButton (Effacer recherche) | new_orders_screen.dart:132 | ✅ OK | _searchCtrl.clear() |
| Nouvelles cmds | FilledButton (Prendre commande) | new_orders_screen.dart:358 | ✅ OK | _pick(d) → POST /api/livreur/orders/{doPiece}/assign |

## Endpoints backend confirmés

- `POST /api/livreur/orders/{doPiece}/assign` (pick depuis le pool)
- `PUT /api/livreur/orders/{doPiece}/status` (changement statut)
- `PUT /api/livreur/orders/batch-status` (changement statut multi)
- `POST /api/livreur/reclamations/attempt` (record tentative)
- `GET /api/livreur/reclamations/commandes/{doPiece}/escalation-status`
- `GET /api/livreur/orders/available` (pool)
- `GET /api/livreur/orders/mine` (mes commandes)
- `POST /api/auth/logout`

## TOTAL : 29 boutons audités, 0 morts, 0 endpoints manquants

## Ajouts à venir (Section 1 — refonte)

Boutons / endpoints à créer dans le cadre de la refonte (pas des "morts" — features nouvelles) :

- Onglet Stats : sélecteur de date, hero card, cashbox card, top zones, sparkline 7j → endpoint `GET /api/livreur/stats`
- Bouton « Remettre la caisse au dépôt » → endpoint `POST /api/livreur/cashbox/remettre`
- Pastille qualité d'adresse + tooltip
- Toggle heatmap retours → endpoint `GET /api/livreur/map/heatmap`
- Suggestion créneau IA
- Bouton « 🧭 Optimiser ma tournée » → endpoint `GET /api/livreur/tournee/optimize`
- Bandeau connexion instable + queue offline (Hive)
- Templates SMS rapides (3 boutons)
