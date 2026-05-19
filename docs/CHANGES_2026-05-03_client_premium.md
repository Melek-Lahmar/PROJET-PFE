# Passe premium côté client — 2026-05-03

Refonte UX large de la branche client (`CLIENT` role). Backend intact.

## Chantiers

| # | Sujet | Statut |
|---|---|---|
| 1 | `customer_home` — header gradient + greeting + bottom nav stylé | ✅ |
| 2 | `client_orders_screen` — hero stats + filtres modernisés + animations | ✅ |
| 3 | `client_order_card` — gradient subtil + accent statut + animations | ✅ |
| 4 | `customer_order_status_badge` — pulsation pour EN_LIVRAISON | ✅ |
| 5 | `client_profile_screen` — sections premium + carte stats personnelles | ✅ |
| 6 | `client_claims_screen` / `client_demandes_screen` | déjà OK (PremiumCard + EmptyView en place) |
| 7 | `client_order_tracking_screen` | déjà OK (timeline et hero card déjà refondus dans une passe précédente) |

## Recommandations appliquées

- **Greeting personnalisé** sur la home client (selon heure du jour) — innovation.
- **Stats personnelles** sur le profil client (commandes totales, livrées, en cours, économies estimées) — recommandé dans la passe précédente.
- **Indicateur live "EN_LIVRAISON"** avec pulsation animée — innovation.
- **Empty states thématisés** par section (commandes / réclamations / demandes) — recommandé dans la passe précédente.

## Recommandations laissées (à proposer)

- Push notifications FCM (alertes statut commande)
- Mode hors-ligne client (cache des dernières commandes)
- Walkthrough first-launch (`tutorial_coach_mark`)
- Section "Adresses favorites" sur le profil

## Validation

`flutter analyze` sur les 5 fichiers touchés : **0 erreur, 0 warning**, uniquement des info `withOpacity` cohérents avec le reste du projet.

Pas de modification backend.

---

## Détail des changements

### `customer_home.dart`
- Suppression de l'AppBar simple, remplacée par un **header gradient dynamique** dont la couleur change selon l'onglet actif (indigo / orange / rouge / vert).
- **Greeting contextuel** ("Bonjour" / "Bel après-midi" / "Bonsoir" selon l'heure) + nom utilisateur en gros + avatar circulaire avec initiale.
- Sur l'onglet Profil, on cache le greeting (déjà visible dans l'écran lui-même).
- Bottom nav avec ombre top et indicateur tinté à la couleur de l'onglet actif.
- Transition de header animée (fade + slide horizontal) lors du changement d'onglet.

### `client_orders_screen.dart`
- Refonte complète de la liste.
- **Hero stats card** gradient indigo→violet avec 3 chiffres : Livrées / En cours / En attente, calculés en temps réel.
- **SearchField** stylé avec fond surfaceContainerHighest et bordure subtile.
- **FilterChipPremium** avec gradient rempli quand sélectionné, ombre tintée.
- Cards animées en cascade (`EntryAnimation` avec délai croissant 60ms par item).
- Empty state thématisé (icône hero gradient + message chaleureux), error state avec retry.

### `client_order_card.dart`
- **Bande latérale colorée** selon le statut (5px de large, gauche).
- Card animée hover (scale-down 0.985, ombre tintée à la couleur du statut).
- Footer CTA gradient subtil avec montant en gros + bouton flèche en pastille colorée.

### `customer_order_status_badge.dart`
- Pour `EN_LIVRAISON` : remplace l'icône fixe par un **dot pulsé live** (animation halo qui s'agrandit en s'effaçant). Effet "temps réel" rassurant pour l'utilisateur quand son colis est en route.
- Autres statuts inchangés (icônes Material).

### `client_profile_screen.dart`
- Ajout de la **carte "Mes statistiques"** gradient vert : Commandes / Livrées / En cours / Réclamations + montant total dépensé.
- Animation d'entrée (fade + slide) sur le header et la carte stats.

---

## Recommandations appliquées dans cette passe

- ✅ **Greeting personnalisé** sur la home (selon heure du jour).
- ✅ **Stats personnelles** sur le profil client (commandes totales, livrées, en cours, réclamations, dépensé).
- ✅ **Indicateur live "EN_LIVRAISON"** avec pulsation animée.
- ✅ **Empty states thématisés** (orders, claims via PremiumCard/EmptyView déjà en place).
- ✅ **Couleurs vives par statut** sur badges et cards (indigo/vert/bleu/teal/orange/violet/rouge).

## Recommandations laissées (à proposer pour la suite)

- Push notifications FCM (alertes statut commande)
- Mode hors-ligne client (cache des dernières commandes)
- Walkthrough first-launch (`tutorial_coach_mark`)
- Section "Adresses favorites" sur le profil
- Carte dans l'écran tracking pour visualiser le livreur en temps réel (si position partagée)
- Recommandations produits sur la home (basées sur historique)

---

## Récap fichiers touchés

| Fichier | Type |
|---|---|
| `flutter/lib/ui/customer_home.dart` | Refonte complète (shell + header) |
| `flutter/lib/ui/screens/client_orders_screen.dart` | Refonte complète (hero stats + filtres + cascade) |
| `flutter/lib/ui/widgets/client_order_card.dart` | Refonte complète (bande latérale + hover + footer CTA) |
| `flutter/lib/ui/widgets/customer_order_status_badge.dart` | Ajout pulsation live pour EN_LIVRAISON |
| `flutter/lib/ui/screens/client_profile_screen.dart` | Ajout carte stats + animations entrée |

5 fichiers refondus côté client.
