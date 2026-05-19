using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;

namespace Web_Api.Controllers.Stocks
{
    [ApiController]
    [Route("api/stocks")]
    public class StocksController : ControllerBase
    {
        private readonly AppDbContext _db;

        public StocksController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// GET /api/stocks
        /// Query:
        /// - arRef: filtre article
        /// - deNo: filtre dépôt
        /// - principalOnly (default:false): AS_Principal = 1
        /// - take (default: 500)
        /// - skip (default: 0)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? arRef,
            [FromQuery] int? deNo,
            [FromQuery] bool principalOnly = false,
            [FromQuery] int take = 500,
            [FromQuery] int skip = 0,
            CancellationToken ct = default)
        {
            if (take <= 0) take = 500;
            if (take > 2000) take = 2000;
            if (skip < 0) skip = 0;

            var query = _db.F_ARTSTOCKS.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(arRef))
            {
                var r = arRef.Trim();
                query = query.Where(x => (x.AR_Ref ?? string.Empty).Trim() == r);
            }

            if (deNo.HasValue)
                query = query.Where(x => x.DE_No == deNo.Value);

            if (principalOnly)
                query = query.Where(x => x.AS_Principal == 1);

            var total = await query.CountAsync(ct);

            var items = await query
                .OrderBy(x => x.AR_Ref)
                .ThenBy(x => x.DE_No)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);

            return Ok(new
            {
                total,
                skip,
                take,
                items
            });
        }

        /// <summary>
        /// GET /api/stocks/{arRef}/{deNo}
        /// </summary>
        [HttpGet("{arRef}/{deNo:int}")]
        public async Task<IActionResult> GetByKey(string arRef, int deNo, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(arRef))
                return BadRequest(new { message = "arRef est obligatoire." });

            var item = await _db.F_ARTSTOCKS
                .AsNoTracking()
                .FirstOrDefaultAsync(x => (x.AR_Ref ?? string.Empty).Trim() == arRef.Trim() && x.DE_No == deNo, ct);

            if (item is null)
                return NotFound(new { message = $"Stock introuvable pour AR_Ref={arRef}, DE_No={deNo}" });

            return Ok(item);
        }
    }
}
