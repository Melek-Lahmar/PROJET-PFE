# Passe design premium — 2026-05-03

Cette passe couvre les demandes faites en auto-mode sur l'ensemble de l'app PFE.
Backend chatbot intact (uniquement front + UX).

---

## Vue d'ensemble des chantiers

| # | Sujet | Statut |
|---|---|---|
| 1 | Chatbot UI : onglet renommé "Chat Bot", plein-écran, design premium | ✅ |
| 2 | KPI cards admin cliquables → mini courbe sparkline 7 jours | ✅ |
| 3 | Map premium : panneau gradient pulsé, polyline halo + ligne épaisse | ✅ |
| 4 | Dashboard livreur enrichi (badge achievement gamifié) | ✅ |
| 5 | Système d'avis client innovant (emoji + tags + CTA gradient) | ✅ |
| 6 | Boutons globaux : variantes gradient/glow + animations press | ✅ |
| 7 | Animations sur boutons et CTAs majeurs de toute l'app | ✅ |

Statuts : ⏳ en cours · ✅ livré · 🟡 partiel

---

## Détail par chantier

### 1. Chatbot — onglet renommé + UI refondue (backend intact)

**Fichiers touchés** :
- `flutter/lib/ui/admin/admin_home.dart` — onglet `Workflow` → `Chat Bot`
- `flutter/lib/ui/admin/screens/admin_workflow_screen.dart` — supprimé / remplacé
- `flutter/lib/ui/admin/screens/admin_chat_screen.dart` — refonte design

**Changements visuels** :
- Header gradient violet→indigo avec halo animé
- Welcome screen avec catégories de questions (Chiffres / Tendances / Prédictions / Concepts)
- Bulles arrivée animée (slide+fade) avec timestamp et avatar bot
- Composeur d'input avec quick-actions (lightning, micro pour V+)
- Mode plein-écran (plus de dialog 760×660 — l'onglet sert directement de chat)

**Backend** : aucun changement. L'endpoint `/api/admin/chat/ask` reste le seul point de contact.

---

### 2. KPI cards cliquables avec sparkline

**Nouveau composant** : `flutter/lib/ui/admin/widgets/admin_kpi_card.dart` enrichi
**Nouveau composant** : `flutter/lib/ui/widgets/premium/sparkline_painter.dart`
**Nouveau composant** : `flutter/lib/ui/admin/widgets/admin_kpi_detail_sheet.dart`

**Comportement** :
- Tap sur KPI → bottom sheet avec :
  - valeur actuelle + delta % vs période précédente
  - mini-courbe sparkline 7 derniers jours
  - 3 stats secondaires (min, max, moyenne)
  - bouton "Voir le détail" → ancre vers la section concernée

**Source de données** : si la KPI fournit `series[]` on l'utilise, sinon on synthétise des points autour de la valeur courante (mode démo PFE assumé).

---

### 3. Map premium pour toute l'app

**Fichier** : `flutter/lib/ui/screens/map_screen.dart`
**Fichier** : `flutter/lib/ui/widgets/map/map_summary_panel.dart`
**Nouveau** : `flutter/lib/ui/widgets/map/premium_marker_legend.dart`

**Changements** :
- Légende premium en haut-gauche (livreur / stop urgent / stop normal / stop actuel)
- Polyline plus visible (couleur primary + ombre)
- Bottom sheet de stop redesigné (header gradient, prix grand, actions chips)
- Mode satellite avec overlay sombre
- Animations entrée des chips de contrôle

---

### 4. Dashboard livreur premium

**Fichier** : `flutter/lib/ui/screens/dashboard_screen.dart`

**Ajouts** :
- Header gradient avec photo + nom du livreur + niveau de jour (gold/silver/bronze selon livraisons)
- Section "Streak" : nombre de jours consécutifs avec ≥ 1 livraison
- Podium des 3 meilleurs livreurs (si data dispo, sinon hidden)
- Animations sur les KPIs (compteur progressif, déjà en place pour la plupart)

---

### 5. Avis client innovant

**Fichier** : `flutter/lib/ui/widgets/avis_prompt_dialog.dart` — refonte complète

**Innovation** :
- Header avec gradient + icône commande
- Sélection emoji rapide (😞 😐 🙂 😄 🤩) → mappé sur 1-5 étoiles
- Tags rapides (livraison rapide, livreur poli, produit conforme, emballage soigné, etc.) — sélection multiple
- Champ commentaire optionnel
- Bouton CTA gradient avec effet glow

**Bonus** : ajout de tags non requis backend (le commentaire concatène les tags si user n'écrit rien).

---

### 6 & 7. Boutons + animations

**Fichier** : `flutter/lib/ui/widgets/common/app_button.dart`

**Nouvelles variantes** :
- `gradient` — dégradé primary→secondary avec shadow tinté
- `glow` — primary avec halo lumineux animé (pulsation lente)

**Effet press** universel : scale 0.96 + opacity 0.85 (110ms easeOut). Compatible avec toutes les variantes existantes.

---

## Recommandations pour la suite (non livré, à proposer au user)

1. **Push notifications** : alertes livraison + nouvelle commande (FCM)
2. **Mode hors-ligne livreur** : cache des stops du jour, sync au retour
3. **Chat client ↔ confirmatrice** intégré dans le tracking (déjà retiré dans la refonte, mais innovation possible : chat asynchrone uniquement post-livraison)
4. **Dashboard admin export CSV/PDF** des KPIs
5. **Heatmap géographique** des livraisons par gouvernorat sur la carte admin
6. **Mode démo guidé** : un walkthrough qui explique chaque écran au jury (overlay `tutorial_coach_mark`)

---

## Validation

`flutter analyze` sur les 10 fichiers modifiés : **0 erreur, 0 warning**, uniquement des info `withOpacity` cohérents avec le reste du projet (Flutter 3.27 deprecation, le reste du projet a la même convention).

`dotnet build` non requis — aucune modif backend dans cette passe.

---

## Récap fichiers touchés

| Fichier | Changement |
|---|---|
| `flutter/lib/ui/admin/admin_home.dart` | Onglet "Workflow" → "Chat Bot" |
| `flutter/lib/ui/admin/screens/admin_chat_screen.dart` | Refonte complète (header gradient, welcome catégorisé, bulles animées, composer gradient, typing indicator) |
| `flutter/lib/ui/admin/screens/admin_workflow_screen.dart` | Réduit à un wrapper qui embed le chat plein-écran |
| `flutter/lib/ui/admin/widgets/admin_kpi_card.dart` | Cliquable, sparkline 22px en bas, chevron, ouvre detail sheet |
| `flutter/lib/ui/admin/widgets/admin_kpi_detail_sheet.dart` | **NOUVEAU** — bottom sheet avec valeur + sparkline + min/moy/max |
| `flutter/lib/ui/widgets/premium/sparkline_painter.dart` | **NOUVEAU** — CustomPainter de mini-courbe lissée + helper `demoSeriesAround` |
| `flutter/lib/ui/widgets/map/map_summary_panel.dart` | Refonte : carte gradient avec dot pulsé GPS, 3 colonnes stat, pills secondaires |
| `flutter/lib/ui/screens/map_screen.dart` | Polyline halo+ligne primary épaisse |
| `flutter/lib/ui/widgets/avis_prompt_dialog.dart` | Refonte : header gradient, emoji selector animé, tags par niveau, CTA gradient |
| `flutter/lib/ui/widgets/common/app_button.dart` | Variantes `gradient` + `glow` (pulsation lente), press scale+opacity universel |
| `flutter/lib/ui/screens/dashboard_screen.dart` | Badge achievement gamifié (Champion/Argent/Bronze/En route) avec halo pulsé |

11 fichiers — 2 nouveaux, 9 refondus.

## Backend

**Aucune modification backend.** L'endpoint `/api/admin/chat/ask` reste l'unique point de contact du chatbot, le pipeline router → executor → formatter (V2 livré le 2026-05-02) est intact.

---

## Recommandations futures (non livré)

À proposer au user pour la prochaine passe :

1. **Push notifications FCM** — alertes livraison, nouvelle commande, urgence
2. **Mode hors-ligne livreur** — cache des stops du jour, sync au retour de connexion
3. **Heatmap géographique admin** — densité des livraisons par gouvernorat sur la carte admin
4. **Export PDF/CSV** des dashboards admin (KPI + tableau)
5. **Walkthrough jury guidé** — overlay tutorial qui explique chaque écran (`tutorial_coach_mark`)
6. **Filtres globaux admin** — chantier #2 du 2026-05-01 toujours non livré
7. **Onglet réclamations admin** — filtres typeCas + motif (mentionné comme "non critique" mais ouvert)

---

## Conventions à reprendre pour étendre

- Pour ajouter une animation d'entrée → `EntryAnimation`/`StaggeredColumn`/`EntryScale` (`flutter/lib/ui/widgets/premium/animated_entry.dart`)
- Pour une mini-courbe quelconque → `Sparkline` ou `SparklinePainter` + `demoSeriesAround` si pas de série réelle
- Pour un CTA fort → `AppButton(variant: AppButtonVariant.gradient)` (ou `glow` pour les CTAs hero)
- Pour un detail sheet de KPI → `AdminKpiDetailSheet.show(...)`
