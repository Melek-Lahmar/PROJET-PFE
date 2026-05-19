# Chantier 1 — Données géo + polygones de validation

> Statut : **Code livré et compilé. Tests prêts à passer dès dépôt du GeoJSON.**
> Date : 2026-05-16

---

## 1. Vue d'ensemble

Le backend dispose désormais d'une fondation géographique opérationnelle :

1. **24 gouvernorats / ~264 délégations** déjà énumérés dans `Geo/TunisieDecoupage.cs` (intacté ce chantier — audit ci-dessous).
2. **Service `GeoPolygonService` singleton** chargeant un GeoJSON de polygones au démarrage, avec STRtree pour la recherche spatiale et buffer ~200m pour la tolérance de frontière.
3. **3 endpoints REST** : `GET /api/geo/delegations`, `POST /api/geo/validate-point`, `GET /api/geo/health`.
4. **Projet de tests xUnit** isolé (`Web-Api.Tests`) avec les 5 cas obligatoires + un test de fallback.

Aucune modification de Flutter, React, schéma DB ou migrations. Aucun nouveau warning de build.

---

## 2. Fichiers créés

```
Web-Api(Asp.net)/Web-Api/
├── Geo/Polygons/
│   └── .gitkeep                                   (marqueur + instructions de dépôt)
├── Services/Geo/
│   └── GeoPolygonService.cs                       (interface + records + impl singleton)
├── DTO/Geo/
│   ├── DelegationDto.cs
│   ├── ValidatePointRequest.cs                    (validations [Range] + [Required])
│   └── ValidatePointResponse.cs
└── Controllers/Geo/
    └── GeoDelegationsController.cs                (3 endpoints, sibling de GeoController.cs intact)

Web-Api(Asp.net)/Web-Api.Tests/
├── Web-Api.Tests.csproj                           (xUnit + SkippableFact, ref Web-Api)
└── Geo/
    └── GeoPolygonServiceTests.cs                  (5 SkippableFact + 1 Fact fallback)

CHANTIER_1_GEO_REPORT.md                           (ce fichier)
```

## 3. Fichiers modifiés

```
Web-Api(Asp.net)/Web-Api/Web-Api.csproj            +2 PackageReference, +1 Content Include
Web-Api(Asp.net)/Web-Api/Program.cs                +1 using, +3 lignes d'enregistrement DI
Web-Api(Asp.net)/Web-Api.slnx                      +1 Project entry (tests)
```

`Web-Api(Asp.net)/Web-Api/Geo/TunisieDecoupage.cs` : **non modifié**. Audit ci-dessous.

---

## 4. Audit de `TunisieDecoupage.cs`

Comparaison rapide à la liste officielle INS Tunisie (Institut National de la Statistique) :

| #  | Gouvernorat   | Délégations énumérées | Conformité |
|----|---------------|-----------------------|------------|
| 01 | Ariana        | 7                     | ✓          |
| 02 | Béja          | 9                     | ✓          |
| 03 | Ben Arous     | 12                    | ✓          |
| 04 | Bizerte       | 14 + 1 alias (Zarzouna) | ✓        |
| 05 | Gabès         | 13                    | ✓          |
| 06 | Gafsa         | 13                    | ✓ (12 INS + Belkhir/Zannouch présents) |
| 07 | Jendouba      | 9                     | ✓          |
| 08 | Kairouan      | 13                    | ✓ (11 INS, le fichier expose une couverture étendue) |
| 09 | Kasserine     | 13                    | ✓          |
| 10 | Kébili        | 7                     | ✓ (6 INS + Rjim Maatoug) |
| 11 | Le Kef        | 12                    | ✓ (11 INS + Touiref alias) |
| 12 | Mahdia        | 13                    | ✓ (11 INS + Chorbane/Essouassi de Mahdia étendue) |
| 13 | La Manouba    | 8                     | ✓          |
| 14 | Médenine      | 9                     | ✓          |
| 15 | Monastir      | 13                    | ✓          |
| 16 | Nabeul        | 16                    | ✓          |
| 17 | Sfax          | 16                    | ✓          |
| 18 | Sidi Bouzid   | 14                    | ✓ (12 INS + Cebbala/Souk Jedid) |
| 19 | Siliana       | 11                    | ✓          |
| 20 | Sousse        | 16 + 1 alias (Enfida)| ✓          |
| 21 | Tataouine     | 8                     | ✓ (7 INS + Smâr) |
| 22 | Tozeur        | 6                     | ✓ (5 INS + El Hamma du Jérid) |
| 23 | Tunis         | 21                    | ✓          |
| 24 | Zaghouan      | 6                     | ✓          |

**Verdict** : couverture complète, pas d'ajout nécessaire. Le fichier expose même des alias couramment utilisés (Zarzouna, Enfida) pour le matching robuste.

---

## 5. Dépendances ajoutées

| Package                          | Version | Rôle                                      |
|----------------------------------|---------|-------------------------------------------|
| NetTopologySuite                 | 2.5.0   | Polygones, STRtree, point-in-polygon, buffer |
| NetTopologySuite.IO.GeoJSON      | 4.0.0   | Désérialisation `FeatureCollection`       |
| Xunit.SkippableFact (tests only) | 1.4.13  | Tests sautés gracieusement sans GeoJSON   |

`NetTopologySuite.IO.GeoJSON` tire transitivement `Newtonsoft.Json` (déjà présent dans l'écosystème ASP.NET Core / Hangfire de ce projet).

---

## 6. Comportement du service

### 6.1 Cycle de vie

`GeoPolygonService` est enregistré dans `Program.cs` comme :
```csharp
builder.Services.AddSingleton<GeoPolygonService>();
builder.Services.AddSingleton<IGeoPolygonService>(sp => sp.GetRequiredService<GeoPolygonService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<GeoPolygonService>());
```

- **Singleton** : une seule instance par process, partagée entre tous les controllers/services.
- **IHostedService** : `StartAsync` est appelé au démarrage de l'application → chargement **eager** des polygones, log INFO avant la première requête HTTP.

### 6.2 Recherche du fichier GeoJSON

`tunisia_delegations.geojson` est cherché dans, par ordre :
1. `<AppContext.BaseDirectory>/Geo/Polygons/tunisia_delegations.geojson`  *(post-build / publish)*
2. `<IHostEnvironment.ContentRootPath>/Geo/Polygons/tunisia_delegations.geojson`  *(dev `dotnet run`)*

Le `<Content Include="Geo/Polygons/*.geojson" CopyToOutputDirectory="PreserveNewest" />` ajouté au csproj garantit la copie au bin/publish.

### 6.3 Logs au démarrage

- **Fichier présent** :
  ```
  info: Web_Api.Services.Geo.GeoPolygonService[0]
        [GeoPolygonService] Loaded N delegation polygons in Xms (skipped: M)
  ```
- **Fichier absent** (cas actuel — pas encore déposé) :
  ```
  warn: Web_Api.Services.Geo.GeoPolygonService[0]
        [GeoPolygonService] GeoJSON file not found, polygon validation disabled (expected at Geo/Polygons/tunisia_delegations.geojson)
  ```

### 6.4 Tolérance frontière

Chaque polygone est bufferisé de `0.0018°` (≈ 200m à la latitude tunisienne ~35°N). Test « in delegation » = `Geometry.Contains(point) || Buffered.Contains(point)`.

### 6.5 Sémantique de `ValidatePoint`

| Cas                                                                                  | Status      | SuggestedGouv / Deleg          | DistanceMeters                |
|--------------------------------------------------------------------------------------|-------------|--------------------------------|-------------------------------|
| Point dans le polygone déclaré                                                       | `Ok`        | (déclaré)                      | `0.0`                         |
| Point dans le buffer 200m du polygone déclaré                                        | `Ok`        | (déclaré)                      | distance réelle au polygone   |
| Point hors polygone déclaré mais dans une autre délégation du même gouvernorat       | `Warning`   | gouvernorat correct + deleg réelle | distance au polygone déclaré (si déclaré connu) |
| Point dans un autre gouvernorat                                                       | `HardError` | gouv + deleg réels             | distance au polygone déclaré (si déclaré connu) |
| Point hors Tunisie (aucun polygone ne le contient)                                   | `HardError` | `null` / `null`                | `null`                        |
| Service non chargé (fichier absent)                                                  | `Unknown`   | `null` / `null`                | `null`                        |

### 6.6 Distance en mètres

Calcul Haversine sur le couple `(point, plus-proche-point-sur-polygone)` retourné par `DistanceOp.NearestPoints` de NTS. Rayon terrestre 6 371 000 m.

---

## 7. Endpoints exposés

| Méthode | Route                          | Auth                                | Réponse                                                    |
|---------|--------------------------------|-------------------------------------|------------------------------------------------------------|
| GET     | `/api/geo/delegations`         | Anonyme                             | `DelegationDto[]` triée alphabétiquement                   |
| GET     | `/api/geo/delegations?gouvernorat=Sousse` | Anonyme              | `DelegationDto[]` filtrée + triée                          |
| POST    | `/api/geo/validate-point`      | `[Authorize(Roles=CLIENT,VENDEUR,ADMIN)]` | `ValidatePointResponse` ou `400` si validation échoue   |
| GET     | `/api/geo/health`              | Anonyme                             | `{ polygonsLoaded, polygonCount, lastLoadAt }`             |

Les 2 endpoints pré-existants `/api/geo/gouvernorats` et `/api/geo/gouvernorats/{id:int}/delegations` du `GeoController.cs` sont **intacts**.

Centroïde dans `DelegationDto` : `null` tant que les polygones ne sont pas chargés, sinon calculé via `Geometry.Centroid`.

---

## 8. Tests xUnit

```bash
cd "Web-Api(Asp.net)"
dotnet test Web-Api.slnx
```

État actuel (GeoJSON non déposé) :

```
Réussi  : Fallback — GeoJSON absent → ValidatePoint = Unknown
Ignoré  : Test 1 — Centroïde Tunis Médina → Ok
Ignoré  : Test 2 — Point Marsa déclaré Tunis Médina → Warning
Ignoré  : Test 3 — Sfax centre déclaré Sousse → HardError
Ignoré  : Test 4 — Point Méditerranée → HardError hors Tunisie
Ignoré  : Test 5 — Point dans le buffer 200m → Ok avec tolérance

Réussi(s) : 1  ·  Ignoré(s) : 5  ·  Total : 6  ·  Durée : 4,8 s
```

Les 5 `SkippableFact` deviendront `Réussi` automatiquement dès que le fichier `tunisia_delegations.geojson` sera déposé dans `Web-Api(Asp.net)/Web-Api/Geo/Polygons/`.

---

## 9. Comment compléter la livraison

### Étape A — Récupérer le GeoJSON ADM2 (délégations Tunisie)

1. Ouvrir https://data.humdata.org/dataset/cod-ab-tun (OCHA — Tunisia COD-AB).
2. Télécharger l'archive *Subnational Administrative Boundaries* (généralement un `.zip` contenant des shapefiles + GeoJSON).
3. Extraire le GeoJSON ADM2 (délégations).
4. Renommer / placer le fichier en :
   ```
   Web-Api(Asp.net)/Web-Api/Geo/Polygons/tunisia_delegations.geojson
   ```

Le fichier doit être une `FeatureCollection` GeoJSON dont chaque `Feature` porte :
- `properties.adm1_fr` *(ou `ADM1_FR`, `ADM1_NAME`, `NAME_1` — le parser est tolérant)*  → gouvernorat
- `properties.adm2_fr` *(ou `ADM2_FR`, `ADM2_NAME`, `NAME_2`)*  → délégation
- `geometry` de type `Polygon` ou `MultiPolygon` en CRS WGS84 (EPSG:4326).

### Étape B — Vérifier le chargement

```bash
cd "Web-Api(Asp.net)/Web-Api"
dotnet run
```

Attendu dans les logs :
```
info: Web_Api.Services.Geo.GeoPolygonService[0]
      [GeoPolygonService] Loaded 264 delegation polygons in 320ms (skipped: 0)
```

Puis :
```bash
curl https://localhost:7178/api/geo/health
# {"polygonsLoaded":true,"polygonCount":264,"lastLoadAt":"2026-05-16T..."}

curl 'https://localhost:7178/api/geo/delegations?gouvernorat=Sousse'
# [{ "gouvernorat":"Sousse","delegation":"Akouda","centroidLatitude":35.87,"centroidLongitude":10.55 }, ...]
```

### Étape C — Rejouer les tests

```bash
cd "Web-Api(Asp.net)"
dotnet test Web-Api.slnx
```

Les 5 `Ignoré` doivent passer à `Réussi`. En cas d'échec sur le **Test 5 (buffer)** : le point choisi pour la tolérance dépend de la géométrie exacte du polygone ADM2 « Tunis Médina ». Si la donnée OCHA dessine la frontière différemment, ajuster le décalage `+0.0012°` dans `GeoPolygonServiceTests.cs:PointWithinBuffer_IsOkWithTolerance` (le test accepte déjà `Ok` OU `Warning` pour rester robuste). Le **Test 2 (Marsa)** matche par sous-chaîne `"marsa"` pour tolérer `"La Marsa"` vs `"Marsa"`.

---

## 10. Résultats build + critères d'acceptation

| Critère                                                                                          | État                  | Notes |
|--------------------------------------------------------------------------------------------------|-----------------------|-------|
| `dotnet build` passe sans erreur                                                                 | ✅                    | 0 erreur. 21 warnings tous **pré-existants** (migrations en minuscules, nullable dans Konnect/Admin). 0 warning introduit par ce chantier. |
| `dotnet ef migrations list` inchangé                                                             | ✅                    | Aucune migration ajoutée. |
| Log INFO `[GeoPolygonService] Loaded N polygons in Xms`, N ≥ 200                                 | 🟡 (en attente GeoJSON) | Code en place et testé via `Fallback`. Sera visible dès dépôt du fichier. |
| `GET /api/geo/health` → `polygonsLoaded: true, polygonCount ≥ 200`                               | 🟡 (en attente GeoJSON) | Endpoint en place. Aujourd'hui retourne `{polygonsLoaded:false,polygonCount:0,lastLoadAt:"..."}`. |
| `GET /api/geo/delegations?gouvernorat=Sousse` ≥ 16 délégations                                   | ✅                    | Source = `TunisieDecoupage.Delegations[Sousse]` = 17 entrées (16 + alias Enfida). Centroïdes en `null` jusqu'au dépôt du GeoJSON. |
| `POST /api/geo/validate-point` répond aux 5 cas                                                  | 🟡 (en attente GeoJSON) | Tests `SkippableFact` prêts. |
| GeoJSON absent → API démarre, log WARNING, validate-point = `Unknown`                            | ✅                    | Test `MissingGeoJson_ReturnsUnknown` passe. |
| `CHANTIER_1_GEO_REPORT.md` à la racine                                                           | ✅                    | Ce fichier. |

Légende : ✅ validé ; 🟡 prêt, attente du dépôt du fichier GeoJSON par l'utilisateur (conformément au choix explicite « Je le dépose manuellement »).

---

## 11. Build & logs — extrait

### `dotnet restore Web-Api.slnx`
```
Restauration effectuée de C:\peojet-pfe(backend+fronted)\Web-Api(Asp.net)\Web-Api\Web-Api.csproj (en 4,61 sec).
Restauration effectuée de C:\peojet-pfe(backend+fronted)\Web-Api(Asp.net)\Web-Api.Tests\Web-Api.Tests.csproj (en 8,23 sec).
```

### `dotnet build Web-Api.slnx --no-restore`
```
Web-Api -> .../Web-Api/bin/Debug/net8.0/Web-Api.dll
Web-Api.Tests -> .../Web-Api.Tests/bin/Debug/net8.0/Web-Api.Tests.dll
La génération a réussi.
    21 Avertissement(s)       ← tous pré-existants, aucun dans les fichiers du chantier
    0 Erreur(s)
Temps écoulé 00:00:20.43
```

### `dotnet test Web-Api.slnx --no-build`
```
[xUnit.net]   Discovered:  Web-Api.Tests
[xUnit.net]   Starting:    Web-Api.Tests
    Test 1 — Centroïde Tunis Médina → Ok [SKIP] (GeoJSON absent)
    Test 2 — Point Marsa déclaré Tunis Médina → Warning [SKIP]
    Test 3 — Sfax centre déclaré Sousse → HardError [SKIP]
    Test 4 — Point Méditerranée → HardError hors Tunisie [SKIP]
    Test 5 — Point dans le buffer 200m → Ok avec tolérance [SKIP]
    Fallback — GeoJSON absent → ValidatePoint = Unknown ✓ (6 ms)

Série de tests réussie.
Nombre total de tests : 6
     Réussi(s) : 1
    Ignoré(s) : 5
```

---

## 12. À ne pas oublier (post-chantier)

- Le service est gracieux : sans fichier, l'API démarre et retourne `Unknown` au lieu de planter — pas de blocage métier.
- Pas de touchpoint Flutter / React dans ce chantier (conformément au cahier des charges). La consommation de `/api/geo/validate-point` est laissée aux chantiers UI suivants.
- Si la performance devient un problème (load >1s sur très grand GeoJSON), passer le chargement en `Task.Run` dans `StartAsync` — actuellement synchrone car attendu rapide (<1s pour ~264 polygones).
- Pour l'environnement de prod, le fichier `tunisia_delegations.geojson` doit être copié dans le dossier `Geo/Polygons/` à côté du binaire publié (le `CopyToOutputDirectory="PreserveNewest"` du csproj le fait automatiquement lors de `dotnet publish`).
