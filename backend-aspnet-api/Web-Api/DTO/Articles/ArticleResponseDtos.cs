namespace Web_Api.DTO.Articles
{
    public class ArticleResponseDto
    {
        public int CbMarq { get; set; }
        public string AR_Ref { get; set; } = string.Empty;
        public string AR_Design { get; set; } = string.Empty;
        public string FA_CodeFamille { get; set; } = string.Empty;
        public short AR_UniteVen { get; set; }
        public decimal AR_PrixVen { get; set; }
        public short AR_PrixTTC { get; set; }
        public short AR_SuiviStock { get; set; }
        public short AR_Sommeil { get; set; }
        public string? AR_Image { get; set; }
        public string AR_CodeBarre { get; set; } = string.Empty;
        public short AR_Publie { get; set; }
        public int CL_No1 { get; set; }
        public int CL_No2 { get; set; }
        public int CL_No3 { get; set; }
        public int CL_No4 { get; set; }
        public short AR_Type { get; set; }

        public decimal AvailableStock { get; set; }
        public string StockStatus { get; set; } = "OUT_OF_STOCK";
        public bool IsOutOfStock { get; set; }
        public bool IsLowStock { get; set; }
        public bool IsInStock { get; set; }
    }
}
