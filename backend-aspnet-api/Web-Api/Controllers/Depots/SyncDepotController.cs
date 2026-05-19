using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.Services;

namespace Web_Api.Controllers.Depots
{
    [ApiController]
    [Authorize(Roles = AppRoles.ADMIN)]
    [Route("api/sync/depots")]
    public class SyncDepotController : ControllerBase
    {
        private readonly SageService _sageService;
        private readonly AppDbContext _db;

        public SyncDepotController(SageService sageService, AppDbContext db)
        {
            _sageService = sageService;
            _db = db;
        }

        [HttpPost]
        public async Task<IActionResult> Sync(CancellationToken ct)
        {
            var dtos = await _sageService.GetDepotsFromSage(ct);

            var existing = await _db.F_DEPOTS.ToListAsync(ct);
            var byNo = existing.ToDictionary(x => x.DE_No);

            int inserted = 0, updated = 0;

            foreach (var dto in dtos)
            {
                if (byNo.TryGetValue(dto.DE_No, out var entity))
                {
                    entity.DE_Code = dto.DE_Code;
                    entity.DE_Intitule = dto.DE_Intitule;
                    entity.DE_Adresse = dto.DE_Adresse;
                    entity.DE_Complement = dto.DE_Complement;
                    entity.DE_CodePostal = dto.DE_CodePostal;
                    entity.DE_Ville = dto.DE_Ville;
                    entity.DE_Pays = dto.DE_Pays;
                    entity.DE_Principal = dto.DE_Principal;
                    entity.DE_CodeSociete = dto.DE_CodeSociete;
                    entity.DE_Banque = dto.DE_Banque;

                    updated++;
                }
                else
                {
                    _db.F_DEPOTS.Add(new F_DEPOT
                    {
                        DE_No = dto.DE_No,
                        DE_Code = dto.DE_Code,
                        DE_Intitule = dto.DE_Intitule,
                        DE_Adresse = dto.DE_Adresse,
                        DE_Complement = dto.DE_Complement,
                        DE_CodePostal = dto.DE_CodePostal,
                        DE_Ville = dto.DE_Ville,
                        DE_Pays = dto.DE_Pays,
                        DE_Principal = dto.DE_Principal,
                        DE_CodeSociete = dto.DE_CodeSociete,
                        DE_Banque = dto.DE_Banque
                    });

                    inserted++;
                }
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new { isSuccess = true, totalFromSage = dtos.Count, inserted, updated });
        }
    }
}
