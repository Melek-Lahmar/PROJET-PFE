using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Module 10 (Master Prompt) — Stockage clé/valeur des paramètres applicatifs
    /// (footer, branding, theme, SEO, langues, traductions overrides, etc.).
    /// La clé est libre (ex: `theme.primary`, `company.email`). La valeur est
    /// sérialisée en JSON (string, number, object, array, ...) pour permettre
    /// tous les types côté admin sans changer le schéma.
    /// </summary>
    [Table("AppSettings")]
    public class AppSetting
    {
        [Key]
        [MaxLength(120)]
        public string Key { get; set; } = string.Empty;

        public string ValueJson { get; set; } = "null";

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsPublic { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Guid? UpdatedByAdminId { get; set; }
    }
}
