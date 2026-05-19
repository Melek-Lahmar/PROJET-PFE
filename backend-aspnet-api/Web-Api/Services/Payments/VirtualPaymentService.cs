using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.DTO.Payments;
using Web_Api.Services;

namespace Web_Api.Services.Payments
{
    public interface IVirtualPaymentService
    {
        Task<VirtualInitiatePaymentResponseDto> InitiateForAuthenticatedClientAsync(
            Guid userId,
            string userEmail,
            CreateBonCommandeRequestDto request,
            CancellationToken ct = default);

        Task<VirtualInitiatePaymentResponseDto> InitiateForGuestAsync(
            CreateGuestBonCommandeRequestDto request,
            CancellationToken ct = default);

        Task<VirtualPaymentResultDto> ConfirmAsync(
            VirtualConfirmPaymentRequestDto request,
            CancellationToken ct = default);

        Task<VirtualPaymentStatusDto> CancelAsync(
            VirtualCancelPaymentRequestDto request,
            CancellationToken ct = default);

        Task<VirtualPaymentStatusDto> GetStatusAsync(
            string piece,
            string paymentRef,
            CancellationToken ct = default);

        IReadOnlyList<VirtualTestCardDto> GetTestCards();
    }

    public sealed class VirtualPaymentService : IVirtualPaymentService
    {
        public const string ValidOtp = "123456";
        public const string ValidCvv = "123";

        private const string InitialExternalStatus = "virtual_initiated";
        private const string Currency = "TND";

        private static readonly IReadOnlyList<VirtualCardRule> CardRules = new List<VirtualCardRule>
        {
            new("4242424242424242", "SUCCES", B_PAIEMENT.STATUS_SUCCES, "virtual_success", "Paiement virtuel accepté avec succès."),
            new("4000000000000002", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_declined", "Paiement refusé par la passerelle virtuelle."),
            new("4000000000009995", "ANNULE", B_PAIEMENT.STATUS_ANNULE, "virtual_cancelled", "Paiement annulé par l’utilisateur."),
            new("4000000000000069", "EXPIRE", B_PAIEMENT.STATUS_EXPIRE, "virtual_expired", "Session de paiement expirée."),
            new("4000000000000119", "EN_ATTENTE", B_PAIEMENT.STATUS_EN_ATTENTE, "virtual_pending", "Paiement en attente de confirmation."),
            new("4000000000000341", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_insufficient_funds", "Fonds insuffisants sur la carte virtuelle."),
            new("4000000000000259", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_card_blocked", "Carte virtuelle bloquée."),
            new("4000000000000101", "ECHEC", B_PAIEMENT.STATUS_ECHEC, "virtual_provider_error", "Erreur technique simulée de la passerelle de paiement.")
        };

        private readonly AppDbContext _db;
        private readonly BonCommandeService _bonCommandeService;

        public VirtualPaymentService(
            AppDbContext db,
            BonCommandeService bonCommandeService)
        {
            _db = db;
            _bonCommandeService = bonCommandeService;
        }

        public async Task<VirtualInitiatePaymentResponseDto> InitiateForAuthenticatedClientAsync(
            Guid userId,
            string userEmail,
            CreateBonCommandeRequestDto request,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request);

            var orderRequest = CloneAuthenticatedRequestForOnlinePayment(request);
            var created = await _bonCommandeService.CreateForAuthenticatedClientAsync(userId, userEmail, orderRequest, ct);

            return await CreatePaymentForOrderAsync(created.Entete.DO_Piece, created.Entete.DO_NetAPayer ?? 0m, ct);
        }

        public async Task<VirtualInitiatePaymentResponseDto> InitiateForGuestAsync(
            CreateGuestBonCommandeRequestDto request,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request);

            var orderRequest = CloneGuestRequestForOnlinePayment(request);
            var created = await _bonCommandeService.CreateForGuestAsync(orderRequest, ct);

            return await CreatePaymentForOrderAsync(created.Entete.DO_Piece, created.Entete.DO_NetAPayer ?? 0m, ct);
        }

        public async Task<VirtualPaymentResultDto> ConfirmAsync(
            VirtualConfirmPaymentRequestDto request,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request);

            var payment = await FindVirtualPaymentAsync(request.Piece, request.PaymentRef, ct);

            if (payment.IsTerminalStatus)
                throw new InvalidOperationException("Ce paiement est déjà finalisé.");

            if (!string.Equals(payment.PA_StatutExterne, InitialExternalStatus, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Ce paiement a déjà été confirmé ou traité.");

            var cardNumber = NormalizeCardNumber(request.CardNumber);
            ValidateCardNumber(cardNumber);
            ValidateExpiryOrThrow(request.Expiry, DateTime.UtcNow);
            ValidateCvv(request.Cvv);
            ValidateOtpFormat(request.Otp);

            var rule = ResolveCardRule(cardNumber, request.Otp);
            ApplyResult(payment, rule);

            await _db.SaveChangesAsync(ct);

            var status = MapToStatus(payment);
            return new VirtualPaymentResultDto
            {
                Success = payment.PA_Statut == B_PAIEMENT.STATUS_SUCCES,
                Result = status.LocalStatus,
                Message = status.Message,
                Status = status
            };
        }

        public async Task<VirtualPaymentStatusDto> CancelAsync(
            VirtualCancelPaymentRequestDto request,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request);

            var payment = await FindVirtualPaymentAsync(request.Piece, request.PaymentRef, ct);

            if (payment.IsTerminalStatus)
                throw new InvalidOperationException("Un paiement finalisé ne peut pas être annulé.");

            payment.PA_Statut = B_PAIEMENT.STATUS_ANNULE;
            payment.PA_StatutExterne = "virtual_cancelled";
            payment.cbModification = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return MapToStatus(payment);
        }

        public async Task<VirtualPaymentStatusDto> GetStatusAsync(
            string piece,
            string paymentRef,
            CancellationToken ct = default)
        {
            var payment = await FindVirtualPaymentAsync(piece, paymentRef, ct);
            return MapToStatus(payment);
        }

        public IReadOnlyList<VirtualTestCardDto> GetTestCards()
        {
            return CardRules
                .Select(x => new VirtualTestCardDto
                {
                    CardNumber = FormatCardNumber(x.CardNumber),
                    Result = x.Result,
                    ExternalStatus = x.ExternalStatus,
                    Message = x.Message,
                    Cvv = ValidCvv,
                    Otp = ValidOtp
                })
                .ToList();
        }

        public static string NormalizeCardNumber(string? cardNumber)
        {
            return (cardNumber ?? string.Empty).Replace(" ", string.Empty).Trim();
        }

        public static bool IsExpiryValid(string? expiry, DateTime utcNow)
        {
            if (!TryParseExpiry(expiry, out var month, out var year))
                return false;

            var lastDay = DateTime.DaysInMonth(year, month);
            var endOfMonth = new DateTime(year, month, lastDay, 23, 59, 59, DateTimeKind.Utc);
            return endOfMonth >= utcNow.Date;
        }

        private async Task<VirtualInitiatePaymentResponseDto> CreatePaymentForOrderAsync(
            string? rawPiece,
            decimal rawAmount,
            CancellationToken ct)
        {
            var piece = (rawPiece ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(piece))
                throw new InvalidOperationException("La commande locale ne contient pas de DO_Piece exploitable.");

            var amount = decimal.Round(rawAmount, 3, MidpointRounding.AwayFromZero);
            if (amount <= 0m)
                throw new InvalidOperationException("Le montant à payer doit être strictement positif.");

            var paymentRef = GeneratePaymentReference(piece);
            var providerPaymentId = GenerateProviderPaymentId();

            var payment = new B_PAIEMENT
            {
                DO_Piece = piece,
                PA_Mode = B_PAIEMENT.MODE_ONLINE,
                PA_Type = B_PAIEMENT.TYPE_ONLINE,
                PA_Statut = B_PAIEMENT.STATUS_EN_ATTENTE,
                PA_Montant = amount,
                PA_Date = null,
                PA_Reference = paymentRef,
                PA_Fournisseur = B_PAIEMENT.FOURNISSEUR_VIRTUAL,
                PA_ProviderPaymentId = providerPaymentId,
                PA_StatutExterne = InitialExternalStatus,
                PA_IsSandbox = true,
                cbCreation = DateTime.UtcNow,
                cbModification = DateTime.UtcNow
            };

            _db.B_PAIEMENTS.Add(payment);
            await _db.SaveChangesAsync(ct);

            return new VirtualInitiatePaymentResponseDto
            {
                LocalPaymentId = payment.cbMarq,
                Piece = piece,
                Provider = B_PAIEMENT.FOURNISSEUR_VIRTUAL,
                PaymentRef = paymentRef,
                ProviderPaymentId = providerPaymentId,
                PayUrl = BuildVirtualPayUrl(piece, paymentRef),
                Amount = amount,
                Currency = Currency,
                LocalStatusCode = payment.PA_Statut,
                LocalStatus = payment.LocalStatusLabel,
                Status = payment.LocalStatusLabel,
                IsSandbox = true,
                Message = "Paiement virtuel initialisé. Aucune transaction bancaire réelle ne sera effectuée."
            };
        }

        private async Task<B_PAIEMENT> FindVirtualPaymentAsync(
            string? piece,
            string? paymentRef,
            CancellationToken ct)
        {
            var normalizedPiece = (piece ?? string.Empty).Trim();
            var normalizedRef = (paymentRef ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(normalizedPiece))
                throw new VirtualPaymentValidationException("piece est obligatoire.");

            if (string.IsNullOrWhiteSpace(normalizedRef))
                throw new VirtualPaymentValidationException("paymentRef est obligatoire.");

            var payment = await _db.B_PAIEMENTS
                .FirstOrDefaultAsync(x =>
                    x.DO_Piece == normalizedPiece &&
                    x.PA_Reference == normalizedRef &&
                    x.PA_Fournisseur == B_PAIEMENT.FOURNISSEUR_VIRTUAL,
                    ct);

            return payment ?? throw new KeyNotFoundException("Paiement virtuel introuvable.");
        }

        private static string BuildVirtualPayUrl(string piece, string paymentRef)
        {
            return "/checkout/virtual-payment" +
                   $"?piece={Uri.EscapeDataString(piece)}" +
                   $"&paymentRef={Uri.EscapeDataString(paymentRef)}";
        }

        private static string GeneratePaymentReference(string piece)
        {
            return $"VIRT-{piece}-{RandomHex(6)}";
        }

        private static string GenerateProviderPaymentId()
        {
            return $"vp_{DateTime.UtcNow:yyyyMMdd}_{RandomHex(6).ToLowerInvariant()}";
        }

        private static string RandomHex(int length)
        {
            var bytes = RandomNumberGenerator.GetBytes((length + 1) / 2);
            return Convert.ToHexString(bytes)[..length];
        }

        private static VirtualCardRule ResolveCardRule(string normalizedCard, string otp)
        {
            if (!string.Equals(otp.Trim(), ValidOtp, StringComparison.Ordinal))
            {
                return new VirtualCardRule(
                    normalizedCard,
                    "ECHEC",
                    B_PAIEMENT.STATUS_ECHEC,
                    "virtual_invalid_otp",
                    "Code OTP incorrect.");
            }

            return CardRules.FirstOrDefault(x => x.CardNumber == normalizedCard)
                   ?? new VirtualCardRule(
                       normalizedCard,
                       "ECHEC",
                       B_PAIEMENT.STATUS_ECHEC,
                       "virtual_unknown_card",
                       "Carte virtuelle non reconnue.");
        }

        private static void ApplyResult(B_PAIEMENT payment, VirtualCardRule rule)
        {
            payment.PA_Statut = rule.LocalStatus;
            payment.PA_StatutExterne = rule.ExternalStatus;
            payment.cbModification = DateTime.UtcNow;

            if (rule.LocalStatus == B_PAIEMENT.STATUS_SUCCES)
                payment.PA_Date = DateTime.UtcNow;
        }

        private static VirtualPaymentStatusDto MapToStatus(B_PAIEMENT payment)
        {
            return new VirtualPaymentStatusDto
            {
                LocalPaymentId = payment.cbMarq,
                Piece = payment.DO_Piece,
                Provider = payment.PA_Fournisseur ?? B_PAIEMENT.FOURNISSEUR_VIRTUAL,
                PaymentRef = payment.PA_Reference ?? string.Empty,
                ProviderPaymentId = payment.PA_ProviderPaymentId,
                Amount = payment.PA_Montant,
                Currency = Currency,
                LocalStatusCode = payment.PA_Statut,
                LocalStatus = payment.LocalStatusLabel,
                Status = payment.LocalStatusLabel,
                ExternalStatus = payment.PA_StatutExterne,
                Message = ResolveMessage(payment.PA_StatutExterne),
                CreatedAtUtc = payment.cbCreation,
                LastModifiedAtUtc = payment.cbModification,
                PaidAtUtc = payment.PA_Date,
                IsSandbox = payment.PA_IsSandbox,
                IsFinal = payment.IsTerminalStatus,
                IsSuccess = payment.PA_Statut == B_PAIEMENT.STATUS_SUCCES
            };
        }

        private static string ResolveMessage(string? externalStatus)
        {
            var normalized = (externalStatus ?? string.Empty).Trim().ToLowerInvariant();
            if (normalized == InitialExternalStatus)
                return "Paiement virtuel initialisé. En attente de saisie de la carte de test.";

            var rule = CardRules.FirstOrDefault(x => x.ExternalStatus == normalized);
            if (rule != null)
                return rule.Message;

            return normalized switch
            {
                "virtual_invalid_otp" => "Code OTP incorrect.",
                "virtual_unknown_card" => "Carte virtuelle non reconnue.",
                _ => "Statut de paiement virtuel lu depuis le backend."
            };
        }

        private static void ValidateCardNumber(string normalizedCardNumber)
        {
            if (string.IsNullOrWhiteSpace(normalizedCardNumber))
                throw new VirtualPaymentValidationException("Numéro de carte obligatoire.");

            if (!normalizedCardNumber.All(char.IsDigit))
                throw new VirtualPaymentValidationException("Le numéro de carte doit contenir uniquement des chiffres.");

            if (normalizedCardNumber.Length < 13 || normalizedCardNumber.Length > 19)
                throw new VirtualPaymentValidationException("Longueur de numéro de carte invalide.");
        }

        private static void ValidateExpiryOrThrow(string? expiry, DateTime utcNow)
        {
            if (string.IsNullOrWhiteSpace(expiry))
                throw new VirtualPaymentValidationException("Date d'expiration obligatoire.");

            if (!TryParseExpiry(expiry, out _, out _))
                throw new VirtualPaymentValidationException("Date d'expiration invalide. Formats acceptés : MM/YY ou MM/YYYY.");

            if (!IsExpiryValid(expiry, utcNow))
                throw new VirtualPaymentValidationException("Carte virtuelle expirée.");
        }

        private static bool TryParseExpiry(string? expiry, out int month, out int year)
        {
            month = 0;
            year = 0;

            var parts = (expiry ?? string.Empty).Trim().Split('/', StringSplitOptions.TrimEntries);
            if (parts.Length != 2)
                return false;

            if (!int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out month))
                return false;

            if (month < 1 || month > 12)
                return false;

            if (!int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out year))
                return false;

            if (parts[1].Length == 2)
                year += 2000;
            else if (parts[1].Length != 4)
                return false;

            return year >= 2000 && year <= 2099;
        }

        private static void ValidateCvv(string? cvv)
        {
            var normalized = (cvv ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(normalized))
                throw new VirtualPaymentValidationException("CVV obligatoire.");

            if (normalized.Length != 3 || !normalized.All(char.IsDigit))
                throw new VirtualPaymentValidationException("CVV invalide. Le CVV de test doit contenir 3 chiffres.");

            if (!string.Equals(normalized, ValidCvv, StringComparison.Ordinal))
                throw new VirtualPaymentValidationException("CVV invalide pour la carte virtuelle.");
        }

        private static void ValidateOtpFormat(string? otp)
        {
            var normalized = (otp ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(normalized))
                throw new VirtualPaymentValidationException("Code OTP obligatoire.");

            if (!normalized.All(char.IsDigit))
                throw new VirtualPaymentValidationException("Le code OTP doit contenir uniquement des chiffres.");
        }

        private static string FormatCardNumber(string cardNumber)
        {
            return string.Join(' ', Enumerable.Range(0, cardNumber.Length / 4).Select(i => cardNumber.Substring(i * 4, 4)));
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

        private sealed record VirtualCardRule(
            string CardNumber,
            string Result,
            short LocalStatus,
            string ExternalStatus,
            string Message);
    }

    public sealed class VirtualPaymentValidationException : Exception
    {
        public VirtualPaymentValidationException(string message) : base(message)
        {
        }
    }
}
