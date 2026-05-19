# Dépôt fixes — Sous-statuts livreur + bug reload (2026-05-12)

Corrections demandées par le user sur le flow dépôt livreur. Le côté
livreur "ça va bien" (motifs et map OK) sauf pour ces points précis.

## Récapitulatif

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1 | Bug reload : REPORTE → EN_LIVRAISON automatique | ✅ | Bloc retiré de `LivreurController.GetMine` (ex-lignes 109-122). |
| 2 | Sous-statuts `DepotEnCoursDePreparation` + `DepotPret` | ✅ | Codes 6 et 7 ajoutés à `DeliveryStatusCodes` + labels string. |
| 3 | `Assign` → `DepotEnCoursDePreparation` | ✅ | Le livreur qui accepte une commande crée une `F_LIVRAISON` avec ce sous-statut au lieu de `EnLivraison`. |
| 4 | UI livreur : distinguer "En préparation" / "Prêtes" | ⚠️ Partiel | Filtres chips + palette OK. Boutons "Marquer prête" prêts (`_markAsReady`, `_markSelectedAsReady`) mais non câblés à l'UI (voir reste à faire ci-dessous). |
| 5 | Client : 3 sous-statuts dépôt → "Au dépôt" | ✅ | `customer_order.dart` normalise DEPOT_EN_COURS_DE_PREPARATION/DEPOT_PRET → DEPOT et le label passe de "Retour dépôt" à "Au dépôt". |
| 6 | Profil livreur : coordonnées complètes | ✅ | Nouvelle section "Mes coordonnées" : email, téléphone, gouvernorat, délégation, adresse, complément, code postal, pays. |

---

## 1. Bug reload — diagnostic et fix

**Cause** : `LivreurController.GetMine` faisait une auto-conversion à chaque `GET /api/livreur/orders/mine` :

```csharp
if (li.LI_Statut == DeliveryStatusCodes.Reporte &&
    li.LI_DateReplanification.HasValue &&
    li.LI_DateReplanification.Value <= now)
{
    li.LI_Statut = DeliveryStatusCodes.EnLivraison;  // ← BUG
}
```

À chaque reload de l'app livreur, toute commande REPORTÉE dont la date de replanification était passée basculait automatiquement en EN_LIVRAISON. C'était en conflit avec le job Hangfire `DepotIncrementJob` qui doit faire `REPORTE → DEPOT` à 00:00 (et pas EN_LIVRAISON).

**Fix** : suppression du bloc. La transition automatique est désormais exclusivement gérée par `DepotIncrementJob` (`REPORTE → DEPOT` à 00:00 Africa/Tunis).

---

## 2. Nouveaux sous-statuts dépôt côté livreur

| Code | Constante | Quand |
|------|-----------|-------|
| 6 | `DepotEnCoursDePreparation` | Livreur vient d'accepter la commande du pool. Le colis est physiquement au dépôt en préparation. |
| 7 | `DepotPret` | Livreur a marqué la commande prête à partir en livraison. Apparaît dans le sélecteur "Lancer livraison" (batch). |
| 4 | `Depot` (existant) | État final dépôt après cycle REPORTÉ + Hangfire 00:00. Affiché aussi pour le client. |

`NormalizeRequestedStatus`, `MapStringToCode`, `MapLivraisonCodeToStatus` étendus pour les 2 nouveaux statuts.

## 3. Flow d'acceptation modifié

**Avant** : `LivreurController.Assign` créait `F_LIVRAISON` avec `LI_Statut = EnLivraison` directement.
**Après** : `LI_Statut = DepotEnCoursDePreparation`. Le livreur doit explicitement marquer la commande prête puis cliquer "Lancer livraison" pour passer à EN_LIVRAISON.

## 4. UI livreur — état actuel

- Filtres chips dans `my_orders_screen.dart` : nouveau chip "En préparation" (orange) ajouté avant "Au dépôt prêtes" (vert). Compte calculé par `_isDepotInPrep` / `_isDepotReady` basés sur `apiStatus`.
- Palette `AppStatusPalette` enrichie : visuels distincts pour `DEPOT_EN_COURS_DE_PREPARATION` (orange/inventory) et `DEPOT_PRET` (vert/task_alt).
- `DeliveriesRepository.setStatusBatch` accepte maintenant un paramètre optionnel `apiStatusOverride` qui contourne le mapping int→string. Permet d'envoyer directement "DEPOT_PRET" ou "DEPOT_EN_COURS_DE_PREPARATION" au backend.
- **Méthodes prêtes mais non câblées à l'UI** (`// ignore: unused_element`) :
  - `_markAsReady(Delivery d)` : passe une commande individuelle de "en préparation" à "prête".
  - `_markSelectedAsReady()` : batch pour la sélection multi.

**Reste à faire (peut être fait en suivante session)** : brancher ces fonctions sur un bouton "Prête" individuel sur la card (mode normal) et sur un FAB secondaire "Marquer N prêtes" (mode sélection quand la sélection contient des "en préparation").

## 5. Client — masquage des sous-statuts

Le client voit "Au dépôt" pour les 3 codes (DepotEnCoursDePreparation, DepotPret, Depot). Pas d'exposition de la sous-distinction métier réservée au livreur.

## 6. Profil livreur

Nouvelle carte `_CoordonneesCard` dans `livreur_profile_screen.dart` qui affiche le contenu de `session.profile` :
- Email (déjà visible dans le hero — répété ici pour le bloc complet)
- Téléphone (couleur verte si présent — match avec le bouton "Appeler" générique)
- Gouvernorat
- Délégation
- Adresse + complément si présent
- Code postal et pays si présents

---

## Builds

```
dotnet build : 0 erreur source (warnings nullable inchangés)
flutter analyze : 0 error, 0 warning sur tous les fichiers modifiés
```

⚠️ Le build dotnet a échoué uniquement parce que ton instance backend tourne (PID 31584) et lock le `.exe`. Il faut redémarrer le backend pour appliquer les changements C#. Côté Flutter, hot reload suffit.

---

## Job Hangfire 00:00

Vérifié — `DepotIncrementJob.RunAsync` fait déjà la bonne chose :
```csharp
li.LI_Statut = DeliveryStatusCodes.Depot;  // ligne 78
```
Donc les commandes REPORTÉES dont la date de replanification est passée basculent bien vers DEPOT (pas vers REPORTE ou DEPOT_REPORTE). Aucun renommage nécessaire — c'est ce que tu voulais.

Le label affiché côté client est désormais "Au dépôt" (pas "Retour dépôt" comme avant — corrigé dans `customer_order.dart`).
