using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Geo;
using Web_Api.Geo;
using Web_Api.Services.Geo;

namespace Web_Api.Controllers.Geo;

[ApiController]
[Route("api/geo")]
public class GeoDelegationsController : ControllerBase
{
    private readonly IGeoPolygonService _geo;

    public GeoDelegationsController(IGeoPolygonService geo)
    {
        _geo = geo;
    }

    // GET /api/geo/delegations[?gouvernorat=Sousse]
    [HttpGet("delegations")]
    [AllowAnonymous]
    public ActionResult<IEnumerable<DelegationDto>> GetDelegations([FromQuery] string? gouvernorat = null)
    {
        Dictionary<(string, string), DelegationCentroid> centroidsByKey;
        if (_geo.IsReady)
        {
            centroidsByKey = _geo.AllCentroids()
                .GroupBy(c => (GeoPolygonService.NormalizeName(c.Gouvernorat),
                               GeoPolygonService.NormalizeName(c.Delegation)))
                .ToDictionary(g => g.Key, g => g.First());
        }
        else
        {
            centroidsByKey = new Dictionary<(string, string), DelegationCentroid>();
        }

        var results = new List<DelegationDto>();
        foreach (var kv in TunisieDecoupage.Delegations)
        {
            var spacedGouv = SplitPascalCase(kv.Key.ToString());
            foreach (var deleg in kv.Value)
            {
                var key = (GeoPolygonService.NormalizeName(spacedGouv),
                           GeoPolygonService.NormalizeName(deleg));
                centroidsByKey.TryGetValue(key, out var c);

                results.Add(new DelegationDto
                {
                    Gouvernorat = spacedGouv,
                    Delegation = deleg,
                    CentroidLatitude = c?.Latitude,
                    CentroidLongitude = c?.Longitude,
                });
            }
        }

        if (!string.IsNullOrWhiteSpace(gouvernorat))
        {
            var filterNorm = GeoPolygonService.NormalizeName(gouvernorat);
            results = results
                .Where(r => GeoPolygonService.NormalizeName(r.Gouvernorat) == filterNorm)
                .ToList();
        }

        var ordered = results
            .OrderBy(r => r.Gouvernorat, StringComparer.OrdinalIgnoreCase)
            .ThenBy(r => r.Delegation, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(ordered);
    }

    // POST /api/geo/validate-point
    [HttpPost("validate-point")]
    [Authorize(Roles = AppRoles.CLIENT + "," + AppRoles.VENDEUR + "," + AppRoles.ADMIN)]
    public ActionResult<ValidatePointResponse> ValidatePoint([FromBody] ValidatePointRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var r = _geo.ValidatePoint(req.Latitude, req.Longitude, req.Gouvernorat, req.Delegation);

        return Ok(new ValidatePointResponse
        {
            Status = r.Status.ToString(),
            SuggestedGouvernorat = r.SuggestedGouvernorat,
            SuggestedDelegation = r.SuggestedDelegation,
            DistanceMeters = r.DistanceMeters,
            Message = r.Message,
        });
    }

    // GET /api/geo/health
    [HttpGet("health")]
    [AllowAnonymous]
    public ActionResult<object> Health()
    {
        return Ok(new
        {
            polygonsLoaded = _geo.IsReady,
            polygonCount = _geo.PolygonCount,
            lastLoadAt = _geo.LastLoadAt,
        });
    }

    private static string SplitPascalCase(string s) =>
        Regex.Replace(s, "(?<!^)([A-Z])", " $1");
}
