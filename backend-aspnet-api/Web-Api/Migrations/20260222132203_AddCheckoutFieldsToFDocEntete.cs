using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckoutFieldsToFDocEntete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DO_AdresseLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_CodePostalLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(9)",
                maxLength: 9,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DO_FraisLivraison",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_LatitudeLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_LongitudeLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_ModeLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_ModePaiement",
                table: "F_DOCENTETE",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DO_TimbreFiscal",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DO_VilleLivraison",
                table: "F_DOCENTETE",
                type: "nvarchar(35)",
                maxLength: 35,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DO_AdresseLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_CodePostalLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_FraisLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_LatitudeLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_LongitudeLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_ModeLivraison",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_ModePaiement",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_TimbreFiscal",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DO_VilleLivraison",
                table: "F_DOCENTETE");
        }
    }
}
