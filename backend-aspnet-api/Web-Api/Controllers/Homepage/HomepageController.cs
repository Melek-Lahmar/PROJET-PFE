using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Homepage;
using Web_Api.Services;

namespace Web_Api.Controllers.Homepage
{
    [ApiController]
    [Route("api")]
    public class HomepageController : ControllerBase
    {
        private readonly HomepageService _service;

        public HomepageController(HomepageService service)
        {
            _service = service;
        }

        [HttpGet("homepage")]
        [AllowAnonymous]
        public async Task<ActionResult<HomepageViewDto>> GetPublic(CancellationToken ct)
        {
            return Ok(await _service.GetPublicViewAsync(ct));
        }

        [HttpGet("admin/homepage")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<ActionResult<HomepageAdminDocumentDto>> GetAdminDocument(CancellationToken ct)
        {
            return Ok(await _service.GetAdminDocumentAsync(ct));
        }

        [HttpGet("admin/homepage/preview")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<ActionResult<HomepageViewDto>> GetPreview(CancellationToken ct)
        {
            return Ok(await _service.GetDraftPreviewAsync(ct));
        }

        [HttpPut("admin/homepage/draft")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<ActionResult<HomepageAdminDocumentDto>> SaveDraft([FromBody] SaveHomepageDraftRequestDto request, CancellationToken ct)
        {
            try
            {
                var userId = ParseCurrentUserId();
                var result = await _service.SaveDraftAsync(request.Content, userId, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("admin/homepage/publish")]
        [Authorize(Roles = AppRoles.ADMIN)]
        public async Task<ActionResult<HomepageAdminDocumentDto>> Publish(CancellationToken ct)
        {
            try
            {
                var userId = ParseCurrentUserId();
                var result = await _service.PublishAsync(userId, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private Guid? ParseCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var guid) ? guid : null;
        }
    }
}