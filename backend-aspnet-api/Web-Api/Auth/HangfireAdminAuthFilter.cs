using Hangfire.Dashboard;
using Web_Api.Auth.Constants;

namespace Web_Api.Auth
{
    /// <summary>
    /// Section 1.1 — Restreint /hangfire au rôle ADMIN.
    /// En dev (Environment.IsDevelopment) : autorise tout le monde pour faciliter
    /// le debug. En prod : authentification + rôle ADMIN obligatoires.
    /// </summary>
    public class HangfireAdminAuthFilter : IDashboardAuthorizationFilter
    {
        public bool Authorize(DashboardContext context)
        {
            var http = context.GetHttpContext();
            var env = http.RequestServices.GetService<IWebHostEnvironment>();
            if (env != null && env.IsDevelopment()) return true;
            return http.User.Identity?.IsAuthenticated == true
                && http.User.IsInRole(AppRoles.ADMIN);
        }
    }
}
