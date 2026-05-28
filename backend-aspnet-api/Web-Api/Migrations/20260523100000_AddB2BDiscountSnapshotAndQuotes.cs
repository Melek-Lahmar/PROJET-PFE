using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddB2BDiscountSnapshotAndQuotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "B2BDiscountAmount",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "B2BDiscountRate",
                table: "F_DOCENTETE",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscountSource",
                table: "F_DOCENTETE",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QuoteAcceptedAt",
                table: "F_DOCENTETE",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "QuoteAssignedToUserId",
                table: "F_DOCENTETE",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuoteClientNote",
                table: "F_DOCENTETE",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QuoteConvertedAt",
                table: "F_DOCENTETE",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuoteConvertedToPiece",
                table: "F_DOCENTETE",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "QuoteCreatedByUserId",
                table: "F_DOCENTETE",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuoteInternalNote",
                table: "F_DOCENTETE",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QuoteRefusedAt",
                table: "F_DOCENTETE",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QuoteSentAt",
                table: "F_DOCENTETE",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuoteStatus",
                table: "F_DOCENTETE",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QuoteValidUntil",
                table: "F_DOCENTETE",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalBeforeDiscount",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCENTETE_DO_Type_QuoteStatus",
                table: "F_DOCENTETE",
                columns: new[] { "DO_Type", "QuoteStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCENTETE_QuoteAssignedToUserId",
                table: "F_DOCENTETE",
                column: "QuoteAssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCENTETE_QuoteConvertedToPiece",
                table: "F_DOCENTETE",
                column: "QuoteConvertedToPiece");

            migrationBuilder.CreateIndex(
                name: "IX_F_DOCENTETE_QuoteCreatedByUserId",
                table: "F_DOCENTETE",
                column: "QuoteCreatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_F_DOCENTETE_DO_Type_QuoteStatus",
                table: "F_DOCENTETE");

            migrationBuilder.DropIndex(
                name: "IX_F_DOCENTETE_QuoteAssignedToUserId",
                table: "F_DOCENTETE");

            migrationBuilder.DropIndex(
                name: "IX_F_DOCENTETE_QuoteConvertedToPiece",
                table: "F_DOCENTETE");

            migrationBuilder.DropIndex(
                name: "IX_F_DOCENTETE_QuoteCreatedByUserId",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "B2BDiscountAmount",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "B2BDiscountRate",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "DiscountSource",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteAcceptedAt",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteAssignedToUserId",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteClientNote",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteConvertedAt",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteConvertedToPiece",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteCreatedByUserId",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteInternalNote",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteRefusedAt",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteSentAt",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteStatus",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "QuoteValidUntil",
                table: "F_DOCENTETE");

            migrationBuilder.DropColumn(
                name: "TotalBeforeDiscount",
                table: "F_DOCENTETE");
        }
    }
}
