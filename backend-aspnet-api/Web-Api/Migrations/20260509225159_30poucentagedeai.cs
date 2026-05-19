using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class _30poucentagedeai : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactPreference",
                table: "ProfilsUtilisateurs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "Encaisse",
                table: "F_LIVRAISON",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "EncaisseAt",
                table: "F_LIVRAISON",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MontantEncaisse",
                table: "F_LIVRAISON",
                type: "decimal(18,3)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RemisAuDepot",
                table: "F_LIVRAISON",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "RemisAuDepotAt",
                table: "F_LIVRAISON",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ProximityAlertSent",
                table: "F_DOCENTETE",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "F_APP_CONFIG",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
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

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVRAISON_LivreurId_EncaisseAt_RemisAuDepot",
                table: "F_LIVRAISON",
                columns: new[] { "LivreurId", "EncaisseAt", "RemisAuDepot" });

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
                name: "IX_F_LIVREUR_ACTION_LOG_ClientActionId",
                table: "F_LIVREUR_ACTION_LOG",
                column: "ClientActionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_LIVREUR_ACTION_LOG_LivreurUserId_ProcessedAt",
                table: "F_LIVREUR_ACTION_LOG",
                columns: new[] { "LivreurUserId", "ProcessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_SMS_LOG_DoPiece_SentAt",
                table: "F_SMS_LOG",
                columns: new[] { "DoPiece", "SentAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "F_APP_CONFIG");

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
                name: "F_LIVREUR_ACTION_LOG");

            migrationBuilder.DropTable(
                name: "F_LIVREUR_POSITION");

            migrationBuilder.DropTable(
                name: "F_SMS_LOG");

            migrationBuilder.DropIndex(
                name: "IX_F_LIVRAISON_LivreurId_EncaisseAt_RemisAuDepot",
                table: "F_LIVRAISON");

            migrationBuilder.DropColumn(
                name: "ContactPreference",
                table: "ProfilsUtilisateurs");

            migrationBuilder.DropColumn(
                name: "Encaisse",
                table: "F_LIVRAISON");

            migrationBuilder.DropColumn(
                name: "EncaisseAt",
                table: "F_LIVRAISON");

            migrationBuilder.DropColumn(
                name: "MontantEncaisse",
                table: "F_LIVRAISON");

            migrationBuilder.DropColumn(
                name: "RemisAuDepot",
                table: "F_LIVRAISON");

            migrationBuilder.DropColumn(
                name: "RemisAuDepotAt",
                table: "F_LIVRAISON");

            migrationBuilder.DropColumn(
                name: "ProximityAlertSent",
                table: "F_DOCENTETE");
        }
    }
}
