using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Admin;
using Web_Api.Services.Admin;

namespace Web_Api.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/dashboard")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminDashboardController : ControllerBase
    {
        private readonly AdminDashboardService _service;

        public AdminDashboardController(AdminDashboardService service)
        {
            _service = service;
        }

        /// <summary>
        /// Cockpit admin — KPIs logistique + réclamations + séries pour
        /// graphiques + breakdown statut/gouvernorat. Tout en un seul appel.
        /// </summary>
        [HttpGet("overview")]
        public async Task<ActionResult<AdminDashboardOverviewDto>> GetOverview(
            [FromQuery] AdminDashboardQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetOverviewAsync(query, ct);
            return Ok(result);
        }
    }
}
