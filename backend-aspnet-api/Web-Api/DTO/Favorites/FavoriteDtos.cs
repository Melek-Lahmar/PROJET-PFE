namespace Web_Api.DTO.Favorites
{
    public class FavoriteArticleDto
    {
        public string ArRef { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string? Family { get; set; }
        public decimal Price { get; set; }
        public string? Image { get; set; }
        public decimal AvailableStock { get; set; }
        public string StockStatus { get; set; } = "OUT_OF_STOCK";
        public bool IsOutOfStock { get; set; }
        public bool IsLowStock { get; set; }
        public bool IsInStock { get; set; }
        public DateTime AddedAt { get; set; }
    }

    public class FavoriteCountDto
    {
        public int Count { get; set; }
    }

    public class FavoriteExistsDto
    {
        public string ArRef { get; set; } = string.Empty;
        public bool IsFavorite { get; set; }
    }

    public class FavoriteActionResultDto
    {
        public string ArRef { get; set; } = string.Empty;
        public bool IsFavorite { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
