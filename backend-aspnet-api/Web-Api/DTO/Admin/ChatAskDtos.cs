using System.Collections.Generic;

namespace Web_Api.DTO.Admin
{
    /// <summary>
    /// Endpoint unique exposé à Flutter (sans n8n). Reçoit la question
    /// utilisateur, retourne la réponse formatée + données / graphe / liste.
    /// </summary>
    public class ChatAskRequestDto
    {
        public string Question { get; set; } = string.Empty;
        public string? SessionId { get; set; }
    }

    public class ChatAskResponseDto
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        /// <summary>kb | query | analyze | predict | chitchat | action | error</summary>
        public string Action { get; set; } = "chitchat";
        public object? Data { get; set; }
        public List<ChatAskRowDto>? Rows { get; set; }
        public ChatAskChartDto? Chart { get; set; }

        // Section 5.8 — quick-replies contextuelles (3-4 boutons sous la réponse)
        public List<string> Suggestions { get; set; } = new();

        // Section 5.2 — sessionId conversationnel renvoyé pour les requêtes suivantes
        public string? SessionId { get; set; }

        // Section 5.3 — langue détectée (fr / ar / tounsi)
        public string? Language { get; set; }

        // Section 5.5 — action en attente confirmation OUI/ANNULER
        public PendingActionDto? PendingAction { get; set; }
    }

    public class PendingActionDto
    {
        public string ActionType { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string? PendingId { get; set; }
    }

    public class ChatAskRowDto
    {
        public string? Key { get; set; }
        public string Label { get; set; } = string.Empty;
        public double? Value { get; set; }
        public Dictionary<string, object?> Fields { get; set; } = new();
    }

    public class ChatAskChartDto
    {
        /// <summary>bar | line</summary>
        public string Type { get; set; } = "bar";
        public List<ChatAskChartPointDto> Points { get; set; } = new();
    }

    public class ChatAskChartPointDto
    {
        public string Bucket { get; set; } = string.Empty;
        public double Value { get; set; }
        public double? Lower { get; set; }
        public double? Upper { get; set; }
    }
}
