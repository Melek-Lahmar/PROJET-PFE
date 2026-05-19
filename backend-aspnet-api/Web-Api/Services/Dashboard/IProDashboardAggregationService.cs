using Web_Api.DTO.Dashboard;

namespace Web_Api.Services.Dashboard
{
    public interface IProDashboardAggregationService
    {
        Task<ProDashboardPageResponseDto> GetOverviewAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetSalesAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetOrdersAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetProductsAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetStockAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetDepotsAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetLogisticsAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetDriversAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetClientsAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetReclamationsAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetSyncAsync(ProDashboardFilterDto query, CancellationToken ct);
        Task<ProDashboardPageResponseDto> GetInsightsAsync(ProDashboardFilterDto query, CancellationToken ct);
    }
}