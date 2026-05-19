using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.Services.Push;

namespace Web_Api.Controllers.Client
{
    /// <summary>
    /// Section 3.11 — enregistrement du token FCM device.
    /// </summary>
    [ApiController]
    [Route("api/client/push")]
    [Authorize]
    public class ClientPushController : ControllerBase
    {
        private readonly PushNotificationService _push;

        public ClientPushController(PushNotificationService push)
        {
            _push = push;
        }

        public class RegisterTokenDto
        {
            public string? Token { get; set; }
            public string? Platform { get; set; }
        }

        [HttpPost("register-token")]
        public async Task<IActionResult> Register([FromBody] RegisterTokenDto dto, CancellationToken ct)
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(raw, out var userId)) return Forbid();

            if (dto == null || string.IsNullOrWhiteSpace(dto.Token))
                return BadRequest(new { message = "Token requis." });

            var entity = await _push.RegisterTokenAsync(userId, dto.Token!, dto.Platform ?? "android");
            return Ok(new { id = entity.Id, lastSeenAt = entity.LastSeenAt });
        }
    }
}
