using System.Text.Json.Serialization;

namespace Web_Api.DTO
{
    public class SageResponseDto<T>
    {
        [JsonPropertyName("isSuccess")]
        public bool IsSuccess { get; set; }

        [JsonPropertyName("value")]
        public List<T>? Value { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }
}