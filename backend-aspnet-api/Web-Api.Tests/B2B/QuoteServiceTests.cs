using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Quotes;
using Web_Api.Geo;
using Web_Api.Model;
using Web_Api.Services;
using Web_Api.Services.B2B;
using Xunit;

namespace Web_Api.Tests.B2B;

public sealed class QuoteServiceTests
{
    [Fact]
    public async Task CreateClientQuoteAsync_ForB2BClient_CreatesSubmittedQuoteForConnectedClient()
    {
        await using var db = CreateDb();
        var clientId = Guid.NewGuid();
        var otherClientId = Guid.NewGuid();

        db.Users.Add(new ApplicationUser { Id = clientId, UserName = "b2b@test.tn", Email = "b2b@test.tn" });
        db.Users.Add(new ApplicationUser { Id = otherClientId, UserName = "other@test.tn", Email = "other@test.tn" });
        db.ProfilsUtilisateurs.Add(new ProfilUtilisateur
        {
            UtilisateurId = clientId,
            TypeProfil = TypeProfil.Client,
            TypeClient = TypeClient.B2B,
            NomSociete = "Client B2B",
            Telephone = "22000000",
            Gouvernorat = GouvernoratTunisie.Sfax,
            Delegation = "Sfax Ville",
            Adresse = "Route de Tunis",
            CodeClientSage = "B2B001",
            DiscountPercent = 10m
        });
        db.ProfilsUtilisateurs.Add(new ProfilUtilisateur
        {
            UtilisateurId = otherClientId,
            TypeProfil = TypeProfil.Client,
            TypeClient = TypeClient.B2B,
            NomSociete = "Autre B2B",
            Gouvernorat = GouvernoratTunisie.Sfax,
            Delegation = "Sfax Ville",
            Adresse = "Route de Tunis"
        });
        db.F_ARTICLES.Add(CreateArticle("DIS030", "Wide Spade Chisel", 32m));
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var request = new CreateQuoteRequestDto
        {
            ClientUserId = otherClientId,
            SendImmediately = false,
            Lines = new List<CreateQuoteLineRequestDto>
            {
                new() { ArticleRef = "DIS030", Qty = 2m }
            }
        };

        var quote = await service.CreateClientQuoteAsync(clientId, new[] { AppRoles.CLIENT }, request, CancellationToken.None);

        Assert.StartsWith("DV", quote.Piece);
        Assert.Equal(clientId, quote.ClientUserId);
        Assert.Equal("B2B001", quote.ClientCode);
        Assert.Equal(F_DEVIS_ENTETE.STATUS_SOUMIS, quote.QuoteStatus);
        Assert.NotNull(quote.ValidUntil);
        Assert.Equal(64m, quote.TotalBeforeDiscount);
        Assert.Equal(10m, quote.B2BDiscountRate);
        Assert.Equal(6.4m, quote.B2BDiscountAmount);
        Assert.Equal(57.6m, quote.NetAPayer);
        Assert.Single(quote.Lines);

        var header = await db.F_DEVIS_ENTETES.Include(x => x.Events).SingleAsync(x => x.DevisPiece == quote.Piece);
        Assert.Equal(clientId, header.ClientUserId);
        Assert.Equal(clientId, header.CreatedByUserId);
        Assert.Null(header.AssignedConfirmateurId);
        Assert.Contains(header.Events, x => x.EventType == F_DEVIS_EVENT.TYPE_STATUS_CHANGE && x.NewStatus == F_DEVIS_ENTETE.STATUS_SOUMIS);
    }

    [Fact]
    public async Task CreateClientQuoteAsync_ForB2CClient_RejectsQuote()
    {
        await using var db = CreateDb();
        var clientId = Guid.NewGuid();

        db.Users.Add(new ApplicationUser { Id = clientId, UserName = "b2c@test.tn", Email = "b2c@test.tn" });
        db.ProfilsUtilisateurs.Add(new ProfilUtilisateur
        {
            UtilisateurId = clientId,
            TypeProfil = TypeProfil.Client,
            TypeClient = TypeClient.B2C,
            NomComplet = "Client B2C",
            Gouvernorat = GouvernoratTunisie.Sfax,
            Delegation = "Sfax Ville",
            Adresse = "Route de Tunis"
        });
        db.F_ARTICLES.Add(CreateArticle("DIS030", "Wide Spade Chisel", 32m));
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var request = new CreateQuoteRequestDto
        {
            Lines = new List<CreateQuoteLineRequestDto>
            {
                new() { ArticleRef = "DIS030", Qty = 1m }
            }
        };

        var ex = await Assert.ThrowsAsync<QuoteValidationException>(() =>
            service.CreateClientQuoteAsync(clientId, new[] { AppRoles.CLIENT }, request, CancellationToken.None));

        Assert.Contains("B2B", ex.Message);
    }

    [Fact]
    public async Task InternalComment_IsHiddenFromClientDetail()
    {
        await using var db = CreateDb();
        var service = CreateService(db);
        var clientId = await SeedB2BClientAsync(db);
        db.F_ARTICLES.Add(CreateArticle("ART001", "Article test", 100m));
        await db.SaveChangesAsync();

        var quote = await service.CreateClientQuoteAsync(clientId, new[] { AppRoles.CLIENT }, new CreateQuoteRequestDto
        {
            Lines = new List<CreateQuoteLineRequestDto> { new() { ArticleRef = "ART001", Qty = 1m } }
        }, CancellationToken.None);

        await service.AddCommentAsync(Guid.NewGuid(), new[] { AppRoles.CONFIRMATEUR }, quote.Piece, "Note interne", false, CancellationToken.None);
        await service.AddCommentAsync(Guid.NewGuid(), new[] { AppRoles.CONFIRMATEUR }, quote.Piece, "Message public", true, CancellationToken.None);

        var clientView = await service.GetQuoteDetailAsync(clientId, new[] { AppRoles.CLIENT }, quote.Piece, CancellationToken.None);

        Assert.Contains(clientView.Events, x => x.Message == "Message public");
        Assert.DoesNotContain(clientView.Events, x => x.Message == "Note interne");
    }

    [Fact]
    public async Task ConfirmateurStatus_InfoMissing_RequiresComment()
    {
        await using var db = CreateDb();
        var service = CreateService(db);
        var clientId = await SeedB2BClientAsync(db);
        db.F_ARTICLES.Add(CreateArticle("ART001", "Article test", 100m));
        await db.SaveChangesAsync();

        var quote = await service.CreateClientQuoteAsync(clientId, new[] { AppRoles.CLIENT }, new CreateQuoteRequestDto
        {
            Lines = new List<CreateQuoteLineRequestDto> { new() { ArticleRef = "ART001", Qty = 1m } }
        }, CancellationToken.None);

        await Assert.ThrowsAsync<QuoteValidationException>(() =>
            service.UpdateQuoteStatusByConfirmateurAsync(Guid.NewGuid(), new[] { AppRoles.CONFIRMATEUR }, quote.Piece, F_DEVIS_ENTETE.STATUS_INFO_MANQUANTE, null, CancellationToken.None));
    }

    [Fact]
    public async Task AcceptQuote_ConvertsToBcAndBlocksDoubleConversion()
    {
        await using var db = CreateDb();
        var service = CreateService(db);
        var clientId = await SeedB2BClientAsync(db);
        db.F_ARTICLES.Add(CreateArticle("ART001", "Article test", 100m));
        db.F_ARTSTOCKS.Add(new F_ARTSTOCK { AR_Ref = "ART001", DE_No = 1, AS_QteSto = 5m, AS_QteRes = 0m, AS_Principal = 1 });
        await db.SaveChangesAsync();

        var quote = await service.CreateClientQuoteAsync(clientId, new[] { AppRoles.CLIENT }, new CreateQuoteRequestDto
        {
            Lines = new List<CreateQuoteLineRequestDto> { new() { ArticleRef = "ART001", Qty = 2m } }
        }, CancellationToken.None);
        await service.UpdateQuoteStatusByConfirmateurAsync(Guid.NewGuid(), new[] { AppRoles.CONFIRMATEUR }, quote.Piece, F_DEVIS_ENTETE.STATUS_VALIDE, "Validé", CancellationToken.None);
        await service.SendToClientAsync(Guid.NewGuid(), new[] { AppRoles.CONFIRMATEUR }, quote.Piece, "Envoyé", CancellationToken.None);

        var result = await service.AcceptQuoteAsync(clientId, quote.Piece, "OK", CancellationToken.None);
        var second = await service.AcceptQuoteAsync(clientId, quote.Piece, "OK encore", CancellationToken.None);

        Assert.StartsWith("BC", result.BcPiece);
        Assert.True(second.AlreadyConverted);
        Assert.Equal(result.BcPiece, second.BcPiece);
        Assert.Single(await db.F_DOCENTETES.Where(x => x.DO_Piece == result.BcPiece && x.DO_Type == F_DOCENTETE.DOC_TYPE_BC).ToListAsync());
        var devis = await db.F_DEVIS_ENTETES.SingleAsync(x => x.DevisPiece == quote.Piece);
        Assert.Equal(F_DEVIS_ENTETE.STATUS_CONVERTI_BC, devis.StatusKey);
    }

    [Fact]
    public async Task AcceptQuote_ExpiredQuote_IsBlocked()
    {
        await using var db = CreateDb();
        var service = CreateService(db);
        var clientId = await SeedB2BClientAsync(db);
        db.F_ARTICLES.Add(CreateArticle("ART001", "Article test", 100m));
        db.F_ARTSTOCKS.Add(new F_ARTSTOCK { AR_Ref = "ART001", DE_No = 1, AS_QteSto = 5m, AS_QteRes = 0m, AS_Principal = 1 });
        await db.SaveChangesAsync();

        var quote = await service.CreateClientQuoteAsync(clientId, new[] { AppRoles.CLIENT }, new CreateQuoteRequestDto
        {
            ValidUntil = DateTime.UtcNow.AddDays(-1),
            Lines = new List<CreateQuoteLineRequestDto> { new() { ArticleRef = "ART001", Qty = 1m } }
        }, CancellationToken.None);

        await Assert.ThrowsAsync<QuoteValidationException>(() => service.AcceptQuoteAsync(clientId, quote.Piece, "OK", CancellationToken.None));
    }

    private static QuoteService CreateService(AppDbContext db)
    {
        var calculator = new OrderCalculatorService();
        var bonCommande = new BonCommandeService(db, calculator);
        return new QuoteService(db, calculator, bonCommande);
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new AppDbContext(options);
    }

    private static F_ARTICLE CreateArticle(string reference, string designation, decimal price)
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
            AR_Publie = 1,
            CL_No1 = 1,
            CL_No2 = 0,
            CL_No3 = 0,
            CL_No4 = 0,
            AR_Type = 0
        };
    }

    private static async Task<Guid> SeedB2BClientAsync(AppDbContext db)
    {
        var clientId = Guid.NewGuid();
        db.Users.Add(new ApplicationUser { Id = clientId, UserName = "b2b@test.tn", Email = "b2b@test.tn" });
        db.ProfilsUtilisateurs.Add(new ProfilUtilisateur
        {
            UtilisateurId = clientId,
            TypeProfil = TypeProfil.Client,
            TypeClient = TypeClient.B2B,
            NomSociete = "Client B2B",
            Telephone = "22000000",
            Gouvernorat = GouvernoratTunisie.Sfax,
            Delegation = "Sfax Ville",
            Adresse = "Route de Tunis",
            CodeClientSage = "B2B001",
            DiscountPercent = 10m
        });
        await db.SaveChangesAsync();
        return clientId;
    }
}
