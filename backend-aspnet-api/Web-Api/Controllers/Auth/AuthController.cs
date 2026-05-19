using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.DTO;
using Web_Api.Auth.Entities;
using Web_Api.Auth.Services;
using Web_Api.data;
using Web_Api.Services.Email;

namespace Web_Api.Controllers.Auth
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private const string ForgotPasswordGenericMessage =
            "Si un compte existe pour cet email, la procédure de réinitialisation a été déclenchée.";

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AppDbContext _db;
        private readonly IJwtTokenService _jwt;
        private readonly IConfiguration _config;
        private readonly IEmailSenderService _emailSender;
        private readonly ILogger<AuthController> _logger;
        private readonly IWebHostEnvironment _env;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            AppDbContext db,
            IJwtTokenService jwt,
            IConfiguration config,
            IEmailSenderService emailSender,
            ILogger<AuthController> logger,
            IWebHostEnvironment env)
        {
            _userManager = userManager;
            _db = db;
            _jwt = jwt;
            _config = config;
            _emailSender = emailSender;
            _logger = logger;
            _env = env;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var existing = await _userManager.FindByEmailAsync(dto.Email);
            if (existing != null)
                return BadRequest(new { message = "Email déjà utilisé." });

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email
            };

            var create = await _userManager.CreateAsync(user, dto.Password);
            if (!create.Succeeded)
                return BadRequest(new { message = "Création utilisateur échouée.", errors = create.Errors });

            await _userManager.AddToRoleAsync(user, AppRoles.CLIENT);

            var profile = new ProfilUtilisateur
            {
                UtilisateurId = user.Id,
                TypeProfil = dto.TypeProfil,
                TypeClient = dto.TypeClient,

                NomComplet = dto.NomComplet,
                Telephone = dto.Telephone,
                CIN = dto.CIN,
                DateNaissance = dto.DateNaissance,

                Gouvernorat = dto.Gouvernorat,
                Delegation = dto.Delegation,

                Adresse = dto.Adresse,
                AdresseComplementaire = dto.AdresseComplementaire,
                CodePostal = dto.CodePostal,
                Pays = dto.Pays,

                Latitude = dto.Latitude,
                Longitude = dto.Longitude,

                NomSociete = dto.NomSociete,
                MatriculeFiscal = dto.MatriculeFiscal,

                DateCreation = DateTime.UtcNow,
                DateModification = DateTime.UtcNow
            };

            TryValidateModel(profile);
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            _db.ProfilsUtilisateurs.Add(profile);
            await _db.SaveChangesAsync(ct);

            (string token, int exp, string[] roles) = await _jwt.CreateTokenAsync(user);

            return Ok(new AuthResponseDto
            {
                AccessToken = token,
                ExpiresInMinutes = exp,
                UserId = user.Id,
                Email = user.Email ?? "",
                Roles = roles,
                Role = roles.FirstOrDefault() ?? string.Empty,
                IsTransit = profile.IsTransit,
                Interfaces = ResolveInterfaces(roles, profile.IsTransit)
            });
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
                return Unauthorized(new { message = "Identifiants invalides." });

            var ok = await _userManager.CheckPasswordAsync(user, dto.Password);
            if (!ok)
                return Unauthorized(new { message = "Identifiants invalides." });

            var (token, exp, roles) = await _jwt.CreateTokenAsync(user);
            var profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(p => p.UtilisateurId == user.Id);

            return Ok(new AuthResponseDto
            {
                AccessToken = token,
                ExpiresInMinutes = exp,
                UserId = user.Id,
                Email = user.Email ?? "",
                Roles = roles,
                Role = roles.FirstOrDefault() ?? string.Empty,
                IsTransit = profile?.IsTransit ?? false,
                Interfaces = ResolveInterfaces(roles, profile?.IsTransit ?? false)
            });
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var email = dto.Email.Trim();
            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
                return Ok(new { message = ForgotPasswordGenericMessage });

            try
            {
                var rawToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(rawToken));

                var frontendOrigin = (_config["ExternalAuth:FrontendOrigin"] ?? "http://localhost:5173").TrimEnd('/');
                var userEmail = user.Email ?? email;

                var resetUrl =
                    $"{frontendOrigin}/reset-password?email={Uri.EscapeDataString(userEmail)}&token={Uri.EscapeDataString(encodedToken)}";

                await _emailSender.SendPasswordResetEmailAsync(userEmail, resetUrl);

                if (_env.IsDevelopment())
                {
                    _logger.LogInformation(
                        "PASSWORD_RESET_LINK for {Email}: {ResetUrl}",
                        userEmail,
                        resetUrl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur envoi email forgot-password pour {Email}", email);
            }

            return Ok(new { message = ForgotPasswordGenericMessage });
        }
        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequestDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var email = dto.Email.Trim();
            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
                return BadRequest(new { message = "Lien de réinitialisation invalide ou expiré." });

            string decodedToken;
            try
            {
                decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token));
            }
            catch
            {
                return BadRequest(new { message = "Lien de réinitialisation invalide ou expiré." });
            }

            var result = await _userManager.ResetPasswordAsync(user, decodedToken, dto.NewPassword);

            if (!result.Succeeded)
            {
                var errors = result.Errors
                    .Select(x => x.Description)
                    .ToArray();

                return BadRequest(new
                {
                    message = "Impossible de réinitialiser le mot de passe.",
                    errors
                });
            }

            return Ok(new { message = "Votre mot de passe a été réinitialisé avec succès." });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult<MeResponseDto>> Me(CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized(new { message = "Token invalide." });

            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == guid, ct);
            if (user == null)
                return Unauthorized(new { message = "Utilisateur introuvable." });

            var roles = (await _userManager.GetRolesAsync(user)).ToArray();
            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == guid, ct);

            return Ok(new MeResponseDto
            {
                UserId = user.Id,
                Email = user.Email ?? "",
                Roles = roles,
                Profile = profile,
                Role = roles.FirstOrDefault() ?? string.Empty,
                IsTransit = profile?.IsTransit ?? false,
                Interfaces = ResolveInterfaces(roles, profile?.IsTransit ?? false)
            });
        }

        [Authorize]
        [HttpPut("me/profile")]
        public async Task<ActionResult> UpdateMyProfile([FromBody] UpdateProfileRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized(new { message = "Token invalide." });

            var profile = await _db.ProfilsUtilisateurs.FirstOrDefaultAsync(p => p.UtilisateurId == guid, ct);
            if (profile == null)
            {
                profile = new ProfilUtilisateur
                {
                    UtilisateurId = guid,
                    TypeProfil = TypeProfil.Client,
                    TypeClient = TypeClient.B2C,
                    DateCreation = DateTime.UtcNow,
                    DateModification = DateTime.UtcNow
                };
                _db.ProfilsUtilisateurs.Add(profile);
            }

            profile.Gouvernorat = dto.Gouvernorat;
            profile.Delegation = dto.Delegation;
            profile.Adresse = dto.Adresse;
            profile.AdresseComplementaire = dto.AdresseComplementaire;
            profile.CodePostal = dto.CodePostal;
            profile.Pays = dto.Pays;
            profile.NomComplet = dto.NomComplet;
            profile.Telephone = dto.Telephone;
            profile.CIN = dto.CIN;
            profile.DateNaissance = dto.DateNaissance;
            profile.Latitude = dto.Latitude;
            profile.Longitude = dto.Longitude;
            profile.NomSociete = dto.NomSociete;
            profile.MatriculeFiscal = dto.MatriculeFiscal;
            profile.DateModification = DateTime.UtcNow;

            TryValidateModel(profile);
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
        private static string[] ResolveInterfaces(IEnumerable<string> roles, bool isTransit)
        {
            var normalized = roles.Select(r => r.ToUpperInvariant()).ToHashSet();

            if (normalized.Contains(AppRoles.ADMIN)) return new[] { "react" };
            if (normalized.Contains(AppRoles.SUPERVISEUR)) return new[] { "react", "flutter" };
            if (normalized.Contains(AppRoles.CONFIRMATEUR)) return new[] { "react", "flutter" };
            if (normalized.Contains(AppRoles.LIVREUR) && isTransit) return new[] { "react", "flutter" };
            if (normalized.Contains(AppRoles.LIVREUR)) return new[] { "flutter" };
            if (normalized.Contains(AppRoles.CLIENT)) return new[] { "react" };
            if (normalized.Contains(AppRoles.VENDEUR)) return new[] { "react" };
            return Array.Empty<string>();
        }
    }
}