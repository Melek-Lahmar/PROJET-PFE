using Web_Api.Auth.Entities;

namespace Web_Api.DTO.Admin
{
    public class UserAdminResponseDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = "";
        public List<string> Roles { get; set; } = new();
        public ProfilUtilisateur? Profile { get; set; }
    }
}
