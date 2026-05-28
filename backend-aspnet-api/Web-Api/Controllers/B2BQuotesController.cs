using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Quotes;
using Web_Api.Services.B2B;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/b2b/devis")]
    [Authorize]
    public class B2BQuotesController : ControllerBase
    {
        private readonly QuoteService _quotes;

        public B2BQuotesController(QuoteService quotes)
        {
            _quotes = quotes;
        }

        [HttpPost]
        [HttpPost("/api/b2b/quotes")]
        [Authorize(Roles = $"{AppRoles.ADMIN},{AppRoles.VENDEUR},{AppRoles.CLIENT}")]
        public async Task<ActionResult<QuoteDetailDto>> Create([FromBody] CreateQuoteRequestDto req, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                var roles = GetRoles();

                if (roles.Contains(AppRoles.CLIENT, StringComparer.OrdinalIgnoreCase)
                    && !roles.Contains(AppRoles.ADMIN, StringComparer.OrdinalIgnoreCase)
                    && !roles.Contains(AppRoles.VENDEUR, StringComparer.OrdinalIgnoreCase))
                {
                    return Ok(await _quotes.CreateClientQuoteAsync(actor.Value, roles, req, ct));
                }

                return Ok(await _quotes.CreateQuoteAsync(actor.Value, roles, req, ct));
            }
            catch (QuoteValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (QuoteNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        [HttpGet]
        [HttpGet("/api/b2b/quotes")]
        [Authorize(Roles = $"{AppRoles.ADMIN},{AppRoles.VENDEUR},{AppRoles.CONFIRMATEUR},{AppRoles.CLIENT}")]
        public async Task<ActionResult<List<QuoteListItemDto>>> List([FromQuery] string? status, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                var roles = GetRoles();
                if (roles.Contains(AppRoles.CLIENT, StringComparer.OrdinalIgnoreCase)
                    && !roles.Contains(AppRoles.ADMIN, StringComparer.OrdinalIgnoreCase)
                    && !roles.Contains(AppRoles.VENDEUR, StringComparer.OrdinalIgnoreCase)
                    && !roles.Contains(AppRoles.CONFIRMATEUR, StringComparer.OrdinalIgnoreCase))
                {
                    return Ok(await _quotes.GetMyQuotesAsync(actor.Value, ct));
                }

                return Ok(await _quotes.GetAdminQuotesAsync(actor.Value, roles, status, ct));
            }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        [HttpGet("my")]
        [HttpGet("/api/b2b/quotes/my")]
        [Authorize(Roles = AppRoles.CLIENT)]
        public async Task<ActionResult<List<QuoteListItemDto>>> MyQuotes(CancellationToken ct)
        {
            var actor = GetUserId();
            if (actor == null) return Unauthorized();
            return Ok(await _quotes.GetMyQuotesAsync(actor.Value, ct));
        }

        [HttpGet("{piece}")]
        [HttpGet("/api/b2b/quotes/{piece}")]
        public async Task<ActionResult<QuoteDetailDto>> Detail(string piece, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                return Ok(await _quotes.GetQuoteDetailAsync(actor.Value, GetRoles(), piece, ct));
            }
            catch (QuoteNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        [HttpPost("{piece}/comments")]
        [HttpPost("/api/b2b/quotes/{piece}/comments")]
        [Authorize(Roles = AppRoles.CLIENT)]
        public async Task<ActionResult<QuoteDetailDto>> AddComment(string piece, [FromBody] AddQuoteCommentRequestDto req, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                return Ok(await _quotes.AddCommentAsync(actor.Value, GetRoles(), piece, req?.Message, true, ct));
            }
            catch (QuoteValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (QuoteNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        [HttpPost("{piece}/accept")]
        [HttpPost("/api/b2b/quotes/{piece}/accept")]
        [Authorize(Roles = AppRoles.CLIENT)]
        public async Task<ActionResult<ConvertDevisToBcResultDto>> Accept(string piece, [FromBody] QuoteDecisionRequestDto? req, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                return Ok(await _quotes.AcceptQuoteAsync(actor.Value, piece, req?.Comment ?? req?.Reason, ct));
            }
            catch (QuoteValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (QuoteNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        [HttpPost("{piece}/reject")]
        [HttpPost("{piece}/refuse")]
        [HttpPost("/api/b2b/quotes/{piece}/reject")]
        [HttpPost("/api/b2b/quotes/{piece}/refuse")]
        [Authorize(Roles = AppRoles.CLIENT)]
        public async Task<ActionResult<QuoteDetailDto>> Refuse(string piece, [FromBody] QuoteDecisionRequestDto req, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                return Ok(await _quotes.RefuseQuoteAsync(actor.Value, piece, req?.Comment ?? req?.Reason, ct));
            }
            catch (QuoteValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (QuoteNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        [HttpPost("{piece}/cancel")]
        [HttpPost("/api/b2b/quotes/{piece}/cancel")]
        [Authorize(Roles = $"{AppRoles.ADMIN},{AppRoles.CONFIRMATEUR}")]
        public async Task<ActionResult<QuoteDetailDto>> Cancel(string piece, [FromBody] QuoteDecisionRequestDto req, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                return Ok(await _quotes.CancelQuoteAsync(actor.Value, GetRoles(), piece, req?.Comment ?? req?.Reason, ct));
            }
            catch (QuoteValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (QuoteNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        [HttpPost("{piece}/convert-to-order")]
        [HttpPost("/api/b2b/quotes/{piece}/convert-to-order")]
        [Authorize(Roles = $"{AppRoles.ADMIN},{AppRoles.CONFIRMATEUR}")]
        public async Task<IActionResult> ConvertToOrder(string piece, [FromBody] ConvertQuoteToOrderRequestDto? req, CancellationToken ct)
        {
            try
            {
                var actor = GetUserId();
                if (actor == null) return Unauthorized();
                var result = await _quotes.ConvertQuoteToOrderAsync(actor.Value, GetRoles(), piece, req ?? new ConvertQuoteToOrderRequestDto(), ct);
                return Ok(new { piece = result.BcPiece, quotePiece = result.DevisPiece, devisPiece = result.DevisPiece, bcPiece = result.BcPiece, result.AlreadyConverted, result.Message });
            }
            catch (QuoteValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (QuoteNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (QuoteForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        }

        private Guid? GetUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private string[] GetRoles()
        {
            return User.Claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role")
                .Select(c => c.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
    }
}
