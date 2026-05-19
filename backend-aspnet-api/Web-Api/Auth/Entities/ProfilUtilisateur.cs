using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Web_Api.Geo;

namespace Web_Api.Auth.Entities
{
    public enum TypeProfil
    {
        Client = 0,
        Employe = 1
    }

    public enum TypeClient
    {
        B2C = 0,
        B2B = 1
    }

    /// <summary>
    /// Validation: Delegation doit appartenir au Gouvernorat sélectionné (via TunisieDecoupage)
    /// </summary>
    [AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
    public sealed class DelegationSelonGouvernoratAttribute : ValidationAttribute
    {
        private readonly string _gouvernoratPropertyName;

        public DelegationSelonGouvernoratAttribute(string gouvernoratPropertyName)
        {
            _gouvernoratPropertyName = gouvernoratPropertyName;
            ErrorMessage = "La délégation ne correspond pas au gouvernorat choisi.";
        }

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var delegation = value as string;

            var gouvernoratProp = validationContext.ObjectType.GetProperty(_gouvernoratPropertyName);
            if (gouvernoratProp == null)
                return new ValidationResult($"Propriété '{_gouvernoratPropertyName}' introuvable.");

            var gouvernoratValue = gouvernoratProp.GetValue(validationContext.ObjectInstance);

            if (gouvernoratValue is not GouvernoratTunisie gouvernorat)
                return new ValidationResult("Gouvernorat invalide.");

            if (!TunisieDecoupage.IsDelegationValide(gouvernorat, delegation))
                return new ValidationResult(ErrorMessage);

            return ValidationResult.Success;
        }
    }

    [Table("ProfilsUtilisateurs")]
    public class ProfilUtilisateur
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int cbMarq { get; set; }

        public Guid? UtilisateurId { get; set; }

        public TypeProfil? TypeProfil { get; set; }
        public TypeClient? TypeClient { get; set; }

        // =============================
        // 👤 Infos personnelles
        // =============================
        [MaxLength(150)]
        public string? NomComplet { get; set; }

        [MaxLength(30)]
        public string? Telephone { get; set; }

        [MaxLength(20)]
        public string? CIN { get; set; }

        public DateTime? DateNaissance { get; set; }

        // =============================
        // 🏢 Infos société
        // =============================
        [MaxLength(200)]
        public string? NomSociete { get; set; }

        [MaxLength(50)]
        public string? MatriculeFiscal { get; set; }

        [MaxLength(50)]
        public string? RegistreCommerce { get; set; }

        [MaxLength(50)]
        public string? NumeroTVA { get; set; }

        public int? Remise { get; set; }
        public decimal? PlafondCredit { get; set; }

        // Module 4 — Remise B2B personnalisée (decimal 0..100, ex: 12.50%)
        // Prend précédence sur `Remise` (int) si renseigné. Voir IMPLEMENTATION_DECISIONS.md D14/D15.
        [Column(TypeName = "decimal(5,2)")]
        public decimal? DiscountPercent { get; set; }

        // =============================
        // 📍 Adresse géographique (OBLIGATOIRE)
        // =============================

        [Required(ErrorMessage = "Le gouvernorat est obligatoire.")]
        public GouvernoratTunisie? Gouvernorat { get; set; }

        [Required(ErrorMessage = "La délégation est obligatoire.")]
        [MaxLength(100)]
        [DelegationSelonGouvernorat(nameof(Gouvernorat))]
        public string? Delegation { get; set; }

        // ✅ NOUVEAU : Adresse texte principale (obligatoire)
        [Required(ErrorMessage = "L'adresse est obligatoire.")]
        [MaxLength(300)]
        public string? Adresse { get; set; }

        // ✅ NOUVEAU : Complément d’adresse (optionnel)
        [MaxLength(300)]
        public string? AdresseComplementaire { get; set; }

        // Code postal (déjà présent)
        [MaxLength(20)]
        public string? CodePostal { get; set; }

        [MaxLength(100)]
        public string? Pays { get; set; }

        // GPS (optionnel)
        [Column(TypeName = "decimal(9,6)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Longitude { get; set; }

        // =============================
        // 👨‍💼 Infos employé
        // =============================
        [MaxLength(50)]
        public string? CodeEmploye { get; set; }

        [MaxLength(100)]
        public string? Departement { get; set; }

        [MaxLength(100)]
        public string? Poste { get; set; }

        [MaxLength(50)]
        public string? CodeDepot { get; set; }

        [MaxLength(100)]
        public string? ZoneLivraison { get; set; }


        // =============================
        // 🚚 Refonte PFE — Livreur transit / dépôt rattaché
        // =============================
        /// <summary>Flag métier : true si ce livreur assure le transit inter-dépôts.</summary>
        public bool IsTransit { get; set; } = false;

        /// <summary>Dépôt rattaché du livreur ou livreur-transit. FK logique vers F_DEPOT.DE_No.</summary>
        public int? DepotRattacheNo { get; set; }

        // =============================
        // 🔗 Sage
        // =============================
        [MaxLength(50)]
        public string? CodeClientSage { get; set; }

        public bool? EstSynchroniseAvecSage { get; set; }

        public DateTime? DateDerniereSynchronisation { get; set; }

        // =============================
        // 🕒 Audit
        // =============================
        public DateTime? DateCreation { get; set; }
        public DateTime? DateModification { get; set; }

        // =============================
        // 🎧 État de disponibilité confirmatrice (phase 3A)
        // =============================

        /// <summary>Confirmatrice en pause volontaire (mise manuellement). Exclue de la distribution auto.</summary>
        public bool IsInPause { get; set; }

        /// <summary>Dernière activité API de la confirmatrice. Alimenté par un middleware léger.
        /// Sert à dériver le flag "en ligne" (activité &lt; seuil).</summary>
        public DateTime? LastActivityAt { get; set; }

        /// <summary>Dernière fois qu'un cas lui a été attribué automatiquement.
        /// Sert de départage au critère "plus ancienne attribution" en phase 3B.</summary>
        public DateTime? LastAssignmentAt { get; set; }

        /// <summary>Section 3.8 — préférence de contact côté client : Both | AppelOnly | SmsOnly.
        /// Filtre les SMS auto pré-livraison et affiche un badge dans le détail livreur.</summary>
        [System.ComponentModel.DataAnnotations.StringLength(20)]
        public string ContactPreference { get; set; } = "Both";
    }
}