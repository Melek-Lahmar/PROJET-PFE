using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.Geo;
using Web_Api.Model;
using Web_Api.Services.Favorites;
using Xunit;

namespace Web_Api.Tests.Favorites;

public sealed class ClientFavoritesServiceTests
{
    [Fact]
    public async Task ToggleAsync_ForB2BClient_AddsThenRemovesFavorite()
    {
        await using var fixture = await FavoriteFixture.CreateAsync(TypeClient.B2B);
        fixture.Db.F_ARTICLES.Add(CreateArticle("DIS030", "Wide Spade Chisel", 32m));
        await fixture.Db.SaveChangesAsync();

        var added = await fixture.Service.ToggleAsync(" DIS030 ", CancellationToken.None);
        var existsAfterAdd = await fixture.Service.ExistsAsync("DIS030", CancellationToken.None);

        var removed = await fixture.Service.ToggleAsync("DIS030", CancellationToken.None);
        var countAfterRemove = await fixture.Service.CountAsync(CancellationToken.None);

        Assert.True(added.IsFavorite);
        Assert.Equal("DIS030", added.ArRef);
        Assert.True(existsAfterAdd.IsFavorite);
        Assert.False(removed.IsFavorite);
        Assert.Equal(0, countAfterRemove.Count);
    }

    [Fact]
    public async Task ListAsync_ReturnsFavoriteArticlesWithStockStatus()
    {
        await using var fixture = await FavoriteFixture.CreateAsync(TypeClient.B2C);
        fixture.Db.F_ARTICLES.Add(CreateArticle("RAW347", "Bread Bag", 0.25m));
        fixture.Db.F_ARTSTOCKS.Add(new F_ARTSTOCK
        {
            AR_Ref = "RAW347",
            DE_No = 1,
            AS_QteSto = 10m,
            AS_QteRes = 2m,
            AS_Principal = 1
        });
        fixture.Db.F_CLIENT_FAVORIS.Add(new F_CLIENT_FAVORI
        {
            ClientUserId = fixture.UserId,
            AR_Ref = "RAW347",
            CreatedAt = DateTime.UtcNow
        });
        await fixture.Db.SaveChangesAsync();

        var favorites = await fixture.Service.ListAsync(CancellationToken.None);

        var favorite = Assert.Single(favorites);
        Assert.Equal("RAW347", favorite.ArRef);
        Assert.Equal("Bread Bag", favorite.Designation);
        Assert.Equal(8m, favorite.AvailableStock);
        Assert.Equal("IN_STOCK", favorite.StockStatus);
    }

    [Fact]
    public async Task AddAsync_WhenArticleIsNotPublished_ReturnsNotFound()
    {
        await using var fixture = await FavoriteFixture.CreateAsync(TypeClient.B2B);
        fixture.Db.F_ARTICLES.Add(CreateArticle("HIDDEN", "Hidden Article", 10m, published: false));
        await fixture.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            fixture.Service.AddAsync("HIDDEN", CancellationToken.None));
    }

    private static F_ARTICLE CreateArticle(string reference, string designation, decimal price, bool published = true)
    {
        return new F_ARTICLE
        {
            AR_Ref = reference,
            AR_Design = designation,
            FA_CodeFamille = "TEST",
            AR_UniteVen = 1,
            AR_PrixVen = price,
            AR_PrixTTC = 1,
            AR_SuiviStock = 1,
            AR_Sommeil = 0,
            AR_CodeBarre = reference,
            AR_Publie = published ? (short)1 : (short)0,
            CL_No1 = 1,
            CL_No2 = 0,
            CL_No3 = 0,
            CL_No4 = 0,
            AR_Type = 0
        };
    }

    private sealed class FavoriteFixture : IAsyncDisposable
    {
        private readonly ServiceProvider _provider;

        private FavoriteFixture(ServiceProvider provider, AppDbContext db, ClientFavoritesService service, Guid userId)
        {
            _provider = provider;
            Db = db;
            Service = service;
            UserId = userId;
        }

        public AppDbContext Db { get; }
        public ClientFavoritesService Service { get; }
        public Guid UserId { get; }

        public static async Task<FavoriteFixture> CreateAsync(TypeClient typeClient)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddHttpContextAccessor();
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(Guid.NewGuid().ToString("N")));
            services
                .AddIdentityCore<ApplicationUser>()
                .AddRoles<IdentityRole<Guid>>()
                .AddEntityFrameworkStores<AppDbContext>();

            var provider = services.BuildServiceProvider();
            var db = provider.GetRequiredService<AppDbContext>();
            var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            if (!await roleManager.RoleExistsAsync(AppRoles.CLIENT))
                await roleManager.CreateAsync(new IdentityRole<Guid>(AppRoles.CLIENT));

            var userId = Guid.NewGuid();
            var user = new ApplicationUser
            {
                Id = userId,
                UserName = $"{typeClient.ToString().ToLowerInvariant()}@test.tn",
                Email = $"{typeClient.ToString().ToLowerInvariant()}@test.tn",
                EmailConfirmed = true
            };

            var create = await userManager.CreateAsync(user);
            Assert.True(create.Succeeded, string.Join("; ", create.Errors.Select(e => e.Description)));

            var role = await userManager.AddToRoleAsync(user, AppRoles.CLIENT);
            Assert.True(role.Succeeded, string.Join("; ", role.Errors.Select(e => e.Description)));

            db.ProfilsUtilisateurs.Add(new ProfilUtilisateur
            {
                UtilisateurId = userId,
                TypeProfil = TypeProfil.Client,
                TypeClient = typeClient,
                NomComplet = typeClient == TypeClient.B2C ? "Client B2C" : null,
                NomSociete = typeClient == TypeClient.B2B ? "Client B2B" : null,
                Gouvernorat = GouvernoratTunisie.Sfax,
                Delegation = "Sfax Ville",
                Adresse = "Route de Tunis"
            });
            await db.SaveChangesAsync();

            var httpContextAccessor = new FixedHttpContextAccessor
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                        new Claim(ClaimTypes.Role, AppRoles.CLIENT)
                    }, "Test"))
                }
            };

            var service = new ClientFavoritesService(db, httpContextAccessor, userManager);
            return new FavoriteFixture(provider, db, service, userId);
        }

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await _provider.DisposeAsync();
        }
    }

    private sealed class FixedHttpContextAccessor : IHttpContextAccessor
    {
        public HttpContext? HttpContext { get; set; }
    }
}
