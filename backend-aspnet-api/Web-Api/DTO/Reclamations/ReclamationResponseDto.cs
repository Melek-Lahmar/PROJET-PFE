namespace Web_Api.DTO.Reclamations
{
    public class ReclamationResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public ReclamationDetailsDto Reclamation { get; set; } = new();
    }
}
