using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    /// <summary>
    /// Section 3.6 — Carnet d'adresses client (max 4). Validé côté API.
    /// </summary>
    [Table("F_CLIENT_ADDRESS")]
    public class F_CLIENT_ADDRESS
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ClientUserId { get; set; }

        [Required]
        [StringLength(50)]
        public string Label { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Adresse { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Gouvernorat { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Delegation { get; set; }

        [Required]
        [StringLength(100)]
        public string Ville { get; set; } = string.Empty;

        [StringLength(10)]
        public string? CodePostal { get; set; }

        [StringLength(200)]
        public string? Landmark { get; set; }

        [StringLength(20)]
        public string? GeoValidationStatus { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal? Longitude { get; set; }

        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
