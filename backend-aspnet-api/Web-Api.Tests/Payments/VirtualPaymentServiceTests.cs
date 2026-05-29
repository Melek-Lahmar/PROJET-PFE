using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.DTO.Payments;
using Web_Api.Model;
using Web_Api.Services;
using Web_Api.Services.Payments;
using Xunit;

namespace Web_Api.Tests.Payments
{
    public sealed class VirtualPaymentServiceTests
    {
        private const string ArticleRef = "ART-TEST-001";

        [Fact]
        public async Task Initiate_authenticated_client_creates_virtual_payment()
        {
            var fixture = CreateFixture();

            var response = await fixture.Service.InitiateForAuthenticatedClientAsync(
                Guid.NewGuid(),
                "client@test.local",
                CreateAuthenticatedRequest(),
                CancellationToken.None);

            Assert.StartsWith("BC", response.Piece);
            Assert.StartsWith($"VIRT-{response.Piece}-", response.PaymentRef);
            Assert.Equal(B_PAIEMENT.FOURNISSEUR_VIRTUAL, response.Provider);
            Assert.Equal(B_PAIEMENT.STATUS_EN_ATTENTE, response.LocalStatusCode);
            Assert.Equal("EN_ATTENTE", response.LocalStatus);
            Assert.Equal("EN_ATTENTE", response.Status);
            Assert.True(response.IsSandbox);
            Assert.StartsWith("/checkout/virtual-payment?", response.PayUrl);
            Assert.Contains(response.Piece, response.PayUrl);
            Assert.Contains(Uri.EscapeDataString(response.PaymentRef), response.PayUrl);

            var persisted = await fixture.Db.B_PAIEMENTS.SingleAsync();
            Assert.Equal(B_PAIEMENT.FOURNISSEUR_VIRTUAL, persisted.PA_Fournisseur);
            Assert.Equal("virtual_initiated", persisted.PA_StatutExterne);
        }

        [Fact]
        public async Task Initiate_guest_creates_order_and_virtual_payment()
        {
            var fixture = CreateFixture();

            var response = await fixture.Service.InitiateForGuestAsync(
                CreateGuestRequest(),
                CancellationToken.None);

            Assert.StartsWith("BC", response.Piece);
            Assert.Equal(B_PAIEMENT.FOURNISSEUR_VIRTUAL, response.Provider);
            Assert.Equal(13m, response.Amount);

            var order = await fixture.Db.F_DOCENTETES.SingleAsync();
            Assert.Equal(BonCommandeService.CustomerModePassager, order.DO_ClientMode);
            Assert.Equal(BonCommandeService.PaymentOnlineCarte, order.DO_ModePaiement);
        }

        [Theory]
        [InlineData("4242 4242 4242 4242", "SUCCES", B_PAIEMENT.STATUS_SUCCES, "virtual_success")]
        [InlineData("4000 0000 0000 0002", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_declined")]
        [InlineData("4000 0000 0000 9995", "ANNULE", B_PAIEMENT.STATUS_ANNULE, "virtual_cancelled")]
        [InlineData("4000 0000 0000 0069", "EXPIRE", B_PAIEMENT.STATUS_EXPIRE, "virtual_expired")]
        [InlineData("4000 0000 0000 0119", "EN_ATTENTE", B_PAIEMENT.STATUS_EN_ATTENTE, "virtual_pending")]
        [InlineData("4000 0000 0000 0341", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_insufficient_funds")]
        [InlineData("4000 0000 0000 0259", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_card_blocked")]
        [InlineData("4000 0000 0000 0101", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_provider_error")]
        public async Task Confirm_maps_virtual_test_cards(
            string cardNumber,
            string expectedStatus,
            short expectedCode,
            string expectedExternalStatus)
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);

            var result = await fixture.Service.ConfirmAsync(
                CreateConfirmRequest(payment, cardNumber),
                CancellationToken.None);

            Assert.Equal(expectedStatus, result.Result);
            Assert.Equal(expectedCode, result.Status.LocalStatusCode);
            Assert.Equal(expectedExternalStatus, result.Status.ExternalStatus);
            Assert.Equal(expectedStatus == "SUCCES", result.Success);
            Assert.Equal(expectedStatus == "SUCCES", result.Status.IsSuccess);
        }

        [Fact]
        public async Task Confirm_with_invalid_otp_sets_failure_without_storing_sensitive_data()
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);

            var result = await fixture.Service.ConfirmAsync(
                CreateConfirmRequest(payment, "4242 4242 4242 4242", otp: "111111"),
                CancellationToken.None);

            Assert.False(result.Success);
            Assert.Equal(B_PAIEMENT.STATUS_ECHEC, result.Status.LocalStatusCode);
            Assert.Equal("virtual_invalid_otp", result.Status.ExternalStatus);
            Assert.DoesNotContain("4242", result.Status.Message);
        }

        [Fact]
        public async Task Confirm_with_unknown_card_sets_failure()
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);

            var result = await fixture.Service.ConfirmAsync(
                CreateConfirmRequest(payment, "4111 1111 1111 1111"),
                CancellationToken.None);

            Assert.False(result.Success);
            Assert.Equal(B_PAIEMENT.STATUS_ECHEC, result.Status.LocalStatusCode);
            Assert.Equal("virtual_unknown_card", result.Status.ExternalStatus);
        }

        [Fact]
        public async Task Confirm_rejects_expired_card()
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);
            var request = CreateConfirmRequest(payment, "4242 4242 4242 4242", expiry: "01/2020");

            await Assert.ThrowsAsync<VirtualPaymentValidationException>(
                () => fixture.Service.ConfirmAsync(request, CancellationToken.None));
        }

        [Fact]
        public async Task Confirm_rejects_invalid_cvv()
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);
            var request = CreateConfirmRequest(payment, "4242 4242 4242 4242", cvv: "999");

            await Assert.ThrowsAsync<VirtualPaymentValidationException>(
                () => fixture.Service.ConfirmAsync(request, CancellationToken.None));
        }

        [Fact]
        public async Task Status_for_unknown_payment_throws_not_found()
        {
            var fixture = CreateFixture();

            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => fixture.Service.GetStatusAsync("BCUNKNOWN", "VIRT-UNKNOWN", CancellationToken.None));
        }

        [Fact]
        public async Task Confirm_prevents_double_confirmation_after_success()
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);
            var request = CreateConfirmRequest(payment, "4242 4242 4242 4242");

            await fixture.Service.ConfirmAsync(request, CancellationToken.None);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => fixture.Service.ConfirmAsync(request, CancellationToken.None));
        }

        [Fact]
        public async Task Confirm_after_cancellation_is_rejected()
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);

            await fixture.Service.CancelAsync(
                new VirtualCancelPaymentRequestDto
                {
                    Piece = payment.Piece,
                    PaymentRef = payment.PaymentRef
                },
                CancellationToken.None);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => fixture.Service.ConfirmAsync(
                    CreateConfirmRequest(payment, "4242 4242 4242 4242"),
                    CancellationToken.None));
        }

        [Fact]
        public async Task Cancel_after_success_is_rejected()
        {
            var fixture = CreateFixture();
            var payment = await fixture.Service.InitiateForGuestAsync(CreateGuestRequest(), CancellationToken.None);

            await fixture.Service.ConfirmAsync(
                CreateConfirmRequest(payment, "4242 4242 4242 4242"),
                CancellationToken.None);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => fixture.Service.CancelAsync(
                    new VirtualCancelPaymentRequestDto
                    {
                        Piece = payment.Piece,
                        PaymentRef = payment.PaymentRef
                    },
                    CancellationToken.None));
        }

        [Fact]
        public async Task Initiate_rejects_empty_cart()
        {
            var fixture = CreateFixture();
            var request = CreateGuestRequest();
            request.Lines.Clear();

            await Assert.ThrowsAsync<BonCommandeService.BonCommandeValidationException>(
                () => fixture.Service.InitiateForGuestAsync(request, CancellationToken.None));
        }

        [Fact]
        public async Task Initiate_rejects_insufficient_stock()
        {
            var fixture = CreateFixture(stockQuantity: 1m);
            var request = CreateGuestRequest(qty: 2m);

            await Assert.ThrowsAsync<BonCommandeService.BonCommandeValidationException>(
                () => fixture.Service.InitiateForGuestAsync(request, CancellationToken.None));
        }

        private static TestFixture CreateFixture(decimal stockQuantity = 20m)
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
                DE_Ville = "Tunis"
            });

            db.F_ARTICLES.Add(new F_ARTICLE
            {
                cbMarq = 1,
                AR_Ref = ArticleRef,
                AR_Design = "Article test",
                FA_CodeFamille = "TEST",
                AR_UniteVen = 1,
                AR_PrixVen = 12m,
                AR_PrixTTC = 1,
                AR_SuiviStock = 1,
                AR_Sommeil = 0,
                AR_CodeBarre = "6190000000010",
                AR_Publie = 1,
                CL_No1 = 0,
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
                AS_QteSto = stockQuantity,
                AS_QteRes = 0m,
                AS_Principal = 1
            });

            db.SaveChanges();

            var bonCommandeService = new BonCommandeService(db, new OrderCalculatorService());
            var service = new VirtualPaymentService(db, bonCommandeService);

            return new TestFixture(db, service);
        }

        private static CreateBonCommandeRequestDto CreateAuthenticatedRequest(decimal qty = 1m)
        {
            return new CreateBonCommandeRequestDto
            {
                DepotNo = 1,
                DeliveryType = BonCommandeService.DeliveryTypePickup,
                PaymentMethod = "VIRTUAL",
                Lines = new List<CreateBonCommandeLineRequestDto>
                {
                    new() { ArticleRef = ArticleRef, Qty = qty }
                }
            };
        }

        private static CreateGuestBonCommandeRequestDto CreateGuestRequest(decimal qty = 1m)
        {
            return new CreateGuestBonCommandeRequestDto
            {
                DepotNo = 1,
                DeliveryType = BonCommandeService.DeliveryTypePickup,
                PaymentMethod = "VIRTUAL",
                Customer = new GuestBonCommandeCustomerDto
                {
                    TypeClient = "B2C",
                    NomComplet = "Client Test",
                    Telephone = "22123456",
                    Gouvernorat = "Tunis",
                    Delegation = "Tunis",
                    Adresse = "Rue de test",
                    CodePostal = "1000"
                },
                Lines = new List<CreateBonCommandeLineRequestDto>
                {
                    new() { ArticleRef = ArticleRef, Qty = qty }
                }
            };
        }

        private static VirtualConfirmPaymentRequestDto CreateConfirmRequest(
            VirtualInitiatePaymentResponseDto payment,
            string cardNumber,
            string expiry = "12/2099",
            string cvv = VirtualPaymentService.ValidCvv,
            string otp = VirtualPaymentService.ValidOtp)
        {
            return new VirtualConfirmPaymentRequestDto
            {
                Piece = payment.Piece,
                PaymentRef = payment.PaymentRef,
                CardNumber = cardNumber,
                Expiry = expiry,
                Cvv = cvv,
                CardHolderName = "Client Test",
                Otp = otp
            };
        }

        private sealed record TestFixture(AppDbContext Db, VirtualPaymentService Service);
    }
}
