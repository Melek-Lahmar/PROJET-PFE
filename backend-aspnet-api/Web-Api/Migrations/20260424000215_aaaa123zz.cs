using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class aaaa123zz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsInPause",
                table: "ProfilsUtilisateurs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityAt",
                table: "ProfilsUtilisateurs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastAssignmentAt",
                table: "ProfilsUtilisateurs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReprogrammationCreneau",
                table: "F_RECLAMATION",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReprogrammationDate",
                table: "F_RECLAMATION",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "VisibleClient",
                table: "F_RECLAMATION",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "DO_InstructionsLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_RepereLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_TelephoneLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_VisibleClient",
                table: "F_RECLAMATION",
                column: "VisibleClient");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommandeConfirmationLocks");

            migrationBuilder.DropIndex(
                name: "IX_F_RECLAMATION_VisibleClient",
                table: "F_RECLAMATION");

            migrationBuilder.DropColumn(
                name: "IsInPause",
                table: "ProfilsUtilisateurs");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "ProfilsUtilisateurs");

            migrationBuilder.DropColumn(
                name: "LastAssignmentAt",
                table: "ProfilsUtilisateurs");

            migrationBuilder.DropColumn(
                name: "ReprogrammationCreneau",
                table: "F_RECLAMATION");

            migrationBuilder.DropColumn(
                name: "ReprogrammationDate",
                table: "F_RECLAMATION");

            migrationBuilder.DropColumn(
                name: "VisibleClient",
                table: "F_RECLAMATION");

            migrationBuilder.DropColumn(
                name: "DO_InstructionsLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_RepereLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_TelephoneLivraison",
                table: "F_DOCENTETE");
        }
    }
}
