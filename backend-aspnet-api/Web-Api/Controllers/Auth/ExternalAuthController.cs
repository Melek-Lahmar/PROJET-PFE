using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Web_Api.Auth.Constants;
using Web_Api.Auth.DTO;
using Web_Api.Auth.Entities;
using Web_Api.Auth.Services;

namespace Web_Api.Controllers.Auth
{
    [ApiController]
    [Route("api/auth")]
    public class ExternalAuthController : ControllerBase
    {
        private const string ExternalScheme = "External";

        private readonly IConfiguration _config;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IJwtTokenService _jwt;

        public ExternalAuthController(
            IConfiguration config,
            UserManager<ApplicationUser> userManager,
            IJwtTokenService jwt)
        {
            _config = config;
            _userManager = userManager;
            _jwt = jwt;
        }

        // ✅ Start OAuth flow
        // GET /api/auth/external/google
        // GET /api/auth/external/facebook
        [HttpGet("external/{provider}")]
        public IActionResult Start([FromRoute] string provider)
        {
            var normalizedProvider = provider?.Trim().ToLowerInvariant() ?? "";
            var scheme = GetScheme(normalizedProvider);

            if (scheme == null)
                return BadRequest(new { message = "Provider non supporté." });

            var configError = GetExternalProviderConfigurationError(normalizedProvider);
            if (!string.IsNullOrWhiteSpace(configError))
                return BadRequest(new { message = configError });

            var redirectUrl = Url.Action(nameof(Callback), "ExternalAuth", new { provider = normalizedProvider }, Request.Scheme);
            var props = new AuthenticationProperties { RedirectUri = redirectUrl };

            return Challenge(props, scheme);
        }
        [HttpGet("external/failure")]
        public IActionResult Failure([FromQuery] string? provider, [FromQuery] string? message)
        {
            var frontendOrigin = _config["ExternalAuth:FrontendOrigin"] ?? "http://localhost:5173";

            var normalizedProvider = string.IsNullOrWhiteSpace(provider)
                ? "provider"
                : provider.Trim().ToLowerInvariant();

            var finalMessage = string.IsNullOrWhiteSpace(message)
                ? $"Échec de l'authentification externe ({normalizedProvider})."
                : $"Échec de l'authentification externe ({normalizedProvider}) : {message}";

            return HtmlPostMessage(frontendOrigin, "OAUTH_LOGIN_ERROR", new
            {
                message = finalMessage
            });
        }

        private string? GetExternalProviderConfigurationError(string provider)
        {
            provider = provider.Trim().ToLowerInvariant();

            if (provider == "google")
            {
                var clientId = _config["ExternalAuth:Google:ClientId"];
                var clientSecret = _config["ExternalAuth:Google:ClientSecret"];

                if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
                    return "Configuration Google incomplète côté backend.";
            }

            if (provider == "facebook")
            {
                var appId = _config["ExternalAuth:Facebook:AppId"];
                var appSecret = _config["ExternalAuth:Facebook:AppSecret"];

                if (string.IsNullOrWhiteSpace(appId) ||
                    string.IsNullOrWhiteSpace(appSecret) ||
                    string.Equals(appId, "A_REMPLACER_PAR_TON_FACEBOOK_APP_ID", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(appSecret, "A_REMPLACER_PAR_TON_FACEBOOK_APP_SECRET", StringComparison.OrdinalIgnoreCase))
                {
                    return "Configuration Facebook incomplète côté backend. Renseigne AppId et AppSecret réels.";
                }
            }

            return null;
        }

        // ✅ Final callback (after signin-google / signin-facebook)
        // GET /api/auth/external/google/callback
        // GET /api/auth/external/facebook/callback
        [HttpGet("external/{provider}/callback")]
        public async Task<IActionResult> Callback([FromRoute] string provider)
        {
            var frontendOrigin = _config["ExternalAuth:FrontendOrigin"] ?? "http://localhost:5173";

            var authResult = await HttpContext.AuthenticateAsync(ExternalScheme);
            if (!authResult.Succeeded || authResult.Principal == null)
            {
                await HttpContext.SignOutAsync(ExternalScheme);
                return HtmlPostMessage(frontendOrigin, "OAUTH_LOGIN_ERROR", new { message = "Échec authentification externe." });
            }

            var principal = authResult.Principal;

            var email =
                principal.FindFirstValue(ClaimTypes.Email) ??
                principal.FindFirstValue("email");

            var providerKey =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub") ??
                "";

            if (string.IsNullOrWhiteSpace(email))
            {
                await HttpContext.SignOutAsync(ExternalScheme);
                return HtmlPostMessage(frontendOrigin, "OAUTH_LOGIN_ERROR", new { message = "Email non fourni par le provider." });
            }

            // 1) Find or create user
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true
                };

                var create = await _userManager.CreateAsync(user);
                if (!create.Succeeded)
                {
                    await HttpContext.SignOutAsync(ExternalScheme);
                    return HtmlPostMessage(frontendOrigin, "OAUTH_LOGIN_ERROR", new
                    {
                        message = "Création utilisateur échouée.",
                        errors = create.Errors.Select(e => e.Description).ToArray()
                    });
                }

                // rôle par défaut
                await _userManager.AddToRoleAsync(user, AppRoles.CLIENT);
            }

            // 2) Link external login (AspNetUserLogins)
            if (!string.IsNullOrWhiteSpace(providerKey))
            {
                var loginProvider = GetLoginProviderName(provider);
                var info = new UserLoginInfo(loginProvider, providerKey, loginProvider);

                var existing = await _userManager.GetLoginsAsync(user);
                var alreadyLinked = existing.Any(l => l.LoginProvider == info.LoginProvider && l.ProviderKey == info.ProviderKey);

                if (!alreadyLinked)
                    await _userManager.AddLoginAsync(user, info);
            }

            // 3) Clear external cookie
            await HttpContext.SignOutAsync(ExternalScheme);

            // 4) Issue JWT
            var (token, exp, roles) = await _jwt.CreateTokenAsync(user);

            var res = new AuthResponseDto
            {
                AccessToken = token,
                ExpiresInMinutes = exp,
                UserId = user.Id,
                Email = user.Email ?? "",
                Roles = roles
            };

            return HtmlPostMessage(frontendOrigin, "OAUTH_LOGIN_SUCCESS", res);
        }

        private static string? GetScheme(string provider)
        {
            provider = provider.Trim().ToLowerInvariant();
            return provider switch
            {
                "google" => GoogleDefaults.AuthenticationScheme,
                "facebook" => FacebookDefaults.AuthenticationScheme,
                _ => null
            };
        }

        private static string GetLoginProviderName(string provider)
        {
            provider = provider.Trim().ToLowerInvariant();
            return provider switch
            {
                "google" => "Google",
                "facebook" => "Facebook",
                _ => provider
            };
        }

        private ContentResult HtmlPostMessage(string targetOrigin, string type, object payload)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(
                payload,
                new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
            );

            var safeJson = JavaScriptEncoder.Default.Encode(json);
            var safeOrigin = JavaScriptEncoder.Default.Encode(targetOrigin);
            var safeType = JavaScriptEncoder.Default.Encode(type);

            var html = $@"
<!doctype html>
<html>
<head><meta charset='utf-8' /></head>
<body>
<script>
(function(){{
  try {{
    var data = JSON.parse(""{safeJson}"");
    if (window.opener) {{
      window.opener.postMessage({{ type: ""{safeType}"", payload: data }}, ""{safeOrigin}"");
    }}
  }} catch(e) {{}}
  window.close();
}})();
</script>
</body>
</html>";

            return Content(html, "text/html");
        }
    }
}