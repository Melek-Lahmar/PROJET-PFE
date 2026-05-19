using Microsoft.AspNetCore.Mvc;
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
    }
}
