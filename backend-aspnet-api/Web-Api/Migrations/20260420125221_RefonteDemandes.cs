using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Refonte du module réclamations → demandes structurées.
    ///
    /// Historique : cette migration était initialement un no-op car le schéma avait été
    /// appliqué manuellement via sqlcmd en phase de test. Ce script manuel était
    /// incomplet (colonnes ArRef et IsGlobal oubliées), provoquant une SqlException
    /// « Nom de colonne non valide » à la première création de Réclamation sur toute DB
    /// non patchée à la main.
    ///
    /// Cette version remplit le Up() avec le vrai SQL, idempotent (IF COL_LENGTH IS NULL),
    /// pour que toute DB neuve s'aligne automatiquement via dotnet ef database update.
    /// Sur une DB déjà patchée manuellement, l'IF garantit que rien n'est ré-exécuté.
    ///
    /// Colonnes F_RECLAMATION introduites par la refonte :
    ///   ArRef, IsGlobal, CreatedByUserId, CorrectionProposee, CorrectionAppliquee,
    ///   MotifRefus, NoteInterne, TentativesCount, FirstAttemptAt, LastAttemptAt.
    ///
    /// Colonnes F_RECLAMATION retirées par la refonte (legacy chat) :
    ///   LastMessageAt, IsReadByClient, IsReadByStaff.
    /// </summary>
    public partial class RefonteDemandes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ============================================================
            // F_RECLAMATION — ajout des colonnes de la refonte (idempotent)
            // ============================================================

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'ArRef') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [ArRef] nvarchar(19) NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'IsGlobal') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [IsGlobal] bit NOT NULL
        CONSTRAINT [DF_F_RECLAMATION_IsGlobal] DEFAULT (1);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'CreatedByUserId') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [CreatedByUserId] uniqueidentifier NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'CorrectionProposee') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [CorrectionProposee] nvarchar(2000) NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'CorrectionAppliquee') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [CorrectionAppliquee] bit NOT NULL
        CONSTRAINT [DF_F_RECLAMATION_CorrectionAppliquee] DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'MotifRefus') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [MotifRefus] nvarchar(500) NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'NoteInterne') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [NoteInterne] nvarchar(1000) NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'TentativesCount') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [TentativesCount] int NOT NULL
        CONSTRAINT [DF_F_RECLAMATION_TentativesCount] DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'FirstAttemptAt') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [FirstAttemptAt] datetime2 NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'LastAttemptAt') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [LastAttemptAt] datetime2 NULL;
");

            // ============================================================
            // F_RECLAMATION — suppression des colonnes chat legacy (idempotent)
            // ============================================================

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'LastMessageAt') IS NOT NULL
    ALTER TABLE [dbo].[F_RECLAMATION] DROP COLUMN [LastMessageAt];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'IsReadByClient') IS NOT NULL
BEGIN
    DECLARE @dfIsReadClient nvarchar(200) = (
        SELECT dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.F_RECLAMATION')
          AND c.name = 'IsReadByClient'
    );
    IF @dfIsReadClient IS NOT NULL
        EXEC('ALTER TABLE [dbo].[F_RECLAMATION] DROP CONSTRAINT [' + @dfIsReadClient + ']');
    ALTER TABLE [dbo].[F_RECLAMATION] DROP COLUMN [IsReadByClient];
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'IsReadByStaff') IS NOT NULL
BEGIN
    DECLARE @dfIsReadStaff nvarchar(200) = (
        SELECT dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.F_RECLAMATION')
          AND c.name = 'IsReadByStaff'
    );
    IF @dfIsReadStaff IS NOT NULL
        EXEC('ALTER TABLE [dbo].[F_RECLAMATION] DROP CONSTRAINT [' + @dfIsReadStaff + ']');
    ALTER TABLE [dbo].[F_RECLAMATION] DROP COLUMN [IsReadByStaff];
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback non fourni : environnement dev/test, pas de production.
            // Pour revenir en arrière, restaurer le backup DB.
        }
    }
}
