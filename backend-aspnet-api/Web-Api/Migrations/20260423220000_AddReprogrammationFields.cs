using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Phase 7 — Ajout des champs ReprogrammationDate + ReprogrammationCreneau sur F_RECLAMATION
    /// pour le motif client REPROGRAMMATION (date J+1 à J+14 + créneau MATIN/APRES_MIDI/SOIR).
    /// Migration idempotente.
    /// </summary>
    public partial class AddReprogrammationFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'ReprogrammationDate') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION] ADD [ReprogrammationDate] datetime2 NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'ReprogrammationCreneau') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION] ADD [ReprogrammationCreneau] nvarchar(20) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'ReprogrammationCreneau') IS NOT NULL
    ALTER TABLE [dbo].[F_RECLAMATION] DROP COLUMN [ReprogrammationCreneau];
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'ReprogrammationDate') IS NOT NULL
    ALTER TABLE [dbo].[F_RECLAMATION] DROP COLUMN [ReprogrammationDate];
");
        }
    }
}
