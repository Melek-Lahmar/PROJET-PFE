# Passe premium — confirmatrice + livreur + admin (2026-05-03)

Extension de la passe client à tous les autres rôles. Backend intact.

## Périmètre

| # | Rôle | Sujet | Statut |
|---|---|---|---|
| 1 | CONFIRMATRICE | Shell `confirmatrice_home` — header gradient + greeting + nav stylé | ✅ |
| 2 | CONFIRMATRICE | `confirmatrice_orders_screen` — filtres premium gradient + cascade | ✅ |
| 3 | CONFIRMATRICE | `confirmatrice_profile_screen` | déjà OK (`_StatsGrid` premium en place) |
| 4 | LIVREUR | `new_orders_screen` — hero gradient indigo→violet + cascade | ✅ |
| 5 | LIVREUR | `my_orders_screen` — cards animées en cascade | ✅ |
| 6 | LIVREUR | `livreur_profile_screen` | déjà OK (`_QuickStatsGrid` en place) |
| 7 | ADMIN | Listes (orders/drivers/confirmatrices/claims) — cascade | ✅ |

Note : `home.dart` (livreur) et `admin_home.dart` (admin) sont **déjà premium** depuis les passes précédentes. Pas de refonte du shell.

## Recommandations à appliquer

- **Greeting contextuel** identique à customer_home (Bonjour/Bel après-midi/Bonsoir).
- **Carte stats personnelles** gradient sur le profil de chaque rôle.
- **Animations cascade** (`EntryAnimation` 60ms × index) sur les listes principales.
- **Badge live** sur statuts en temps réel (ex: confirmatrice → cas urgents).
- **Couleurs vives par statut** harmonisées avec la passe client.

## Validation

`flutter analyze` sur les 8 fichiers touchés : **0 erreur, 0 warning**, seulement des info `withOpacity` cohérents avec le projet.

---

## Récap fichiers touchés

| Fichier | Changement |
|---|---|
| `flutter/lib/ui/confirmatrice_home.dart` | Refonte complète : header gradient dynamique (indigo/orange/rouge/vert) + greeting + avatar + bottom nav stylé |
| `flutter/lib/ui/screens/confirmatrice_orders_screen.dart` | Filtres ChoiceChip → `_ConfFilterChip` gradient, cascade animée sur les rows (40ms+35×i), suppression du `_label` orphelin |
| `flutter/lib/ui/screens/livreur/new_orders_screen.dart` | Header `_Header` repensé en gradient indigo→violet avec icône, sous-titre, badge compteur blanc; cascade animée |
| `flutter/lib/ui/screens/livreur/my_orders_screen.dart` | Cascade animée sur les rows |
| `flutter/lib/ui/admin/screens/admin_orders_screen.dart` | Cascade animée sur les rows |
| `flutter/lib/ui/admin/screens/admin_drivers_screen.dart` | Cascade animée sur les rows |
| `flutter/lib/ui/admin/screens/admin_confirmatrices_screen.dart` | Cascade animée sur les rows |
| `flutter/lib/ui/admin/screens/admin_claims_screen.dart` | Cascade animée sur les unhandled rows |

8 fichiers — 1 refonte complète (`confirmatrice_home`), 1 hero refait (`new_orders`), 1 filtres premium (`confirmatrice_orders`), 5 cascades animées.

## Recommandations appliquées

- ✅ Greeting contextuel (Bonjour/Bel après-midi/Bonsoir) + nom utilisateur sur shell confirmatrice
- ✅ Bottom nav stylé avec ombre top et indicateur tinté par onglet
- ✅ Header gradient dynamique par onglet (chaque onglet a sa propre couleur)
- ✅ FilterChipPremium gradient pour les statuts confirmatrice
- ✅ Cascade animée sur toutes les listes principales (cohérent avec la passe client)
- ✅ Hero gradient indigo→violet pour `new_orders` livreur

## Recommandations laissées (à proposer)

- Push notifications FCM (même besoin que côté client)
- Mode sombre amélioré (theme provider est en place mais palette pourrait être affinée)
- Walkthrough first-launch
- Filtres globaux admin (chantier #2 du 2026-05-01)
- Section "Calendrier" pour confirmatrice (vue planning des cas)
- Heatmap géographique dans l'admin (recommandé déjà avant)

## Cohérence avec les autres passes

Les fichiers déjà refondus dans des passes précédentes ne sont **pas re-touchés** :
- `home.dart` (livreur) — passe précédente (header animé + premium navbar)
- `admin_home.dart` — passe précédente (onglet "Chat Bot" + AnimatedPageStack)
- `dashboard_screen.dart` (livreur) — passe précédente (badge achievement gamifié)
- `map_screen.dart` (livreur) — passe précédente (polyline halo)
- `admin_chat_screen.dart` — passe précédente (refonte chat plein écran)
- `admin_kpi_card.dart` — passe précédente (cliquable + sparkline)
- `livreur_profile_screen.dart`, `confirmatrice_profile_screen.dart` — déjà premium
