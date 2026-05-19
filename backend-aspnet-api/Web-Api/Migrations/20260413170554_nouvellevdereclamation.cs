using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class nouvellevdereclamation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "F_RECLAMATION",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CodeReclamation = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    DoPiece = table.Column<string>(type: "nvarchar(13)", maxLength: 13, nullable: false),
                    ClientUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientProfileId = table.Column<int>(type: "int", nullable: true),
                    AssignedToUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TypeReclamation = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Motif = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Statut = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Priorite = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastMessageAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsReadByClient = table.Column<bool>(type: "bit", nullable: false),
                    IsReadByStaff = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_RECLAMATION", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "F_RECLAMATION_MESSAGE",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReclamationId = table.Column<int>(type: "int", nullable: false),
                    SenderUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SenderProfileId = table.Column<int>(type: "int", nullable: true),
                    SenderRole = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    MessageText = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    MessageType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsInternal = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_F_RECLAMATION_MESSAGE", x => x.Id);
                    table.ForeignKey(
                        name: "FK_F_RECLAMATION_MESSAGE_F_RECLAMATION_ReclamationId",
                        column: x => x.ReclamationId,
                        principalTable: "F_RECLAMATION",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_AssignedToUserId",
                table: "F_RECLAMATION",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_ClientUserId",
                table: "F_RECLAMATION",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_CodeReclamation",
                table: "F_RECLAMATION",
                column: "CodeReclamation",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_CreatedAt",
                table: "F_RECLAMATION",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_DoPiece",
                table: "F_RECLAMATION",
                column: "DoPiece");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_Statut",
                table: "F_RECLAMATION",
                column: "Statut");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_UpdatedAt",
                table: "F_RECLAMATION",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_MESSAGE_CreatedAt",
                table: "F_RECLAMATION_MESSAGE",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_F_RECLAMATION_MESSAGE_ReclamationId",
                table: "F_RECLAMATION_MESSAGE",
                column: "ReclamationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "F_RECLAMATION_MESSAGE");

            migrationBuilder.DropTable(
                name: "F_RECLAMATION");
        }
    }
}
