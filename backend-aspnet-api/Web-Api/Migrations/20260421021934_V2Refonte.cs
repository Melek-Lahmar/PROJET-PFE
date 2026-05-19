using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// V2 Échange structuré multi-lignes + colonnes ajoutées en phase 2 de la refonte.
    /// Idempotent : utilise IF COL_LENGTH IS NULL pour pouvoir être appliquée sur une DB
    /// où le schéma a déjà été pushé manuellement (cas de notre environnement test).
    /// </summary>
    public partial class V2Refonte : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // === F_RECLAMATION ===
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'TypeCas') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION] ADD [TypeCas] nvarchar(20) NOT NULL CONSTRAINT [DF_F_RECLAMATION_TypeCas] DEFAULT ('RECLAMATION');
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'EchangeDemandeText') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION] ADD [EchangeDemandeText] nvarchar(500) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'LastClientReplyAt') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION] ADD [LastClientReplyAt] datetime2 NULL;
");

            // === F_DOCENTETE ===
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'AssignedLivreurId') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [AssignedLivreurId] uniqueidentifier NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'TypeCommande') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [TypeCommande] nvarchar(20) NOT NULL CONSTRAINT [DF_F_DOCENTETE_TypeCommande] DEFAULT ('NORMALE');
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'CommandeOriginalePiece') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [CommandeOriginalePiece] nvarchar(13) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'EchangeArticleRetour') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [EchangeArticleRetour] nvarchar(500) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'EchangeArticleLivraison') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [EchangeArticleLivraison] nvarchar(500) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'ReclamationOrigineId') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [ReclamationOrigineId] int NULL;
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_F_DOCENTETE_AssignedLivreurId')
    CREATE INDEX [IX_F_DOCENTETE_AssignedLivreurId] ON [dbo].[F_DOCENTETE] ([AssignedLivreurId]);
");

            // === F_DOCLIGNE — V2 Échange structuré ===
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCLIGNE', 'LigneType') IS NULL
    ALTER TABLE [dbo].[F_DOCLIGNE] ADD [LigneType] nvarchar(20) NOT NULL CONSTRAINT [DF_F_DOCLIGNE_LigneType] DEFAULT ('STANDARD');
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_F_DOCLIGNE_LigneType')
    CREATE INDEX [IX_F_DOCLIGNE_LigneType] ON [dbo].[F_DOCLIGNE] ([LigneType]);
");

            // === F_LIVREUR_ABANDON_LOG ===
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_LIVREUR_ABANDON_LOG', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_LIVREUR_ABANDON_LOG] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [LivreurUserId] uniqueidentifier NOT NULL,
        [CommandePiece] nvarchar(13) NOT NULL,
        [Note] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_F_LIVREUR_ABANDON_LOG] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    CREATE INDEX [IX_F_LIVREUR_ABANDON_LOG_LivreurDate] ON [dbo].[F_LIVREUR_ABANDON_LOG] ([LivreurUserId], [CreatedAt]);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback non fourni (environnement test, pas de production).
        }
    }
}
