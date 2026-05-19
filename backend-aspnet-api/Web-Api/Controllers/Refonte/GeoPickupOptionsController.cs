using Microsoft.AspNetCore.Mvc;
using Web_Api.Services.Refonte;

namespace Web_Api.Controllers.Refonte
{
    [ApiController]
    [Route("api/geo")]
    public sealed class GeoPickupOptionsController : ControllerBase
    {
        private readonly IDepotZoneService _service;
        public GeoPickupOptionsController(IDepotZoneService service) => _service = service;

        [HttpGet("pickup-options")]
        public async Task<IActionResult> GetPickupOptions([FromQuery] string gouvernorat, [FromQuery] string delegation, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(gouvernorat) || string.IsNullOrWhiteSpace(delegation))
                return BadRequest(new { errorCode = "GEO_ADDRESS_REQUIRED", errorMessage = "Gouvernorat et délégation sont obligatoires." });

            return Ok(await _service.GetPickupOptionsAsync(gouvernorat, delegation, ct));
        }
    }
}
