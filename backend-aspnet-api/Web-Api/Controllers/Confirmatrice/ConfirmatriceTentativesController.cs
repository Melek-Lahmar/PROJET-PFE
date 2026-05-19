using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;

namespace Web_Api.Controllers.Confirmatrice
{
    /// <summary>
    /// Section 2.5 — détail des tentatives liées à un cas (réclamation/demande).
    /// Source : F_RECLAMATION_TENTATIVE, ordre antéchronologique.
    /// </summary>
    [ApiController]
    [Route("api/confirmatrice/reclamations")]
    [Authorize(Roles = AppRoles.CONFIRMATEUR + "," + AppRoles.ADMIN)]
    public class ConfirmatriceTentativesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ConfirmatriceTentativesController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("{id:int}/tentatives")]
        public async Task<IActionResult> Get(int id, CancellationToken ct)
        {
            var rec = await _db.F_RECLAMATIONS.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id, ct);
            if (rec == null) return NotFound();

            var rows = await _db.F_RECLAMATION_TENTATIVES.AsNoTracking()
                .Where(t => t.ReclamationId == id || t.CommandePiece == rec.DoPiece)
                .OrderByDescending(t => t.DateJour)
                .Take(20)
                .ToListAsync(ct);

            // Numérotation (1, 2, 3, …) basée sur l'ordre chronologique
            int total = rows.Count;
            var ordered = rows
                .OrderBy(t => t.DateJour)
                .ToList();
            var numbered = new List<object>();
            for (int i = 0; i < ordered.Count; i++)
            {
                numbered.Add(new
                {
                    numero = i + 1,
                    date = ordered[i].DateJour,
                    motif = ordered[i].Motif,
                    livreurId = ordered[i].LivreurUserId,
                    latitude = ordered[i].Latitude,
                    longitude = ordered[i].Longitude,
                    photoUrl = ordered[i].PhotoUrl,
                });
            }
            // Tri antéchronologique pour l'affichage
            numbered.Reverse();

            return Ok(new
            {
                total,
                tentatives = numbered,
            });
        }
    }
}
