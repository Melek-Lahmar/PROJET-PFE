using System.Collections.Generic;

namespace Web_Api.DTO.BL
{
    public class StockInsufficientResponseDto
    {
        public string Message { get; set; } = "Stock insuffisant";
        public List<StockInsufficientItemDto> Items { get; set; } = new();
    }

    public class StockInsufficientItemDto
    {
        public string ArticleRef { get; set; } = "";
        public decimal RequestedQty { get; set; }
        public decimal AvailableQty { get; set; }
        public int DepotNo { get; set; }
    }
}