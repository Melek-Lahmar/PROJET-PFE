using System.ComponentModel.DataAnnotations;

namespace Web_Api.Auth.DTO
{
    public class AssignRolesRequestDto
    {
        [Required]
        public string[] Roles { get; set; } = Array.Empty<string>();
    }
}
