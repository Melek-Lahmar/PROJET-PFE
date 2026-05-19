using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.Services;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Module 7 (Master Prompt) — CRUD + activate des templates Homepage Builder.
    /// </summary>
    [ApiController]
    [Route("api/admin/homepage/templates")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminHomepageTemplatesController : ControllerBase
    {
        private readonly HomepageTemplateService _service;

        public AdminHomepageTemplatesController(HomepageTemplateService service) { _service = service; }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
            => Ok(await _service.ListAsync(ct));

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        {
            var t = await _service.GetAsync(id, ct);
            return t == null ? NotFound() : Ok(t);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TemplateUpsertDto dto, CancellationToken ct)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Nom requis." });

            Guid? adminId = null;
            if (Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var g)) adminId = g;

            var (created, error) = await _service.CreateAsync(dto.Name, dto.BlocksJson ?? "[]", adminId, ct);
            if (error != null) return BadRequest(new { message = error });
            return Ok(created);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] TemplateUpsertDto dto, CancellationToken ct)
        {
            if (dto == null) return BadRequest();
            var (updated, error) = await _service.UpdateAsync(id, dto.Name, dto.BlocksJson, ct);
            if (error != null) return NotFound(new { message = error });
            return Ok(updated);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var error = await _service.DeleteAsync(id, ct);
            if (error != null) return BadRequest(new { message = error });
            return NoContent();
        }

        [HttpPost("{id:guid}/activate")]
        public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
        {
            var (activated, error) = await _service.ActivateAsync(id, ct);
            if (error != null) return NotFound(new { message = error });
            return Ok(activated);
        }

        public class TemplateUpsertDto
        {
            public string? Name { get; set; }
            public string? BlocksJson { get; set; }
        }
    }

    /// <summary>
    /// Endpoint public exposant le template actif (consommé par la homepage publique).
    /// </summary>
    [ApiController]
    [Route("api/homepage")]
    [AllowAnonymous]
    public class PublicHomepageTemplateController : ControllerBase
    {
        private readonly HomepageTemplateService _service;

        public PublicHomepageTemplateController(HomepageTemplateService service) { _service = service; }

        // Note: si /api/homepage est déjà occupé par HomepageController existant, ce route sera ignoré.
        // Les templates exposés ici sont accessibles via /api/homepage/active.
        [HttpGet("active")]
        public async Task<IActionResult> Active(CancellationToken ct)
        {
            var t = await _service.GetActiveAsync(ct);
            if (t == null) return NotFound();
            return Ok(t);
        }
    }
}
