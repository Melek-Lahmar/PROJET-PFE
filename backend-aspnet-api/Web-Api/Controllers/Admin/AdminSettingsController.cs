using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.Services;

namespace Web_Api.Controllers.Admin
{
    /// <summary>
    /// Module 10 (Master Prompt) — Paramétrage applicatif (admin only).
    /// Le sous-ensemble "public" est exposé sans auth via /api/settings/public.
    /// </summary>
    [ApiController]
    [Route("api/admin/settings")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class AdminSettingsController : ControllerBase
    {
        private readonly AppSettingsService _service;

        public AdminSettingsController(AppSettingsService service) { _service = service; }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var rows = await _service.ListAllAsync(ct);
            return Ok(rows);
        }

        [HttpGet("delivery-fee")]
        public async Task<IActionResult> GetDeliveryFee(CancellationToken ct)
        {
            var row = await _service.GetAsync(AppSettingsService.DeliveryFeeHomeKey, ct);
            var value = row == null
                ? AppSettingsService.DefaultDeliveryFeeHome
                : await _service.GetDecimalAsync(AppSettingsService.DeliveryFeeHomeKey, AppSettingsService.DefaultDeliveryFeeHome, ct);

            return Ok(new DeliveryFeeResponseDto
            {
                Key = AppSettingsService.DeliveryFeeHomeKey,
                Value = value,
                IsPublic = row?.IsPublic ?? true,
                UpdatedAt = row?.UpdatedAt,
                UpdatedByAdminId = row?.UpdatedByAdminId
            });
        }

        [HttpPut("delivery-fee")]
        public async Task<IActionResult> PutDeliveryFee([FromBody] DeliveryFeePutDto? dto, CancellationToken ct)
        {
            if (dto?.Value == null)
                return BadRequest(new { message = "La valeur du frais de livraison est obligatoire." });

            var value = dto.Value.Value;
            if (value < 0m)
                return BadRequest(new { message = "Le frais de livraison doit être supérieur ou égal à 0." });

            if (value > 999.999m)
                return BadRequest(new { message = "Le frais de livraison doit être inférieur ou égal à 999.999 TND." });

            if (decimal.GetBits(value)[3] >> 16 is var scale && scale > 3)
                return BadRequest(new { message = "Le frais de livraison accepte au maximum 3 décimales." });

            Guid? adminId = null;
            if (Guid.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var g)) adminId = g;

            var saved = await _service.SetDecimalAsync(
                AppSettingsService.DeliveryFeeHomeKey,
                value,
                "Frais fixe appliqué aux nouvelles commandes livrées à domicile.",
                true,
                adminId,
                ct);

            return Ok(new DeliveryFeeResponseDto
            {
                Key = saved.Key,
                Value = value,
                IsPublic = saved.IsPublic,
                UpdatedAt = saved.UpdatedAt,
                UpdatedByAdminId = saved.UpdatedByAdminId
            });
        }

        [HttpGet("{key}")]
        public async Task<IActionResult> Get(string key, CancellationToken ct)
        {
            var row = await _service.GetAsync(key, ct);
            if (row == null) return NotFound();
            return Ok(row);
        }

        [HttpPut("{key}")]
        public async Task<IActionResult> Put(string key, [FromBody] SettingPutDto dto, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(key)) return BadRequest();
            if (dto == null) return BadRequest(new { message = "Body manquant." });

            Guid? adminId = null;
            if (Guid.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var g)) adminId = g;

            var saved = await _service.SetAsync(key, dto.ValueJson ?? "null", dto.Description, dto.IsPublic, adminId, ct);
            return Ok(saved);
        }

        public class SettingPutDto
        {
            public string? ValueJson { get; set; }
            public string? Description { get; set; }
            public bool IsPublic { get; set; }
        }

        public class DeliveryFeePutDto
        {
            public decimal? Value { get; set; }
        }

        public class DeliveryFeeResponseDto
        {
            public string Key { get; set; } = AppSettingsService.DeliveryFeeHomeKey;
            public decimal Value { get; set; }
            public bool IsPublic { get; set; }
            public DateTime? UpdatedAt { get; set; }
            public Guid? UpdatedByAdminId { get; set; }
        }
    }

    [ApiController]
    [Route("api/settings")]
    [AllowAnonymous]
    public class PublicSettingsController : ControllerBase
    {
        private readonly AppSettingsService _service;

        public PublicSettingsController(AppSettingsService service) { _service = service; }

        [HttpGet("public")]
        public async Task<IActionResult> Public(CancellationToken ct)
        {
            var dict = await _service.GetPublicAsync(ct);
            return Ok(dict);
        }
    }
}
