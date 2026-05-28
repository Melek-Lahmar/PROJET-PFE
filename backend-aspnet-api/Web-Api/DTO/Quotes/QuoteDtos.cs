namespace Web_Api.DTO.Quotes
{
    public static class DevisStatuses
    {
        public const string BROUILLON = "BROUILLON";
        public const string SOUMIS = "SOUMIS";
        public const string EN_ETUDE = "EN_ETUDE";
        public const string INFO_MANQUANTE = "INFO_MANQUANTE";
        public const string REPONSE_CLIENT = "REPONSE_CLIENT";
        public const string MODIFIE = "MODIFIE";
        public const string VALIDE = "VALIDE";
        public const string ENVOYE_CLIENT = "ENVOYE_CLIENT";
        public const string ACCEPTE_CLIENT = "ACCEPTE_CLIENT";
        public const string REFUSE_CLIENT = "REFUSE_CLIENT";
        public const string EXPIRE = "EXPIRE";
        public const string CONVERTI_BC = "CONVERTI_BC";
        public const string ANNULE = "ANNULE";
    }

    public class CreateQuoteRequestDto
    {
        public Guid ClientUserId { get; set; }
        public DateTime? ValidUntil { get; set; }
        public string? InternalNote { get; set; }
        public string? ClientNote { get; set; }
        public bool SendImmediately { get; set; }
        public List<CreateQuoteLineRequestDto> Lines { get; set; } = new();
    }

    public class CreateQuoteLineRequestDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public decimal Qty { get; set; }
    }

    public class QuoteListItemDto
    {
        public string Piece { get; set; } = string.Empty;
        public string DevisPiece { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? ClientName { get; set; }
        public string? CompanyName { get; set; }
        public string? ClientCode { get; set; }
        public string? ClientType { get; set; }
        public string? ClientPhone { get; set; }
        public string QuoteStatus { get; set; } = string.Empty;
        public string StatusKey { get; set; } = string.Empty;
        public DateTime? ValidUntil { get; set; }
        public decimal TotalBeforeDiscount { get; set; }
        public decimal TotalHT { get; set; }
        public decimal TotalHTNet { get; set; }
        public decimal TotalTTC { get; set; }
        public decimal? B2BDiscountRate { get; set; }
        public decimal? DiscountPercentSnapshot { get; set; }
        public decimal B2BDiscountAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAPayer { get; set; }
        public string? CreatedBy { get; set; }
        public string? AssignedTo { get; set; }
        public string? BcPiece { get; set; }
    }

    public class QuoteDetailDto : QuoteListItemDto
    {
        public Guid? ClientUserId { get; set; }
        public string? DiscountSource { get; set; }
        public string? ClientNote { get; set; }
        public string? InternalNote { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public DateTime? RefusedAt { get; set; }
        public DateTime? ConvertedAt { get; set; }
        public string? QuoteConvertedToPiece { get; set; }
        public string? BcPiece { get; set; }
        public int Version { get; set; }
        public List<QuoteLineDto> Lines { get; set; } = new();
        public List<QuoteTimelineItemDto> Timeline { get; set; } = new();
        public List<QuoteEventDto> Events { get; set; } = new();
    }

    public class QuoteLineDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public decimal Qty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal UnitPriceHT { get; set; }
        public decimal? DiscountLinePercent { get; set; }
        public decimal AmountHT { get; set; }
        public decimal AmountTTC { get; set; }
        public int SortOrder { get; set; }
    }

    public class QuoteTimelineItemDto
    {
        public string Label { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class QuoteEventDto
    {
        public int Id { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string? AuthorRole { get; set; }
        public string? OldStatus { get; set; }
        public string? NewStatus { get; set; }
        public string? Message { get; set; }
        public bool IsPublic { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class QuoteDecisionRequestDto
    {
        public string? Reason { get; set; }
        public string? Comment { get; set; }
    }

    public class ConvertQuoteToOrderRequestDto
    {
        public string? InternalNote { get; set; }
        public bool PreserveQuoteDiscount { get; set; } = true;
    }

    public class ConvertDevisToBcResultDto
    {
        public string DevisPiece { get; set; } = string.Empty;
        public string BcPiece { get; set; } = string.Empty;
        public bool AlreadyConverted { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class AddQuoteCommentRequestDto
    {
        public string? Message { get; set; }
        public bool IsPublic { get; set; } = true;
    }

    public class UpdateQuoteStatusRequestDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Message { get; set; }
    }

    public class UpdateQuoteLinesRequestDto
    {
        public string? Message { get; set; }
        public List<UpdateQuoteLineDto> Lines { get; set; } = new();
    }

    public class UpdateQuoteLineDto
    {
        public string ArticleRef { get; set; } = string.Empty;
        public decimal Qty { get; set; }
        public decimal? UnitPriceHT { get; set; }
        public decimal? DiscountLinePercent { get; set; }
    }
}
