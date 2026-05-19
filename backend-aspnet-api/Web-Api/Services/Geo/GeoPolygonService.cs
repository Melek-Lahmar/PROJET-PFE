using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using NetTopologySuite;
using NetTopologySuite.Features;
using NetTopologySuite.Geometries;
using NetTopologySuite.Index.Strtree;
using NetTopologySuite.IO;
using NetTopologySuite.Operation.Distance;
using Web_Api.Geo;

namespace Web_Api.Services.Geo;

public interface IGeoPolygonService
{
    bool IsReady { get; }
    int PolygonCount { get; }
    DateTime? LastLoadAt { get; }

    bool IsPointInDelegation(double latitude, double longitude, string gouvernorat, string delegation);
    GeoMatchResult? WhichDelegation(double latitude, double longitude);
    GeoValidationResult ValidatePoint(double latitude, double longitude, string declaredGouvernorat, string declaredDelegation);

    IReadOnlyList<DelegationCentroid> AllCentroids();
}

public sealed record GeoMatchResult(string Gouvernorat, string Delegation);

public sealed record GeoValidationResult(
    GeoValidationStatus Status,
    string? SuggestedGouvernorat,
    string? SuggestedDelegation,
    double? DistanceMeters,
    string Message
);

public sealed record DelegationCentroid(string Gouvernorat, string Delegation, double Latitude, double Longitude);

public enum GeoValidationStatus
{
    Ok,
    Warning,
    HardError,
    Unknown
}

public sealed class GeoPolygonService : IGeoPolygonService, IHostedService
{
    // ~200m de tolérance à la latitude tunisienne (1° lat ≈ 111 km → 0.0018° ≈ 200m).
    private const double BufferDegrees = 0.0018;
    private const double EarthRadiusMeters = 6_371_000.0;

    private readonly ILogger<GeoPolygonService> _logger;
    private readonly IHostEnvironment _env;
    private readonly GeometryFactory _geometryFactory =
        NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    private readonly object _initLock = new();
    private bool _initialized;

    private STRtree<DelegationFeature> _tree = new();
    private readonly List<DelegationFeature> _features = new();
    private readonly Dictionary<(string gouv, string deleg), DelegationFeature> _byNormalizedKey = new();
    private readonly Dictionary<string, string> _gouvCanonicalByNormalized = new(StringComparer.Ordinal);

    public bool IsReady { get; private set; }
    public int PolygonCount => _features.Count;
    public DateTime? LastLoadAt { get; private set; }

    public GeoPolygonService(ILogger<GeoPolygonService> logger, IHostEnvironment env)
    {
        _logger = logger;
        _env = env;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        EnsureLoaded();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private void EnsureLoaded()
    {
        if (_initialized) return;
        lock (_initLock)
        {
            if (_initialized) return;
            try
            {
                LoadPolygons();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GeoPolygonService] Failed to load delegation polygons, validation disabled");
                IsReady = false;
            }
            finally
            {
                _initialized = true;
            }
        }
    }

    private void LoadPolygons()
    {
        SeedGouvernoratCanonical();

        var geoJsonPath = ResolveGeoJsonPath();
        if (geoJsonPath is null)
        {
            _logger.LogWarning("[GeoPolygonService] GeoJSON file not found, polygon validation disabled (expected at Geo/Polygons/tunisia_delegations.geojson)");
            IsReady = false;
            return;
        }

        var sw = Stopwatch.StartNew();
        var json = File.ReadAllText(geoJsonPath);

        var reader = new GeoJsonReader(_geometryFactory, new Newtonsoft.Json.JsonSerializerSettings());
        var fc = reader.Read<FeatureCollection>(json) ?? new FeatureCollection();

        int loaded = 0, skipped = 0;
        foreach (var feat in fc)
        {
            if (feat.Geometry is null || feat.Attributes is null)
            {
                skipped++;
                continue;
            }

            var rawGouv = TryGet(feat.Attributes, "adm1_fr", "ADM1_FR", "ADM1_NAME", "ADM1Name", "adm1Name", "Gouvernorat", "gouvernorat", "NAME_1");
            var rawDeleg = TryGet(feat.Attributes, "adm2_fr", "ADM2_FR", "ADM2_NAME", "ADM2Name", "adm2Name", "Delegation", "delegation", "NAME_2");
            if (rawGouv is null || rawDeleg is null)
            {
                skipped++;
                continue;
            }

            var normGouv = NormalizeName(rawGouv);
            var normDeleg = NormalizeName(rawDeleg);

            var canonicalGouv = _gouvCanonicalByNormalized.TryGetValue(normGouv, out var canon)
                ? canon
                : rawGouv;

            Geometry buffered;
            try
            {
                buffered = feat.Geometry.Buffer(BufferDegrees);
            }
            catch
            {
                buffered = feat.Geometry;
            }

            var df = new DelegationFeature(canonicalGouv, rawDeleg, feat.Geometry, buffered, normGouv, normDeleg);
            _features.Add(df);
            _tree.Insert(buffered.EnvelopeInternal, df);
            _byNormalizedKey[(normGouv, normDeleg)] = df;
            loaded++;
        }

        if (loaded > 0)
        {
            _tree.Build();
        }
        sw.Stop();

        IsReady = loaded > 0;
        LastLoadAt = DateTime.UtcNow;

        _logger.LogInformation(
            "[GeoPolygonService] Loaded {Count} delegation polygons in {Ms}ms (skipped: {Skipped})",
            loaded, sw.ElapsedMilliseconds, skipped);
    }

    private string? ResolveGeoJsonPath()
    {
        const string fileName = "tunisia_delegations.geojson";
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Geo", "Polygons", fileName),
            Path.Combine(_env.ContentRootPath, "Geo", "Polygons", fileName),
        };
        foreach (var p in candidates)
        {
            if (File.Exists(p)) return p;
        }
        return null;
    }

    private void SeedGouvernoratCanonical()
    {
        foreach (var g in Enum.GetValues<GouvernoratTunisie>())
        {
            var spaced = SplitPascalCase(g.ToString());
            _gouvCanonicalByNormalized[NormalizeName(spaced)] = spaced;
            _gouvCanonicalByNormalized[NormalizeName(g.ToString())] = spaced;
        }
    }

    public bool IsPointInDelegation(double latitude, double longitude, string gouvernorat, string delegation)
    {
        EnsureLoaded();
        if (!IsReady) return false;

        var key = (NormalizeName(gouvernorat), NormalizeName(delegation));
        if (!_byNormalizedKey.TryGetValue(key, out var feat)) return false;

        var p = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));
        return feat.Geometry.Contains(p) || feat.Buffered.Contains(p);
    }

    public GeoMatchResult? WhichDelegation(double latitude, double longitude)
    {
        EnsureLoaded();
        if (!IsReady) return null;

        var p = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));
        var env = new Envelope(p.Coordinate);
        var candidates = _tree.Query(env);
        foreach (var feat in candidates)
        {
            if (feat.Geometry.Contains(p))
            {
                return new GeoMatchResult(feat.Gouvernorat, feat.Delegation);
            }
        }
        return null;
    }

    public GeoValidationResult ValidatePoint(double latitude, double longitude, string declaredGouvernorat, string declaredDelegation)
    {
        EnsureLoaded();
        if (!IsReady)
        {
            return new GeoValidationResult(GeoValidationStatus.Unknown, null, null, null,
                "Validation géographique indisponible (polygones non chargés).");
        }

        var p = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));
        var declaredKey = (NormalizeName(declaredGouvernorat), NormalizeName(declaredDelegation));
        _byNormalizedKey.TryGetValue(declaredKey, out var declaredFeat);

        if (declaredFeat is not null)
        {
            if (declaredFeat.Geometry.Contains(p))
            {
                return new GeoValidationResult(GeoValidationStatus.Ok, declaredFeat.Gouvernorat, declaredFeat.Delegation, 0.0,
                    "Point dans la délégation déclarée.");
            }
            if (declaredFeat.Buffered.Contains(p))
            {
                var dist = DistanceMeters(p, declaredFeat.Geometry);
                return new GeoValidationResult(GeoValidationStatus.Ok, declaredFeat.Gouvernorat, declaredFeat.Delegation, dist,
                    $"Point à proximité de la frontière (~{Math.Round(dist)}m), accepté avec tolérance.");
            }
        }

        var actual = WhichDelegation(latitude, longitude);
        if (actual is null)
        {
            return new GeoValidationResult(GeoValidationStatus.HardError, null, null, null,
                "Point hors Tunisie ou hors couverture des délégations.");
        }

        double? distDeclared = declaredFeat is not null ? DistanceMeters(p, declaredFeat.Geometry) : null;

        var declaredGouvNormalized = NormalizeName(declaredGouvernorat);
        var actualGouvNormalized = NormalizeName(actual.Gouvernorat);

        if (declaredGouvNormalized == actualGouvNormalized)
        {
            return new GeoValidationResult(GeoValidationStatus.Warning, actual.Gouvernorat, actual.Delegation, distDeclared,
                $"Point situé dans {actual.Delegation} (même gouvernorat que la délégation déclarée).");
        }

        return new GeoValidationResult(GeoValidationStatus.HardError, actual.Gouvernorat, actual.Delegation, distDeclared,
            $"Point situé dans {actual.Gouvernorat} / {actual.Delegation}, ne correspond pas au gouvernorat déclaré.");
    }

    public IReadOnlyList<DelegationCentroid> AllCentroids()
    {
        EnsureLoaded();
        if (!IsReady) return Array.Empty<DelegationCentroid>();
        return _features
            .Select(f =>
            {
                var c = f.Geometry.Centroid;
                return new DelegationCentroid(f.Gouvernorat, f.Delegation, c.Y, c.X);
            })
            .ToList();
    }

    private static double DistanceMeters(Point p, Geometry g)
    {
        var nearest = DistanceOp.NearestPoints(p, g);
        return Haversine(p.Y, p.X, nearest[1].Y, nearest[1].X);
    }

    private static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        static double Rad(double d) => d * Math.PI / 180.0;
        var dLat = Rad(lat2 - lat1);
        var dLon = Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * EarthRadiusMeters * Math.Asin(Math.Min(1.0, Math.Sqrt(a)));
    }

    private static string? TryGet(IAttributesTable t, params string[] names)
    {
        var existing = t.GetNames();
        foreach (var n in names)
        {
            if (Array.IndexOf(existing, n) >= 0)
            {
                var v = t[n]?.ToString();
                if (!string.IsNullOrWhiteSpace(v)) return v;
            }
        }
        return null;
    }

    private static string SplitPascalCase(string s) =>
        Regex.Replace(s, "(?<!^)([A-Z])", " $1");

    // Aligned with Web_Api.Geo.TunisieDecoupage.NormalizeKey (private there).
    internal static string NormalizeName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var s = value.Trim().ToLowerInvariant()
            .Replace('–', '-').Replace('—', '-')
            .Replace('’', '\'');

        var norm = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(norm.Length);
        foreach (var c in norm)
        {
            var uc = CharUnicodeInfo.GetUnicodeCategory(c);
            if (uc == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(c)) sb.Append(c);
            else if (c == '-' || char.IsWhiteSpace(c)) sb.Append(' ');
        }
        return string.Join(' ', sb.ToString().Normalize(NormalizationForm.FormC)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private sealed record DelegationFeature(
        string Gouvernorat,
        string Delegation,
        Geometry Geometry,
        Geometry Buffered,
        string NormalizedGouv,
        string NormalizedDeleg
    );
}
