# SECTION 4 — Espace Admin (React + Flutter)

> Section 4/5 du brief technique global. Couvre l'**espace admin** dans ses deux incarnations : le dashboard React (web) et l'app Flutter mobile.

---

## 4.1 Contexte

L'espace admin a deux incarnations qui doivent rester **cohérentes** (mêmes chiffres, mêmes définitions) :

- **Admin Web (React)** dans `React-Ecommerce/src/features/dashboard/`
- **Admin Mobile (Flutter)** dans `flutter/lib/ui/admin/`

La refonte vise :
1. Différencier visuellement les onglets (fini le « kifkif »)
2. Rendre tous les KPIs cliquables vers une vue détaillée plein-écran
3. Corriger les bugs de comptage (réclamations 7 vs 8 envoyées)
4. Vraie section Produits avec KPIs cliquables
5. Onglet Paramètres avec personnalisation thème (couleur globale de l'app)
6. Export Excel/PDF

L'existant à conserver :
- 6 onglets actuels (Dashboard / Commandes / Livreurs / Confirmatrices / Réclamations & Demandes / Produits / Chatbot)
- Sparkline 7 jours déjà en place
- Map premium déjà en place
- Filtres existants

---

## 4.2 Bug critique à corriger : compteurs réclamations

### 4.2.1 Le problème

« 7 réclamations totales mais 8 envoyées » est mathématiquement impossible et trahit un bug.

**Causes possibles :**
1. Endpoints différents (cache désynchronisé)
2. Jointure dupliquante (réclamation avec 2 photos compte 2×)
3. Soft delete mal géré
4. Filtre gouvernorat appliqué partiellement
5. TypeCas mélangés (Réclamations + Demandes)

### 4.2.2 La règle stricte : un seul endpoint pour tous les compteurs

```
GET /api/admin/reclamations/summary?period=30d&governorate=Sousse&typeCas=RECLAMATION
```

Réponse atomique calculée en **une seule requête SQL** :

```json
{
  "total": 7,
  "byStatus": {
    "envoyee": 2, "enCours": 1, "cloturee": 3, "refusee": 1
  },
  "byMotif": [{"code": "CHANGEMENT_ADRESSE", "count": 3}],
  "byGovernorate": [{"name": "Sousse", "count": 4}]
}
```

**Garantie** : `total = SUM(byStatus) = SUM(byMotif) = SUM(byGovernorate)`.

### 4.2.3 Implémentation backend

```csharp
public async Task<ReclamationsSummaryDto> GetSummaryAsync(
    string period, string? governorate, string? typeCas, CancellationToken ct)
{
    var (from, to) = PeriodHelper.Parse(period);

    var query = _db.F_RECLAMATIONS
        .Where(r => r.CreatedAt >= from && r.CreatedAt < to)
        .Where(r => !r.IsDeleted);

    if (!string.IsNullOrEmpty(governorate))
        query = query.Where(r => r.Gouvernorat == governorate);
    if (!string.IsNullOrEmpty(typeCas))
        query = query.Where(r => r.TypeCas == typeCas);

    var all = await query
        .Select(r => new { r.Statut, r.Motif, r.Gouvernorat })
        .ToListAsync(ct);

    var result = new ReclamationsSummaryDto
    {
        Total = all.Count,
        ByStatus = new {
            Envoyee = all.Count(x => x.Statut == "ENVOYEE"),
            EnCours = all.Count(x => x.Statut == "EN_COURS_DE_TRAITEMENT"),
            Cloturee = all.Count(x => x.Statut == "CLOTUREE"),
            Refusee = all.Count(x => x.Statut == "REFUSEE"),
        },
        // ...
    };

    // Test de cohérence en dev : exception si total != sum
    var sum = result.ByStatus.Envoyee + result.ByStatus.EnCours
            + result.ByStatus.Cloturee + result.ByStatus.Refusee;
    if (sum != result.Total)
        throw new InvalidOperationException(
            $"Compteur incohérent : total={result.Total}, sum={sum}");

    return result;
}
```

### 4.2.4 Application aux 5 sections admin

- `GET /api/admin/orders/summary`
- `GET /api/admin/livreurs/summary`
- `GET /api/admin/confirmatrices/summary`
- `GET /api/admin/products/summary`
- `GET /api/admin/reclamations/summary`

Tous suivent le même pattern : 1 endpoint, 1 requête, totaux cohérents.

---

## 4.3 KPIs cliquables → écran plein-écran

### 4.3.1 Comportement

Tu as choisi **« Nouvel écran plein-écran (push navigation) »**.

Au clic sur un KPI :
- Animation push (slide depuis la droite sur mobile, modal full-screen sur desktop)
- Liste détaillée filtrée
- Bouton retour clair en haut à gauche
- Boutons « Exporter Excel / PDF » en haut à droite (§4.7)

### 4.3.2 Mapping KPI → Liste détaillée

| KPI cliqué | Écran qui s'ouvre | Contenu |
|---|---|---|
| Total commandes | Liste commandes | ref, client, statut, gouvernorat, date, montant |
| Livrées / Reportées / Retournées | Liste filtrée par statut | Idem + spécifique au statut |
| Total livreurs / En ligne | Liste livreurs | nom, tel, gouvernorat, online, livraisons |
| Total confirmatrices | Liste confirmatrices | nom, online, charge, performance |
| Total réclamations / Par statut | Liste filtrée | type, motif, statut, client, commande |
| Total produits / Top vendu / Stock critique | Liste produits | référence, désignation, stock, ventes |

### 4.3.3 Composants partagés

**React** : `KpiDetailListPage.tsx` dans `React-Ecommerce/src/features/dashboard/components/`

```tsx
interface KpiDetailListPageProps {
  title: string;
  endpoint: string;
  columns: ColumnDef[];
  filters?: FilterDef[];
  exportEnabled: boolean;
  onRowClick?: (row) => void;
}
```

**Flutter** : `AdminKpiDetailScreen.dart` dans `flutter/lib/ui/admin/widgets/`

```dart
class AdminKpiDetailScreen<T> extends StatefulWidget {
  final String title;
  final Future<List<T>> Function(KpiFilters) loadData;
  final Widget Function(T item) buildRow;
  final List<ExportFormat> exports;
  final void Function(T item)? onRowTap;
}
```

Push navigation : `Navigator.push(...)` depuis le tap d'une `AdminKpiCard`.

---

## 4.4 Différenciation visuelle entre onglets

### 4.4.1 Identité par onglet

| Onglet | Couleur | Icône | Hero kicker |
|---|---|---|---|
| **Dashboard** | Indigo `#3F51B5` | `dashboard` | Cockpit général |
| **Commandes** | Bleu `#1976D2` | `inventory_2` | Pilotage logistique |
| **Livreurs** | Vert `#388E3C` | `local_shipping` | Performance terrain |
| **Confirmatrices** | Violet `#7B1FA2` | `support_agent` | Relation client |
| **Réclamations** | Orange `#F57C00` | `report_problem` | Service après-vente |
| **Produits** | Teal `#00796B` | `category` | Catalogue & ventes |
| **Chatbot** | Rose `#C2185B` | `smart_toy` | Assistant IA |
| **Paramètres** | Gris `#455A64` | `settings` | Configuration |

### 4.4.2 KPIs spécifiques par onglet

**Dashboard** (vue agrégée transverse — premier KPI = total commandes tous statuts)
- Total commandes (tous statuts)
- Total revenus 30j
- Total clients actifs
- Total livreurs en ligne
- Taux de livraison global
- Taux de retour global

**Commandes**
- Total / En attente / Confirmées / En livraison / Livrées / Reportées / Retournées / Refusées

**Livreurs**
- Total / En ligne / En pause / Hors ligne / Top livreur / Pire taux retour / Charge moyenne

**Confirmatrices**
- Total / En ligne / En pause / Charge moyenne / Temps traitement / Top conf / Cas > 24h

**Réclamations & Demandes**
- Total cas / Réclamations vs Demandes / 4 statuts / Top motif / Cas urgents / Taux résolution

**Produits**
- Total actifs / Top vendu / Top retourné / Stock critique / Ventes mois TND / Top gouvernorat

**Chatbot**
- Questions jour / mois / Top intent / Taux succès / Temps réponse / Users uniques

### 4.4.3 Hero card par onglet

```tsx
<DashboardHero
  kicker="Performance terrain"
  title="Vue livreurs"
  description="..."
  highlights={top3Kpis}
  accentColor="#388E3C"
  icon={LocalShippingOutlined}
/>
```

Composant existant `DashboardHero` enrichi avec `accentColor` et `icon`.

---

## 4.5 Section Produits — refonte complète

### 4.5.1 KPIs cliquables Produits

| KPI | Au clic, ouvre | Tri |
|---|---|---|
| Total produits | Liste tous produits | Alphabétique |
| Produit le + vendu | Liste produits | Tri ventes desc |
| Produit le + retourné | Liste produits | Tri retours desc |
| Stock critique | Liste produits stock < 7 | Stock asc |
| Ventes du mois | Liste produits | Tri CA desc |
| Top gouvernorat produits | Liste produits | Tri volumes-zone desc |

### 4.5.2 Détail produit (5 blocs)

1. **Identité** — Référence Sage (`ArRef`), désignation, catégorie, photo
2. **KPIs produit** — Stock actuel, ventes 30j, retours 30j, réclamations, note moyenne
3. **Courbes** — Ventes par jour 30j + Retours par jour 30j
4. **Répartition géographique** — Top 5 gouvernorats où il se vend
5. **Avis clients** — Liste, note moyenne, distribution étoiles

### 4.5.3 Endpoints

```
GET /api/admin/products/summary?period=30d
GET /api/admin/products?sort=sales&dir=desc&limit=50
GET /api/admin/products/{arRef}/detail
GET /api/admin/products/{arRef}/sales-trend?period=30d
GET /api/admin/products/{arRef}/by-governorate?period=30d
```

---

## 4.6 Onglet Paramètres — personnalisation thème global

### 4.6.1 Comportement

Nouvel onglet **« Paramètres »** dans l'admin Flutter et React. Permet de :

1. Changer la **couleur thème principale de toute l'app mobile** (livreur, client, confirmatrice, admin elle-même)
2. Choisir entre mode clair / sombre / auto
3. (V2) Gérer utilisateurs, rôles, paramètres plateforme

### 4.6.2 Section Apparence

```
┌─────────────────────────────────────────────────────────┐
│ APPARENCE                                                │
│                                                          │
│ Couleur principale                                       │
│ [🟦] [🟩] [🟧] [🟪] [🟥] [🟨] [⚫] [⚪]                  │
│  Bleu  Vert Orange Violet Rouge Jaune Noir Custom       │
│                                                          │
│ Mode                                                     │
│ ○ Clair  ● Sombre  ○ Auto (suit le système)            │
│                                                          │
│ [Aperçu en direct]                                       │
└─────────────────────────────────────────────────────────┘
```

### 4.6.3 Backend — table singleton

```sql
CREATE TABLE F_APP_CONFIG (
    Id INT PRIMARY KEY DEFAULT 1,
    PrimaryColor NVARCHAR(7) NOT NULL DEFAULT '#3F51B5',
    ThemeMode NVARCHAR(10) NOT NULL DEFAULT 'auto',
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedByUserId UNIQUEIDENTIFIER NULL,
    CONSTRAINT CK_AppConfig_OneRow CHECK (Id = 1)
);
INSERT INTO F_APP_CONFIG (Id, PrimaryColor, ThemeMode) VALUES (1, '#3F51B5', 'auto');
```

### 4.6.4 Endpoints

```
GET  /api/admin/config/theme    -- public, lu par toutes les apps au démarrage
PUT  /api/admin/config/theme    -- admin uniquement
```

### 4.6.5 Propagation aux apps mobiles

Au démarrage de chaque app Flutter :

```dart
class ThemeBootstrap {
  static Future<ThemeData> load() async {
    final response = await dio.get('/api/admin/config/theme');
    return ThemeData(
      primarySwatch: _hexToMaterialColor(response.data['primaryColor']),
      brightness: response.data['themeMode'] == 'dark' ? Brightness.dark : Brightness.light,
    );
  }
}
```

- **Cache local** : SharedPreferences pour éviter le flash au démarrage
- **Reload temps réel** : SignalR event `ThemeChanged` pour rafraîchir sans redémarrer

### 4.6.6 Sections futures (V2, cartes grisées)

- Gestion utilisateurs / rôles / permissions
- Configuration plateforme (frais 8 DT, timbre 1 DT, gouvernorats actifs)
- Configuration SMS gateway
- Logs et audit trail

Pour le PFE, **seule la section Apparence est obligatoire**.

---

## 4.7 Export Excel / PDF

### 4.7.1 Comportement

Dans chaque écran de liste KPI, 2 boutons en haut à droite :
- **Excel** (icône feuille verte) → télécharge un `.xlsx`
- **PDF** (icône PDF rouge) → télécharge un `.pdf`

L'export respecte les filtres actuels.

### 4.7.2 Backend Excel — ClosedXML

```csharp
public byte[] ExportOrdersToExcel(List<OrderDto> orders)
{
    using var workbook = new XLWorkbook();
    var sheet = workbook.Worksheets.Add("Commandes");
    
    sheet.Cell(1, 1).Value = "Référence";
    sheet.Cell(1, 2).Value = "Client";
    // ... headers
    
    var header = sheet.Range("A1:F1");
    header.Style.Font.Bold = true;
    header.Style.Fill.BackgroundColor = XLColor.LightGray;
    
    for (int i = 0; i < orders.Count; i++) { /* lignes */ }
    
    sheet.Columns().AdjustToContents();
    
    using var ms = new MemoryStream();
    workbook.SaveAs(ms);
    return ms.ToArray();
}
```

### 4.7.3 Backend PDF — QuestPDF

```csharp
public byte[] ExportOrdersToPdf(List<OrderDto> orders, AdminFilters filters)
{
    return Document.Create(container =>
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Header().Text("Rapport commandes").FontSize(18).Bold();
            page.Content().Column(col => { /* tableau */ });
            page.Footer().AlignCenter().Text(t => { /* pagination */ });
        });
    }).GeneratePdf();
}
```

### 4.7.4 Endpoints

```
GET /api/admin/orders/export?format=xlsx&period=30d&governorate=Sousse
GET /api/admin/reclamations/export?format=pdf&period=30d
```

### 4.7.5 Limites pratiques

- Max 10 000 lignes par export
- Au-delà → conseiller filtrer ou export async (V2)
- Loader visible pour les PDFs lourds

---

## 4.8 Audit boutons morts admin

Fichier livrable `ADMIN_BUTTONS_AUDIT.md`. Périmètre :
- React : `React-Ecommerce/src/features/dashboard/`
- Flutter : `flutter/lib/ui/admin/`

À vérifier en priorité :
- Boutons « Voir le détail » sur KPI cards
- Boutons « Exporter » Excel/PDF
- Filtres appliqués correctement et partagés avec l'export
- Drill-down depuis tableaux
- Actions admin (réinitialiser MDP, désactiver compte) si présentes

---

## 4.9 Cohérence avec l'existant

### 4.9.1 Ne PAS toucher

- Sparkline 7 jours
- Map premium (déjà refondue)
- `useDashboardFilters`, `DashboardHero`, `KpiGrid`, `ChartCard`
- Endpoints `useDashboardOverview`, `useDashboardLogistics`

### 4.9.2 À factoriser

- Les `*Summary` endpoints (1 endpoint = 1 vue, totaux cohérents)
- `KpiDetailListPage` et `AdminKpiDetailScreen` réutilisés partout
- `ExportService` partagé pour Excel et PDF

### 4.9.3 Migrations DB

- `F_APP_CONFIG` (singleton)
- Index `IX_F_RECLAMATION_Stats` :
  ```sql
  CREATE INDEX IX_F_RECLAMATION_Stats
  ON F_RECLAMATION (CreatedAt, Statut, TypeCas, Gouvernorat)
  WHERE IsDeleted = 0;
  ```

---

## 4.10 Plan d'exécution

1. Audit boutons morts → `ADMIN_BUTTONS_AUDIT.md`
2. Endpoint `/summary` cohérent + assertion en dev → étendre aux 5 sections
3. Différenciation visuelle (couleur, icône, kicker, KPIs par onglet)
4. KPIs cliquables (composants partagés + push nav)
5. Section Produits (KPIs + détail)
6. Onglet Paramètres (table + endpoints + UI + bootstrap + SignalR)
7. Export Excel/PDF (ClosedXML + QuestPDF + endpoints + UI)
8. Tests manuels (6 scénarios)
9. Re-audit boutons morts

---

## 4.11 Tests manuels (6 scénarios)

1. **Cohérence compteurs** — total = sum byStatus quel que soit le filtre
2. **Drill-down KPI** — clic Total commandes → push → liste → clic ligne → détail → retour
3. **Différenciation** — 8 onglets visités, couleurs + icônes + KPIs distincts
4. **Thème global** — admin choisit Vert → livreur/client/confirmatrice tous en vert sans redémarrage
5. **Export Excel** — fichier `.xlsx` téléchargé, header stylé, colonnes ajustées
6. **Export PDF** — fichier `.pdf` téléchargé, titre + période + tableau + pagination

---

**Fin de la section Admin. Section suivante : Chatbot intelligent.**
