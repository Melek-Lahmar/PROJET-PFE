using Web_Api.Auth.Entities;

namespace Web_Api.Auth.DTO
{
    public class MeResponseDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = "";
        public string[] Roles { get; set; } = Array.Empty<string>();
        public ProfilUtilisateur? Profile { get; set; }
        public string Role { get; set; } = "";
        public bool IsTransit { get; set; }
        public string[] Interfaces { get; set; } = Array.Empty<string>();
    }
}
