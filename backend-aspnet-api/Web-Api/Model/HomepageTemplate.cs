using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Module 7 (Master Prompt) — Templates "Homepage Builder".
    /// Maximum 5 templates en BDD, un seul peut avoir IsActive=true à la fois
    /// (contrainte gérée côté service, pas par index unique pour permettre
    /// l'activation atomique en transaction).
    /// </summary>
    [Table("HomepageTemplates")]
    public class HomepageTemplate
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        /// <summary>
        /// JSON tableau des blocs (banner / carousel / categories / richText / video).
        /// </summary>
        public string BlocksJson { get; set; } = "[]";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Guid? CreatedByAdminId { get; set; }
    }
}
