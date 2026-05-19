using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    cbCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    cbModification = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_B_PAIEMENT", x => x.cbMarq);
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
                name: "F_DOCENTETE",
                columns: table => new
                {
                    cbMarq = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DO_Domaine = table.Column<short>(type: "smallint", nullable: false),
                    DO_Type = table.Column<short>(type: "smallint", nullable: false),
                    DO_Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DO_Ref = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DO_Tiers = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: false),
                    DE_No = table.Column<int>(type: "int", nullable: false),
                    CT_NumPayeur = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: true),
                    DO_TotalHT = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DO_TotalHTNet = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DO_TotalTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DO_NetAPayer = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DO_Valide = table.Column<short>(type: "smallint", nullable: false),
                    DO_Piece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    cbCreation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    cbModification = table.Column<DateTime>(type: "datetime2", nullable: true)
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
                    DO_Domaine = table.Column<short>(type: "smallint", nullable: false),
                    DO_Type = table.Column<short>(type: "smallint", nullable: false),
                    DO_Piece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    DO_Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CT_Num = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: true),
                    AR_Ref = table.Column<string>(type: "nvarchar(19)", maxLength: 19, nullable: false),
                    DL_Design = table.Column<string>(type: "nvarchar(69)", maxLength: 69, nullable: true),
                    DL_Qte = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DL_PrixUnitaire = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DL_MontantHT = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DL_MontantTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    cbCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    cbModification = table.Column<DateTime>(type: "datetime2", nullable: true)
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
                    LI_CodePostal = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: false),
                    LI_Statut = table.Column<short>(type: "smallint", nullable: false),
                    LivreurId = table.Column<int>(type: "int", nullable: true),
                    LI_DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LI_DateLivree = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LI_Latitude = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    LI_Longitude = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    LI_PieceSage = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_LIVRAISON", x => x.cbMarq);
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "B_PAIEMENT");

            migrationBuilder.DropTable(
                name: "F_ARTICLE");

            migrationBuilder.DropTable(
                name: "F_ARTSTOCK");

            migrationBuilder.DropTable(
                name: "F_CATALOGUE");

            migrationBuilder.DropTable(
                name: "F_DEPOT");

            migrationBuilder.DropTable(
                name: "F_DOCENTETE");

            migrationBuilder.DropTable(
                name: "F_DOCLIGNE");

            migrationBuilder.DropTable(
                name: "F_LIVRAISON");

            migrationBuilder.DropTable(
                name: "F_TAXE");
        }
    }
}
