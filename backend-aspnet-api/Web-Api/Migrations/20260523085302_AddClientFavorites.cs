using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClientFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "F_CLIENT_FAVORIS",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AR_Ref = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_CLIENT_FAVORIS", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_F_CLIENT_FAVORIS_AR_Ref",
                table: "F_CLIENT_FAVORIS",
                column: "AR_Ref");

            migrationBuilder.CreateIndex(
                name: "IX_F_CLIENT_FAVORIS_ClientUserId",
                table: "F_CLIENT_FAVORIS",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_CLIENT_FAVORIS_ClientUserId_AR_Ref",
                table: "F_CLIENT_FAVORIS",
                columns: new[] { "ClientUserId", "AR_Ref" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "F_CLIENT_FAVORIS");
        }
    }
}
