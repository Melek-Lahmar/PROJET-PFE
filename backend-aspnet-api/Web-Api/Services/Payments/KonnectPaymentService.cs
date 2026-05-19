using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.DTO.Payments;
using Web_Api.Model;
using Web_Api.Options;

namespace Web_Api.Services.Payments
{
    public class KonnectPaymentService
    {
        private readonly AppDbContext _db;
        private readonly BonCommandeService _bonCommandeService;
        private readonly IKonnectClient _konnectClient;
        private readonly KonnectOptions _options;

        public KonnectPaymentService(
            AppDbContext db,
            BonCommandeService bonCommandeService,
            IKonnectClient konnectClient,
            IOptions<KonnectOptions> options)
        {
            _db = db;
            _bonCommandeService = bonCommandeService;
            _konnectClient = konnectClient;
            _options = options.Value;
        }

        public async Task<KonnectInitiatePaymentResponseDto> InitiateForAuthenticatedClientAsync(
            Guid userId,
            string userEmail,
            CreateBonCommandeRequestDto request,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request);

            var orderRequest = CloneAuthenticatedRequestForOnlinePayment(request);
            var created = await _bonCommandeService.CreateForAuthenticatedClientAsync(userId, userEmail, orderRequest, ct);

            return await InitiateAfterOrderCreationAsync(
                entete: created.Entete,
                payerEmail: userEmail,
                isGuest: false,
                ct: ct);
        }

        public async Task<KonnectInitiatePaymentResponseDto> InitiateForGuestAsync(
            CreateGuestBonCommandeRequestDto request,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request);

            var orderRequest = CloneGuestRequestForOnlinePayment(request);
            var created = await _bonCommandeService.CreateForGuestAsync(orderRequest, ct);

            return await InitiateAfterOrderCreationAsync(
                entete: created.Entete,
                payerEmail: null,
                isGuest: true,
                ct: ct);
        }

        public async Task<KonnectWebhookProcessingResponseDto> HandleWebhookAsync(
            string paymentRef,
            CancellationToken ct = default)
        {
            paymentRef = (paymentRef ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(paymentRef))
                throw new InvalidOperationException("payment_ref est obligatoire.");

            var payment = await _db.B_PAIEMENTS
                .FirstOrDefaultAsync(x => x.PA_Reference == paymentRef, ct);

            if (payment == null)
            {
                return new KonnectWebhookProcessingResponseDto
                {
                    Handled = false,
                    Message = "Référence inconnue localement. Webhook ignoré sans échec dur.",
                    PaymentRef = paymentRef,
                    Piece = null,
                    LocalPaymentId = null,
                    PreviousLocalStatus = null,
                    CurrentLocalStatus = null,
                    ExternalStatus = null,
                    IsFinal = false
                };
            }

            var previousStatus = payment.LocalStatusLabel;

            await RefreshPaymentStateAsync(payment, forceGatewayRead: true, ct);

            return new KonnectWebhookProcessingResponseDto
            {
                Handled = true,
                Message = "Webhook traité.",
                PaymentRef = payment.PA_Reference ?? paymentRef,
                Piece = payment.DO_Piece,
                LocalPaymentId = payment.cbMarq,
                PreviousLocalStatus = previousStatus,
                CurrentLocalStatus = payment.LocalStatusLabel,
                ExternalStatus = payment.PA_StatutExterne,
                IsFinal = payment.IsTerminalStatus
            };
        }

        public async Task<KonnectPublicPaymentStatusDto> GetPublicPaymentStatusAsync(
            string piece,
            string paymentRef,
            bool refresh = true,
            CancellationToken ct = default)
        {
            piece = (piece ?? string.Empty).Trim();
            paymentRef = (paymentRef ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("piece est obligatoire.");

            if (string.IsNullOrWhiteSpace(paymentRef))
                throw new InvalidOperationException("paymentRef est obligatoire.");

            var payment = await _db.B_PAIEMENTS
                .FirstOrDefaultAsync(x => x.DO_Piece == piece && x.PA_Reference == paymentRef, ct);

            if (payment == null)
                throw new KeyNotFoundException("Paiement introuvable.");

            if (refresh)
                await RefreshPaymentStateAsync(payment, forceGatewayRead: false, ct);

            return MapToPublicStatus(payment);
        }

        private async Task<KonnectInitiatePaymentResponseDto> InitiateAfterOrderCreationAsync(
            F_DOCENTETE entete,
            string? payerEmail,
            bool isGuest,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(entete.DO_Piece))
                throw new InvalidOperationException("La commande locale ne contient pas de DO_Piece exploitable.");

            var piece = entete.DO_Piece.Trim();
            var amount = decimal.Round(entete.DO_NetAPayer ?? 0m, 3, MidpointRounding.AwayFromZero);

            if (amount <= 0m)
                throw new InvalidOperationException("Le montant à payer doit être strictement positif.");

            var payment = new B_PAIEMENT
            {
                DO_Piece = piece,
                PA_Mode = B_PAIEMENT.MODE_ONLINE,
                PA_Type = B_PAIEMENT.TYPE_ONLINE,
                PA_Statut = B_PAIEMENT.STATUS_INITIE,
                PA_Montant = amount,
                PA_Date = null,
                PA_Reference = null,
                PA_Fournisseur = _options.IsMockMode ? B_PAIEMENT.FOURNISSEUR_MOCK : B_PAIEMENT.FOURNISSEUR_KONNECT,
                PA_ProviderPaymentId = null,
                PA_StatutExterne = "created_locally",
                PA_IsSandbox = !_options.IsProductionMode,
                cbCreation = DateTime.UtcNow,
                cbModification = DateTime.UtcNow
            };

            _db.B_PAIEMENTS.Add(payment);
            await _db.SaveChangesAsync(ct);

            try
            {
                if (_options.IsMockMode)
                    return await BuildMockInitiationResponseAsync(payment, piece, amount, isGuest, ct);

                _options.ValidateForGateway();

                var payer = BuildPayerInfo(entete, payerEmail);
                var gatewayResponse = await _konnectClient.InitiatePaymentAsync(
                    BuildGatewayRequest(piece, amount, payer, isGuest),
                    ct);

                payment.PA_Reference = gatewayResponse.PaymentRef;
                payment.PA_Statut = B_PAIEMENT.STATUS_EN_ATTENTE;
                payment.PA_StatutExterne = "initiated";
                payment.cbModification = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);

                return new KonnectInitiatePaymentResponseDto
                {
                    LocalPaymentId = payment.cbMarq,
                    Piece = piece,
                    Provider = B_PAIEMENT.FOURNISSEUR_KONNECT,
                    PaymentRef = gatewayResponse.PaymentRef,
                    PayUrl = gatewayResponse.PayUrl,
                    Amount = amount,
                    Currency = _options.Currency,
                    LocalStatusCode = payment.PA_Statut,
                    LocalStatus = payment.LocalStatusLabel,
                    IsSandbox = payment.PA_IsSandbox,
                    IsMock = false
                };
            }
            catch (KonnectGatewayException ex)
            {
                payment.PA_Statut = B_PAIEMENT.STATUS_ECHEC;
                payment.PA_StatutExterne = "init_failed";
                payment.cbModification = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);

                throw new KonnectPaymentInitiationException(
                    message: "La commande a été créée, mais l'initialisation du paiement Konnect a échoué.",
                    piece: piece,
                    localPaymentId: payment.cbMarq,
                    detail: ex.Message,
                    innerException: ex);
            }
            catch (Exception ex) when (ex is not KonnectPaymentInitiationException)
            {
                payment.PA_Statut = B_PAIEMENT.STATUS_ECHEC;
                payment.PA_StatutExterne = "init_failed_unexpected";
                payment.cbModification = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);

                throw new KonnectPaymentInitiationException(
                    message: "La commande a été créée, mais une erreur inattendue a empêché l'initialisation du paiement.",
                    piece: piece,
                    localPaymentId: payment.cbMarq,
                    detail: ex.Message,
                    innerException: ex);
            }
        }

        private async Task RefreshPaymentStateAsync(
            B_PAIEMENT payment,
            bool forceGatewayRead,
            CancellationToken ct)
        {
            if (payment == null)
                throw new ArgumentNullException(nameof(payment));

            if (string.Equals(payment.PA_Fournisseur, B_PAIEMENT.FOURNISSEUR_MOCK, StringComparison.OrdinalIgnoreCase))
            {
                if (!payment.IsTerminalStatus)
                {
                    ApplyMockResult(payment);
                    await _db.SaveChangesAsync(ct);
                }

                return;
            }

            if (!forceGatewayRead && payment.IsTerminalStatus)
                return;

            if (string.IsNullOrWhiteSpace(payment.PA_Reference))
                throw new InvalidOperationException("Aucune référence provider n'est enregistrée pour ce paiement.");

            _options.ValidateForGateway();

            var details = await _konnectClient.GetPaymentDetailsAsync(payment.PA_Reference!, ct);
            ApplyGatewaySnapshot(payment, details);
            await _db.SaveChangesAsync(ct);
        }

        private void ApplyMockResult(B_PAIEMENT payment)
        {
            var currentMarker = (payment.PA_StatutExterne ?? string.Empty).Trim().ToLowerInvariant();
            var mockResult = currentMarker.StartsWith("mock_", StringComparison.OrdinalIgnoreCase)
                ? currentMarker["mock_".Length..]
                : NormalizeMockResult(_options.MockResult);

            var nextStatus = mockResult switch
            {
                "success" => B_PAIEMENT.STATUS_SUCCES,
                "failed" => B_PAIEMENT.STATUS_ECHEC,
                "cancelled" => B_PAIEMENT.STATUS_ANNULE,
                _ => B_PAIEMENT.STATUS_EN_ATTENTE
            };

            payment.PA_Statut = nextStatus;
            payment.PA_StatutExterne = $"mock_{mockResult}";
            if (nextStatus == B_PAIEMENT.STATUS_SUCCES && payment.PA_Date == null)
                payment.PA_Date = DateTime.UtcNow;

            payment.cbModification = DateTime.UtcNow;
        }

        private void ApplyGatewaySnapshot(B_PAIEMENT payment, KonnectPaymentDetailsApiResponse details)
        {
            var providerPayment = details.Payment
                ?? throw new InvalidOperationException("La réponse Konnect ne contient pas d'objet payment.");

            var localStatus = DetermineLocalStatus(providerPayment);

            payment.PA_ProviderPaymentId = TrimOrNull(providerPayment.Id);
            payment.PA_StatutExterne = TrimOrNull(providerPayment.Status) ?? "unknown";
            payment.PA_Statut = localStatus;

            if (localStatus == B_PAIEMENT.STATUS_SUCCES && payment.PA_Date == null)
            {
                payment.PA_Date = ResolveSuccessfulPaymentDate(providerPayment) ?? DateTime.UtcNow;
            }

            payment.cbModification = DateTime.UtcNow;
        }

        private short DetermineLocalStatus(KonnectPaymentDetailsApiPaymentDto providerPayment)
        {
            var paymentStatus = NormalizeStatus(providerPayment.Status);
            var transactionStatuses = providerPayment.Transactions?
                .Select(x => NormalizeStatus(x.Status))
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToList() ?? new List<string>();

            if (paymentStatus == "completed" || transactionStatuses.Contains("success"))
                return B_PAIEMENT.STATUS_SUCCES;

            if (paymentStatus is "cancelled" or "canceled" ||
                transactionStatuses.Any(IsCancelledTransactionStatus))
                return B_PAIEMENT.STATUS_ANNULE;

            if (paymentStatus == "expired")
                return B_PAIEMENT.STATUS_EXPIRE;

            var expirationUtc = ParseProviderDate(providerPayment.ExpirationDate);
            if (paymentStatus == "pending" && expirationUtc.HasValue && expirationUtc.Value < DateTime.UtcNow)
                return B_PAIEMENT.STATUS_EXPIRE;

            if (paymentStatus is "failed" or "refused" or "declined" or "rejected" or "error" ||
                transactionStatuses.Any(IsFailedTransactionStatus))
                return B_PAIEMENT.STATUS_ECHEC;

            return B_PAIEMENT.STATUS_EN_ATTENTE;
        }

        private static bool IsFailedTransactionStatus(string status)
        {
            return status is "failed" or "declined" or "refused" or "rejected" or "error";
        }

        private static bool IsCancelledTransactionStatus(string status)
        {
            return status is "cancelled" or "canceled";
        }

        private static DateTime? ResolveSuccessfulPaymentDate(KonnectPaymentDetailsApiPaymentDto providerPayment)
        {
            var transactionDate = providerPayment.Transactions?
                .Where(x => NormalizeStatus(x.Status) == "success")
                .Select(x => ParseProviderDate(x.Date) ?? ParseProviderDate(x.CreatedAt))
                .FirstOrDefault(x => x.HasValue);

            return transactionDate;
        }

        private KonnectInitiatePaymentApiRequest BuildGatewayRequest(
            string piece,
            decimal amount,
            PayerInfo payer,
            bool isGuest)
        {
            return new KonnectInitiatePaymentApiRequest
            {
                ReceiverWalletId = _options.ReceiverWalletId,
                Token = _options.Currency,
                Amount = ConvertToMinorUnit(amount, _options.Currency),
                Type = "immediate",
                Description = $"Paiement commande {piece}",
                AcceptedPaymentMethods = _options.GetAcceptedPaymentMethods(),
                Lifespan = _options.LifespanMinutes,
                CheckoutForm = _options.CheckoutForm,
                AddPaymentFeesToAmount = _options.AddPaymentFeesToAmount,
                FirstName = payer.FirstName,
                LastName = payer.LastName,
                PhoneNumber = payer.PhoneNumber,
                Email = payer.Email,
                OrderId = piece,
                Webhook = _options.BuildWebhookUrl(),
                SilentWebhook = _options.SilentWebhook,
                SuccessUrl = _options.BuildFrontendReturnUrl("success", isGuest, piece, amount),
                FailUrl = _options.BuildFrontendReturnUrl("failed", isGuest, piece, amount),
                Theme = _options.Theme
            };
        }

        private async Task<KonnectInitiatePaymentResponseDto> BuildMockInitiationResponseAsync(
    B_PAIEMENT payment,
    string piece,
    decimal amount,
    bool isGuest,
    CancellationToken ct)
        {
            var normalizedResult = NormalizeMockResult(_options.MockResult);

            var safePiece = (piece ?? string.Empty).Trim().ToUpperInvariant();
            if (safePiece.Length > 28)
                safePiece = safePiece[..28];

            var shortSuffix = Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
            var paymentRef = $"MOCK-{safePiece}-{shortSuffix}";

            var payUrl = _options.BuildFrontendReturnUrl(normalizedResult, isGuest, piece, amount)
                + $"&paymentRef={Uri.EscapeDataString(paymentRef)}";

            payment.PA_Reference = paymentRef;
            payment.PA_Statut = B_PAIEMENT.STATUS_EN_ATTENTE;
            payment.PA_StatutExterne = $"mock_{normalizedResult}";
            payment.cbModification = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return new KonnectInitiatePaymentResponseDto
            {
                LocalPaymentId = payment.cbMarq,
                Piece = piece,
                Provider = B_PAIEMENT.FOURNISSEUR_MOCK,
                PaymentRef = paymentRef,
                PayUrl = payUrl,
                Amount = amount,
                Currency = _options.Currency,
                LocalStatusCode = payment.PA_Statut,
                LocalStatus = payment.LocalStatusLabel,
                IsSandbox = true,
                IsMock = true
            };
        }

        private static PayerInfo BuildPayerInfo(F_DOCENTETE entete, string? payerEmail)
        {
            var rawFullName = !string.IsNullOrWhiteSpace(entete.DO_PassagerNomComplet)
                ? entete.DO_PassagerNomComplet
                : entete.DO_PassagerNomSociete;

            var names = SplitName(rawFullName);

            return new PayerInfo
            {
                FirstName = names.firstName,
                LastName = names.lastName,
                PhoneNumber = TrimOrNull(entete.DO_PassagerTelephone),
                Email = TrimOrNull(payerEmail)
            };
        }

        private static (string? firstName, string? lastName) SplitName(string? rawFullName)
        {
            var normalized = TrimOrNull(rawFullName);
            if (normalized == null)
                return (null, null);

            var parts = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            if (parts.Length == 0)
                return (null, null);

            if (parts.Length == 1)
                return (parts[0], parts[0]);

            return (parts[0], string.Join(' ', parts.Skip(1)));
        }

        private static decimal ConvertToMinorUnit(decimal amount, string currency)
        {
            var normalized = (currency ?? "TND").Trim().ToUpperInvariant();
            var factor = normalized == "TND" ? 1000m : 100m;
            return decimal.Round(amount * factor, 0, MidpointRounding.AwayFromZero);
        }

        private static string NormalizeMockResult(string? value)
        {
            var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
            return normalized switch
            {
                "success" => "success",
                "failed" => "failed",
                "cancelled" => "cancelled",
                _ => "pending"
            };
        }

        private static string NormalizeStatus(string? value)
        {
            return (value ?? string.Empty).Trim().ToLowerInvariant();
        }

        private static DateTime? ParseProviderDate(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
                return dt;

            if (DateTime.TryParse(value, out dt))
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);

            return null;
        }

        private KonnectPublicPaymentStatusDto MapToPublicStatus(B_PAIEMENT payment)
        {
            return new KonnectPublicPaymentStatusDto
            {
                LocalPaymentId = payment.cbMarq,
                Piece = payment.DO_Piece,
                Provider = payment.PA_Fournisseur ?? string.Empty,
                PaymentRef = payment.PA_Reference ?? string.Empty,
                ProviderPaymentId = payment.PA_ProviderPaymentId,
                Amount = payment.PA_Montant,
                Currency = _options.Currency,
                LocalStatusCode = payment.PA_Statut,
                LocalStatus = payment.LocalStatusLabel,
                ExternalStatus = payment.PA_StatutExterne,
                CreatedAtUtc = payment.cbCreation,
                LastModifiedAtUtc = payment.cbModification,
                PaidAtUtc = payment.PA_Date,
                IsSandbox = payment.PA_IsSandbox,
                IsMock = string.Equals(payment.PA_Fournisseur, B_PAIEMENT.FOURNISSEUR_MOCK, StringComparison.OrdinalIgnoreCase),
                IsFinal = payment.IsTerminalStatus
            };
        }

        private static CreateBonCommandeRequestDto CloneAuthenticatedRequestForOnlinePayment(CreateBonCommandeRequestDto request)
        {
            return new CreateBonCommandeRequestDto
            {
                DepotNo = request.DepotNo,
                DeliveryType = request.DeliveryType,
                PaymentMethod = BonCommandeService.PaymentOnlineCarte,
                Address = request.Address,
                City = request.City,
                PostalCode = request.PostalCode,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Lines = request.Lines
                    .Select(x => new CreateBonCommandeLineRequestDto
                    {
                        ArticleRef = x.ArticleRef,
                        Qty = x.Qty
                    })
                    .ToList()
            };
        }

        private static CreateGuestBonCommandeRequestDto CloneGuestRequestForOnlinePayment(CreateGuestBonCommandeRequestDto request)
        {
            return new CreateGuestBonCommandeRequestDto
            {
                DepotNo = request.DepotNo,
                DeliveryType = request.DeliveryType,
                PaymentMethod = BonCommandeService.PaymentOnlineCarte,
                Address = request.Address,
                City = request.City,
                PostalCode = request.PostalCode,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Customer = request.Customer == null
                    ? null
                    : new GuestBonCommandeCustomerDto
                    {
                        TypeClient = request.Customer.TypeClient,
                        NomComplet = request.Customer.NomComplet,
                        Telephone = request.Customer.Telephone,
                        Cin = request.Customer.Cin,
                        NomSociete = request.Customer.NomSociete,
                        MatriculeFiscal = request.Customer.MatriculeFiscal,
                        RegistreCommerce = request.Customer.RegistreCommerce,
                        NumeroTVA = request.Customer.NumeroTVA,
                        Gouvernorat = request.Customer.Gouvernorat,
                        Delegation = request.Customer.Delegation,
                        Adresse = request.Customer.Adresse,
                        AdresseComplementaire = request.Customer.AdresseComplementaire,
                        CodePostal = request.Customer.CodePostal
                    },
                Lines = request.Lines
                    .Select(x => new CreateBonCommandeLineRequestDto
                    {
                        ArticleRef = x.ArticleRef,
                        Qty = x.Qty
                    })
                    .ToList()
            };
        }

        private static string? TrimOrNull(string? value)
        {
            var trimmed = value?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        private sealed class PayerInfo
        {
            public string? FirstName { get; set; }
            public string? LastName { get; set; }
            public string? PhoneNumber { get; set; }
            public string? Email { get; set; }
        }
    }

    public sealed class KonnectPaymentInitiationException : Exception
    {
        public KonnectPaymentInitiationException(
            string message,
            string piece,
            int localPaymentId,
            string? detail,
            Exception? innerException = null)
            : base(message, innerException)
        {
            Piece = piece;
            LocalPaymentId = localPaymentId;
            Detail = detail;
        }

        public string Piece { get; }
        public int LocalPaymentId { get; }
        public string? Detail { get; }
    }
}