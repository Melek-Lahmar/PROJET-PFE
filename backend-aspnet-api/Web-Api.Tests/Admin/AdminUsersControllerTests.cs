using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.Controllers.Admin;
using Web_Api.data;
using Web_Api.DTO.Admin;
using Web_Api.Geo;
using Xunit;

namespace Web_Api.Tests.Admin;

public sealed class AdminUsersControllerTests
{
    [Fact]
    public async Task Create_b2c_client_sets_client_profile_and_role()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();

        var result = await fixture.Controller.CreateUser(CreateDto("b2c@test.tn", AppRoles.CLIENT, TypeClient.B2C));

        var user = AssertOk(result);
        var profile = await fixture.Db.ProfilsUtilisateurs.SingleAsync(x => x.UtilisateurId == user.UserId);
        Assert.Contains(AppRoles.CLIENT, user.Roles);
        Assert.Equal(TypeProfil.Client, profile.TypeProfil);
        Assert.Equal(TypeClient.B2C, profile.TypeClient);
    }

    [Fact]
    public async Task Create_b2b_client_requires_company_and_tax_id()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();
        var dto = CreateDto("b2b-invalid@test.tn", AppRoles.CLIENT, TypeClient.B2B);
        dto.NomSociete = null;
        dto.MatriculeFiscal = null;

        var result = await fixture.Controller.CreateUser(dto);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_b2b_client_sets_b2b_profile()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();

        var result = await fixture.Controller.CreateUser(CreateDto("b2b@test.tn", AppRoles.CLIENT, TypeClient.B2B));

        var user = AssertOk(result);
        var profile = await fixture.Db.ProfilsUtilisateurs.SingleAsync(x => x.UtilisateurId == user.UserId);
        Assert.Contains(AppRoles.CLIENT, user.Roles);
        Assert.Equal(TypeClient.B2B, profile.TypeClient);
        Assert.Equal("Société Test", profile.NomSociete);
        Assert.Equal("MF123", profile.MatriculeFiscal);
    }

    [Fact]
    public async Task Create_livreur_normal_sets_is_transit_false()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();

        var result = await fixture.Controller.CreateUser(CreateDto("livreur@test.tn", AppRoles.LIVREUR));

        var user = AssertOk(result);
        var profile = await fixture.Db.ProfilsUtilisateurs.SingleAsync(x => x.UtilisateurId == user.UserId);
        Assert.Contains(AppRoles.LIVREUR, user.Roles);
        Assert.False(profile.IsTransit);
    }

    [Fact]
    public async Task Create_livreur_transit_requires_and_sets_depot()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();
        var dto = CreateDto("transit@test.tn", AppRoles.LIVREUR);
        dto.IsTransit = true;
        dto.DepotRattacheNo = 4;

        var result = await fixture.Controller.CreateUser(dto);

        var user = AssertOk(result);
        var profile = await fixture.Db.ProfilsUtilisateurs.SingleAsync(x => x.UtilisateurId == user.UserId);
        Assert.True(profile.IsTransit);
        Assert.Equal(4, profile.DepotRattacheNo);
        Assert.Equal("4", profile.CodeDepot);
        Assert.Equal("TRANSIT", profile.ZoneLivraison);
    }

    [Fact]
    public async Task Create_rejects_transit_for_non_livreur()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();
        var dto = CreateDto("bad-transit@test.tn", AppRoles.ADMIN);
        dto.IsTransit = true;
        dto.DepotRattacheNo = 4;

        var result = await fixture.Controller.CreateUser(dto);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_admin_is_allowed()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();

        var result = await fixture.Controller.CreateUser(CreateDto("admin@test.tn", AppRoles.ADMIN));

        var user = AssertOk(result);
        var profile = await fixture.Db.ProfilsUtilisateurs.SingleAsync(x => x.UtilisateurId == user.UserId);
        Assert.Contains(AppRoles.ADMIN, user.Roles);
        Assert.Equal(TypeProfil.Employe, profile.TypeProfil);
        Assert.Null(profile.TypeClient);
    }

    [Fact]
    public async Task Create_rejects_duplicate_email()
    {
        await using var fixture = await AdminUsersFixture.CreateAsync();
        await fixture.Controller.CreateUser(CreateDto("duplicate@test.tn", AppRoles.ADMIN));

        var result = await fixture.Controller.CreateUser(CreateDto("duplicate@test.tn", AppRoles.ADMIN));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    private static UserAdminResponseDto AssertOk(ActionResult<UserAdminResponseDto> result)
    {
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<UserAdminResponseDto>(ok.Value);
    }

    private static CreateUserRequestDto CreateDto(string email, string role, TypeClient? typeClient = null)
    {
        return new CreateUserRequestDto
        {
            Email = email,
            Password = "12345678",
            Role = role,
            TypeProfil = role == AppRoles.CLIENT ? TypeProfil.Client : TypeProfil.Employe,
            TypeClient = role == AppRoles.CLIENT ? typeClient ?? TypeClient.B2C : null,
            NomComplet = "Utilisateur Test",
            Telephone = "22123456",
            Gouvernorat = GouvernoratTunisie.Sfax,
            Delegation = "Sfax Ville",
            Adresse = "Route de Tunis",
            CodePostal = "3000",
            Pays = "Tunisie",
            NomSociete = typeClient == TypeClient.B2B ? "Société Test" : null,
            MatriculeFiscal = typeClient == TypeClient.B2B ? "MF123" : null
        };
    }

    private sealed class AdminUsersFixture : IAsyncDisposable
    {
        private readonly ServiceProvider _provider;

        private AdminUsersFixture(ServiceProvider provider, AppDbContext db, AdminUsersController controller)
        {
            _provider = provider;
            Db = db;
            Controller = controller;
        }

        public AppDbContext Db { get; }
        public AdminUsersController Controller { get; }

        public static async Task<AdminUsersFixture> CreateAsync()
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(Guid.NewGuid().ToString("N")));
            services
                .AddIdentityCore<ApplicationUser>(options =>
                {
                    options.User.RequireUniqueEmail = true;
                    options.Password.RequiredLength = 6;
                    options.Password.RequireDigit = false;
                    options.Password.RequireLowercase = false;
                    options.Password.RequireUppercase = false;
                    options.Password.RequireNonAlphanumeric = false;
                })
                .AddRoles<IdentityRole<Guid>>()
                .AddEntityFrameworkStores<AppDbContext>();

            var provider = services.BuildServiceProvider();
            var db = provider.GetRequiredService<AppDbContext>();
            var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            foreach (var role in AppRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role));
            }

            return new AdminUsersFixture(provider, db, new AdminUsersController(db, userManager));
        }

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await _provider.DisposeAsync();
        }
    }
}
