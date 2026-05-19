using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.data;
using Web_Api.Model;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/doclignes")]
    public class DocLignesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DocLignesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/doclignes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<F_DOCLIGNE>>> GetAll()
        {
            var items = await _context.Set<F_DOCLIGNE>()
                .AsNoTracking()
                .OrderByDescending(x => x.cbMarq)
                .ToListAsync();

            return Ok(items);
        }

        // GET: api/doclignes/{cbMarq}
        [HttpGet("{cbMarq:int}")]
        public async Task<ActionResult<F_DOCLIGNE>> GetById(int cbMarq)
        {
            var item = await _context.Set<F_DOCLIGNE>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.cbMarq == cbMarq);

            if (item == null) return NotFound();
            return Ok(item);
        }

        // POST: api/doclignes
        [HttpPost]
        public async Task<ActionResult<F_DOCLIGNE>> Create([FromBody] F_DOCLIGNE entity)
        {
            _context.Set<F_DOCLIGNE>().Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { cbMarq = entity.cbMarq }, entity);
        }

        // PUT: api/doclignes/{cbMarq}
        [HttpPut("{cbMarq:int}")]
        public async Task<IActionResult> Update(int cbMarq, [FromBody] F_DOCLIGNE entity)
        {
            if (cbMarq != entity.cbMarq) return BadRequest("cbMarq mismatch.");

            var exists = await _context.Set<F_DOCLIGNE>().AnyAsync(x => x.cbMarq == cbMarq);
            if (!exists) return NotFound();

            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/doclignes/{cbMarq}
        [HttpDelete("{cbMarq:int}")]
        public async Task<IActionResult> Delete(int cbMarq)
        {
            var entity = await _context.Set<F_DOCLIGNE>().FindAsync(cbMarq);
            if (entity == null) return NotFound();

            _context.Set<F_DOCLIGNE>().Remove(entity);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
