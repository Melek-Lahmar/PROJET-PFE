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
    [Route("api/admin/confirmatrices")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminConfirmatricesController : ControllerBase
    {
        private readonly AdminConfirmatricesService _service;

        public AdminConfirmatricesController(AdminConfirmatricesService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<AdminConfirmatricesPageDto>> GetPage(
            [FromQuery] AdminConfirmatricesQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetPageAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("{userId:guid}")]
        public async Task<ActionResult<AdminConfirmatriceDetailDto>> GetDetail(
            Guid userId, [FromQuery] AdminConfirmatricesQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetDetailAsync(userId, query, ct);
            if (result == null) return NotFound(new { message = "Confirmatrice introuvable." });
            return Ok(result);
        }
    }
}
