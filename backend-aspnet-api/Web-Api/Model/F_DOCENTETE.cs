using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web_Api.Model
{
    [Table("F_DOCENTETE")]
    public class F_DOCENTETE
    {
        public const short STATUS_EN_ATTENTE = 0;
        public const short STATUS_CONFIRME = 1;
        public const short STATUS_TENTATIVE = 2;
        public const short STATUS_REFUSE = 3;

        public const short DOC_TYPE_BC = 0;
        public const short DOC_TYPE_BL = 1;
        public const short DOC_TYPE_QUOTE = 2;

        public const string QUOTE_STATUS_DRAFT = "DRAFT";
        public const string QUOTE_STATUS_SENT = "SENT";
        public const string QUOTE_STATUS_ACCEPTED = "ACCEPTED";
        public const string QUOTE_STATUS_REFUSED = "REFUSED";
        public const string QUOTE_STATUS_EXPIRED = "EXPIRED";
        public const string QUOTE_STATUS_CONVERTED = "CONVERTED";
        public const string QUOTE_STATUS_CANCELLED = "CANCELLED";

        [Key]
        public int cbMarq { get; set; }

        public short? DO_Domaine { get; set; }
        public short? DO_Type { get; set; }
        public DateTime? DO_Date { get; set; }

        [StringLength(20)]
        public string? DO_Ref { get; set; }

        [StringLength(17)]
        public string? DO_Tiers { get; set; }

        public int? DE_No { get; set; }

        [StringLength(17)]
        public string? CT_NumPayeur { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DO_TotalHT { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DO_TotalHTNet { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DO_TotalTTC { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DO_NetAPayer { get; set; }

        public short? DO_Valide { get; set; }

        /// <summary>
        /// Nombre de tentatives (contact / livraison) enregistrées par la
        /// confirmatrice avant confirmation. Ajusté manuellement via les boutons
        /// +1 / -1 de la liste BC. Quand &gt; 0, le BC bascule au statut TENTATIVE.
        /// </summary>
        public int DO_TentativeCount { get; set; }

        [NotMapped]
        public string DocumentStatus => ToStatusLabel(DO_Valide);

        [NotMapped]
        public string DocumentMappingStatus => "mapped";

        [StringLength(13)]
        public string? DO_Piece { get; set; }

        [StringLength(10)]
        public string? DO_ModeLivraison { get; set; }

        [StringLength(20)]
        public string? DO_ModePaiement { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DO_FraisLivraison { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? DO_TimbreFiscal { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? TotalBeforeDiscount { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? B2BDiscountRate { get; set; }

        [Column(TypeName = "decimal(24,13)")]
        public decimal? B2BDiscountAmount { get; set; }

        [StringLength(30)]
        public string? DiscountSource { get; set; }

        [StringLength(150)]
        public string? DO_AdresseLivraison { get; set; }

        [StringLength(35)]
        public string? DO_VilleLivraison { get; set; }

        [StringLength(9)]
        public string? DO_CodePostalLivraison { get; set; }

        [StringLength(20)]
        public string? DO_LatitudeLivraison { get; set; }

        [StringLength(20)]
        public string? DO_LongitudeLivraison { get; set; }

        /// <summary>
        /// Snapshot du téléphone de livraison, spécifique à la commande.
        /// Permet la correction de numéro via une Demande NUMERO_INCORRECT
        /// sans écraser le téléphone global du profil client.
        /// </summary>
        [StringLength(20)]
        public string? DO_TelephoneLivraison { get; set; }

        /// <summary>
        /// Phase 6 — Repère visuel pour le livreur (ex : "à côté de la pharmacie XYZ").
        /// Texte libre ; spécificité Tunisie où les adresses sont souvent imprécises.
        /// </summary>
        [StringLength(200)]
        public string? DO_RepereLivraison { get; set; }

        /// <summary>
        /// Phase 6 — Instructions spécifiques pour le livreur (ex : "sonner 2 fois,
        /// entrée côté parking"). Texte libre.
        /// </summary>
        [StringLength(500)]
        public string? DO_InstructionsLivraison { get; set; }

        // =============================
        // Traçabilité vendeur / client (origine React)
        // =============================
        public Guid? DO_VendeurUserId { get; set; }
        public Guid? DO_ClientUserId { get; set; }

        [StringLength(12)]
        public string? DO_ClientMode { get; set; } // EXISTING | PASSAGER

        [StringLength(10)]
        public string? DO_PassagerTypeClient { get; set; } // B2C | B2B

        [StringLength(150)]
        public string? DO_PassagerNomComplet { get; set; }

        [StringLength(30)]
        public string? DO_PassagerTelephone { get; set; }

        [StringLength(20)]
        public string? DO_PassagerCIN { get; set; }

        [StringLength(200)]
        public string? DO_PassagerNomSociete { get; set; }

        [StringLength(50)]
        public string? DO_PassagerMatriculeFiscal { get; set; }

        [StringLength(50)]
        public string? DO_PassagerRegistreCommerce { get; set; }

        [StringLength(50)]
        public string? DO_PassagerNumeroTVA { get; set; }

        [StringLength(50)]
        public string? DO_PassagerGouvernorat { get; set; }

        [StringLength(100)]
        public string? DO_PassagerDelegation { get; set; }

        [StringLength(300)]
        public string? DO_PassagerAdresse { get; set; }

        [StringLength(300)]
        public string? DO_PassagerAdresseComplementaire { get; set; }

        [StringLength(20)]
        public string? DO_PassagerCodePostal { get; set; }

        public DateTime? cbCreation { get; set; }
        public DateTime? cbModification { get; set; }


        // =============================
        // Refonte PFE — livraison domicile / retrait dépôt / validation GPS
        // =============================
        [StringLength(20)]
        public string DeliveryMode { get; set; } = "HOME_DELIVERY";

        public int? PickupDepotNo { get; set; }

        [StringLength(20)]
        public string? GeoValidationStatus { get; set; }

        public bool HasDeliveryIncident { get; set; } = false;

        [Column(TypeName = "decimal(9,6)")]
        public decimal? GeoLat { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? GeoLng { get; set; }

        // Pool livreur
        public Guid? AssignedLivreurId { get; set; }

        // Échange
        [StringLength(20)]
        public string TypeCommande { get; set; } = "NORMALE";

        [StringLength(13)]
        public string? CommandeOriginalePiece { get; set; }

        [StringLength(500)]
        public string? EchangeArticleRetour { get; set; }

        [StringLength(500)]
        public string? EchangeArticleLivraison { get; set; }

        public int? ReclamationOrigineId { get; set; }

        // Section 3.11.2 — anti-spam push proximité (livreur < 500m).
        // Une seule notification par commande, ne resette pas si livreur s'éloigne.
        public bool ProximityAlertSent { get; set; } = false;

        /// <summary>
        /// Section 1.4 — Active Delivery. Indique que CETTE commande est la
        /// "tête active" du livreur, c'est-à-dire celle vers laquelle il se dirige
        /// maintenant. Une seule commande par livreur peut être active en même
        /// temps (validé en transaction côté start-heading). Tant que ce flag est
        /// false, le client voit "En cours de livraison" sans carte ni ETA précis.
        /// </summary>
        public bool IsActiveDelivery { get; set; } = false;

        // Workflow devis B2B (DO_Type = 2)
        [StringLength(20)]
        public string? QuoteStatus { get; set; }

        public DateTime? QuoteValidUntil { get; set; }

        public Guid? QuoteCreatedByUserId { get; set; }

        public Guid? QuoteAssignedToUserId { get; set; }

        public DateTime? QuoteSentAt { get; set; }

        public DateTime? QuoteAcceptedAt { get; set; }

        public DateTime? QuoteRefusedAt { get; set; }

        public DateTime? QuoteConvertedAt { get; set; }

        [StringLength(13)]
        public string? QuoteConvertedToPiece { get; set; }

        [StringLength(500)]
        public string? QuoteClientNote { get; set; }

        [StringLength(500)]
        public string? QuoteInternalNote { get; set; }

        public bool DO_ValiderSageX3 { get; set; }

        [StringLength(25)]
        public string? DO_NumeroSageX3 { get; set; }

        public void SetWorkflowStatus(short status)
        {
            if (status < STATUS_EN_ATTENTE || status > STATUS_REFUSE)
                throw new ArgumentOutOfRangeException(nameof(status), "Le statut métier doit être entre 0 et 3.");

            DO_Valide = status;
            cbModification = DateTime.UtcNow;
        }

        public void SetWorkflowStatus(string? statusLabel)
        {
            DO_Valide = ParseStatusLabel(statusLabel);
            cbModification = DateTime.UtcNow;
        }

        public static short ParseStatusLabel(string? statusLabel)
        {
            var normalized = (statusLabel ?? string.Empty).Trim().ToUpperInvariant();

            return normalized switch
            {
                "EN_ATTENTE" => STATUS_EN_ATTENTE,
                "CONFIRME" => STATUS_CONFIRME,
                "TRANSFORME" => STATUS_CONFIRME,
                "TENTATIVE" => STATUS_TENTATIVE,
                "REFUSE" => STATUS_REFUSE,
                _ => throw new ArgumentException($"Statut métier inconnu : {statusLabel}", nameof(statusLabel))
            };
        }

        public static string ToStatusLabel(short? status)
        {
            return status switch
            {
                STATUS_EN_ATTENTE => "EN_ATTENTE",
                STATUS_CONFIRME => "CONFIRME",
                STATUS_TENTATIVE => "TENTATIVE",
                STATUS_REFUSE => "REFUSE",
                _ => "INCONNU"
            };
        }
    }
}
