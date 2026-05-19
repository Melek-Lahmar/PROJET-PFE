using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Constants;
using Web_Api.data;
using Web_Api.DTO.Statistics;

namespace Web_Api.Controllers
{
    [ApiController]
    [Route("api/statistics")]
    [Authorize(Roles = AppRoles.LIVREUR + "," + AppRoles.ADMIN + "," + AppRoles.CONFIRMATEUR)]
    public class StatisticsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public StatisticsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<DashboardResponseDto>> GetDashboard([FromQuery] string range = "week7", CancellationToken ct = default)
        {
            var start = GetStartDate(range);
            var today = DateTime.UtcNow.Date;

            var livraisons = await _db.F_LIVRAISONS
                .AsNoTracking()
                .Where(x => x.LI_DateCreation >= start)
                .ToListAsync(ct);

            var driverIds = livraisons
                .Where(x => x.LivreurId.HasValue)
                .Select(x => x.LivreurId!.Value)
                .Distinct()
                .ToList();

            var drivers = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .Where(x => driverIds.Contains(x.cbMarq))
                .ToListAsync(ct);

            var driverNames = drivers.ToDictionary(
                x => x.cbMarq,
                x => string.IsNullOrWhiteSpace(x.NomComplet) ? $"Livreur #{x.cbMarq}" : x.NomComplet!);

            string StatusOf(short code) => MapCodeToString(code);

            var total = livraisons.Count;
            var delivered = livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.Livre);
            var returned = livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.Retour);
            var reported = livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.Reporte);
            var inProgress = livraisons.Count(x => x.LI_Statut == DeliveryStatusCodes.EnLivraison);
            var successRate = total == 0 ? 0 : (double)delivered / total * 100.0;

            var response = new DashboardResponseDto
            {
                Kpis = new List<KpiItemDto>
                {
                    new() { Title = "Total affectées", Value = total.ToString(), Subtitle = "Période sélectionnée" },
                    new() { Title = "En livraison", Value = inProgress.ToString(), Subtitle = "Tournées actives" },
                    new() { Title = "Livrées", Value = delivered.ToString(), Subtitle = "Terminées" },
                    new() { Title = "Retours", Value = returned.ToString(), Subtitle = "Échec livraison", PositiveIsGood = false },
                    new() { Title = "Reportées", Value = reported.ToString(), Subtitle = "Retards", PositiveIsGood = false },
                    new() { Title = "Taux réussite", Value = $"{successRate:0.0}%", Subtitle = "Livrées / Affectées" },
                }
            };

            var days = Enumerable.Range(0, (today - start.Date).Days + 1)
                .Select(i => start.Date.AddDays(i))
                .ToList();

            response.DeliveriesTrend = days
                .Select(d => new TimePointDto
                {
                    T = d,
                    Y = livraisons.Count(x => x.LI_DateLivree.HasValue && x.LI_DateLivree.Value.Date == d)
                })
                .ToList();

            response.LateByDriver = livraisons
                .Where(x => x.LivreurId.HasValue)
                .GroupBy(x => x.LivreurId!.Value)
                .Select(g => new DriverMetricDto
                {
                    DriverName = driverNames.TryGetValue(g.Key, out var name) ? name : $"Livreur #{g.Key}",
                    LateCount = g.Count(x => x.LI_Statut == DeliveryStatusCodes.Reporte)
                })
                .OrderByDescending(x => x.LateCount)
                .ToList();

            response.StatusBreakdown = livraisons
                .GroupBy(x => StatusOf(x.LI_Statut))
                .Select(g => new StatusSliceDto
                {
                    Label = g.Key,
                    Value = g.Count()
                })
                .OrderByDescending(x => x.Value)
                .ToList();

            return Ok(response);
        }

        private static DateTime GetStartDate(string range)
        {
            var today = DateTime.UtcNow.Date;

            return (range ?? string.Empty).Trim().ToLowerInvariant() switch
            {
                "today" => today,
                "month30" => today.AddDays(-29),
                _ => today.AddDays(-6)
            };
        }

        private static string MapCodeToString(short code)
        {
            return code switch
            {
                DeliveryStatusCodes.Confirme => DeliveryStatuses.Confirme,
                DeliveryStatusCodes.EnLivraison => DeliveryStatuses.EnLivraison,
                DeliveryStatusCodes.Livre => DeliveryStatuses.Livre,
                DeliveryStatusCodes.Retour => DeliveryStatuses.Retour,
                DeliveryStatusCodes.Depot => DeliveryStatuses.Depot,
                DeliveryStatusCodes.Reporte => DeliveryStatuses.Reporte,
                _ => DeliveryStatuses.Confirme
            };
        }
    }
}