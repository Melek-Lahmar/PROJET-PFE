using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;

namespace Web_Api.Controllers.Catalogues
{
    [ApiController]
    [Route("api/catalogues")]
    public class CataloguesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CataloguesController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// GET /api/catalogues
        /// Query:
        /// - search: recherche dans CL_Code et CL_Intitule
        /// - parentNo: filtre CL_NoParent
        /// - niveau: filtre CL_Niveau
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] int? parentNo = null,
            [FromQuery] short? niveau = null,
            CancellationToken ct = default)
        {
            var query = _db.F_CATALOGUES.AsNoTracking().AsQueryable();

            if (parentNo.HasValue)
                query = query.Where(x => x.CL_NoParent == parentNo.Value);

            if (niveau.HasValue)
                query = query.Where(x => x.CL_Niveau == niveau.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(x =>
                    EF.Functions.Like(x.CL_Code, $"%{s}%") ||
                    EF.Functions.Like(x.CL_Intitule, $"%{s}%")
                );
            }

            var items = await query
                .OrderBy(x => x.CL_Niveau)
                .ThenBy(x => x.CL_Intitule)
                .ToListAsync(ct);

            return Ok(new
            {
                total = items.Count,
                items
            });
        }

        /// <summary>
        /// GET /api/catalogues/{clNo}
        /// </summary>
        [HttpGet("{clNo:int}")]
        public async Task<IActionResult> GetByNo(int clNo, CancellationToken ct)
        {
            var item = await _db.F_CATALOGUES
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CL_No == clNo, ct);

            if (item is null)
                return NotFound(new { message = $"Catalogue introuvable: {clNo}" });

            return Ok(item);
        }
    }
}
