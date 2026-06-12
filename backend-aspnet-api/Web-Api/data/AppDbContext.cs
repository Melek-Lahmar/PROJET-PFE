using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MODELS_CREATEUR.MODELS_SAGE;
using Web_Api.Auth.Entities;
using Web_Api.DTO;
using Web_Api.Model;

namespace Web_Api.data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<ProfilUtilisateur> ProfilsUtilisateurs { get; set; } = null!;

        public DbSet<F_DOCENTETE> F_DOCENTETES { get; set; } = null!;
        public DbSet<F_DOCLIGNE> F_DOCLIGNES { get; set; } = null!;
        public DbSet<F_DEVIS_ENTETE> F_DEVIS_ENTETES { get; set; } = null!;
        public DbSet<F_DEVIS_LIGNE> F_DEVIS_LIGNES { get; set; } = null!;
        public DbSet<F_DEVIS_EVENT> F_DEVIS_EVENTS { get; set; } = null!;

        public DbSet<F_LIVRAISON> F_LIVRAISONS { get; set; } = null!;
        public DbSet<B_PAIEMENT> B_PAIEMENTS { get; set; } = null!;
        public DbSet<F_TAXE> F_TAXES { get; set; } = null!;

        public DbSet<F_ARTICLE> F_ARTICLES { get; set; } = null!;
        public DbSet<F_ARTSTOCK> F_ARTSTOCKS { get; set; } = null!;
        public DbSet<F_CATALOGUE> F_CATALOGUES { get; set; } = null!;
        public DbSet<F_DEPOT> F_DEPOTS { get; set; } = null!;
        public DbSet<F_ARTICLE_IMAGE> F_ARTICLE_IMAGES { get; set; } = null!;
        public DbSet<CMS_HOMEPAGE> HOMEPAGES { get; set; } = null!;

        public DbSet<F_RECLAMATION> F_RECLAMATIONS { get; set; } = null!;
        public DbSet<F_RECLAMATION_TENTATIVE> F_RECLAMATION_TENTATIVES { get; set; } = null!;
        public DbSet<F_RECLAMATION_PHOTO> F_RECLAMATION_PHOTOS { get; set; } = null!;
        public DbSet<F_AVIS_COMMANDE> F_AVIS_COMMANDES { get; set; } = null!;
        public DbSet<F_AVIS_PROMPT_STATE> F_AVIS_PROMPT_STATES { get; set; } = null!;
        public DbSet<F_LIVREUR_ABANDON_LOG> F_LIVREUR_ABANDON_LOGS { get; set; } = null!;
        public DbSet<F_LIVREUR_ACTION_LOG> F_LIVREUR_ACTION_LOGS { get; set; } = null!;
        public DbSet<F_LIVRAISON_HISTORIQUE> F_LIVRAISON_HISTORIQUES { get; set; } = null!;
        public DbSet<F_LIVREUR_POSITION_HISTORY> F_LIVREUR_POSITION_HISTORIES { get; set; } = null!;
        public DbSet<F_CLIENT_DEVICE_TOKEN> F_CLIENT_DEVICE_TOKENS { get; set; } = null!;
        public DbSet<F_CLIENT_FAVORI> F_CLIENT_FAVORIS { get; set; } = null!;

        // Refonte PFE v3 — zones, superviseur, transit, photos incidents
        public DbSet<F_DEPOT_ZONE> F_DEPOT_ZONES { get; set; } = null!;
        public DbSet<F_LIVREUR_ZONE> F_LIVREUR_ZONES { get; set; } = null!;
        public DbSet<F_TRANSFERT> F_TRANSFERTS { get; set; } = null!;
        public DbSet<F_TRANSFERT_AUDIT_LOG> F_TRANSFERT_AUDIT_LOGS { get; set; } = null!;
        public DbSet<F_SUPERVISOR_ALERT> F_SUPERVISOR_ALERTS { get; set; } = null!;
        public DbSet<F_DELIVERY_INCIDENT_PHOTO> F_DELIVERY_INCIDENT_PHOTOS { get; set; } = null!;

        // Section 3 — Client refonte
        public DbSet<F_CLIENT_ADDRESS> F_CLIENT_ADDRESSES { get; set; } = null!;
        public DbSet<F_LIVREUR_POSITION> F_LIVREUR_POSITIONS { get; set; } = null!;
        public DbSet<F_SMS_LOG> F_SMS_LOGS { get; set; } = null!;

        // Section 4 — Admin refonte
        public DbSet<F_APP_CONFIG> F_APP_CONFIGS { get; set; } = null!;

        // Module 4 (Master Prompt) — Historique remise B2B
        public DbSet<F_B2B_DISCOUNT_HISTORY> F_B2B_DISCOUNT_HISTORIES { get; set; } = null!;

        // Module 10 (Master Prompt) — App settings clé/valeur
        public DbSet<AppSetting> AppSettings { get; set; } = null!;

        // Module 7 (Master Prompt) — Templates de homepage (max 5, 1 actif)
        public DbSet<HomepageTemplate> HomepageTemplates { get; set; } = null!;

        // Section 5 — Chatbot intelligent
        public DbSet<F_CHATBOT_SESSION> F_CHATBOT_SESSIONS { get; set; } = null!;
        public DbSet<F_CHATBOT_MESSAGE> F_CHATBOT_MESSAGES { get; set; } = null!;
        public DbSet<F_CHATBOT_INSIGHT> F_CHATBOT_INSIGHTS { get; set; } = null!;
        public DbSet<F_CHATBOT_PENDING_ACTION> F_CHATBOT_PENDING_ACTIONS { get; set; } = null!;
        public DbSet<F_CHATBOT_ACTION_LOG> F_CHATBOT_ACTION_LOGS { get; set; } = null!;

        // Phase 4 — verrou visuel 15 min sur les commandes à confirmer (pool FIFO).
        public DbSet<CommandeConfirmationLock> CommandeConfirmationLocks { get; set; } = null!;

        // Journal des tentatives de confirmation (qui/quand) — partagé entre confirmatrices.
        public DbSet<CommandeTentativeLog> CommandeTentativeLogs { get; set; } = null!;

        // A.2 — Sessions des confirmatrices (workload + temps de pause)
        public DbSet<F_CONFIRMATRICE_SESSION> F_CONFIRMATRICE_SESSIONS { get; set; } = null!;

        public DbSet<DOCUMENT> DOCUMENTS { get; set; } = null!;
        public DbSet<LIGNE_DOCUMENT> LIGNE_DOCUMENTS { get; set; } = null!;
        public DbSet<PARAM_CONNEXION_X3> PARAM_CONNEXION_X3 { get; set; } = null!;

        // Module Impression — paramètres d'impression + manifestes vendeur
        public DbSet<PrintSettings> PrintSettings { get; set; } = null!;
        public DbSet<ManifestePrintBloc> ManifestePrintBlocs { get; set; } = null!;
        public DbSet<ManifestePrintBlocLine> ManifestePrintBlocLines { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<F_DOCENTETE>().HasKey(x => x.cbMarq);
            modelBuilder.Entity<F_DOCLIGNE>().HasKey(x => x.cbMarq);
            modelBuilder.Entity<F_DEVIS_ENTETE>().HasKey(x => x.Id);
            modelBuilder.Entity<F_DEVIS_LIGNE>().HasKey(x => x.Id);
            modelBuilder.Entity<F_DEVIS_EVENT>().HasKey(x => x.Id);
            modelBuilder.Entity<F_LIVRAISON>().HasKey(x => x.cbMarq);
            modelBuilder.Entity<B_PAIEMENT>().HasKey(x => x.cbMarq);
            modelBuilder.Entity<F_TAXE>().HasKey(x => x.cbMarq);

            modelBuilder.Entity<F_ARTICLE>().HasKey(x => x.cbMarq);
            modelBuilder.Entity<F_ARTSTOCK>().HasKey(x => x.cbMarq);
            modelBuilder.Entity<F_CATALOGUE>().HasKey(x => x.cbMarq);
            modelBuilder.Entity<F_DEPOT>().HasKey(x => x.cbMarq);

            modelBuilder.Entity<F_ARTICLE_IMAGE>().HasKey(x => x.Id);
            modelBuilder.Entity<CMS_HOMEPAGE>().HasKey(x => x.Id);
            modelBuilder.Entity<CMS_HOMEPAGE>().HasIndex(x => x.Scope).IsUnique();

            modelBuilder.Entity<ProfilUtilisateur>(entity =>
            {
                entity.HasKey(x => x.cbMarq);
                entity.HasIndex(x => x.DepotRattacheNo).HasDatabaseName("IX_ProfilUtilisateur_DepotRattacheNo");
                entity.Property(x => x.IsTransit).HasDefaultValue(false);
            });

            // B_PAIEMENT — config grafted from Web-Api(react) (Konnect support)
            modelBuilder.Entity<B_PAIEMENT>()
                .Property(x => x.PA_Montant)
                .HasColumnType("decimal(24,13)");

            modelBuilder.Entity<B_PAIEMENT>()
                .Property(x => x.PA_IsSandbox)
                .HasDefaultValue(false);

            modelBuilder.Entity<B_PAIEMENT>()
                .HasIndex(x => new { x.DO_Piece, x.cbMarq });

            modelBuilder.Entity<B_PAIEMENT>()
                .HasIndex(x => x.PA_Reference)
                .IsUnique()
                .HasFilter("[PA_Reference] IS NOT NULL");

            modelBuilder.Entity<B_PAIEMENT>()
                .HasIndex(x => x.PA_ProviderPaymentId)
                .HasFilter("[PA_ProviderPaymentId] IS NOT NULL");

            modelBuilder.Entity<B_PAIEMENT>()
                .HasIndex(x => x.PA_Statut);

            modelBuilder.Entity<F_TAXE>().Property(x => x.TX_TAUX).HasColumnType("decimal(24,13)");
            modelBuilder.Entity<F_ARTICLE>().Property(x => x.AR_Description).HasMaxLength(2000);
            modelBuilder.Entity<F_ARTICLE>().Property(x => x.AR_PrixVen).HasColumnType("decimal(24,13)");
            modelBuilder.Entity<F_ARTSTOCK>().Property(x => x.AS_QteMaxi).HasColumnType("decimal(24,13)");
            modelBuilder.Entity<F_ARTSTOCK>().Property(x => x.AS_QteMini).HasColumnType("decimal(24,13)");
            modelBuilder.Entity<F_ARTSTOCK>().Property(x => x.AS_QteRes).HasColumnType("decimal(24,13)");
            modelBuilder.Entity<F_ARTSTOCK>().Property(x => x.AS_QteSto).HasColumnType("decimal(24,13)");

            modelBuilder.Entity<DOCUMENT>(entity =>
            {
                entity.ToTable("DOCUMENT");
                entity.HasKey(x => x.DO_NumDocument);
                entity.Property(x => x.DO_TotalTTC).HasColumnType("decimal(24,13)");
                entity.HasMany(x => x.LIGNEDOCUMENTs)
                    .WithOne()
                    .HasForeignKey("DO_NumDocument")
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<LIGNE_DOCUMENT>(entity =>
            {
                entity.ToTable("LIGNE_DOCUMENT");
                entity.Property<int>("Id").ValueGeneratedOnAdd();
                entity.HasKey("Id");
                entity.Property(x => x.LP_QteMvt).HasColumnType("decimal(24,13)");
                entity.Property(x => x.LP_PrixUnitaire).HasColumnType("decimal(24,13)");
                entity.Property(x => x.LP_ValeurRemise).HasColumnType("decimal(24,13)");
                entity.Property(x => x.LP_PUTTC).HasColumnType("decimal(24,13)");
                entity.Property(x => x.LP_MontantTTC).HasColumnType("decimal(24,13)");
            });

            modelBuilder.Entity<PARAM_CONNEXION_X3>(entity =>
            {
                entity.ToTable("PARAM_CONNEXION_X3");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Id).ValueGeneratedNever();
                entity.Property(x => x.Http).HasDefaultValue((short)0);
                entity.Property(x => x.AdresseIP_X3).IsRequired().HasMaxLength(100).HasDefaultValue("localhost:8124");
                entity.Property(x => x.Login).IsRequired().HasMaxLength(100).HasDefaultValue("admin");
                entity.Property(x => x.Password).IsRequired().HasMaxLength(100).HasDefaultValue("@Zerty1234");
                entity.Property(x => x.Dossier).IsRequired().HasMaxLength(50).HasDefaultValue("SEED");
                entity.Property(x => x.Service_Web_BC).IsRequired().HasMaxLength(50).HasDefaultValue("SOH");
                entity.Property(x => x.Type_BC).IsRequired().HasMaxLength(50).HasDefaultValue("WEB");
                entity.HasData(new PARAM_CONNEXION_X3
                {
                    Id = 1,
                    Http = 0,
                    AdresseIP_X3 = "localhost:8124",
                    Login = "admin",
                    Password = "@Zerty1234",
                    Dossier = "SEED",
                    Service_Web_BC = "SOH",
                    Type_BC = "WEB"
                });
            });

            modelBuilder.Entity<F_RECLAMATION>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.CodeReclamation).IsUnique();
                entity.HasIndex(x => x.DoPiece);
                entity.HasIndex(x => x.ClientUserId);
                entity.HasIndex(x => x.AssignedToUserId);
                entity.HasIndex(x => x.Statut);
                entity.HasIndex(x => x.Source);
                entity.HasIndex(x => x.CreatedAt);
                entity.HasIndex(x => x.UpdatedAt);

                entity.Property(x => x.CodeReclamation).IsRequired().HasMaxLength(30);
                entity.Property(x => x.DoPiece).IsRequired().HasMaxLength(13);
                entity.Property(x => x.ArRef).HasMaxLength(19);
                entity.Property(x => x.TypeReclamation).HasMaxLength(30);
                entity.Property(x => x.Motif).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Description).IsRequired().HasMaxLength(1000);
                entity.Property(x => x.Statut).IsRequired().HasMaxLength(30);
                entity.Property(x => x.Priorite).HasMaxLength(20);
                entity.Property(x => x.Source).IsRequired().HasMaxLength(20);
                entity.Property(x => x.CorrectionProposee).HasMaxLength(2000);
                entity.Property(x => x.MotifRefus).HasMaxLength(500);
                entity.Property(x => x.NoteInterne).HasMaxLength(1000);
                entity.Property(x => x.TypeCas).IsRequired().HasMaxLength(20);
                entity.Property(x => x.EchangeDemandeText).HasMaxLength(500);
                entity.Property(x => x.VisibleClient).IsRequired().HasDefaultValue(false);
                entity.HasIndex(x => x.TypeCas);
                entity.HasIndex(x => x.VisibleClient);
            });

            modelBuilder.Entity<F_DOCENTETE>(entity =>
            {
                entity.Property(x => x.TypeCommande).HasMaxLength(20);
                entity.Property(x => x.CommandeOriginalePiece).HasMaxLength(13);
                entity.Property(x => x.EchangeArticleRetour).HasMaxLength(500);
                entity.Property(x => x.EchangeArticleLivraison).HasMaxLength(500);
                entity.Property(x => x.DO_TelephoneLivraison).HasMaxLength(20);
                entity.Property(x => x.TotalBeforeDiscount).HasColumnType("decimal(24,13)");
                entity.Property(x => x.B2BDiscountRate).HasColumnType("decimal(5,2)");
                entity.Property(x => x.B2BDiscountAmount).HasColumnType("decimal(24,13)");
                entity.Property(x => x.DiscountSource).HasMaxLength(30);
                entity.Property(x => x.QuoteStatus).HasMaxLength(20);
                entity.Property(x => x.QuoteConvertedToPiece).HasMaxLength(13);
                entity.Property(x => x.QuoteClientNote).HasMaxLength(500);
                entity.Property(x => x.QuoteInternalNote).HasMaxLength(500);
                entity.Property(x => x.DeliveryMode).IsRequired().HasMaxLength(20).HasDefaultValue("HOME_DELIVERY");
                entity.Property(x => x.GeoValidationStatus).HasMaxLength(20);
                entity.Property(x => x.HasDeliveryIncident).HasDefaultValue(false);
                entity.HasIndex(x => x.PickupDepotNo);
                entity.HasIndex(x => x.AssignedLivreurId);
                entity.HasIndex(x => new { x.DO_Type, x.QuoteStatus });
                entity.HasIndex(x => x.QuoteCreatedByUserId);
                entity.HasIndex(x => x.QuoteAssignedToUserId);
                entity.HasIndex(x => x.QuoteConvertedToPiece);
            });

            modelBuilder.Entity<F_DOCLIGNE>(entity =>
            {
                entity.Property(x => x.LigneType).HasMaxLength(20);
                entity.HasIndex(x => x.LigneType);
            });

            modelBuilder.Entity<F_DEVIS_ENTETE>(entity =>
            {
                entity.HasIndex(x => x.DevisPiece).IsUnique();
                entity.HasIndex(x => x.ClientUserId);
                entity.HasIndex(x => x.StatusKey);
                entity.HasIndex(x => x.AssignedConfirmateurId);
                entity.HasIndex(x => x.BcPiece).HasFilter("[BcPiece] IS NOT NULL");
                entity.Property(x => x.DevisPiece).IsRequired().HasMaxLength(20);
                entity.Property(x => x.ClientCode).HasMaxLength(17);
                entity.Property(x => x.ClientType).IsRequired().HasMaxLength(10);
                entity.Property(x => x.StatusKey).IsRequired().HasMaxLength(30);
                entity.Property(x => x.TotalHT).HasColumnType("decimal(24,13)");
                entity.Property(x => x.DiscountPercentSnapshot).HasColumnType("decimal(5,2)");
                entity.Property(x => x.DiscountAmount).HasColumnType("decimal(24,13)");
                entity.Property(x => x.TotalHTNet).HasColumnType("decimal(24,13)");
                entity.Property(x => x.TotalTTC).HasColumnType("decimal(24,13)");
                entity.Property(x => x.NetAPayer).HasColumnType("decimal(24,13)");
                entity.Property(x => x.BcPiece).HasMaxLength(13);
            });

            modelBuilder.Entity<F_DEVIS_LIGNE>(entity =>
            {
                entity.HasIndex(x => new { x.DevisId, x.SortOrder });
                entity.Property(x => x.ArticleRef).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Designation).HasMaxLength(200);
                entity.Property(x => x.Qty).HasColumnType("decimal(24,13)");
                entity.Property(x => x.UnitPriceHT).HasColumnType("decimal(24,13)");
                entity.Property(x => x.DiscountLinePercent).HasColumnType("decimal(5,2)");
                entity.Property(x => x.AmountHT).HasColumnType("decimal(24,13)");
                entity.Property(x => x.AmountTTC).HasColumnType("decimal(24,13)");
                entity.HasOne(x => x.Devis)
                    .WithMany(x => x.Lignes)
                    .HasForeignKey(x => x.DevisId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<F_DEVIS_EVENT>(entity =>
            {
                entity.HasIndex(x => new { x.DevisId, x.CreatedAt });
                entity.Property(x => x.AuthorRole).HasMaxLength(30);
                entity.Property(x => x.EventType).IsRequired().HasMaxLength(30);
                entity.Property(x => x.OldStatus).HasMaxLength(30);
                entity.Property(x => x.NewStatus).HasMaxLength(30);
                entity.Property(x => x.Message).HasMaxLength(2000);
                entity.HasOne(x => x.Devis)
                    .WithMany(x => x.Events)
                    .HasForeignKey(x => x.DevisId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<F_LIVREUR_ABANDON_LOG>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.CommandePiece).IsRequired().HasMaxLength(13);
                entity.Property(x => x.Note).HasMaxLength(500);
                entity.HasIndex(x => new { x.LivreurUserId, x.CreatedAt });
            });

            modelBuilder.Entity<F_LIVREUR_ACTION_LOG>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.ClientActionId).IsUnique();
                entity.HasIndex(x => new { x.LivreurUserId, x.ProcessedAt });
                entity.Property(x => x.Endpoint).IsRequired().HasMaxLength(255);
                entity.Property(x => x.PayloadHash).IsRequired().HasMaxLength(64);
            });

            // Section 3.6 — Carnet d'adresses client (max 3 par client, validé côté API)
            modelBuilder.Entity<F_CLIENT_ADDRESS>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.ClientUserId);
                entity.Property(x => x.Label).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Adresse).IsRequired().HasMaxLength(500);
                entity.Property(x => x.Gouvernorat).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Ville).IsRequired().HasMaxLength(100);
            });

            // Section 3.4.3 — dernière position connue d'un livreur (1 ligne par livreur)
            modelBuilder.Entity<F_LIVREUR_POSITION>(entity =>
            {
                entity.HasKey(x => x.LivreurUserId);
            });

            // Section 3.3.4 — journal SMS pré-livraison
            modelBuilder.Entity<F_SMS_LOG>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.DoPiece, x.SentAt });
                entity.Property(x => x.DoPiece).IsRequired().HasMaxLength(13);
                entity.Property(x => x.Phone).IsRequired().HasMaxLength(20);
                entity.Property(x => x.Message).IsRequired().HasMaxLength(500);
                entity.Property(x => x.Provider).IsRequired().HasMaxLength(20);
            });

            // Section 4.6 — singleton config app (PK=1, contrainte CHECK)
            modelBuilder.Entity<F_APP_CONFIG>(entity =>
            {
                entity.HasKey(x => x.Id);
                // 1.B — Id est un singleton (1) : EF ne doit pas le générer.
                // Sans ça, SQL Server crée la colonne en IDENTITY et le PUT
                // d'un thème inexistant lève "IDENTITY_INSERT is OFF".
                entity.Property(x => x.Id).ValueGeneratedNever();
                entity.Property(x => x.PrimaryColor).IsRequired().HasMaxLength(7);
                entity.Property(x => x.ThemeMode).IsRequired().HasMaxLength(10);
                entity.ToTable(t => t.HasCheckConstraint("CK_AppConfig_OneRow", "[Id] = 1"));
            });

            // A.2 — Sessions confirmatrices (work / pause stats)
            modelBuilder.Entity<F_CONFIRMATRICE_SESSION>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.ConfirmatriceId, x.StartedAt })
                    .HasDatabaseName("IX_ConfirmatriceSession_User_Start");
                entity.HasIndex(x => x.EndedAt)
                    .HasDatabaseName("IX_ConfirmatriceSession_EndedAt");
            });

            // Section 5.2 — chatbot sessions/messages
            modelBuilder.Entity<F_CHATBOT_SESSION>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.UserId, x.LastActivityAt });
                entity.Property(x => x.Language).IsRequired().HasMaxLength(10);
            });

            modelBuilder.Entity<F_CHATBOT_MESSAGE>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.SessionId, x.CreatedAt });
                entity.Property(x => x.Role).IsRequired().HasMaxLength(20);
                entity.Property(x => x.Action).HasMaxLength(20);
                entity.Property(x => x.Feedback).HasMaxLength(10);
            });

            modelBuilder.Entity<F_CHATBOT_INSIGHT>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.CreatedAt);
                entity.HasIndex(x => x.DismissedAt);
                entity.Property(x => x.Type).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Severity).IsRequired().HasMaxLength(10);
                entity.Property(x => x.Title).IsRequired().HasMaxLength(200);
                entity.Property(x => x.Message).IsRequired().HasMaxLength(500);
                entity.Property(x => x.AdminFeedback).HasMaxLength(15);
            });

            modelBuilder.Entity<F_CHATBOT_PENDING_ACTION>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.UserId, x.ExpiresAt });
                entity.Property(x => x.ActionType).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<F_CHATBOT_ACTION_LOG>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.UserId, x.ExecutedAt });
                entity.Property(x => x.ActionType).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Result).IsRequired().HasMaxLength(20);
                entity.Property(x => x.ErrorMessage).HasMaxLength(500);
                entity.Property(x => x.OriginalQuestion).IsRequired().HasMaxLength(500);
            });

            // Section 1.5 — Cashbox COD : index pour agréger rapidement le cash
            // du jour par livreur (vue Stats + endpoint /cashbox/remettre).
            modelBuilder.Entity<F_LIVRAISON>()
                .HasIndex(x => new { x.LivreurId, x.EncaisseAt, x.RemisAuDepot });

            // Section 1.3 — Dépôts numérotés : index pour le job
            // DepotIncrementJob et la projection liste livreur.
            modelBuilder.Entity<F_LIVRAISON>()
                .HasIndex(x => new { x.LI_Statut, x.DepotPassageNumber })
                .HasDatabaseName("IX_F_LIVRAISON_DepotPassage")
                .IncludeProperties(x => new { x.DO_Piece, x.LivreurId });

            // Historique des passages livraison (Section 1.3 + 2.5).
            modelBuilder.Entity<F_LIVRAISON_HISTORIQUE>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.DoPiece, x.CreatedAt });
                entity.HasIndex(x => new { x.LivreurUserId, x.CreatedAt });
                entity.Property(x => x.DoPiece).IsRequired().HasMaxLength(13);
                entity.Property(x => x.Type).IsRequired().HasMaxLength(30);
                entity.Property(x => x.Motif).HasMaxLength(50);
                entity.Property(x => x.Note).HasMaxLength(500);
                entity.Property(x => x.PhotoUrl).HasMaxLength(500);
            });

            // Module Impression — PrintSettings singleton (Id=1)
            modelBuilder.Entity<PrintSettings>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Id).ValueGeneratedNever();
                entity.Property(x => x.FieldsConfig).IsRequired().HasDefaultValue("{}");
                entity.ToTable(t => t.HasCheckConstraint("CK_PrintSettings_OneRow", "[Id] = 1"));
            });

            modelBuilder.Entity<ManifestePrintBloc>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.DepotNo, x.PrintedAt });
                entity.HasMany(x => x.Lines)
                    .WithOne(x => x.Bloc)
                    .HasForeignKey(x => x.BlocId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ManifestePrintBlocLine>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.BlocId);
                entity.HasIndex(x => x.BLPiece);
                entity.Property(x => x.BLPiece).IsRequired().HasMaxLength(13);
            });

            // Section 1.4 — historique GPS livreur (1 ligne par ping, asynchrone).
            modelBuilder.Entity<F_LIVREUR_POSITION_HISTORY>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.LivreurId, x.CapturedAt }).HasDatabaseName("IX_LivreurPosHistory");
                entity.HasIndex(x => x.ClientActionId).IsUnique().HasFilter("[ClientActionId] IS NOT NULL");
            });

            // Section 1.4 — index Active Delivery sur F_DOCENTETE.
            modelBuilder.Entity<F_DOCENTETE>()
                .HasIndex(x => new { x.IsActiveDelivery, x.AssignedLivreurId })
                .HasDatabaseName("IX_F_DOCENTETE_ActiveDelivery");

            // Section 3.11 — tokens device pour push FCM.
            modelBuilder.Entity<F_CLIENT_DEVICE_TOKEN>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.Token).IsUnique();
                entity.HasIndex(x => x.UserId);
                entity.Property(x => x.Token).IsRequired().HasMaxLength(500);
                entity.Property(x => x.Platform).IsRequired().HasMaxLength(20);
            });

            modelBuilder.Entity<F_CLIENT_FAVORI>(entity =>
            {
                entity.ToTable("F_CLIENT_FAVORIS");
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.ClientUserId);
                entity.HasIndex(x => x.AR_Ref);
                entity.HasIndex(x => new { x.ClientUserId, x.AR_Ref }).IsUnique();
                entity.Property(x => x.AR_Ref).IsRequired().HasMaxLength(50);
                entity.Property(x => x.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<F_RECLAMATION_TENTATIVE>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.CommandePiece);
                entity.HasIndex(x => x.ReclamationId);
                entity.HasIndex(x => new { x.CommandePiece, x.DateJour }).IsUnique();

                entity.Property(x => x.CommandePiece).IsRequired().HasMaxLength(13);
                entity.Property(x => x.Motif).IsRequired().HasMaxLength(50);
                entity.Property(x => x.PhotoUrl).HasMaxLength(500);
                entity.Property(x => x.DateJour).HasColumnType("date");
                entity.Property(x => x.Latitude).HasColumnType("decimal(9,6)");
                entity.Property(x => x.Longitude).HasColumnType("decimal(9,6)");
            });

            modelBuilder.Entity<F_RECLAMATION_PHOTO>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.ReclamationId);
                entity.Property(x => x.Url).IsRequired().HasMaxLength(500);
                entity.Property(x => x.FileName).HasMaxLength(255);
                entity.Property(x => x.ContentType).HasMaxLength(100);
            });

            modelBuilder.Entity<F_RECLAMATION>()
                .HasMany(x => x.Photos)
                .WithOne()
                .HasForeignKey(x => x.ReclamationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<F_RECLAMATION>()
                .HasMany(x => x.Tentatives)
                .WithOne()
                .HasForeignKey(x => x.ReclamationId)
                .OnDelete(DeleteBehavior.NoAction);


            modelBuilder.Entity<F_DEPOT_ZONE>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.DepotNo, x.Gouvernorat, x.Delegation }).IsUnique();
                entity.HasIndex(x => new { x.Gouvernorat, x.Delegation }).HasDatabaseName("IX_DepotZone_Delegation");
                entity.HasIndex(x => new { x.Gouvernorat, x.Delegation, x.IsPrimary })
                    .HasDatabaseName("IX_DepotZone_Primary_Lookup");
                entity.Property(x => x.Gouvernorat).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Delegation).IsRequired().HasMaxLength(100);
            });

            modelBuilder.Entity<F_LIVREUR_ZONE>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => new { x.LivreurUserId, x.Gouvernorat, x.Delegation }).IsUnique();
                entity.HasIndex(x => new { x.Gouvernorat, x.Delegation }).HasDatabaseName("IX_LivreurZone_Delegation");
                entity.Property(x => x.Gouvernorat).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Delegation).IsRequired().HasMaxLength(100);
            });

            modelBuilder.Entity<F_TRANSFERT>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.DoPiece).IsRequired().HasMaxLength(20);
                entity.Property(x => x.ArRef).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Status).IsRequired().HasMaxLength(30).HasDefaultValue(TransitStatuses.EnAttenteTransit);
                entity.Property(x => x.Quantite).HasColumnType("decimal(18,4)");
                entity.HasIndex(x => x.Status);
                entity.HasIndex(x => x.TransitLivreurUserId);
                entity.HasIndex(x => new { x.SourceDepotNo, x.Status });
                entity.HasIndex(x => new { x.DoPiece, x.ArRef, x.Status });
            });

            modelBuilder.Entity<F_TRANSFERT_AUDIT_LOG>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.ActionType).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Motif).HasMaxLength(500);
                entity.HasIndex(x => new { x.TransfertId, x.OccurredAt });
            });

            modelBuilder.Entity<F_SUPERVISOR_ALERT>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Severity).IsRequired().HasMaxLength(10);
                entity.Property(x => x.AlertType).IsRequired().HasMaxLength(50);
                entity.Property(x => x.Message).IsRequired().HasMaxLength(500);
                entity.HasIndex(x => new { x.AcknowledgedAt, x.Severity });
            });

            modelBuilder.Entity<F_DELIVERY_INCIDENT_PHOTO>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.DoPiece).IsRequired().HasMaxLength(20);
                entity.Property(x => x.CloudinaryUrl).IsRequired().HasMaxLength(500);
                entity.Property(x => x.CloudinaryPublicId).IsRequired().HasMaxLength(200);
                entity.HasIndex(x => x.DoPiece);
                entity.ToTable(t => t.HasCheckConstraint("CK_IncidentPhoto_Order", "[PhotoOrder] BETWEEN 1 AND 5"));
            });

            modelBuilder.Entity<F_AVIS_COMMANDE>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.CommandePiece).IsUnique();
                entity.HasIndex(x => x.ClientUserId);
                entity.Property(x => x.CommandePiece).IsRequired().HasMaxLength(13);
                entity.Property(x => x.Commentaire).HasMaxLength(500);
            });

            modelBuilder.Entity<F_AVIS_PROMPT_STATE>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.CommandePiece).IsUnique();
                entity.HasIndex(x => x.ClientUserId);
                entity.Property(x => x.CommandePiece).IsRequired().HasMaxLength(13);
            });
        }
    }
}
