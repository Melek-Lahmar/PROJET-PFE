using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Caching.Memory;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.Model;
using Web_Api.Services;
using Xunit;

namespace Web_Api.Tests.Orders;

public sealed class BonCommandeDeliveryFeeTests
{
    private const string ArticleRef = "ART-FEE-001";

    [Fact]
    public async Task Home_delivery_uses_current_setting_as_document_snapshot()
    {
        await using var fixture = CreateFixture();
        await fixture.Settings.SetDecimalAsync(AppSettingsService.DeliveryFeeHomeKey, 9.500m, null, true, null);

        var created = await fixture.Service.CreateForGuestAsync(CreateGuestRequest("HOME"), CancellationToken.None);

        Assert.Equal(9.500m, created.Entete.DO_FraisLivraison);
    }

    [Fact]
    public async Task Pickup_delivery_uses_zero_delivery_fee()
    {
        await using var fixture = CreateFixture();
        await fixture.Settings.SetDecimalAsync(AppSettingsService.DeliveryFeeHomeKey, 9.500m, null, true, null);

        var created = await fixture.Service.CreateForGuestAsync(CreateGuestRequest("PICKUP"), CancellationToken.None);

        Assert.Equal(0m, created.Entete.DO_FraisLivraison);
    }

    [Fact]
    public async Task Existing_order_keeps_delivery_fee_when_setting_changes()
    {
        await using var fixture = CreateFixture();
        await fixture.Settings.SetDecimalAsync(AppSettingsService.DeliveryFeeHomeKey, 9.500m, null, true, null);
        var created = await fixture.Service.CreateForGuestAsync(CreateGuestRequest("HOME"), CancellationToken.None);

        await fixture.Settings.SetDecimalAsync(AppSettingsService.DeliveryFeeHomeKey, 12.000m, null, true, null);
        var persisted = await fixture.Db.F_DOCENTETES.SingleAsync(x => x.DO_Piece == created.Entete.DO_Piece);

        Assert.Equal(9.500m, persisted.DO_FraisLivraison);
    }

    [Fact]
    public async Task Net_a_payer_includes_total_discounted_ttc_delivery_fee_and_stamp()
    {
        await using var fixture = CreateFixture();
        await fixture.Settings.SetDecimalAsync(AppSettingsService.DeliveryFeeHomeKey, 9.500m, null, true, null);

        var created = await fixture.Service.CreateForGuestAsync(CreateGuestRequest("HOME", qty: 2m), CancellationToken.None);

        Assert.Equal(30.500m, created.Entete.DO_NetAPayer);
    }

    [Fact]
    public async Task Bc_to_bl_keeps_existing_delivery_fee()
    {
        await using var fixture = CreateFixture();
        await fixture.Settings.SetDecimalAsync(AppSettingsService.DeliveryFeeHomeKey, 9.500m, null, true, null);
        var created = await fixture.Service.CreateForGuestAsync(CreateGuestRequest("HOME"), CancellationToken.None);

        var blService = new BcToBlService(fixture.Db);
        var (bl, stockError, errorMessage) = await blService.ConfirmAndTransformBcToBlAsync(created.Entete.DO_Piece!, CancellationToken.None);

        Assert.Null(stockError);
        Assert.Null(errorMessage);
        Assert.NotNull(bl);
        Assert.Equal(9.500m, bl!.FraisLivraison);
    }

    private static TestFixture CreateFixture()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var db = new AppDbContext(options);
        db.F_DEPOTS.Add(new F_DEPOT
        {
            cbMarq = 1,
            DE_No = 1,
            DE_Code = "D001",
            DE_Intitule = "Dépôt test",
            DE_Principal = 1,
            DE_Ville = "Sfax"
        });
        db.F_ARTICLES.Add(new F_ARTICLE
        {
            cbMarq = 1,
            AR_Ref = ArticleRef,
            AR_Design = "Article frais",
            FA_CodeFamille = "TEST",
            AR_UniteVen = 1,
            AR_PrixVen = 10m,
            AR_PrixTTC = 1,
            AR_SuiviStock = 1,
            AR_Sommeil = 0,
            AR_CodeBarre = "6190000000020",
            AR_Publie = 1,
            CL_No1 = 1,
            CL_No2 = 0,
            CL_No3 = 0,
            CL_No4 = 0,
            AR_Type = 0
        });
        db.F_ARTSTOCKS.Add(new F_ARTSTOCK
        {
            cbMarq = 1,
            AR_Ref = ArticleRef,
            DE_No = 1,
            AS_QteSto = 20m,
            AS_QteRes = 0m,
            AS_Principal = 1
        });
        db.SaveChanges();

        var cache = new MemoryCache(new MemoryCacheOptions());
        var settings = new AppSettingsService(db, cache);
        var service = new BonCommandeService(db, new OrderCalculatorService(), appSettings: settings);

        return new TestFixture(db, cache, settings, service);
    }

    private static CreateGuestBonCommandeRequestDto CreateGuestRequest(string deliveryType, decimal qty = 1m)
    {
        return new CreateGuestBonCommandeRequestDto
        {
            DepotNo = deliveryType == "PICKUP" ? 1 : null,
            DeliveryType = deliveryType,
            PaymentMethod = "COD",
            Address = deliveryType == "HOME" ? "Route de Tunis" : null,
            City = deliveryType == "HOME" ? "Sfax" : null,
            PostalCode = deliveryType == "HOME" ? "3000" : null,
            Customer = new GuestBonCommandeCustomerDto
            {
                TypeClient = "B2C",
                NomComplet = "Client Test",
                Telephone = "22123456",
                Gouvernorat = "Sfax",
                Delegation = "Sfax Ville",
                Adresse = "Route de Tunis",
                CodePostal = "3000"
            },
            Lines = new List<CreateBonCommandeLineRequestDto>
            {
                new() { ArticleRef = ArticleRef, Qty = qty }
            }
        };
    }

    private sealed record TestFixture(
        AppDbContext Db,
        MemoryCache Cache,
        AppSettingsService Settings,
        BonCommandeService Service) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            Cache.Dispose();
            await Db.DisposeAsync();
        }
    }
}
