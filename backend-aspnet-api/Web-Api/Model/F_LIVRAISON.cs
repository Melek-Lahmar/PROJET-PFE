using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MODELS_CREATEUR.MODELS_SAGE
{
    [Table("F_LIVRAISON")]
    public class F_LIVRAISON
    {
        [Key]
        public int cbMarq { get; set; }

        [Required]
        [StringLength(13)]
        public string DO_Piece { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string LI_Adresse { get; set; } = string.Empty;

        [Required]
        [StringLength(35)]
        public string LI_Ville { get; set; } = string.Empty;

        [StringLength(9)]
        public string? LI_CodePostal { get; set; }

        public short LI_Statut { get; set; }

        /// <summary>
        /// Correspond à ProfilUtilisateur.cbMarq
        /// </summary>
        public int? LivreurId { get; set; }

        public DateTime LI_DateCreation { get; set; }
        public DateTime? LI_DateLivree { get; set; }
        public DateTime? LI_DateReplanification { get; set; }

        // Report partiel (même journée). Le statut reste EN_LIVRAISON ; la
        // commande est juste « bloquée » dans l'UI livreur jusqu'à cet
        // instant, puis revient automatiquement dans la liste active.
        // null = pas de blocage, livraison normale.
        public DateTime? LI_HeureSouhaitee { get; set; }

        [StringLength(250)]
        public string? LI_Commentaire { get; set; }

        [StringLength(20)]
        public string? LI_Latitude { get; set; }

        [StringLength(20)]
        public string? LI_Longitude { get; set; }

        [StringLength(13)]
        public string? LI_PieceSage { get; set; }

        // =====================================================
        // Section 1 — Cashbox COD livreur
        // Fait suite au brief PFE 2026-05-09. L'encaissement et la
        // remise au dépôt sont locaux à la livraison ; on ne touche
        // pas au modèle B_PAIEMENT (qui sert Konnect / virement).
        // =====================================================

        public bool Encaisse { get; set; } = false;

        public DateTime? EncaisseAt { get; set; }

        [Column(TypeName = "decimal(18,3)")]
        public decimal? MontantEncaisse { get; set; }

        public bool RemisAuDepot { get; set; } = false;

        public DateTime? RemisAuDepotAt { get; set; }

        // =====================================================
        // Section 1.3 — Dépôts numérotés (DepotIncrementJob 00:00).
        // 0 = jamais sortie, 1+ = nombre de passages au dépôt.
        // Plafond métier : 10 (garde-fou pour éviter les boucles).
        // =====================================================
        public int DepotPassageNumber { get; set; } = 0;

        // Manifeste vendeur — true dès que le livreur passe en EN_LIVRAISON (code 1).
        // Exclut cette livraison de l'onglet "En attente" même si elle retombe DEPOT.
        public bool HasEverBeenPickedUp { get; set; } = false;
    }
}