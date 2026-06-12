using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddManifestePrintAndPrintSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasEverBeenPickedUp",
                table: "F_LIVRAISON",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ManifestePrintBlocs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PrintedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PrintedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepotNo = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    BLCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManifestePrintBlocs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PrintSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CompanyAddress = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CompanyPhone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    CompanyEmail = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MatriculeFiscal = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RegistreCommerce = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FieldsConfig = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "{}"),
                    FooterText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrintSettings", x => x.Id);
                    table.CheckConstraint("CK_PrintSettings_OneRow", "[Id] = 1");
                });

            migrationBuilder.CreateTable(
                name: "ManifestePrintBlocLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BlocId = table.Column<int>(type: "int", nullable: false),
                    BLPiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    ClientCode = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    ClientAddress = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ClientCity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ClientPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManifestePrintBlocLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManifestePrintBlocLines_ManifestePrintBlocs_BlocId",
                        column: x => x.BlocId,
                        principalTable: "ManifestePrintBlocs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ManifestePrintBlocLines_BlocId",
                table: "ManifestePrintBlocLines",
                column: "BlocId");

            migrationBuilder.CreateIndex(
                name: "IX_ManifestePrintBlocLines_BLPiece",
                table: "ManifestePrintBlocLines",
                column: "BLPiece");

            migrationBuilder.CreateIndex(
                name: "IX_ManifestePrintBlocs_DepotNo_PrintedAt",
                table: "ManifestePrintBlocs",
                columns: new[] { "DepotNo", "PrintedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManifestePrintBlocLines");

            migrationBuilder.DropTable(
                name: "PrintSettings");

            migrationBuilder.DropTable(
                name: "ManifestePrintBlocs");

            migrationBuilder.DropColumn(
                name: "HasEverBeenPickedUp",
                table: "F_LIVRAISON");
        }
    }
}
