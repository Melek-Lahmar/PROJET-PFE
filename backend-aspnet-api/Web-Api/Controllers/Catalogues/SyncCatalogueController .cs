using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.Services;

namespace Web_Api.Controllers.Catalogues
{
    [ApiController]
    [Authorize(Roles = AppRoles.ADMIN)]
    [Route("api/sync/catalogues")]
    public class SyncCatalogueController : ControllerBase
    {
        private readonly SageService _sageService;
        private readonly AppDbContext _db;

        public SyncCatalogueController(SageService sageService, AppDbContext db)
        {
            _sageService = sageService;
            _db = db;
        }

        [HttpPost]
        public async Task<IActionResult> Sync(CancellationToken ct)
        {
            var dtos = await _sageService.GetCataloguesFromSage(ct);

            var existing = await _db.F_CATALOGUES.ToListAsync(ct);
            var byNo = existing.ToDictionary(x => x.CL_No);

            int inserted = 0, updated = 0;

            foreach (var dto in dtos)
            {
                if (byNo.TryGetValue(dto.CL_No, out var entity))
                {
                    entity.CL_Intitule = dto.CL_Intitule;
                    entity.CL_Code = dto.CL_Code;
                    entity.CL_Stock = dto.CL_Stock;
                    entity.CL_NoParent = dto.CL_NoParent;
                    entity.CL_Niveau = dto.CL_Niveau;

                    updated++;
                }
                else
                {
                    _db.F_CATALOGUES.Add(new F_CATALOGUE
                    {
                        CL_No = dto.CL_No,
                        CL_Intitule = dto.CL_Intitule,
                        CL_Code = dto.CL_Code,
                        CL_Stock = dto.CL_Stock,
                        CL_NoParent = dto.CL_NoParent,
                        CL_Niveau = dto.CL_Niveau
                    });

                    inserted++;
                }
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new { isSuccess = true, totalFromSage = dtos.Count, inserted, updated });
        }
    }
}
