using Microsoft.AspNetCore.Mvc;

namespace Web_Api.Controllers
{
    /// <summary>
    /// Section 1.7.3 — Endpoint léger utilisé par le BackendHealthService Flutter
    /// pour détecter le retour du backend après un mode dégradé. Ne touche pas
    /// la DB pour rester rapide même sous charge.
    /// </summary>
    [ApiController]
    [Route("api/health")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        [HttpGet("ping")]
        public IActionResult Get()
        {
            return Ok(new { ok = true, ts = DateTime.UtcNow });
        }
    }
}
