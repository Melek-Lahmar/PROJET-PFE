namespace Web_Api.DTO.Orders
{
    public class CustomerTrackingEventDto
    {
        public string Label { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public string? Description { get; set; }
        public bool IsDone { get; set; }
        /// <summary>DONE | ACTIVE | PENDING | ERROR</summary>
        public string State { get; set; } = "PENDING";
    }
}
