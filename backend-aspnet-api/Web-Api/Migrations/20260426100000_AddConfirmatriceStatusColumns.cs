using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Phase 3A — Ajout des colonnes d'état de disponibilité sur ProfilsUtilisateurs.
    ///
    /// Colonnes :
    ///   - IsInPause bit NOT NULL DEFAULT 0 : pause volontaire de la confirmatrice
    ///   - LastActivityAt datetime2 NULL     : dernière activité API (mise à jour par middleware)
    ///   - LastAssignmentAt datetime2 NULL   : dernière attribution reçue (utilisée en 3B pour départage)
    ///
    /// Migration idempotente via IF COL_LENGTH IS NULL.
    /// Aucune donnée existante n'est touchée.
    /// </summary>
    public partial class AddConfirmatriceStatusColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.ProfilsUtilisateurs', 'IsInPause') IS NULL
    ALTER TABLE [dbo].[ProfilsUtilisateurs]
    ADD [IsInPause] bit NOT NULL
        CONSTRAINT [DF_ProfilsUtilisateurs_IsInPause] DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.ProfilsUtilisateurs', 'LastActivityAt') IS NULL
    ALTER TABLE [dbo].[ProfilsUtilisateurs]
    ADD [LastActivityAt] datetime2 NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.ProfilsUtilisateurs', 'LastAssignmentAt') IS NULL
    ALTER TABLE [dbo].[ProfilsUtilisateurs]
    ADD [LastAssignmentAt] datetime2 NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.ProfilsUtilisateurs', 'LastAssignmentAt') IS NOT NULL
    ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP COLUMN [LastAssignmentAt];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.ProfilsUtilisateurs', 'LastActivityAt') IS NOT NULL
    ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP COLUMN [LastActivityAt];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.ProfilsUtilisateurs', 'IsInPause') IS NOT NULL
BEGIN
    IF OBJECT_ID('dbo.DF_ProfilsUtilisateurs_IsInPause', 'D') IS NOT NULL
        ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP CONSTRAINT [DF_ProfilsUtilisateurs_IsInPause];
    ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP COLUMN [IsInPause];
END
");
        }
    }
}
