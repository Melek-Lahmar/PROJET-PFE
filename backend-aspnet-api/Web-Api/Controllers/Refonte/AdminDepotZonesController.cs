using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Refonte;
using Web_Api.Services.Refonte;

namespace Web_Api.Controllers.Refonte
{
    [ApiController]
    [Route("api/admin/depot-zones")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public sealed class AdminDepotZonesController : ControllerBase
    {
        private readonly IDepotZoneService _service;
        public AdminDepotZonesController(IDepotZoneService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct) => Ok(await _service.ListAsync(ct));

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UpsertDepotZoneRequest request, CancellationToken ct)
        {
            try { return Ok(await _service.CreateAsync(request, ct)); }
            catch (InvalidOperationException ex) { return Conflict(new { errorCode = "DEPOT_ZONE_CONFLICT", errorMessage = ex.Message }); }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }

        [HttpPost("import-csv")]
        public IActionResult ImportCsvPlaceholder()
        {
            return Accepted(new
            {
                message = "Import CSV réservé au Chantier 2. Le contrat API est prêt ; brancher le parseur CSV après validation du format 264 délégations."
            });
        }
    }
}
