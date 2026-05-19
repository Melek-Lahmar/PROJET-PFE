using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 3.11 — token FCM par device (peut y en avoir plusieurs par user :
    /// téléphone + tablette). Le token est unique au niveau global.
    /// </summary>
    [Table("F_CLIENT_DEVICE_TOKEN")]
    public class F_CLIENT_DEVICE_TOKEN
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }

        [Required]
        [StringLength(500)]
        public string Token { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Platform { get; set; } = "android"; // android | ios | web

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    }
}
