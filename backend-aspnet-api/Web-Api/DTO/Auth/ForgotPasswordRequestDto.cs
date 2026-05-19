using System.ComponentModel.DataAnnotations;

namespace Web_Api.Auth.DTO
{
    public class ForgotPasswordRequestDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = "";
    }
}