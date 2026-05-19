using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class M_20260216 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "cbCreation",
                table: "F_DOCLIGNE",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<short>(
                name: "DO_Type",
                table: "F_DOCLIGNE",
                type: "smallint",
                nullable: true,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<string>(
                name: "DO_Piece",
                table: "F_DOCLIGNE",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(13)",
                oldMaxLength: 13);

            migrationBuilder.AlterColumn<short>(
                name: "DO_Domaine",
                table: "F_DOCLIGNE",
                type: "smallint",
                nullable: true,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DO_Date",
                table: "F_DOCLIGNE",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_Qte",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_PrixUnitaire",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_MontantTTC",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_MontantHT",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<string>(
                name: "AR_Ref",
                table: "F_DOCLIGNE",
                type: "nvarchar(19)",
                maxLength: 19,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(19)",
                oldMaxLength: 19);

            migrationBuilder.AlterColumn<short>(
                name: "DO_Valide",
                table: "F_DOCENTETE",
                type: "smallint",
                nullable: true,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<short>(
                name: "DO_Type",
                table: "F_DOCENTETE",
                type: "smallint",
                nullable: true,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_TotalTTC",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_TotalHTNet",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_TotalHT",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<string>(
                name: "DO_Tiers",
                table: "F_DOCENTETE",
                type: "nvarchar(17)",
                maxLength: 17,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(17)",
                oldMaxLength: 17);

            migrationBuilder.AlterColumn<string>(
                name: "DO_Piece",
                table: "F_DOCENTETE",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(13)",
                oldMaxLength: 13);

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_NetAPayer",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)");

            migrationBuilder.AlterColumn<short>(
                name: "DO_Domaine",
                table: "F_DOCENTETE",
                type: "smallint",
                nullable: true,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DO_Date",
                table: "F_DOCENTETE",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<int>(
                name: "DE_No",
                table: "F_DOCENTETE",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "cbCreation",
                table: "F_DOCLIGNE",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<short>(
                name: "DO_Type",
                table: "F_DOCLIGNE",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DO_Piece",
                table: "F_DOCLIGNE",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(13)",
                oldMaxLength: 13,
                oldNullable: true);

            migrationBuilder.AlterColumn<short>(
                name: "DO_Domaine",
                table: "F_DOCLIGNE",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "DO_Date",
                table: "F_DOCLIGNE",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_Qte",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_PrixUnitaire",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_MontantTTC",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DL_MontantHT",
                table: "F_DOCLIGNE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AR_Ref",
                table: "F_DOCLIGNE",
                type: "nvarchar(19)",
                maxLength: 19,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(19)",
                oldMaxLength: 19,
                oldNullable: true);

            migrationBuilder.AlterColumn<short>(
                name: "DO_Valide",
                table: "F_DOCENTETE",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldNullable: true);

            migrationBuilder.AlterColumn<short>(
                name: "DO_Type",
                table: "F_DOCENTETE",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_TotalTTC",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_TotalHTNet",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_TotalHT",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DO_Tiers",
                table: "F_DOCENTETE",
                type: "nvarchar(17)",
                maxLength: 17,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(17)",
                oldMaxLength: 17,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DO_Piece",
                table: "F_DOCENTETE",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(13)",
                oldMaxLength: 13,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DO_NetAPayer",
                table: "F_DOCENTETE",
                type: "decimal(24,13)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(24,13)",
                oldNullable: true);

            migrationBuilder.AlterColumn<short>(
                name: "DO_Domaine",
                table: "F_DOCENTETE",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "DO_Date",
                table: "F_DOCENTETE",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DE_No",
                table: "F_DOCENTETE",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
