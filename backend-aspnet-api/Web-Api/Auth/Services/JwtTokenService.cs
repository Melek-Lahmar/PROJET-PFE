using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Web_Api.Auth.Entities;
using Web_Api.Auth.Options;

namespace Web_Api.Auth.Services
{
    public interface IJwtTokenService
    {
        Task<(string token, int expiresInMinutes, string[] roles)> CreateTokenAsync(ApplicationUser user);
    }

    public class JwtTokenService : IJwtTokenService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly JwtOptions _jwt;

        public JwtTokenService(UserManager<ApplicationUser> userManager, IOptions<JwtOptions> jwtOptions)
        {
            _userManager = userManager;
            _jwt = jwtOptions.Value;
        }

        public async Task<(string token, int expiresInMinutes, string[] roles)> CreateTokenAsync(ApplicationUser user)
        {
            var roles = (await _userManager.GetRolesAsync(user)).ToArray();

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Email, user.Email ?? "")
            };

            foreach (var r in roles)
                claims.Add(new Claim(ClaimTypes.Role, r));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes);

            var token = new JwtSecurityToken(
                issuer: _jwt.Issuer,
                audience: _jwt.Audience,
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            var jwtToken = new JwtSecurityTokenHandler().WriteToken(token);
            return (jwtToken, _jwt.AccessTokenMinutes, roles);
        }
    }
}
