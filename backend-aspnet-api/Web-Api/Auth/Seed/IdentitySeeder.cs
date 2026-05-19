using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.Geo;

namespace Web_Api.Auth.Seed
{
    public static class IdentitySeeder
    {
        /// <summary>
        /// 1.B — Garantit l'existence de la ligne singleton F_APP_CONFIG (Id=1).
        /// La colonne Id a été créée en IDENTITY par EF — toute tentative
        /// d'INSERT explicite côté controller échouait. On force l'INSERT
        /// initial via SET IDENTITY_INSERT, puis tous les UPDATE futurs
        /// passent normalement.
        /// </summary>
        public static async Task SeedAppConfigAsync(AppDbContext db)
        {
            // Si la ligne existe déjà, rien à faire.
            var exists = await db.F_APP_CONFIGS.AsNoTracking().AnyAsync(c => c.Id == 1);
            if (exists) return;

            // Sinon, INSERT via SQL brut avec IDENTITY_INSERT activé.
            await db.Database.ExecuteSqlRawAsync(@"
SET IDENTITY_INSERT [F_APP_CONFIG] ON;
IF NOT EXISTS (SELECT 1 FROM [F_APP_CONFIG] WHERE [Id] = 1)
    INSERT INTO [F_APP_CONFIG] ([Id], [PrimaryColor], [ThemeMode], [UpdatedAt])
    VALUES (1, '#3F51B5', 'auto', SYSUTCDATETIME());
SET IDENTITY_INSERT [F_APP_CONFIG] OFF;");
        }

        public static async Task SeedRolesAsync(RoleManager<IdentityRole<Guid>> roleManager)
        {
            foreach (var role in AppRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role));
                }
            }
        }

        public static async Task SeedDevUsersAsync(
            UserManager<ApplicationUser> userManager,
            AppDbContext db)
        {
            var seeds = new (string Email, string Password, string Role, TypeProfil Profil, string NomComplet)[]
            {
                ("client@gmail.com",        "123456", AppRoles.CLIENT,       TypeProfil.Client,  "Client Demo"),
                ("admin@gmail.com",         "123456", AppRoles.ADMIN,        TypeProfil.Employe, "Admin Demo"),
                ("caisse@gmail.com",        "123456", AppRoles.VENDEUR,      TypeProfil.Employe, "Caisse Demo"),
                ("confirmatrice@gmail.com", "123456", AppRoles.CONFIRMATEUR, TypeProfil.Employe, "Confirmatrice Demo"),
                ("livreur@gmail.com",       "123456", AppRoles.LIVREUR,      TypeProfil.Employe, "Livreur Demo"),
                ("superviseur@gmail.com",   "123456", AppRoles.SUPERVISEUR,  TypeProfil.Employe, "Superviseur Demo"),
                ("transit@gmail.com",       "123456", AppRoles.LIVREUR,      TypeProfil.Employe, "Livreur Transit Demo"),
            };

            foreach (var s in seeds)
            {
                var existing = await userManager.FindByEmailAsync(s.Email);
                if (existing != null) continue;

                var user = new ApplicationUser
                {
                    UserName = s.Email,
                    Email = s.Email,
                    EmailConfirmed = true
                };

                var create = await userManager.CreateAsync(user, s.Password);
                if (!create.Succeeded)
                    throw new Exception(
                        $"Seed user {s.Email} failed: " +
                        string.Join("; ", create.Errors.Select(e => $"{e.Code}={e.Description}")));

                await userManager.AddToRoleAsync(user, s.Role);

                var profile = new ProfilUtilisateur
                {
                    UtilisateurId = user.Id,
                    TypeProfil = s.Profil,
                    TypeClient = s.Profil == TypeProfil.Client ? TypeClient.B2C : null,
                    NomComplet = s.NomComplet,
                    Gouvernorat = GouvernoratTunisie.Tunis,
                    Delegation = "Tunis",
                    Adresse = "Adresse demo",
                    IsTransit = s.Email.Contains("transit"),
                    DepotRattacheNo = s.Email.Contains("transit") || s.Email.Contains("livreur") ? 1 : null,
                    DateCreation = DateTime.UtcNow,
                    DateModification = DateTime.UtcNow
                };

                db.ProfilsUtilisateurs.Add(profile);
            }

            await db.SaveChangesAsync();
        }
    }
}
