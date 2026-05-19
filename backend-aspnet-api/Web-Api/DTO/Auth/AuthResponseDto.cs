namespace Web_Api.Auth.DTO
{
    public class AuthResponseDto
    {
        public string AccessToken { get; set; } = "";
        public int ExpiresInMinutes { get; set; }
        public Guid UserId { get; set; }
        public string Email { get; set; } = "";
        public string[] Roles { get; set; } = Array.Empty<string>();
        public string Role { get; set; } = "";
        public bool IsTransit { get; set; }
        public string[] Interfaces { get; set; } = Array.Empty<string>();
    }
}
