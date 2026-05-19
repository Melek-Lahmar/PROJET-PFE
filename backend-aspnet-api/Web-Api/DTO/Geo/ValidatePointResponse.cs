namespace Web_Api.DTO.Geo;

public sealed class ValidatePointResponse
{
    public string Status { get; set; } = "Unknown";
    public string? SuggestedGouvernorat { get; set; }
    public string? SuggestedDelegation { get; set; }
    public double? DistanceMeters { get; set; }
    public string Message { get; set; } = string.Empty;
}
