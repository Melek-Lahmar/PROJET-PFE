using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.Geo;

namespace Web_Api.Controllers.Geo
{
    [ApiController]
    [Route("api/geo")]
    public class GeoController : ControllerBase
    {
        // GET /api/geo/gouvernorats
        [HttpGet("gouvernorats")]
        public ActionResult<IEnumerable<object>> GetGouvernorats()
        {
            var items = Enum.GetValues(typeof(GouvernoratTunisie))
                .Cast<GouvernoratTunisie>()
                .Select(g => new
                {
                    id = (int)g,
                    name = g.ToString()
                })
                .ToList();

            return Ok(items);
        }

        // GET /api/geo/gouvernorats/{id}/delegations
        [HttpGet("gouvernorats/{id:int}/delegations")]
        public ActionResult<IEnumerable<string>> GetDelegations([FromRoute] int id)
        {
            if (!Enum.IsDefined(typeof(GouvernoratTunisie), id))
                return BadRequest(new { message = "Gouvernorat invalide." });

            var gov = (GouvernoratTunisie)id;
            var delegations = TunisieDecoupage.GetDelegations(gov);

            return Ok(delegations);
        }

        // GET /api/geo/depot-coverage/{gouvernoratId}
        // Verifie si le gouvernorat est couvert par au moins un depot.
        // Utilise par le frontend avant validation de commande.
        [HttpGet("depot-coverage/{gouvernoratId:int}")]
        public async Task<IActionResult> DepotCoverage(
            [FromRoute] int gouvernoratId,
            [FromServices] AppDbContext db,
            CancellationToken ct)
        {
            if (!Enum.IsDefined(typeof(GouvernoratTunisie), gouvernoratId))
                return BadRequest(new { message = "Gouvernorat invalide." });

            var govName = ((GouvernoratTunisie)gouvernoratId).ToString();
            var govUpper = govName.ToUpperInvariant();

            var zones = await db.F_DEPOT_ZONES
                .Where(z => z.Gouvernorat.ToUpper() == govUpper)
                .Select(z => new { z.DepotNo, z.IsPrimary })
                .ToListAsync(ct);

            return Ok(new
            {
                hasCoverage = zones.Count > 0,
                gouvernorat = govName,
                gouvernoratId,
                depotCount = zones.Count,
            });
        }
    }
}
