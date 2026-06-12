using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Web_Api.Controllers.Admin;
using Web_Api.data;
using Web_Api.Services;
using Xunit;

namespace Web_Api.Tests.Admin;

public sealed class AdminSettingsDeliveryFeeTests
{
    [Fact]
    public async Task Get_delivery_fee_returns_default_when_setting_is_missing()
    {
        await using var db = CreateDb();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = new AdminSettingsController(new AppSettingsService(db, cache));

        var result = await controller.GetDeliveryFee(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<AdminSettingsController.DeliveryFeeResponseDto>(ok.Value);
        Assert.Equal(AppSettingsService.DeliveryFeeHomeKey, dto.Key);
        Assert.Equal(8.000m, dto.Value);
        Assert.True(dto.IsPublic);
    }

    [Fact]
    public async Task Put_delivery_fee_saves_public_json_number()
    {
        await using var db = CreateDb();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = new AdminSettingsController(new AppSettingsService(db, cache));

        var result = await controller.PutDeliveryFee(
            new AdminSettingsController.DeliveryFeePutDto { Value = 9.500m },
            CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        var row = await db.AppSettings.SingleAsync(x => x.Key == AppSettingsService.DeliveryFeeHomeKey);
        Assert.Equal("9.500", row.ValueJson);
        Assert.True(row.IsPublic);
    }

    [Theory]
    [InlineData(-0.001)]
    [InlineData(1000.000)]
    public async Task Put_delivery_fee_rejects_invalid_values(double rawValue)
    {
        await using var db = CreateDb();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = new AdminSettingsController(new AppSettingsService(db, cache));

        var result = await controller.PutDeliveryFee(
            new AdminSettingsController.DeliveryFeePutDto { Value = (decimal)rawValue },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Public_settings_contains_delivery_fee_after_update()
    {
        await using var db = CreateDb();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new AppSettingsService(db, cache);
        var admin = new AdminSettingsController(service);
        var publicController = new PublicSettingsController(service);

        await admin.PutDeliveryFee(
            new AdminSettingsController.DeliveryFeePutDto { Value = 9.500m },
            CancellationToken.None);

        var result = await publicController.Public(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var dict = Assert.IsType<Dictionary<string, string>>(ok.Value);
        Assert.Equal("9.500", dict[AppSettingsService.DeliveryFeeHomeKey]);
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new AppDbContext(options);
    }
}
