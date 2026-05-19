using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 5.2 — session conversationnelle chatbot.
    /// </summary>
    [Table("F_CHATBOT_SESSION")]
    public class F_CHATBOT_SESSION
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(10)]
        public string Language { get; set; } = "fr";  // fr | ar | tounsi
    }

    /// <summary>
    /// Section 5.2 — message conversationnel (user / assistant / system).
    /// </summary>
    [Table("F_CHATBOT_MESSAGE")]
    public class F_CHATBOT_MESSAGE
    {
        [Key]
        public long Id { get; set; }
        public Guid SessionId { get; set; }

        [Required]
        [StringLength(20)]
        public string Role { get; set; } = string.Empty; // user | assistant | system

        [Required]
        public string Content { get; set; } = string.Empty;

        [StringLength(20)]
        public string? Action { get; set; }  // kb | query | analyze | predict | chitchat | action

        public string? DataJson { get; set; }

        [StringLength(10)]
        public string? Feedback { get; set; }  // up | down

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Section 5.4 — insight proactif pré-calculé par le job Hangfire.
    /// </summary>
    [Table("F_CHATBOT_INSIGHT")]
    public class F_CHATBOT_INSIGHT
    {
        [Key]
        public long Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string Severity { get; set; } = "info"; // info | warning | critical

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Message { get; set; } = string.Empty;

        public string? PayloadJson { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ShownToAdminAt { get; set; }
        public DateTime? DismissedAt { get; set; }

        [StringLength(15)]
        public string? AdminFeedback { get; set; }  // useful | not-useful
    }

    /// <summary>
    /// Section 5.5 — action en attente de confirmation OUI/ANNULER (TTL 2 min).
    /// </summary>
    [Table("F_CHATBOT_PENDING_ACTION")]
    public class F_CHATBOT_PENDING_ACTION
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid SessionId { get; set; }

        [Required]
        [StringLength(50)]
        public string ActionType { get; set; } = string.Empty;

        [Required]
        public string ParamsJson { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(2);
    }

    /// <summary>
    /// Section 5.5.5 — audit trail des actions exécutées par le chatbot.
    /// </summary>
    [Table("F_CHATBOT_ACTION_LOG")]
    public class F_CHATBOT_ACTION_LOG
    {
        [Key]
        public long Id { get; set; }
        public Guid UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string ActionType { get; set; } = string.Empty;

        [Required]
        public string ParamsJson { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Result { get; set; } = string.Empty;  // success | failed

        [StringLength(500)]
        public string? ErrorMessage { get; set; }

        [Required]
        [StringLength(500)]
        public string OriginalQuestion { get; set; } = string.Empty;

        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
    }
}
