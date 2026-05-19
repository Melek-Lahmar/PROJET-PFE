using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Web_Api.Services.Geo;
using Xunit;

namespace Web_Api.Tests.Geo;

public class GeoPolygonServiceTests
{
    private static GeoPolygonService BuildService(string? contentRootOverride = null)
    {
        var env = new TestHostEnvironment
        {
            ContentRootPath = contentRootOverride ?? LocateWebApiContentRoot(),
        };
        var svc = new GeoPolygonService(NullLogger<GeoPolygonService>.Instance, env);
        ((IHostedService)svc).StartAsync(CancellationToken.None).GetAwaiter().GetResult();
        return svc;
    }

    private static string LocateWebApiContentRoot()
    {
        // Remonte depuis bin/Debug/net8.0 jusqu'à trouver le projet Web-Api voisin.
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "..", "Web-Api", "Web-Api.csproj");
            if (File.Exists(candidate))
            {
                return Path.GetFullPath(Path.Combine(dir.FullName, "..", "Web-Api"));
            }
            dir = dir.Parent;
        }
        return AppContext.BaseDirectory;
    }

    private const string SkipNoGeoJson =
        "GeoJSON tunisia_delegations.geojson absent du dossier Web-Api/Geo/Polygons/ — test sauté (cf. CHANTIER_1_GEO_REPORT.md).";

    [SkippableFact(DisplayName = "Test 1 — Centroïde Tunis Médina → Ok")]
    public void TunisMedina_Centroid_IsOk()
    {
        var svc = BuildService();
        Skip.IfNot(svc.IsReady, SkipNoGeoJson);

        var r = svc.ValidatePoint(36.7986, 10.1664, "Tunis", "Médina");

        Assert.Equal(GeoValidationStatus.Ok, r.Status);
    }

    [SkippableFact(DisplayName = "Test 2 — Point Marsa déclaré Tunis Médina → Warning")]
    public void Marsa_DeclaredTunisMedina_IsWarning()
    {
        var svc = BuildService();
        Skip.IfNot(svc.IsReady, SkipNoGeoJson);

        var r = svc.ValidatePoint(36.8829, 10.3215, "Tunis", "Médina");

        Assert.Equal(GeoValidationStatus.Warning, r.Status);
        Assert.Equal("Tunis", r.SuggestedGouvernorat, ignoreCase: true);
        // Le dataset peut nommer la délégation "La Marsa" ou "Marsa".
        Assert.Contains("marsa", (r.SuggestedDelegation ?? string.Empty).ToLowerInvariant());
    }

    [SkippableFact(DisplayName = "Test 3 — Sfax centre déclaré Sousse → HardError")]
    public void SfaxCentre_DeclaredSousse_IsHardError()
    {
        var svc = BuildService();
        Skip.IfNot(svc.IsReady, SkipNoGeoJson);

        var r = svc.ValidatePoint(34.7402, 10.7603, "Sousse", "Sousse Médina");

        Assert.Equal(GeoValidationStatus.HardError, r.Status);
        Assert.Equal("Sfax", r.SuggestedGouvernorat, ignoreCase: true);
    }

    [SkippableFact(DisplayName = "Test 4 — Point Méditerranée → HardError hors Tunisie")]
    public void PointInMediterranean_IsHardError()
    {
        var svc = BuildService();
        Skip.IfNot(svc.IsReady, SkipNoGeoJson);

        var r = svc.ValidatePoint(37.5, 11.0, "Tunis", "Médina");

        Assert.Equal(GeoValidationStatus.HardError, r.Status);
        Assert.Null(r.SuggestedGouvernorat);
        Assert.Contains("hors Tunisie", r.Message, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact(DisplayName = "Test 5 — Point dans le buffer 200m → Ok avec tolérance")]
    public void PointWithinBuffer_IsOkWithTolerance()
    {
        var svc = BuildService();
        Skip.IfNot(svc.IsReady, SkipNoGeoJson);

        // On part du centroïde Tunis Médina (~36.7986, 10.1664) et on décale ~120m à l'est
        // (0.0012° lng ≈ 110m à 35°N) pour cibler une zone proche d'une frontière.
        // Le résultat attendu : Ok (dans le polygone ou dans son buffer 200m).
        var r = svc.ValidatePoint(36.7986, 10.1664 + 0.0012, "Tunis", "Médina");

        // Tolérance test : si le point retombe dans une délégation voisine du même gouvernorat,
        // le service répond Warning. On accepte donc Ok OU Warning, mais jamais HardError/Unknown.
        Assert.True(
            r.Status == GeoValidationStatus.Ok || r.Status == GeoValidationStatus.Warning,
            $"Status inattendu {r.Status} (msg={r.Message}, dist={r.DistanceMeters})"
        );
    }

    [Fact(DisplayName = "Fallback — GeoJSON absent → ValidatePoint = Unknown")]
    public void MissingGeoJson_ReturnsUnknown()
    {
        // ContentRoot pointé vers un dossier temporaire sans Geo/Polygons/*.geojson.
        var temp = Path.Combine(Path.GetTempPath(), "geopoly_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(temp, "Geo", "Polygons"));
        try
        {
            // ⚠ Le service teste AppContext.BaseDirectory en premier ; si le binaire de test n'a
            // pas le geojson dans son sous-dossier Geo/Polygons (et il ne l'a pas — le csproj
            // n'inclut pas de Content copy), seul ContentRootPath décide. On le force vide ici.
            var svc = BuildService(contentRootOverride: temp);

            Assert.False(svc.IsReady, "IsReady devrait être false sans fichier GeoJSON.");

            var r = svc.ValidatePoint(36.7986, 10.1664, "Tunis", "Médina");
            Assert.Equal(GeoValidationStatus.Unknown, r.Status);
            Assert.Contains("indisponible", r.Message, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            try { Directory.Delete(temp, true); } catch { /* best-effort */ }
        }
    }
}

internal sealed class TestHostEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Test";
    public string ApplicationName { get; set; } = "Web-Api.Tests";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
