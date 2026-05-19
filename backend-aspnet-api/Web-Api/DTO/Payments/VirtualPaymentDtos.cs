using System;
using Web_Api.DTO.Orders;

namespace Web_Api.DTO.Payments
{
    public sealed class VirtualInitiatePaymentResponseDto
    {
        public int LocalPaymentId { get; set; }
        public string Piece { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string PaymentRef { get; set; } = string.Empty;
        public string? ProviderPaymentId { get; set; }
        public string PayUrl { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "TND";
        public short LocalStatusCode { get; set; }
        public string LocalStatus { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool IsSandbox { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public sealed class VirtualConfirmPaymentRequestDto
    {
        public string Piece { get; set; } = string.Empty;
        public string PaymentRef { get; set; } = string.Empty;
        public string CardNumber { get; set; } = string.Empty;
        public string Expiry { get; set; } = string.Empty;
        public string Cvv { get; set; } = string.Empty;
        public string CardHolderName { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    public sealed class VirtualCancelPaymentRequestDto
    {
        public string Piece { get; set; } = string.Empty;
        public string PaymentRef { get; set; } = string.Empty;
    }

    public sealed class VirtualPaymentStatusDto
    {
        public int LocalPaymentId { get; set; }
        public string Piece { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string PaymentRef { get; set; } = string.Empty;
        public string? ProviderPaymentId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "TND";
        public short LocalStatusCode { get; set; }
        public string LocalStatus { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? ExternalStatus { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? LastModifiedAtUtc { get; set; }
        public DateTime? PaidAtUtc { get; set; }
        public bool IsSandbox { get; set; }
        public bool IsFinal { get; set; }
        public bool IsSuccess { get; set; }
    }

    public sealed class VirtualTestCardDto
    {
        public string CardNumber { get; set; } = string.Empty;
        public string Result { get; set; } = string.Empty;
        public string ExternalStatus { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Cvv { get; set; } = "123";
        public string Otp { get; set; } = "123456";
    }

    public sealed class VirtualPaymentResultDto
    {
        public bool Success { get; set; }
        public string Result { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public VirtualPaymentStatusDto Status { get; set; } = new();
    }

    public sealed class VirtualInitiatePaymentRequestDto : CreateBonCommandeRequestDto
    {
    }

    public sealed class VirtualInitiateGuestPaymentRequestDto : CreateGuestBonCommandeRequestDto
    {
    }
}
