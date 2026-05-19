using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Web_Api.DTO.Payments;
using Web_Api.Options;

namespace Web_Api.Services.Payments
{
    public sealed class KonnectClient : IKonnectClient
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly HttpClient _httpClient;
        private readonly ILogger<KonnectClient> _logger;
        private readonly KonnectOptions _options;

        public KonnectClient(
            HttpClient httpClient,
            IOptions<KonnectOptions> options,
            ILogger<KonnectClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<KonnectInitiatePaymentApiResponse> InitiatePaymentAsync(
            KonnectInitiatePaymentApiRequest request,
            CancellationToken ct = default)
        {
            _options.ValidateForGateway();

            using var message = new HttpRequestMessage(HttpMethod.Post, "payments/init-payment")
            {
                Content = JsonContent.Create(request, options: JsonOptions)
            };

            message.Headers.Add("x-api-key", _options.ApiKey);
            message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var response = await _httpClient.SendAsync(message, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Konnect initiate payment failed. StatusCode={StatusCode}, Body={Body}",
                    (int)response.StatusCode,
                    body);

                throw new KonnectGatewayException(
                    message: $"Konnect a refusé l'initialisation du paiement (HTTP {(int)response.StatusCode}).",
                    statusCode: (int)response.StatusCode,
                    rawBody: body);
            }

            var payload = JsonSerializer.Deserialize<KonnectInitiatePaymentApiResponse>(body, JsonOptions);

            if (payload == null ||
                string.IsNullOrWhiteSpace(payload.PayUrl) ||
                string.IsNullOrWhiteSpace(payload.PaymentRef))
            {
                _logger.LogWarning("Konnect initiate payment returned an incomplete payload: {Body}", body);

                throw new KonnectGatewayException(
                    message: "Konnect a répondu avec un payload incomplet lors de l'initialisation du paiement.",
                    statusCode: (int)response.StatusCode,
                    rawBody: body);
            }

            return payload;
        }

        public async Task<KonnectPaymentDetailsApiResponse> GetPaymentDetailsAsync(
            string paymentId,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(paymentId))
                throw new ArgumentException("paymentId est obligatoire.", nameof(paymentId));

            _options.ValidateForGateway();

            using var message = new HttpRequestMessage(
                HttpMethod.Get,
                $"payments/{Uri.EscapeDataString(paymentId.Trim())}");

            message.Headers.Add("x-api-key", _options.ApiKey);
            message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var response = await _httpClient.SendAsync(message, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Konnect get payment details failed. StatusCode={StatusCode}, PaymentId={PaymentId}, Body={Body}",
                    (int)response.StatusCode,
                    paymentId,
                    body);

                throw new KonnectGatewayException(
                    message: $"Konnect a refusé la lecture du paiement {paymentId} (HTTP {(int)response.StatusCode}).",
                    statusCode: (int)response.StatusCode,
                    rawBody: body);
            }

            var payload = JsonSerializer.Deserialize<KonnectPaymentDetailsApiResponse>(body, JsonOptions);

            if (payload?.Payment == null)
            {
                _logger.LogWarning("Konnect get payment details returned an incomplete payload: {Body}", body);

                throw new KonnectGatewayException(
                    message: "Konnect a répondu avec un payload incomplet lors de la lecture du paiement.",
                    statusCode: (int)response.StatusCode,
                    rawBody: body);
            }

            return payload;
        }
    }

    public sealed class KonnectGatewayException : Exception
    {
        public KonnectGatewayException(string message, int? statusCode = null, string? rawBody = null)
            : base(message)
        {
            StatusCode = statusCode;
            RawBody = rawBody;
        }

        public int? StatusCode { get; }
        public string? RawBody { get; }
    }
}