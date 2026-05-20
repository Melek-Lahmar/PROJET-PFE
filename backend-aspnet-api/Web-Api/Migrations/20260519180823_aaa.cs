using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class aaa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ValueJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsPublic = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByAdminId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "B_PAIEMENT",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DO_Piece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    PA_Mode = table.Column<short>(type: "smallint", nullable: false),
                    PA_Type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PA_Statut = table.Column<short>(type: "smallint", nullable: false),
                    PA_Montant = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    PA_Date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PA_Reference = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PA_Fournisseur = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PA_ProviderPaymentId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PA_StatutExterne = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    PA_IsSandbox = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    cbCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    cbModification = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_B_PAIEMENT", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "CMS_HOMEPAGE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Scope = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DraftJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PublishedJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PublishedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CMS_HOMEPAGE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CommandeConfirmationLocks",
                columns: table => new
                {
                    DoPiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    LockedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LockedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommandeConfirmationLocks", x => x.DoPiece);
                });

            migrationBuilder.CreateTable(
                name: "F_APP_CONFIG",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    PrimaryColor = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    ThemeMode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_APP_CONFIG", x => x.Id);
                    table.CheckConstraint("CK_AppConfig_OneRow", "[Id] = 1");
                });

            migrationBuilder.CreateTable(
                name: "F_ARTICLE",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AR_Ref = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AR_Design = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FA_CodeFamille = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AR_UniteVen = table.Column<short>(type: "smallint", nullable: false),
                    AR_PrixVen = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    AR_PrixTTC = table.Column<short>(type: "smallint", nullable: false),
                    AR_SuiviStock = table.Column<short>(type: "smallint", nullable: false),
                    AR_Sommeil = table.Column<short>(type: "smallint", nullable: false),
                    AR_CodeBarre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AR_Publie = table.Column<short>(type: "smallint", nullable: false),
                    CL_No1 = table.Column<int>(type: "int", nullable: false),
                    CL_No2 = table.Column<int>(type: "int", nullable: false),
                    CL_No3 = table.Column<int>(type: "int", nullable: false),
                    CL_No4 = table.Column<int>(type: "int", nullable: false),
                    AR_Type = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_ARTICLE", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_ARTICLE_IMAGE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AR_Ref = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CloudinaryPublicId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsMain = table.Column<bool>(type: "bit", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_ARTICLE_IMAGE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_ARTSTOCK",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AR_Ref = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DE_No = table.Column<int>(type: "int", nullable: false),
                    AS_QteSto = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    AS_QteRes = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    AS_QteMini = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    AS_QteMaxi = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    AS_Principal = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_ARTSTOCK", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_AVIS_COMMANDE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommandePiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Note = table.Column<int>(type: "int", nullable: false),
                    Commentaire = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_AVIS_COMMANDE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_AVIS_PROMPT_STATE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommandePiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PromptCount = table.Column<int>(type: "int", nullable: false),
                    LastPromptAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Dismissed = table.Column<bool>(type: "bit", nullable: false),
                    Submitted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_AVIS_PROMPT_STATE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_B2B_DISCOUNT_HISTORY",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OldValue = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    NewValue = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    ChangedByAdminId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_B2B_DISCOUNT_HISTORY", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CATALOGUE",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CL_Intitule = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CL_Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CL_Stock = table.Column<short>(type: "smallint", nullable: false),
                    CL_NoParent = table.Column<int>(type: "int", nullable: false),
                    CL_Niveau = table.Column<short>(type: "smallint", nullable: false),
                    CL_No = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CATALOGUE", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_CHATBOT_ACTION_LOG",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParamsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Result = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OriginalQuestion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ExecutedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CHATBOT_ACTION_LOG", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CHATBOT_INSIGHT",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ShownToAdminAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DismissedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AdminFeedback = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CHATBOT_INSIGHT", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CHATBOT_MESSAGE",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Feedback = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CHATBOT_MESSAGE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CHATBOT_PENDING_ACTION",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParamsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CHATBOT_PENDING_ACTION", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CHATBOT_SESSION",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastActivityAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Language = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CHATBOT_SESSION", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CLIENT_ADDRESS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Adresse = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Gouvernorat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Delegation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Ville = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CodePostal = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    Landmark = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    GeoValidationStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Latitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CLIENT_ADDRESS", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CLIENT_DEVICE_TOKEN",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Platform = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CLIENT_DEVICE_TOKEN", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_CONFIRMATRICE_SESSION",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConfirmatriceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndReason = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CONFIRMATRICE_SESSION", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_DELIVERY_INCIDENT_PHOTO",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DoPiece = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    LivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CloudinaryUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CloudinaryPublicId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhotoOrder = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DELIVERY_INCIDENT_PHOTO", x => x.Id);
                    table.CheckConstraint("CK_IncidentPhoto_Order", "[PhotoOrder] BETWEEN 1 AND 5");
                });

            migrationBuilder.CreateTable(
                name: "F_DEPOT",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DE_No = table.Column<int>(type: "int", nullable: false),
                    DE_Code = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    DE_Intitule = table.Column<string>(type: "nvarchar(35)", maxLength: 35, nullable: true),
                    DE_Adresse = table.Column<string>(type: "nvarchar(35)", maxLength: 35, nullable: true),
                    DE_Complement = table.Column<string>(type: "nvarchar(35)", maxLength: 35, nullable: true),
                    DE_CodePostal = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    DE_Ville = table.Column<string>(type: "nvarchar(35)", maxLength: 35, nullable: true),
                    DE_Pays = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: true),
                    DE_Principal = table.Column<short>(type: "smallint", nullable: true),
                    DE_CodeSociete = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DE_Banque = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DEPOT", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_DEPOT_ZONE",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepotNo = table.Column<int>(type: "int", nullable: false),
                    Gouvernorat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Delegation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DEPOT_ZONE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_DOCENTETE",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DO_Domaine = table.Column<short>(type: "smallint", nullable: true),
                    DO_Type = table.Column<short>(type: "smallint", nullable: true),
                    DO_Date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DO_Ref = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DO_Tiers = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: true),
                    DE_No = table.Column<int>(type: "int", nullable: true),
                    CT_NumPayeur = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: true),
                    DO_TotalHT = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DO_TotalHTNet = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DO_TotalTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DO_NetAPayer = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DO_Valide = table.Column<short>(type: "smallint", nullable: true),
                    DO_Piece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: true),
                    DO_ModeLivraison = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DO_ModePaiement = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DO_FraisLivraison = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DO_TimbreFiscal = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DO_AdresseLivraison = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DO_VilleLivraison = table.Column<string>(type: "nvarchar(35)", maxLength: 35, nullable: true),
                    DO_CodePostalLivraison = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    DO_LatitudeLivraison = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DO_LongitudeLivraison = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DO_TelephoneLivraison = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DO_RepereLivraison = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DO_InstructionsLivraison = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DO_VendeurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DO_ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DO_ClientMode = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: true),
                    DO_PassagerTypeClient = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DO_PassagerNomComplet = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DO_PassagerTelephone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    DO_PassagerCIN = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DO_PassagerNomSociete = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DO_PassagerMatriculeFiscal = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DO_PassagerRegistreCommerce = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DO_PassagerNumeroTVA = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DO_PassagerGouvernorat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DO_PassagerDelegation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DO_PassagerAdresse = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    DO_PassagerAdresseComplementaire = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    DO_PassagerCodePostal = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    cbCreation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    cbModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeliveryMode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "HOME_DELIVERY"),
                    PickupDepotNo = table.Column<int>(type: "int", nullable: true),
                    GeoValidationStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    HasDeliveryIncident = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    GeoLat = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    GeoLng = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    AssignedLivreurId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TypeCommande = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CommandeOriginalePiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: true),
                    EchangeArticleRetour = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EchangeArticleLivraison = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReclamationOrigineId = table.Column<int>(type: "int", nullable: true),
                    ProximityAlertSent = table.Column<bool>(type: "bit", nullable: false),
                    IsActiveDelivery = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DOCENTETE", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_DOCLIGNE",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DO_Domaine = table.Column<short>(type: "smallint", nullable: true),
                    DO_Type = table.Column<short>(type: "smallint", nullable: true),
                    DO_Piece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: true),
                    DO_Date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CT_Num = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: true),
                    AR_Ref = table.Column<string>(type: "nvarchar(19)", maxLength: 19, nullable: true),
                    DL_Design = table.Column<string>(type: "nvarchar(69)", maxLength: 69, nullable: true),
                    DL_Qte = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DL_PrixUnitaire = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DL_MontantHT = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    DL_MontantTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    cbCreation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    cbModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LigneType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DOCLIGNE", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_LIVRAISON",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DO_Piece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    LI_Adresse = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LI_Ville = table.Column<string>(type: "nvarchar(35)", maxLength: 35, nullable: false),
                    LI_CodePostal = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    LI_Statut = table.Column<short>(type: "smallint", nullable: false),
                    LivreurId = table.Column<int>(type: "int", nullable: true),
                    LI_DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LI_DateLivree = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LI_DateReplanification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LI_Commentaire = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    LI_Latitude = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    LI_Longitude = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    LI_PieceSage = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: true),
                    Encaisse = table.Column<bool>(type: "bit", nullable: false),
                    EncaisseAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MontantEncaisse = table.Column<decimal>(type: "decimal(18,3)", nullable: true),
                    RemisAuDepot = table.Column<bool>(type: "bit", nullable: false),
                    RemisAuDepotAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DepotPassageNumber = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVRAISON", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_LIVRAISON_HISTORIQUE",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DoPiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    LivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LivreurProfileId = table.Column<int>(type: "int", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Motif = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PhotoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Latitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    DepotPassageNumber = table.Column<int>(type: "int", nullable: true),
                    Montant = table.Column<decimal>(type: "decimal(18,3)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVRAISON_HISTORIQUE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_LIVREUR_ABANDON_LOG",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommandePiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVREUR_ABANDON_LOG", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_LIVREUR_ACTION_LOG",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientActionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PayloadHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    HttpResponse = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVREUR_ACTION_LOG", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_LIVREUR_POSITION",
                columns: table => new
                {
                    LivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Lat = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    Lng = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    Accuracy = table.Column<decimal>(type: "decimal(8,2)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsBroadcasting = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVREUR_POSITION", x => x.LivreurUserId);
                });

            migrationBuilder.CreateTable(
                name: "F_LIVREUR_POSITION_HISTORY",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LivreurId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Lat = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    Lng = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    Accuracy = table.Column<decimal>(type: "decimal(8,2)", nullable: true),
                    CapturedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClientActionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVREUR_POSITION_HISTORY", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_LIVREUR_ZONE",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Gouvernorat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Delegation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AssignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVREUR_ZONE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_RECLAMATION",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CodeReclamation = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    DoPiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    ArRef = table.Column<string>(type: "nvarchar(19)", maxLength: 19, nullable: true),
                    IsGlobal = table.Column<bool>(type: "bit", nullable: false),
                    VisibleClient = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientProfileId = table.Column<int>(type: "int", nullable: true),
                    AssignedToUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TypeReclamation = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Motif = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Statut = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Priorite = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TypeCas = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EchangeDemandeText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LastClientReplyAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CorrectionProposee = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CorrectionAppliquee = table.Column<bool>(type: "bit", nullable: false),
                    MotifRefus = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    NoteInterne = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    TentativesCount = table.Column<int>(type: "int", nullable: false),
                    FirstAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReprogrammationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReprogrammationCreneau = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_RECLAMATION", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_SMS_LOG",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DoPiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Success = table.Column<bool>(type: "bit", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_SMS_LOG", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_SUPERVISOR_ALERT",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    AlertType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RelatedTransfertId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AcknowledgedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AcknowledgedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_SUPERVISOR_ALERT", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_TAXE",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TX_CODE = table.Column<int>(type: "int", nullable: false),
                    TX_LIBELLE = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TX_TAUX = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    TX_Type = table.Column<short>(type: "smallint", nullable: false),
                    TX_Compte = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_TAXE", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "F_TRANSFERT",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DoPiece = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ArRef = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Quantite = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    SourceDepotNo = table.Column<int>(type: "int", nullable: false),
                    DestinationDepotNo = table.Column<int>(type: "int", nullable: false),
                    TransitLivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "EN_ATTENTE_TRANSIT"),
                    AffectedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PickedUpAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EscalatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PickupGpsLatitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    PickupGpsLongitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    DeliveryGpsLatitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    DeliveryGpsLongitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    AlgoReasoning = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_TRANSFERT", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_TRANSFERT_AUDIT_LOG",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TransfertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SnapshotBefore = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SnapshotAfter = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Motif = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_TRANSFERT_AUDIT_LOG", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HomepageTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    BlocksJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByAdminId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HomepageTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProfilsUtilisateurs",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UtilisateurId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TypeProfil = table.Column<int>(type: "int", nullable: true),
                    TypeClient = table.Column<int>(type: "int", nullable: true),
                    NomComplet = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Telephone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    CIN = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DateNaissance = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NomSociete = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    MatriculeFiscal = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RegistreCommerce = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    NumeroTVA = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Remise = table.Column<int>(type: "int", nullable: true),
                    PlafondCredit = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    DiscountPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    Gouvernorat = table.Column<int>(type: "int", nullable: false),
                    Delegation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Adresse = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    AdresseComplementaire = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CodePostal = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Pays = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Latitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    CodeEmploye = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Departement = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Poste = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CodeDepot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ZoneLivraison = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsTransit = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DepotRattacheNo = table.Column<int>(type: "int", nullable: true),
                    CodeClientSage = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EstSynchroniseAvecSage = table.Column<bool>(type: "bit", nullable: true),
                    DateDerniereSynchronisation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsInPause = table.Column<bool>(type: "bit", nullable: false),
                    LastActivityAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastAssignmentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ContactPreference = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfilsUtilisateurs", x => x.cbMarq);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "F_RECLAMATION_PHOTO",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReclamationId = table.Column<int>(type: "int", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Size = table.Column<long>(type: "bigint", nullable: true),
                    UploadedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_RECLAMATION_PHOTO", x => x.Id);
                    table.ForeignKey(
                        name: "FK_F_RECLAMATION_PHOTO_F_RECLAMATION_ReclamationId",
                        column: x => x.ReclamationId,
                        principalTable: "F_RECLAMATION",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "F_RECLAMATION_TENTATIVE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReclamationId = table.Column<int>(type: "int", nullable: true),
                    CommandePiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    DateJour = table.Column<DateTime>(type: "date", nullable: false),
                    Motif = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LivreurUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Latitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    PhotoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_RECLAMATION_TENTATIVE", x => x.Id);
                    table.ForeignKey(
                        name: "FK_F_RECLAMATION_TENTATIVE_F_RECLAMATION_ReclamationId",
                        column: x => x.ReclamationId,
                        principalTable: "F_RECLAMATION",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerProfilecbMarq = table.Column<int>(type: "int", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_ProfilsUtilisateurs_CustomerProfilecbMarq",
                        column: x => x.CustomerProfilecbMarq,
                        principalTable: "ProfilsUtilisateurs",
                        principalColumn: "cbMarq");
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_CustomerProfilecbMarq",
                table: "AspNetUsers",
                column: "CustomerProfilecbMarq");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_B_PAIEMENT_DO_Piece_cbMarq",
                table: "B_PAIEMENT",
                columns: new[] { "DO_Piece", "cbMarq" });

            migrationBuilder.CreateIndex(
                name: "IX_B_PAIEMENT_PA_ProviderPaymentId",
                table: "B_PAIEMENT",
                column: "PA_ProviderPaymentId",
                filter: "[PA_ProviderPaymentId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_B_PAIEMENT_PA_Reference",
                table: "B_PAIEMENT",
                column: "PA_Reference",
                unique: true,
                filter: "[PA_Reference] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_B_PAIEMENT_PA_Statut",
                table: "B_PAIEMENT",
                column: "PA_Statut");

            migrationBuilder.CreateIndex(
                name: "IX_CMS_HOMEPAGE_Scope",
                table: "CMS_HOMEPAGE",
                column: "Scope",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_AVIS_COMMANDE_ClientUserId",
                table: "F_AVIS_COMMANDE",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_AVIS_COMMANDE_CommandePiece",
                table: "F_AVIS_COMMANDE",
                column: "CommandePiece",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_AVIS_PROMPT_STATE_ClientUserId",
                table: "F_AVIS_PROMPT_STATE",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_AVIS_PROMPT_STATE_CommandePiece",
                table: "F_AVIS_PROMPT_STATE",
                column: "CommandePiece",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_CHATBOT_ACTION_LOG_UserId_ExecutedAt",
                table: "F_CHATBOT_ACTION_LOG",
                columns: new[] { "UserId", "ExecutedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_CHATBOT_INSIGHT_CreatedAt",
                table: "F_CHATBOT_INSIGHT",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_F_CHATBOT_INSIGHT_DismissedAt",
                table: "F_CHATBOT_INSIGHT",
                column: "DismissedAt");

            migrationBuilder.CreateIndex(
                name: "IX_F_CHATBOT_MESSAGE_SessionId_CreatedAt",
                table: "F_CHATBOT_MESSAGE",
                columns: new[] { "SessionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_CHATBOT_PENDING_ACTION_UserId_ExpiresAt",
                table: "F_CHATBOT_PENDING_ACTION",
                columns: new[] { "UserId", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_CHATBOT_SESSION_UserId_LastActivityAt",
                table: "F_CHATBOT_SESSION",
                columns: new[] { "UserId", "LastActivityAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_CLIENT_ADDRESS_ClientUserId",
                table: "F_CLIENT_ADDRESS",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_CLIENT_DEVICE_TOKEN_Token",
                table: "F_CLIENT_DEVICE_TOKEN",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_CLIENT_DEVICE_TOKEN_UserId",
                table: "F_CLIENT_DEVICE_TOKEN",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ConfirmatriceSession_EndedAt",
                table: "F_CONFIRMATRICE_SESSION",
                column: "EndedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ConfirmatriceSession_User_Start",
                table: "F_CONFIRMATRICE_SESSION",
                columns: new[] { "ConfirmatriceId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_DELIVERY_INCIDENT_PHOTO_DoPiece",
                table: "F_DELIVERY_INCIDENT_PHOTO",
                column: "DoPiece");

            migrationBuilder.CreateIndex(
                name: "IX_DepotZone_Delegation",
                table: "F_DEPOT_ZONE",
                columns: new[] { "Gouvernorat", "Delegation" });

            migrationBuilder.CreateIndex(
                name: "IX_DepotZone_Primary_Lookup",
                table: "F_DEPOT_ZONE",
                columns: new[] { "Gouvernorat", "Delegation", "IsPrimary" });

            migrationBuilder.CreateIndex(
                name: "IX_F_DEPOT_ZONE_DepotNo_Gouvernorat_Delegation",
                table: "F_DEPOT_ZONE",
                columns: new[] { "DepotNo", "Gouvernorat", "Delegation" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCENTETE_ActiveDelivery",
                table: "F_DOCENTETE",
                columns: new[] { "IsActiveDelivery", "AssignedLivreurId" });

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCENTETE_AssignedLivreurId",
                table: "F_DOCENTETE",
                column: "AssignedLivreurId");

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCENTETE_PickupDepotNo",
                table: "F_DOCENTETE",
                column: "PickupDepotNo");

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCLIGNE_LigneType",
                table: "F_DOCLIGNE",
                column: "LigneType");

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVRAISON_DepotPassage",
                table: "F_LIVRAISON",
                columns: new[] { "LI_Statut", "DepotPassageNumber" })
                .Annotation("SqlServer:Include", new[] { "DO_Piece", "LivreurId" });

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVRAISON_LivreurId_EncaisseAt_RemisAuDepot",
                table: "F_LIVRAISON",
                columns: new[] { "LivreurId", "EncaisseAt", "RemisAuDepot" });

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVRAISON_HISTORIQUE_DoPiece_CreatedAt",
                table: "F_LIVRAISON_HISTORIQUE",
                columns: new[] { "DoPiece", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVRAISON_HISTORIQUE_LivreurUserId_CreatedAt",
                table: "F_LIVRAISON_HISTORIQUE",
                columns: new[] { "LivreurUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVREUR_ABANDON_LOG_LivreurUserId_CreatedAt",
                table: "F_LIVREUR_ABANDON_LOG",
                columns: new[] { "LivreurUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVREUR_ACTION_LOG_ClientActionId",
                table: "F_LIVREUR_ACTION_LOG",
                column: "ClientActionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVREUR_ACTION_LOG_LivreurUserId_ProcessedAt",
                table: "F_LIVREUR_ACTION_LOG",
                columns: new[] { "LivreurUserId", "ProcessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVREUR_POSITION_HISTORY_ClientActionId",
                table: "F_LIVREUR_POSITION_HISTORY",
                column: "ClientActionId",
                unique: true,
                filter: "[ClientActionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LivreurPosHistory",
                table: "F_LIVREUR_POSITION_HISTORY",
                columns: new[] { "LivreurId", "CapturedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVREUR_ZONE_LivreurUserId_Gouvernorat_Delegation",
                table: "F_LIVREUR_ZONE",
                columns: new[] { "LivreurUserId", "Gouvernorat", "Delegation" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LivreurZone_Delegation",
                table: "F_LIVREUR_ZONE",
                columns: new[] { "Gouvernorat", "Delegation" });

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_AssignedToUserId",
                table: "F_RECLAMATION",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_ClientUserId",
                table: "F_RECLAMATION",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_CodeReclamation",
                table: "F_RECLAMATION",
                column: "CodeReclamation",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_CreatedAt",
                table: "F_RECLAMATION",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_DoPiece",
                table: "F_RECLAMATION",
                column: "DoPiece");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_Source",
                table: "F_RECLAMATION",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_Statut",
                table: "F_RECLAMATION",
                column: "Statut");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_TypeCas",
                table: "F_RECLAMATION",
                column: "TypeCas");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_UpdatedAt",
                table: "F_RECLAMATION",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_VisibleClient",
                table: "F_RECLAMATION",
                column: "VisibleClient");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_PHOTO_ReclamationId",
                table: "F_RECLAMATION_PHOTO",
                column: "ReclamationId");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_TENTATIVE_CommandePiece",
                table: "F_RECLAMATION_TENTATIVE",
                column: "CommandePiece");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_TENTATIVE_CommandePiece_DateJour",
                table: "F_RECLAMATION_TENTATIVE",
                columns: new[] { "CommandePiece", "DateJour" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_TENTATIVE_ReclamationId",
                table: "F_RECLAMATION_TENTATIVE",
                column: "ReclamationId");

            migrationBuilder.CreateIndex(
                name: "IX_F_SMS_LOG_DoPiece_SentAt",
                table: "F_SMS_LOG",
                columns: new[] { "DoPiece", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_SUPERVISOR_ALERT_AcknowledgedAt_Severity",
                table: "F_SUPERVISOR_ALERT",
                columns: new[] { "AcknowledgedAt", "Severity" });

            migrationBuilder.CreateIndex(
                name: "IX_F_TRANSFERT_DoPiece_ArRef_Status",
                table: "F_TRANSFERT",
                columns: new[] { "DoPiece", "ArRef", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_F_TRANSFERT_SourceDepotNo_Status",
                table: "F_TRANSFERT",
                columns: new[] { "SourceDepotNo", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_F_TRANSFERT_Status",
                table: "F_TRANSFERT",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_F_TRANSFERT_TransitLivreurUserId",
                table: "F_TRANSFERT",
                column: "TransitLivreurUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_TRANSFERT_AUDIT_LOG_TransfertId_OccurredAt",
                table: "F_TRANSFERT_AUDIT_LOG",
                columns: new[] { "TransfertId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProfilUtilisateur_DepotRattacheNo",
                table: "ProfilsUtilisateurs",
                column: "DepotRattacheNo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "B_PAIEMENT");

            migrationBuilder.DropTable(
                name: "CMS_HOMEPAGE");

            migrationBuilder.DropTable(
                name: "CommandeConfirmationLocks");

            migrationBuilder.DropTable(
                name: "F_APP_CONFIG");

            migrationBuilder.DropTable(
                name: "F_ARTICLE");

            migrationBuilder.DropTable(
                name: "F_ARTICLE_IMAGE");

            migrationBuilder.DropTable(
                name: "F_ARTSTOCK");

            migrationBuilder.DropTable(
                name: "F_AVIS_COMMANDE");

            migrationBuilder.DropTable(
                name: "F_AVIS_PROMPT_STATE");

            migrationBuilder.DropTable(
                name: "F_B2B_DISCOUNT_HISTORY");

            migrationBuilder.DropTable(
                name: "F_CATALOGUE");

            migrationBuilder.DropTable(
                name: "F_CHATBOT_ACTION_LOG");

            migrationBuilder.DropTable(
                name: "F_CHATBOT_INSIGHT");

            migrationBuilder.DropTable(
                name: "F_CHATBOT_MESSAGE");

            migrationBuilder.DropTable(
                name: "F_CHATBOT_PENDING_ACTION");

            migrationBuilder.DropTable(
                name: "F_CHATBOT_SESSION");

            migrationBuilder.DropTable(
                name: "F_CLIENT_ADDRESS");

            migrationBuilder.DropTable(
                name: "F_CLIENT_DEVICE_TOKEN");

            migrationBuilder.DropTable(
                name: "F_CONFIRMATRICE_SESSION");

            migrationBuilder.DropTable(
                name: "F_DELIVERY_INCIDENT_PHOTO");

            migrationBuilder.DropTable(
                name: "F_DEPOT");

            migrationBuilder.DropTable(
                name: "F_DEPOT_ZONE");

            migrationBuilder.DropTable(
                name: "F_DOCENTETE");

            migrationBuilder.DropTable(
                name: "F_DOCLIGNE");

            migrationBuilder.DropTable(
                name: "F_LIVRAISON");

            migrationBuilder.DropTable(
                name: "F_LIVRAISON_HISTORIQUE");

            migrationBuilder.DropTable(
                name: "F_LIVREUR_ABANDON_LOG");

            migrationBuilder.DropTable(
                name: "F_LIVREUR_ACTION_LOG");

            migrationBuilder.DropTable(
                name: "F_LIVREUR_POSITION");

            migrationBuilder.DropTable(
                name: "F_LIVREUR_POSITION_HISTORY");

            migrationBuilder.DropTable(
                name: "F_LIVREUR_ZONE");

            migrationBuilder.DropTable(
                name: "F_RECLAMATION_PHOTO");

            migrationBuilder.DropTable(
                name: "F_RECLAMATION_TENTATIVE");

            migrationBuilder.DropTable(
                name: "F_SMS_LOG");

            migrationBuilder.DropTable(
                name: "F_SUPERVISOR_ALERT");

            migrationBuilder.DropTable(
                name: "F_TAXE");

            migrationBuilder.DropTable(
                name: "F_TRANSFERT");

            migrationBuilder.DropTable(
                name: "F_TRANSFERT_AUDIT_LOG");

            migrationBuilder.DropTable(
                name: "HomepageTemplates");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "F_RECLAMATION");

            migrationBuilder.DropTable(
                name: "ProfilsUtilisateurs");
        }
    }
}
