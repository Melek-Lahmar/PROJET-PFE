using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.DTO.Dashboard;
using Web_Api.Services.Dashboard;

namespace Web_Api.Controllers.Dashboard
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize(Roles = AppRoles.ADMIN)]
    public class DashboardController : ControllerBase
    {
        private readonly IProDashboardAggregationService _service;

        public DashboardController(IProDashboardAggregationService service)
        {
            _service = service;
        }

        [HttpGet("overview")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetOverview([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetOverviewAsync(query, ct));

        [HttpGet("sales")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetSales([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetSalesAsync(query, ct));

        [HttpGet("orders")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetOrders([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetOrdersAsync(query, ct));

        [HttpGet("products")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetProducts([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetProductsAsync(query, ct));

        [HttpGet("stock")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetStock([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetStockAsync(query, ct));

        [HttpGet("depots")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetDepots([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetDepotsAsync(query, ct));

        [HttpGet("logistics")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetLogistics([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetLogisticsAsync(query, ct));

        [HttpGet("drivers")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetDrivers([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetDriversAsync(query, ct));

        [HttpGet("clients")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetClients([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetClientsAsync(query, ct));

        [HttpGet("reclamations")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetReclamations([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetReclamationsAsync(query, ct));

        [HttpGet("sync")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetSync([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetSyncAsync(query, ct));

        [HttpGet("insights")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetInsights([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetInsightsAsync(query, ct));

        [HttpGet("admin-sync")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetAdminSyncAlias([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetSyncAsync(query, ct));

        [HttpGet("strategic-insights")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetStrategicInsightsAlias([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetInsightsAsync(query, ct));

        [HttpGet("confirmateur")]
        public Task<ActionResult<ProDashboardPageResponseDto>> GetConfirmateurAlias([FromQuery] ProDashboardFilterDto query, CancellationToken ct)
            => ExecuteAsync(() => _service.GetOrdersAsync(query, ct));

        private static async Task<ActionResult<ProDashboardPageResponseDto>> ExecuteAsync(
            Func<Task<ProDashboardPageResponseDto>> action)
        {
            try
            {
                return new OkObjectResult(await action());
            }
            catch (ArgumentException ex)
            {
                return new BadRequestObjectResult(new { message = ex.Message });
            }
        }
    }
}