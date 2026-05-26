namespace Web_Api.DTO.Reclamations
{
    public class ReclamationMessageDto
    {
        public int Id { get; set; }
        public int ReclamationId { get; set; }
        public Guid SenderUserId { get; set; }
        public string SenderRole { get; set; } = string.Empty;
        public string SenderDisplay { get; set; } = string.Empty;
        public string MessageText { get; set; } = string.Empty;
        public string MessageType { get; set; } = "TEXT";
        public string? MediaUrl { get; set; }
        public string? MediaFileName { get; set; }
        public string? MediaContentType { get; set; }
        public long? MediaSize { get; set; }
        public bool IsInternal { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
    }

    public class SendMessageRequestDto
    {
        public string MessageText { get; set; } = string.Empty;
        public bool IsInternal { get; set; }
    }
}
