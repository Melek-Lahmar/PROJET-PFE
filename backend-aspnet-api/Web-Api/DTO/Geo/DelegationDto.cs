namespace Web_Api.DTO.Geo;

public sealed class DelegationDto
{
    public string Gouvernorat { get; set; } = string.Empty;
    public string Delegation { get; set; } = string.Empty;
    public double? CentroidLatitude { get; set; }
    public double? CentroidLongitude { get; set; }
}
