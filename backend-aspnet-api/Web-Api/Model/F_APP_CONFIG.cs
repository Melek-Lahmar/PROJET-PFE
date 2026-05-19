using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 4.6 — singleton de configuration applicative globale (couleur thème,
    /// mode clair/sombre/auto). Une seule ligne PK=1, propagée à toutes les apps via
    /// /api/admin/config/theme + SignalR ThemeChanged.
    /// </summary>
    [Table("F_APP_CONFIG")]
    public class F_APP_CONFIG
    {
        [Key]
        public int Id { get; set; } = 1;

        [Required]
        [StringLength(7)]
        public string PrimaryColor { get; set; } = "#3F51B5";

        [Required]
        [StringLength(10)]
        public string ThemeMode { get; set; } = "auto";

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Guid? UpdatedByUserId { get; set; }
    }
}
