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
    [Route("api/admin/products")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminProductsController : ControllerBase
    {
        private readonly AdminProductsService _service;

        public AdminProductsController(AdminProductsService service)
        {
            _service = service;
        }

        [HttpGet("overview")]
        public async Task<ActionResult<AdminProductsOverviewDto>> GetOverview(
            [FromQuery] AdminProductsQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetOverviewAsync(query, ct);
            return Ok(result);
        }
    }
}
