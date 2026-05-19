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
    [Route("api/payments/konnect")]
    public class KonnectPaymentsController : ControllerBase
    {
        private readonly KonnectPaymentService _konnectPaymentService;

        public KonnectPaymentsController(KonnectPaymentService konnectPaymentService)
        {
            _konnectPaymentService = konnectPaymentService;
        }

        [HttpPost("initiate")]
        [Authorize]
        public async Task<ActionResult<KonnectInitiatePaymentResponseDto>> Initiate(
            [FromBody] CreateBonCommandeRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var userId = TryGetUserId();
                var email = TryGetUserEmail();

                if (userId == null || string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized(new
                    {
                        message = "Utilisateur non identifié dans le token.",
                        claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList()
                    });
                }

                var response = await _konnectPaymentService.InitiateForAuthenticatedClientAsync(
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
            catch (KonnectPaymentInitiationException ex)
            {
                return StatusCode(502, new
                {
                    message = ex.Message,
                    piece = ex.Piece,
                    localPaymentId = ex.LocalPaymentId,
                    detail = ex.Detail
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message, detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Erreur serveur.",
                    detail = ex.ToString()
                });
            }
        }

        [AllowAnonymous]
        [HttpPost("initiate/guest")]
        public async Task<ActionResult<KonnectInitiatePaymentResponseDto>> InitiateGuest(
            [FromBody] CreateGuestBonCommandeRequestDto request,
            CancellationToken ct)
        {
            try
            {
                var response = await _konnectPaymentService.InitiateForGuestAsync(request, ct);
                return Ok(response);
            }
            catch (BonCommandeService.BonCommandeValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KonnectPaymentInitiationException ex)
            {
                return StatusCode(502, new
                {
                    message = ex.Message,
                    piece = ex.Piece,
                    localPaymentId = ex.LocalPaymentId,
                    detail = ex.Detail
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message, detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Erreur serveur.",
                    detail = ex.ToString()
                });
            }
        }

        [AllowAnonymous]
        [HttpGet("webhook")]
        public async Task<ActionResult<KonnectWebhookProcessingResponseDto>> Webhook(
            [FromQuery(Name = "payment_ref")] string paymentRef,
            CancellationToken ct)
        {
            try
            {
                var response = await _konnectPaymentService.HandleWebhookAsync(paymentRef, ct);
                return Ok(response);
            }
            catch (KonnectGatewayException ex)
            {
                return StatusCode(502, new
                {
                    message = ex.Message,
                    detail = ex.RawBody
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message, detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Erreur serveur.",
                    detail = ex.ToString()
                });
            }
        }

        [AllowAnonymous]
        [HttpGet("status")]
        public async Task<ActionResult<KonnectPublicPaymentStatusDto>> GetStatus(
            [FromQuery] string piece,
            [FromQuery] string paymentRef,
            [FromQuery] bool refresh = true,
            CancellationToken ct = default)
        {
            try
            {
                var response = await _konnectPaymentService.GetPublicPaymentStatusAsync(piece, paymentRef, refresh, ct);
                return Ok(response);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message, detail = ex.Message });
            }
            catch (KonnectGatewayException ex)
            {
                return StatusCode(502, new
                {
                    message = ex.Message,
                    detail = ex.RawBody
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message, detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Erreur serveur.",
                    detail = ex.ToString()
                });
            }
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

            foreach (var type in candidates)
            {
                var raw = User.FindFirstValue(type);
                if (!string.IsNullOrWhiteSpace(raw))
                    return raw.Trim();
            }

            return null;
        }
    }
}