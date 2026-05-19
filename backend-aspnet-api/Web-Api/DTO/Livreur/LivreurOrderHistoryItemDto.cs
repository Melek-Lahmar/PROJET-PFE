using System;

namespace Web_Api.DTO.Livreur
{
    public class LivreurOrderHistoryItemDto
    {
        public string Label { get; set; } = string.Empty;
        public string? Status { get; set; }
        public DateTime? Date { get; set; }
        public string? Description { get; set; }
    }
}