using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalDevisTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "F_DEVIS_ENTETE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DevisPiece = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientCode = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: true),
                    ClientType = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StatusKey = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TotalHT = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DiscountPercentSnapshot = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    DiscountAmount = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    TotalHTNet = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    TotalTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    NetAPayer = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    ValidUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AssignedConfirmateurId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BcPiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DEVIS_ENTETE", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_DEVIS_EVENT",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DevisId = table.Column<int>(type: "int", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AuthorRole = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    EventType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    OldStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    NewStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsPublic = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DEVIS_EVENT", x => x.Id);
                    table.ForeignKey(
                        name: "FK_F_DEVIS_EVENT_F_DEVIS_ENTETE_DevisId",
                        column: x => x.DevisId,
                        principalTable: "F_DEVIS_ENTETE",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "F_DEVIS_LIGNE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DevisId = table.Column<int>(type: "int", nullable: false),
                    ArticleRef = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Designation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Qty = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    UnitPriceHT = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    DiscountLinePercent = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    AmountHT = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    AmountTTC = table.Column<decimal>(type: "decimal(24,13)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_DEVIS_LIGNE", x => x.Id);
                    table.ForeignKey(
                        name: "FK_F_DEVIS_LIGNE_F_DEVIS_ENTETE_DevisId",
                        column: x => x.DevisId,
                        principalTable: "F_DEVIS_ENTETE",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_F_DEVIS_ENTETE_AssignedConfirmateurId",
                table: "F_DEVIS_ENTETE",
                column: "AssignedConfirmateurId");

            migrationBuilder.CreateIndex(
                name: "IX_F_DEVIS_ENTETE_BcPiece",
                table: "F_DEVIS_ENTETE",
                column: "BcPiece",
                filter: "[BcPiece] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_F_DEVIS_ENTETE_ClientUserId",
                table: "F_DEVIS_ENTETE",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_DEVIS_ENTETE_DevisPiece",
                table: "F_DEVIS_ENTETE",
                column: "DevisPiece",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_DEVIS_ENTETE_StatusKey",
                table: "F_DEVIS_ENTETE",
                column: "StatusKey");

            migrationBuilder.CreateIndex(
                name: "IX_F_DEVIS_EVENT_DevisId_CreatedAt",
                table: "F_DEVIS_EVENT",
                columns: new[] { "DevisId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_F_DEVIS_LIGNE_DevisId_SortOrder",
                table: "F_DEVIS_LIGNE",
                columns: new[] { "DevisId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "F_DEVIS_EVENT");
            migrationBuilder.DropTable(name: "F_DEVIS_LIGNE");
            migrationBuilder.DropTable(name: "F_DEVIS_ENTETE");
        }
    }
}
