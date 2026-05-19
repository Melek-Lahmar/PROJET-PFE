using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Refonte;
using Web_Api.Services.Refonte;

namespace Web_Api.Controllers.Refonte
{
    [ApiController]
    [Route("api/orders")]
    [Authorize(Roles = AppRoles.CLIENT + "," + AppRoles.ADMIN + "," + AppRoles.VENDEUR)]
    public sealed class ClientAddressPreviewController : ControllerBase
    {
        private readonly IDepotZoneService _depotZones;
        public ClientAddressPreviewController(IDepotZoneService depotZones) => _depotZones = depotZones;

        [HttpPost("preview-address")]
        public async Task<IActionResult> PreviewAddress([FromBody] PreviewAddressRequest request, CancellationToken ct)
        {
            if (request.DeliveryMode == "DEPOT_PICKUP")
                return Ok(new { geoValidationStatus = "NotRequired", pickup = await _depotZones.GetPickupOptionsAsync(request.Gouvernorat, request.Delegation, ct) });

            var pickup = await _depotZones.GetPickupOptionsAsync(request.Gouvernorat, request.Delegation, ct);
            return Ok(new
            {
                geoValidationStatus = request.Latitude.HasValue && request.Longitude.HasValue ? "PendingValidatePoint" : "Unknown",
                isCovered = pickup.IsCovered,
                pickupOptions = pickup
            });
        }
    }
}
