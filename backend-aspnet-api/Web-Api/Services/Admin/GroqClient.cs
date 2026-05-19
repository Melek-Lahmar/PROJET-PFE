using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Web_Api.Services.Admin
{
    /// <summary>
    /// Wrapper minimal autour de l'API Groq (compatible OpenAI Chat Completions).
    /// Utilisé par l'orchestrateur du chatbot pour parser l'intention et reformuler
    /// la réponse en français naturel.
    /// </summary>
    public class GroqClient
    {
        private readonly HttpClient _http;
        private readonly ILogger<GroqClient> _logger;
        private readonly string _apiKey;
        private readonly string _model;
        private readonly string _baseUrl;

        public GroqClient(HttpClient http, IConfiguration config, ILogger<GroqClient> logger)
        {
            _http = http;
            _logger = logger;
            _apiKey = config["Groq:ApiKey"]
                      ?? config["Chatbot:ApiKey"]
                      ?? string.Empty;
            _baseUrl = (config["Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1")
                .TrimEnd('/');
            _model = config["Groq:Model"] ?? "llama-3.3-70b-versatile";
        }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

        public async Task<string> CompleteAsync(
            string systemPrompt,
            string userMessage,
            bool jsonResponse = false,
            float temperature = 0.2f,
            CancellationToken ct = default)
        {
            if (!IsConfigured) throw new InvalidOperationException("Groq:ApiKey n'est pas configuré.");

            var body = new GroqRequest
            {
                Model = _model,
                Messages = new List<GroqMessage>
                {
                    new() { Role = "system", Content = systemPrompt },
                    new() { Role = "user", Content = userMessage }
                },
                Temperature = temperature,
                ResponseFormat = jsonResponse
                    ? new GroqResponseFormat { Type = "json_object" }
                    : null
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/chat/completions");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            req.Content = JsonContent.Create(body, options: new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            });

            var res = await _http.SendAsync(req, ct);
            var raw = await res.Content.ReadAsStringAsync(ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Groq API error {status} : {body}", res.StatusCode, raw);
                throw new HttpRequestException($"Groq API error {(int)res.StatusCode} : {raw}");
            }

            using var doc = JsonDocument.Parse(raw);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? string.Empty;
            return content;
        }

        // ============== Wire types ==============
        private class GroqRequest
        {
            [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;
            [JsonPropertyName("messages")] public List<GroqMessage> Messages { get; set; } = new();
            [JsonPropertyName("temperature")] public float Temperature { get; set; }
            [JsonPropertyName("response_format")] public GroqResponseFormat? ResponseFormat { get; set; }
        }

        private class GroqMessage
        {
            [JsonPropertyName("role")] public string Role { get; set; } = string.Empty;
            [JsonPropertyName("content")] public string Content { get; set; } = string.Empty;
        }

        private class GroqResponseFormat
        {
            [JsonPropertyName("type")] public string Type { get; set; } = "json_object";
        }
    }
}
