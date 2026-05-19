using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    public partial class AddReclamationMessageMediaColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MediaUrl",
                table: "F_RECLAMATION_MESSAGE",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MediaFileName",
                table: "F_RECLAMATION_MESSAGE",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MediaContentType",
                table: "F_RECLAMATION_MESSAGE",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "MediaSize",
                table: "F_RECLAMATION_MESSAGE",
                type: "bigint",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MediaUrl",
                table: "F_RECLAMATION_MESSAGE");

            migrationBuilder.DropColumn(
                name: "MediaFileName",
                table: "F_RECLAMATION_MESSAGE");

            migrationBuilder.DropColumn(
                name: "MediaContentType",
                table: "F_RECLAMATION_MESSAGE");

            migrationBuilder.DropColumn(
                name: "MediaSize",
                table: "F_RECLAMATION_MESSAGE");
        }
    }
}