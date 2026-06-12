using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.data;
using Web_Api.Model;
using Web_Api.DTO;
using Web_Api.Services;

namespace Web_Api.Controllers.Stocks
{
    [ApiController]
    [Authorize(Roles = AppRoles.ADMIN)]
    [Route("api/sync/stocks")]
    public class SyncStockController : ControllerBase
    {
        private readonly SageService _sageService;
        private readonly AppDbContext _db;

        public SyncStockController(SageService sageService, AppDbContext db)
        {
            _sageService = sageService;
            _db = db;
        }

        [HttpPost]
        public async Task<IActionResult> Sync(CancellationToken ct)
        {
            List<StockSageDto> dtos;
            try { dtos = await _sageService.GetStocksFromSage(ct); }
            catch (Exception ex) { return StatusCode(502, new { isSuccess = false, error = ex.Message }); }

            var existing = await _db.F_ARTSTOCKS.ToListAsync(ct);
            var byKey = existing.ToDictionary(x => $"{x.AR_Ref}__{x.DE_No}");

            int inserted = 0, updated = 0;

            foreach (var dto in dtos)
            {
                var key = $"{dto.AR_Ref}__{dto.DE_No}";

                if (byKey.TryGetValue(key, out var entity))
                {
                    entity.AS_QteSto = dto.AS_QteSto;
                    entity.AS_QteRes = dto.AS_QteRes;
                    entity.AS_QteMini = dto.AS_QteMini ?? 0m;
                    entity.AS_QteMaxi = dto.AS_QteMaxi ?? 0m;
                    entity.AS_Principal = dto.AS_Principal;

                    updated++;
                }
                else
                {
                    _db.F_ARTSTOCKS.Add(new F_ARTSTOCK
                    {
                        AR_Ref = dto.AR_Ref,
                        DE_No = dto.DE_No,
                        AS_QteSto = dto.AS_QteSto,
                        AS_QteRes = dto.AS_QteRes,
                        AS_QteMini = dto.AS_QteMini ?? 0m,
                        AS_QteMaxi = dto.AS_QteMaxi ?? 0m,
                        AS_Principal = dto.AS_Principal
                    });

                    inserted++;
                }
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new { isSuccess = true, totalFromSage = dtos.Count, inserted, updated });
        }
    }
}
