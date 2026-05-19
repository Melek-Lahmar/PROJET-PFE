using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/docentetes")]
    public class DocEntetesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DocEntetesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/docentetes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<F_DOCENTETE>>> GetAll()
        {
            var items = await _context.Set<F_DOCENTETE>()
                .AsNoTracking()
                .OrderByDescending(x => x.cbMarq)
                .ToListAsync();

            return Ok(items);
        }

        // GET: api/docentetes/{cbMarq}
        [HttpGet("{cbMarq:int}")]
        public async Task<ActionResult<F_DOCENTETE>> GetById(int cbMarq)
        {
            var item = await _context.Set<F_DOCENTETE>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.cbMarq == cbMarq);

            if (item == null) return NotFound();
            return Ok(item);
        }

        // POST: api/docentetes
        [HttpPost]
        public async Task<ActionResult<F_DOCENTETE>> Create([FromBody] F_DOCENTETE entity)
        {
            _context.Set<F_DOCENTETE>().Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { cbMarq = entity.cbMarq }, entity);
        }

        // PUT: api/docentetes/{cbMarq}
        [HttpPut("{cbMarq:int}")]
        public async Task<IActionResult> Update(int cbMarq, [FromBody] F_DOCENTETE entity)
        {
            if (cbMarq != entity.cbMarq) return BadRequest("cbMarq mismatch.");

            var exists = await _context.Set<F_DOCENTETE>().AnyAsync(x => x.cbMarq == cbMarq);
            if (!exists) return NotFound();

            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/docentetes/{cbMarq}
        [HttpDelete("{cbMarq:int}")]
        public async Task<IActionResult> Delete(int cbMarq)
        {
            var entity = await _context.Set<F_DOCENTETE>().FindAsync(cbMarq);
            if (entity == null) return NotFound();

            _context.Set<F_DOCENTETE>().Remove(entity);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
