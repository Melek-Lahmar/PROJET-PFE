using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;

namespace Web_Api.Controllers.Depots
{
    [ApiController]
    [Route("api/depots")]
    public class DepotsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DepotsController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// GET /api/depots
        /// Query:
        /// - principalOnly (default:false): DE_Principal = 1
        /// - search: recherche dans DE_Code, DE_Intitule, DE_Ville
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] bool principalOnly = false,
            [FromQuery] string? search = null,
            CancellationToken ct = default)
        {
            var query = _db.F_DEPOTS.AsNoTracking().AsQueryable();

            if (principalOnly)
                query = query.Where(x => x.DE_Principal == 1);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(x =>
                    (x.DE_Code != null && EF.Functions.Like(x.DE_Code, $"%{s}%")) ||
                    (x.DE_Intitule != null && EF.Functions.Like(x.DE_Intitule, $"%{s}%")) ||
                    (x.DE_Ville != null && EF.Functions.Like(x.DE_Ville, $"%{s}%"))
                );
            }

            var items = await query
                .OrderByDescending(x => x.DE_Principal)
                .ThenBy(x => x.DE_Intitule)
                .ToListAsync(ct);

            return Ok(new
            {
                total = items.Count,
                items
            });
        }

        /// <summary>
        /// GET /api/depots/{deNo}
        /// </summary>
        [HttpGet("{deNo:int}")]
        public async Task<IActionResult> GetByNo(int deNo, CancellationToken ct)
        {
            var item = await _db.F_DEPOTS
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DE_No == deNo, ct);

            if (item is null)
                return NotFound(new { message = $"Dépôt introuvable: {deNo}" });

            return Ok(item);
        }
    }
}
