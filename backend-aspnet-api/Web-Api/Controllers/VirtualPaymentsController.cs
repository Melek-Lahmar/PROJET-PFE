using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.DTO.Orders;
using Web_Api.DTO.Payments;
using Web_Api.Services;
using Web_Api.Services.Payments;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/payments/virtual")]
    public sealed class VirtualPaymentsController : ControllerBase
    {
        private readonly IVirtualPaymentService _virtualPaymentService;

        public VirtualPaymentsController(IVirtualPaymentService virtualPaymentService)
        {
            _virtualPaymentService = virtualPaymentService;
        }

        [HttpPost("initiate")]
        [Authorize]
        public async Task<ActionResult<VirtualInitiatePaymentResponseDto>> Initiate(
            [FromBody] CreateBonCommandeRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = TryGetUserId();
                var email = TryGetUserEmail();

                if (userId == null || string.IsNullOrWhiteSpace(email))
                    return Unauthorized(new { message = "Utilisateur non identifié dans le token." });

                var response = await _virtualPaymentService.InitiateForAuthenticatedClientAsync(
                    userId.Value,
                    email,
                    request,
                    ct);

                return Ok(response);
            }
            catch (BonCommandeService.BonCommandeValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("initiate/guest")]
        [AllowAnonymous]
        public async Task<ActionResult<VirtualInitiatePaymentResponseDto>> InitiateGuest(
            [FromBody] CreateGuestBonCommandeRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var response = await _virtualPaymentService.InitiateForGuestAsync(request, ct);
                return Ok(response);
            }
            catch (BonCommandeService.BonCommandeValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("confirm")]
        [AllowAnonymous]
        public async Task<ActionResult<VirtualPaymentResultDto>> Confirm(
            [FromBody] VirtualConfirmPaymentRequestDto request,
            CancellationToken ct)
        {
            try
            {
                return Ok(await _virtualPaymentService.ConfirmAsync(request, ct));
            }
            catch (VirtualPaymentValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPost("cancel")]
        [AllowAnonymous]
        public async Task<ActionResult<VirtualPaymentStatusDto>> Cancel(
            [FromBody] VirtualCancelPaymentRequestDto request,
            CancellationToken ct)
        {
            try
            {
                return Ok(await _virtualPaymentService.CancelAsync(request, ct));
            }
            catch (VirtualPaymentValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpGet("status")]
        [AllowAnonymous]
        public async Task<ActionResult<VirtualPaymentStatusDto>> GetStatus(
            [FromQuery] string piece,
            [FromQuery] string paymentRef,
            CancellationToken ct)
        {
            try
            {
                return Ok(await _virtualPaymentService.GetStatusAsync(piece, paymentRef, ct));
            }
            catch (VirtualPaymentValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("test-cards")]
        [AllowAnonymous]
        public ActionResult<IReadOnlyList<VirtualTestCardDto>> GetTestCards()
        {
            return Ok(_virtualPaymentService.GetTestCards());
        }

        private Guid? TryGetUserId()
        {
            var candidates = new[]
            {
                ClaimTypes.NameIdentifier,
                "sub",
                "nameid",
                "userid",
                "userId"
            };

            foreach (var type in candidates)
            {
                var raw = User.FindFirstValue(type);
                if (!string.IsNullOrWhiteSpace(raw) && Guid.TryParse(raw, out var parsed))
                    return parsed;
            }

            return null;
        }

        private string? TryGetUserEmail()
        {
            var candidates = new[]
            {
                ClaimTypes.Email,
                "email",
                "upn",
                ClaimTypes.Name
            };

            return candidates
                .Select(type => User.FindFirstValue(type))
                .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))
                ?.Trim();
        }
    }
}
