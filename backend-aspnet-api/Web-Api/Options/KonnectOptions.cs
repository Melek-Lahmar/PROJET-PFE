using System;
using System.Linq;

namespace Web_Api.Options
{
    public sealed class KonnectOptions
    {
        public const string SectionName = "Konnect";

        public string Mode { get; set; } = "Mock"; // Mock | Sandbox | Production
        public string ApiKey { get; set; } = string.Empty;
        public string ReceiverWalletId { get; set; } = string.Empty;

        public string SandboxApiBaseUrl { get; set; } = "https://api.sandbox.konnect.network/api/v2/";
        public string ProductionApiBaseUrl { get; set; } = "https://api.konnect.network/api/v2/";

        public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
        public string BackendPublicBaseUrl { get; set; } = "http://localhost:5123";

        public int LifespanMinutes { get; set; } = 30;
        public bool CheckoutForm { get; set; } = true;
        public bool AddPaymentFeesToAmount { get; set; } = false;
        public bool SilentWebhook { get; set; } = true;
        public string Theme { get; set; } = "light";
        public string Currency { get; set; } = "TND";

        public string MockResult { get; set; } = "success";

        public string[] AcceptedPaymentMethods { get; set; } = new[]
        {
            "wallet",
            "bank_card",
            "e-DINAR"
        };

        public bool IsMockMode => string.Equals(Mode, "Mock", StringComparison.OrdinalIgnoreCase);
        public bool IsProductionMode => string.Equals(Mode, "Production", StringComparison.OrdinalIgnoreCase);
        public bool IsSandboxMode => !IsMockMode && !IsProductionMode;

        public string ResolveApiBaseUrl()
        {
            return IsProductionMode ? ProductionApiBaseUrl : SandboxApiBaseUrl;
        }

        public string[] GetAcceptedPaymentMethods()
        {
            return AcceptedPaymentMethods?
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray()
                ?? Array.Empty<string>();
        }

        public void ValidateForGateway()
        {
            if (IsMockMode)
                return;

            if (string.IsNullOrWhiteSpace(ApiKey))
                throw new InvalidOperationException("Konnect:ApiKey est obligatoire hors mode Mock.");

            if (string.IsNullOrWhiteSpace(ReceiverWalletId))
                throw new InvalidOperationException("Konnect:ReceiverWalletId est obligatoire hors mode Mock.");
        }

        public string BuildFrontendReturnUrl(string status, bool isGuest, string piece, decimal amount)
        {
            var source = isGuest ? "guest" : "account";
            var normalizedStatus = Uri.EscapeDataString(status ?? "pending");

            return $"{FrontendBaseUrl.TrimEnd('/')}/checkout/konnect/return" +
                   $"?source={source}" +
                   $"&status={normalizedStatus}" +
                   $"&piece={Uri.EscapeDataString(piece)}" +
                   $"&amount={amount:F3}";
        }

        public string BuildWebhookUrl()
        {
            return $"{BackendPublicBaseUrl.TrimEnd('/')}/api/payments/konnect/webhook";
        }
    }
}