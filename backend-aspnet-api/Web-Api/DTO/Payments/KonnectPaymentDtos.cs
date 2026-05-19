using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Web_Api.DTO.Payments
{
    public class KonnectInitiatePaymentResponseDto
    {
        public int LocalPaymentId { get; set; }
        public string Piece { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string PaymentRef { get; set; } = string.Empty;
        public string PayUrl { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "TND";
        public short LocalStatusCode { get; set; }
        public string LocalStatus { get; set; } = string.Empty;
        public bool IsSandbox { get; set; }
        public bool IsMock { get; set; }
    }

    public sealed class KonnectInitiatePaymentApiRequest
    {
        [JsonPropertyName("receiverWalletId")]
        public string ReceiverWalletId { get; set; } = string.Empty;

        [JsonPropertyName("token")]
        public string Token { get; set; } = "TND";

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = "immediate";

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("acceptedPaymentMethods")]
        public string[] AcceptedPaymentMethods { get; set; } = Array.Empty<string>();

        [JsonPropertyName("lifespan")]
        public int Lifespan { get; set; }

        [JsonPropertyName("checkoutForm")]
        public bool CheckoutForm { get; set; }

        [JsonPropertyName("addPaymentFeesToAmount")]
        public bool AddPaymentFeesToAmount { get; set; }

        [JsonPropertyName("firstName")]
        public string? FirstName { get; set; }

        [JsonPropertyName("lastName")]
        public string? LastName { get; set; }

        [JsonPropertyName("phoneNumber")]
        public string? PhoneNumber { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("orderId")]
        public string OrderId { get; set; } = string.Empty;

        [JsonPropertyName("webhook")]
        public string? Webhook { get; set; }

        [JsonPropertyName("silentWebhook")]
        public bool SilentWebhook { get; set; }

        [JsonPropertyName("successUrl")]
        public string? SuccessUrl { get; set; }

        [JsonPropertyName("failUrl")]
        public string? FailUrl { get; set; }

        [JsonPropertyName("theme")]
        public string Theme { get; set; } = "light";
    }

    public sealed class KonnectInitiatePaymentApiResponse
    {
        [JsonPropertyName("payUrl")]
        public string PayUrl { get; set; } = string.Empty;

        [JsonPropertyName("paymentRef")]
        public string PaymentRef { get; set; } = string.Empty;
    }

    public sealed class KonnectPaymentDetailsApiResponse
    {
        [JsonPropertyName("payment")]
        public KonnectPaymentDetailsApiPaymentDto? Payment { get; set; }
    }

    public sealed class KonnectPaymentDetailsApiPaymentDto
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("amountDue")]
        public decimal? AmountDue { get; set; }

        [JsonPropertyName("reachedAmount")]
        public decimal? ReachedAmount { get; set; }

        [JsonPropertyName("amount")]
        public decimal? Amount { get; set; }

        [JsonPropertyName("token")]
        public string? Token { get; set; }

        [JsonPropertyName("expirationDate")]
        public string? ExpirationDate { get; set; }

        [JsonPropertyName("orderId")]
        public string? OrderId { get; set; }

        [JsonPropertyName("transactions")]
        public List<KonnectPaymentDetailsApiTransactionDto>? Transactions { get; set; }
    }

    public sealed class KonnectPaymentDetailsApiTransactionDto
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("date")]
        public string? Date { get; set; }

        [JsonPropertyName("createdAt")]
        public string? CreatedAt { get; set; }
    }

    public sealed class KonnectPublicPaymentStatusDto
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
        public string? ExternalStatus { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? LastModifiedAtUtc { get; set; }
        public DateTime? PaidAtUtc { get; set; }
        public bool IsSandbox { get; set; }
        public bool IsMock { get; set; }
        public bool IsFinal { get; set; }
    }

    public sealed class KonnectWebhookProcessingResponseDto
    {
        public bool Handled { get; set; }
        public string Message { get; set; } = string.Empty;
        public string PaymentRef { get; set; } = string.Empty;
        public string? Piece { get; set; }
        public int? LocalPaymentId { get; set; }
        public string? PreviousLocalStatus { get; set; }
        public string? CurrentLocalStatus { get; set; }
        public string? ExternalStatus { get; set; }
        public bool IsFinal { get; set; }
    }
}