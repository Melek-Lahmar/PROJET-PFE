# CONFIRMATRICE_BUTTONS_AUDIT.md

> Audit exhaustif des boutons cliquables de l'espace confirmatrice Flutter.
> Périmètre : `flutter/lib/ui/screens/confirmatrice_*.dart` + widgets associés.
> Date : 2026-05-09

## Résultat

| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| Liste cas | Close search (X) | confirmatrice_claims_screen.dart:206 | ✅ OK | Clear |
| Liste cas | Filters button | confirmatrice_claims_screen.dart:240 | ✅ OK | _openFilters() |
| Liste cas | Refresh button | confirmatrice_claims_screen.dart:315 | ✅ OK | _refresh() |
| Liste cas | Toggle "Tous gouvernorats" | confirmatrice_claims_screen.dart:301 | ✅ OK | setCrossGouvernorat() |
| Liste cas | _ClaimCard | confirmatrice_claims_screen.dart:444 | ✅ OK | _openDetails(c) |
| Filtres | Reset button | confirmatrice_claims_screen.dart:706 | ✅ OK | Reset filter |
| Filtres | Filter chips | confirmatrice_claims_screen.dart:742-801 | ✅ OK | setState filter |
| Filtres | Apply button | confirmatrice_claims_screen.dart:842 | ✅ OK | onApply → setFilter() |
| Détail cas | Refresh AppBar | confirmatrice_claim_details_screen.dart:306 | ✅ OK | _load() |
| Détail cas | Réessayer | confirmatrice_claim_details_screen.dart:358 | ✅ OK | _load() |
| Détail cas | Appel client (header) | confirmatrice_claim_details_screen.dart:220-231 | ✅ OK | _call(clientPhone) |
| Détail cas | Appel livreur (header) | confirmatrice_claim_details_screen.dart:235-246 | ✅ OK | _call(livreurPhone) |
| Détail cas | _ClientBlock call | confirmatrice_claim_details_screen.dart:461 | ✅ OK | onCall callback |
| Détail cas | _LivreurBlock call | confirmatrice_claim_details_screen.dart:491 | ✅ OK | onCall callback |
| Détail cas | _CorrectionBlock Apply | confirmatrice_claim_details_screen.dart:555 | ✅ OK | onApply callback |
| Détail cas | Photo thumbnail | confirmatrice_claim_details_screen.dart:583 | ✅ OK | _openFullScreen |
| Détail cas | Edit note | confirmatrice_claim_details_screen.dart:819 | ✅ OK | onEdit callback |
| ActionsBar | Prendre en charge | confirmatrice_claim_details_screen.dart:996 | ✅ OK | onTakeOver |
| ActionsBar | Appliquer correction | confirmatrice_claim_details_screen.dart:1001 | ✅ OK | onApplyCorrection |
| ActionsBar | Créer échange | confirmatrice_claim_details_screen.dart:1007 | ✅ OK | onCreateEchange |
| ActionsBar | Reporter | confirmatrice_claim_details_screen.dart:1013 | ✅ OK | onQuickReporter |
| ActionsBar | Retourner | confirmatrice_claim_details_screen.dart:1018 | ✅ OK | onQuickRetourner |
| ActionsBar | Relancer livraison | confirmatrice_claim_details_screen.dart:1024 | ✅ OK | onQuickRelancer |
| ActionsBar | Confirmer annulation | confirmatrice_claim_details_screen.dart:1030 | ✅ OK | onQuickRetourner |
| ActionsBar | Reporter commande | confirmatrice_claim_details_screen.dart:1036 | ✅ OK | onQuickReporter |
| ActionsBar | Changer statut commande | confirmatrice_claim_details_screen.dart:1047 | ✅ OK | onChangeCommande |
| ActionsBar | Clôturer | confirmatrice_claim_details_screen.dart:1052 | ✅ OK | onResolve |
| ActionsBar | Refuser | confirmatrice_claim_details_screen.dart:1058 | ✅ OK | onRefuse |
| ActionsBar | Appeler client | confirmatrice_claim_details_screen.dart:1064 | ✅ OK | onCallClient |
| ActionsBar | Appeler livreur | confirmatrice_claim_details_screen.dart:1069 | ✅ OK | onCallLivreur |
| Liste commandes | Clear search | confirmatrice_orders_screen.dart:173 | ✅ OK | Clear |
| Liste commandes | Refresh | confirmatrice_orders_screen.dart:188 | ✅ OK | provider.refresh() |
| Liste commandes | Status filter chips | confirmatrice_orders_screen.dart:211 | ✅ OK | _applyFilter |
| Liste commandes | Retry button | confirmatrice_orders_screen.dart:288 | ✅ OK | refresh |
| Liste commandes | Order tile | confirmatrice_orders_screen.dart:506 | ✅ OK | _openDetails |
| Détail commande | Refresh | confirmatrice_order_details_screen.dart:180 | ✅ OK | _load |
| Détail commande | Edit status | confirmatrice_order_details_screen.dart:186 | ✅ OK | _openEditStatus |
| Détail commande | Call | confirmatrice_order_details_screen.dart:220 | ✅ OK | _call |
| Détail commande | Maps | confirmatrice_order_details_screen.dart:235 | ✅ OK | _openMaps |
| Détail commande | Confirm | confirmatrice_order_details_screen.dart:371 | ✅ OK | _confirmOrder |
| Détail commande | Edit status (button) | confirmatrice_order_details_screen.dart:390 | ✅ OK | _openEditStatus |
| Edit status | Radio buttons | confirmatrice_order_edit_status_screen.dart:139 | ✅ OK | setState |
| Edit status | Save | confirmatrice_order_edit_status_screen.dart:162 | ✅ OK | _save → updateStatus |
| Profil | Logout | confirmatrice_profile_screen.dart:112 | ✅ OK | logout |
| Profil | Pause toggle (Switch) | confirmatrice_profile_screen.dart:312 | ✅ OK | _togglePause |

## TOTAL : 45 boutons audités, 0 morts, 0 endpoints manquants

## Ajouts à venir (Section 2 — refonte)

- Bloc Tentatives dans détail cas (bandeau + liste antéchronologique)
- Badge "Tentative N" dynamique dans liste (couleur progressive)
- Bouton « Comment ça marche ? » → écran WorkflowDiagramScreen
- 4 nouveaux events SignalR : `CasLibere`, `CommandeAttribuee`, `CommandeLiberee`, `ClientARepondu`
- Hub `OnDisconnectedAsync` avec délai de grâce 5s
