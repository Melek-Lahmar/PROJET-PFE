using System;
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
    [Route("api/admin/drivers")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminDriversController : ControllerBase
    {
        private readonly AdminDriversService _service;

        public AdminDriversController(AdminDriversService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<AdminDriversPageDto>> GetPage(
            [FromQuery] AdminDriversQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetPageAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("{userId:guid}")]
        public async Task<ActionResult<AdminDriverDetailDto>> GetDetail(
            Guid userId, [FromQuery] AdminDriversQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetDetailAsync(userId, query, ct);
            if (result == null) return NotFound(new { message = "Livreur introuvable." });
            return Ok(result);
        }
    }
}
