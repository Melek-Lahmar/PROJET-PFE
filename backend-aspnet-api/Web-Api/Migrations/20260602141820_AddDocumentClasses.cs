using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentClasses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DOCUMENT",
                columns: table => new
                {
                    DO_NumDocument = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DO_Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DE_No = table.Column<int>(type: "int", nullable: false),
                    CT_Num = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DO_Ref = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DO_TotalTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DOCUMENT", x => x.DO_NumDocument);
                });

            migrationBuilder.CreateTable(
                name: "LIGNE_DOCUMENT",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AR_Ref = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LP_QteMvt = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    LP_PrixUnitaire = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    LP_ValeurRemise = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    LP_PUTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: true),
                    LP_MontantTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DO_NumDocument = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LIGNE_DOCUMENT", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LIGNE_DOCUMENT_DOCUMENT_DO_NumDocument",
                        column: x => x.DO_NumDocument,
                        principalTable: "DOCUMENT",
                        principalColumn: "DO_NumDocument",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LIGNE_DOCUMENT_DO_NumDocument",
                table: "LIGNE_DOCUMENT",
                column: "DO_NumDocument");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LIGNE_DOCUMENT");

            migrationBuilder.DropTable(
                name: "DOCUMENT");
        }
    }
}
