using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.DTO;
using Web_Api.Services;

namespace Web_Api.Controllers.Articles
{
    [ApiController]
    [Authorize(Roles = AppRoles.ADMIN)]
    [Route("api/sync/articles")]
    public class SyncArticleController : ControllerBase
    {
        private readonly SageService _sageService;
        private readonly AppDbContext _db;

        public SyncArticleController(SageService sageService, AppDbContext db)
        {
            _sageService = sageService;
            _db = db;
        }

        [HttpPost]
        public async Task<IActionResult> Sync(CancellationToken ct)
        {
            List<ArticleSageDto> dtos;
            try { dtos = await _sageService.GetArticlesFromSage(ct); }
            catch (Exception ex) { return StatusCode(502, new { isSuccess = false, error = ex.Message }); }

            var refs = dtos.Select(x => x.AR_Ref).Distinct().ToList();

            var existing = await _db.F_ARTICLES
                .Where(a => refs.Contains(a.AR_Ref))
                .ToListAsync(ct);

            var byRef = existing.ToDictionary(x => x.AR_Ref);

            int inserted = 0, updated = 0;

            foreach (var dto in dtos)
            {
                if (byRef.TryGetValue(dto.AR_Ref, out var entity))
                {
                    entity.AR_Design = dto.AR_Design;
                    entity.FA_CodeFamille = dto.FA_CodeFamille;
                    entity.AR_UniteVen = dto.AR_UniteVen;
                    entity.AR_PrixVen = dto.AR_PrixVen;
                    entity.AR_PrixTTC = dto.AR_PrixTTC;
                    entity.AR_SuiviStock = dto.AR_SuiviStock;
                    entity.AR_Sommeil = dto.AR_Sommeil;
                    entity.AR_CodeBarre = dto.AR_CodeBarre;
                    entity.AR_Publie = dto.AR_Publie;
                    entity.CL_No1 = dto.CL_No1;
                    entity.CL_No2 = dto.CL_No2;
                    entity.CL_No3 = dto.CL_No3;
                    entity.CL_No4 = dto.CL_No4;
                    entity.AR_Type = dto.AR_Type;

                    updated++;
                }
                else
                {
                    _db.F_ARTICLES.Add(new F_ARTICLE
                    {
                        AR_Ref = dto.AR_Ref,
                        AR_Design = dto.AR_Design,
                        FA_CodeFamille = dto.FA_CodeFamille,
                        AR_UniteVen = dto.AR_UniteVen,
                        AR_PrixVen = dto.AR_PrixVen,
                        AR_PrixTTC = dto.AR_PrixTTC,
                        AR_SuiviStock = dto.AR_SuiviStock,
                        AR_Sommeil = dto.AR_Sommeil,
                        AR_CodeBarre = dto.AR_CodeBarre,
                        AR_Publie = dto.AR_Publie,
                        CL_No1 = dto.CL_No1,
                        CL_No2 = dto.CL_No2,
                        CL_No3 = dto.CL_No3,
                        CL_No4 = dto.CL_No4,
                        AR_Type = dto.AR_Type
                    });

                    inserted++;
                }
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new { isSuccess = true, totalFromSage = dtos.Count, inserted, updated });
        }
    }
}