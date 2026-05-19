using System.ComponentModel.DataAnnotations;

namespace Web_Api.DTO.Geo;

public sealed class ValidatePointRequest
{
    [Range(-90.0, 90.0, ErrorMessage = "Latitude doit être dans [-90, 90].")]
    public double Latitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "Longitude doit être dans [-180, 180].")]
    public double Longitude { get; set; }

    [Required(AllowEmptyStrings = false, ErrorMessage = "Gouvernorat requis.")]
    public string Gouvernorat { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "Delegation requise.")]
    public string Delegation { get; set; } = string.Empty;
}
