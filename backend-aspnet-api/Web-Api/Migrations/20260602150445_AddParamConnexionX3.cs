using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddParamConnexionX3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PARAM_CONNEXION_X3",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Http = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)0),
                    AdresseIP_X3 = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "localhost:8124"),
                    Login = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "admin"),
                    Password = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "@Zerty1234"),
                    Dossier = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "SEED"),
                    Service_Web_BC = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "SOH"),
                    Type_BC = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "WEB")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PARAM_CONNEXION_X3", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "PARAM_CONNEXION_X3",
                columns: new[] { "Id", "AdresseIP_X3", "Dossier", "Login", "Password", "Service_Web_BC", "Type_BC" },
                values: new object[] { 1, "localhost:8124", "SEED", "admin", "@Zerty1234", "SOH", "WEB" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PARAM_CONNEXION_X3");
        }
    }
}
