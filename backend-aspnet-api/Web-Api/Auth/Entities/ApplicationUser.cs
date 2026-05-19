using Microsoft.AspNetCore.Identity;

namespace Web_Api.Auth.Entities
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        public ProfilUtilisateur? CustomerProfile { get; set; }
    }
}
