# Prompt Claude Code — Chantier 1 : Données géo + polygones de validation

> **Contexte projet** : monorepo PFE (`Web-Api(Asp.net)/Web-Api/` + `flutter/` + `React-Ecommerce/`).
> Lire d'abord `Web-Api(Asp.net)/Web-Api/Web-Api_REFERENCE_PFE.md` puis `CLAUDE.md` à la racine avant toute modification.
> Chemin backend à TOUJOURS quoter dans les commandes shell : `"Web-Api(Asp.net)/Web-Api/"`.

---

## 1. Objectif

Construire la **fondation géographique** du système. À la fin du chantier, le backend doit :

1. Connaître les **24 gouvernorats** et leurs **~264 délégations** de Tunisie.
2. Pouvoir tester en mémoire si un point GPS (lat/lng) tombe dans une délégation précise, grâce à un fichier GeoJSON chargé au démarrage.
3. Exposer 3 endpoints REST utilisables par React + Flutter.

**Périmètre : backend uniquement.** Aucune modification Flutter / React dans ce chantier. UI = chantiers ultérieurs.

---

## 2. Ce qui existe déjà (NE PAS recréer)

- `Web-Api(Asp.net)/Web-Api/Geo/TunisieDecoupage.cs` — référentiel code-first des gouvernorats + délégations.
- Endpoint existant : `GET /api/geo/gouvernorats`.
- Le `ProfilUtilisateur` a déjà `Gouvernorat` (enum) + `Delegation` (string) + `Latitude` + `Longitude`.
- `F_CLIENT_ADDRESS` a déjà `Gouvernorat` + `Delegation` + `Ville` + `Latitude` + `Longitude`.

**Première chose à faire avant tout code** : lire `TunisieDecoupage.cs` et vérifier la complétude. Si certaines délégations manquent par rapport à la liste officielle INKN (Institut National de la Statistique Tunisie), les compléter. Sinon laisser tel quel.

---

## 3. Spécifications détaillées

### 3.1 Dépendance NuGet à ajouter

Dans `Web-Api(Asp.net)/Web-Api/Web-Api.csproj` :

```xml
<PackageReference Include="NetTopologySuite" Version="2.5.0" />
<PackageReference Include="NetTopologySuite.IO.GeoJSON" Version="4.0.0" />
```

Pas d'autres deps. NetTopologySuite gère les polygones et le test point-in-polygon en C# natif, hors-ligne, gratuit.

### 3.2 Fichier GeoJSON à intégrer

Créer le dossier `Web-Api(Asp.net)/Web-Api/Geo/Polygons/`.

Y placer un fichier `tunisia_delegations.geojson` contenant les polygones (MultiPolygon) des ~264 délégations tunisiennes. Source : dataset OCHA humdata.org « Tunisia Subnational Administrative Boundaries » niveau ADM2 (délégations).

URL de référence (à télécharger manuellement par l'utilisateur si pas accessible en script) :
`https://data.humdata.org/dataset/cod-ab-tun`

Structure attendue de chaque feature :
```json
{
  "type": "Feature",
  "properties": {
    "adm1_fr": "Sousse",
    "adm2_fr": "Hammam Sousse"
  },
  "geometry": { "type": "MultiPolygon", "coordinates": [...] }
}
```

**Important** : les noms dans le GeoJSON peuvent légèrement différer de ceux de `TunisieDecoupage.cs` (accents, tirets, espaces). Implémenter une fonction de **normalisation** (`NormalizeName(string s)` : trim + lowercase + retirer accents + retirer espaces/tirets) appliquée des deux côtés pour le matching. Stocker un dictionnaire `(NormalizedGouv, NormalizedDeleg) → Polygon`.

Mettre le csproj à `<Content Include="Geo/Polygons/*.geojson" CopyToOutputDirectory="PreserveNewest" />` pour que le fichier soit copié à la publication.

### 3.3 Nouveau service `GeoPolygonService`

Créer `Web-Api(Asp.net)/Web-Api/Services/Geo/GeoPolygonService.cs`.

```csharp
public interface IGeoPolygonService
{
    /// <summary>Vrai si le point GPS tombe dans la délégation déclarée (avec marge de tolérance).</summary>
    bool IsPointInDelegation(double latitude, double longitude, string gouvernorat, string delegation);

    /// <summary>Renvoie la délégation qui contient le point, null si aucune match.</summary>
    GeoMatchResult? WhichDelegation(double latitude, double longitude);

    /// <summary>Validation complète avec niveau de criticité.</summary>
    GeoValidationResult ValidatePoint(double latitude, double longitude, string declaredGouvernorat, string declaredDelegation);

    /// <summary>True si le service a chargé ses polygones avec succès.</summary>
    bool IsReady { get; }
}

public sealed record GeoMatchResult(string Gouvernorat, string Delegation);

public sealed record GeoValidationResult(
    GeoValidationStatus Status,
    string? SuggestedGouvernorat,
    string? SuggestedDelegation,
    double? DistanceMeters,
    string Message
);

public enum GeoValidationStatus
{
    Ok,            // Point dans la délégation déclarée (ou < 200m de sa frontière)
    Warning,       // Point dans une autre délégation du même gouvernorat
    HardError,     // Point dans un autre gouvernorat OU hors Tunisie
    Unknown        // Polygones pas trouvés (fallback : on accepte sans valider)
}
```

**Règles de validation** :
- Le service charge le GeoJSON une seule fois au démarrage (`IHostedService` ou init dans le constructeur). Logguer le nombre de polygones chargés.
- Tolérance frontière : on construit un **buffer de 200 mètres autour de chaque polygone** (en utilisant `Polygon.Buffer(0.0018)` ~200m en degrés à la latitude tunisienne) pour le test « ok avec tolérance ». 
- `IsPointInDelegation` retourne `true` si le point est dans le polygone OU son buffer.
- `WhichDelegation` itère sur tous les polygones (cache spatial avec `STRtree` pour rapidité).
- Si `IsReady == false` (polygones absents), `ValidatePoint` retourne toujours `Unknown` avec message *« Validation géographique indisponible »* — pas de blocage applicatif.

Enregistrer comme **Singleton** dans `Program.cs` :
```csharp
builder.Services.AddSingleton<IGeoPolygonService, GeoPolygonService>();
```

### 3.4 DTOs

Créer `Web-Api(Asp.net)/Web-Api/DTO/Geo/` :

- `DelegationDto.cs` : `{ Gouvernorat: string, Delegation: string, CentroidLatitude: double?, CentroidLongitude: double? }`
- `ValidatePointRequest.cs` : `{ Latitude: double, Longitude: double, Gouvernorat: string, Delegation: string }`
- `ValidatePointResponse.cs` : `{ Status: string ("Ok"|"Warning"|"HardError"|"Unknown"), SuggestedGouvernorat: string?, SuggestedDelegation: string?, DistanceMeters: double?, Message: string }`

### 3.5 Endpoints REST

Ajouter dans `Web-Api(Asp.net)/Web-Api/Controllers/Geo/` :

**A. GET `/api/geo/delegations`** (anonymous, ou auth selon convention projet)
- Query param `?gouvernorat=Sousse` (optionnel — si absent, retourne toutes les délégations groupées par gouvernorat).
- Réponse : `List<DelegationDto>` triée alphabétiquement.
- Centroïde rempli si polygones chargés, null sinon.

**B. POST `/api/geo/validate-point`** (auth requis — CLIENT, VENDEUR, ADMIN)
- Body : `ValidatePointRequest`
- Validation des inputs (lat ∈ [-90,90], lng ∈ [-180,180], gouvernorat non vide, delegation non vide).
- Réponse 200 : `ValidatePointResponse`.
- Réponse 400 si inputs invalides.

**C. GET `/api/geo/health`** (anonymous)
- Réponse `{ polygonsLoaded: bool, polygonCount: int, lastLoadAt: DateTime? }` — utile pour le monitoring admin.

Toutes les routes doivent suivre la convention `[ApiController]` + `[Route("api/geo/...")]` du projet et utiliser le `GlobalExceptionMiddleware` existant pour les erreurs.

### 3.6 Tests

Ajouter un projet de tests s'il n'existe pas (`Web-Api(Asp.net)/Web-Api.Tests/` avec xUnit) OU au minimum un dossier `Tests/Geo/` avec une console testable manuellement.

Cas de tests obligatoires (à coder dans la sortie) :

1. **Centroïde Tunis Médina** (~36.7986, 10.1664) avec délégation déclarée « Tunis Médina » → `Status = Ok`.
2. **Point Marsa** (~36.8829, 10.3215) avec délégation déclarée « Tunis Médina » → `Status = Warning`, suggéré « La Marsa ».
3. **Point Sfax centre** (~34.7402, 10.7603) avec gouvernorat déclaré « Sousse » → `Status = HardError`, suggéré « Sfax ».
4. **Point en Méditerranée** (~37.5, 11.0) avec n'importe quelle délégation → `Status = HardError`, message *« hors Tunisie »*.
5. **Point dans le buffer 200m** d'une frontière → `Status = Ok` (tolérance).

---

## 4. Critères d'acceptation

Au terme du chantier :

- [ ] `dotnet build` passe sans erreur ni warning sur le projet backend.
- [ ] `dotnet ef migrations list` n'a pas changé (aucune migration ajoutée — ce chantier n'a pas de DB).
- [ ] Au démarrage de l'API, un log INFO apparaît : `[GeoPolygonService] Loaded {N} delegation polygons in {ms}ms` avec N >= 200.
- [ ] `GET /api/geo/health` retourne `polygonsLoaded: true, polygonCount: >=200`.
- [ ] `GET /api/geo/delegations?gouvernorat=Sousse` retourne au moins 16 délégations (Sousse en a 16).
- [ ] `POST /api/geo/validate-point` répond correctement aux 5 cas de tests ci-dessus.
- [ ] Si le fichier GeoJSON est absent du dossier `Geo/Polygons/`, l'API démarre quand même, log un WARNING `[GeoPolygonService] GeoJSON file not found, polygon validation disabled`, et `validate-point` retourne `Status = Unknown` au lieu de planter.
- [ ] Un fichier `CHANTIER_1_GEO_REPORT.md` est créé à la racine du repo, listant : fichiers créés/modifiés, version de NetTopologySuite, nombre de polygones chargés, échantillon de logs au démarrage, résultats des 5 tests.

---

## 5. À NE PAS toucher dans ce chantier

- `flutter/` : aucune modification.
- `React-Ecommerce/` : aucune modification.
- Aucune migration EF Core. Aucun changement de schéma DB.
- `TunisieDecoupage.cs` : compléter si nécessaire, mais ne pas refactorer la structure.
- Endpoints existants (`/api/geo/gouvernorats`, autres) : ne pas casser leurs contrats.
- Pas de modification du `Program.cs` au-delà de l'enregistrement du nouveau service.

---

## 6. Livrables

À la fin, commit unique (ou série de commits clairs) avec message :
```
feat(geo): polygons-based delegation validation (Chantier 1)

- NetTopologySuite + GeoJSON of 264 Tunisia delegations
- GeoPolygonService singleton (in-memory STRtree)
- Endpoints: GET /api/geo/delegations, POST /api/geo/validate-point, GET /api/geo/health
- 200m boundary tolerance, graceful fallback if GeoJSON missing
```

Et **arrêt** : ne pas enchaîner sur d'autres chantiers, attendre validation utilisateur.
