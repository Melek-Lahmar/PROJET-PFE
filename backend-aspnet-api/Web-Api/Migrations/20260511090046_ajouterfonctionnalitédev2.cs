using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Réconciliation EF model ↔ DB pour les objets créés précédemment via
    /// les handwritten migrations SQL-only (qui ne mettaient pas à jour
    /// le ModelSnapshot). Toutes les opérations sont idempotentes : sur une
    /// base déjà migrée elles sont skippées en silence ; sur une base neuve
    /// elles créent les objets normalement.
    ///
    /// Couvre :
    ///  - F_LIVRAISON.DepotPassageNumber + IX_F_LIVRAISON_DepotPassage
    ///  - F_DOCENTETE.IsActiveDelivery + IX_F_DOCENTETE_ActiveDelivery
    ///  - Tables F_CLIENT_DEVICE_TOKEN / F_LIVRAISON_HISTORIQUE / F_LIVREUR_POSITION_HISTORY
    ///  - Index associés (IX_F_CLIENT_DEVICE_TOKEN_*, IX_F_LIVRAISON_HISTORIQUE_*,
    ///    IX_LivreurPosHistory*)
    /// </summary>
    public partial class ajouterfonctionnalitédev2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ----- F_LIVRAISON.DepotPassageNumber -----
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'DepotPassageNumber') IS NULL
    ALTER TABLE [dbo].[F_LIVRAISON]
    ADD [DepotPassageNumber] int NOT NULL CONSTRAINT DF_F_LIVRAISON_DepotPassageNumber DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_F_LIVRAISON_DepotPassage'
                 AND object_id = OBJECT_ID('dbo.F_LIVRAISON'))
    CREATE INDEX [IX_F_LIVRAISON_DepotPassage]
    ON [dbo].[F_LIVRAISON] ([LI_Statut], [DepotPassageNumber])
    INCLUDE ([DO_Piece], [LivreurId]);
");

            // ----- F_DOCENTETE.IsActiveDelivery -----
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'IsActiveDelivery') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE]
    ADD [IsActiveDelivery] bit NOT NULL CONSTRAINT DF_F_DOCENTETE_IsActiveDelivery DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_F_DOCENTETE_ActiveDelivery'
                 AND object_id = OBJECT_ID('dbo.F_DOCENTETE'))
    CREATE INDEX [IX_F_DOCENTETE_ActiveDelivery]
    ON [dbo].[F_DOCENTETE] ([IsActiveDelivery], [AssignedLivreurId]);
");

            // ----- F_CLIENT_DEVICE_TOKEN -----
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CLIENT_DEVICE_TOKEN', 'U') IS NULL
    CREATE TABLE [dbo].[F_CLIENT_DEVICE_TOKEN] (
        [Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [UserId] uniqueidentifier NOT NULL,
        [Token] nvarchar(500) NOT NULL,
        [Platform] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [LastSeenAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_F_CLIENT_DEVICE_TOKEN] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_F_CLIENT_DEVICE_TOKEN_Token'
                 AND object_id = OBJECT_ID('dbo.F_CLIENT_DEVICE_TOKEN'))
    CREATE UNIQUE INDEX [IX_F_CLIENT_DEVICE_TOKEN_Token]
    ON [dbo].[F_CLIENT_DEVICE_TOKEN] ([Token]);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name IN ('IX_F_CLIENT_DEVICE_TOKEN_User', 'IX_F_CLIENT_DEVICE_TOKEN_UserId')
                 AND object_id = OBJECT_ID('dbo.F_CLIENT_DEVICE_TOKEN'))
    CREATE INDEX [IX_F_CLIENT_DEVICE_TOKEN_UserId]
    ON [dbo].[F_CLIENT_DEVICE_TOKEN] ([UserId]);
");

            // ----- F_LIVRAISON_HISTORIQUE -----
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_LIVRAISON_HISTORIQUE', 'U') IS NULL
    CREATE TABLE [dbo].[F_LIVRAISON_HISTORIQUE] (
        [Id] bigint IDENTITY(1,1) NOT NULL,
        [DoPiece] nvarchar(13) NOT NULL,
        [LivreurUserId] uniqueidentifier NULL,
        [LivreurProfileId] int NULL,
        [Type] nvarchar(30) NOT NULL,
        [Motif] nvarchar(50) NULL,
        [Note] nvarchar(500) NULL,
        [PhotoUrl] nvarchar(500) NULL,
        [Latitude] decimal(9,6) NULL,
        [Longitude] decimal(9,6) NULL,
        [DepotPassageNumber] int NULL,
        [Montant] decimal(18,3) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_F_LIVRAISON_HISTORIQUE] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name IN ('IX_F_LIVRAISON_HISTORIQUE_Piece_Created', 'IX_F_LIVRAISON_HISTORIQUE_DoPiece_CreatedAt')
                 AND object_id = OBJECT_ID('dbo.F_LIVRAISON_HISTORIQUE'))
    CREATE INDEX [IX_F_LIVRAISON_HISTORIQUE_DoPiece_CreatedAt]
    ON [dbo].[F_LIVRAISON_HISTORIQUE] ([DoPiece], [CreatedAt]);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name IN ('IX_F_LIVRAISON_HISTORIQUE_Livreur_Created', 'IX_F_LIVRAISON_HISTORIQUE_LivreurUserId_CreatedAt')
                 AND object_id = OBJECT_ID('dbo.F_LIVRAISON_HISTORIQUE'))
    CREATE INDEX [IX_F_LIVRAISON_HISTORIQUE_LivreurUserId_CreatedAt]
    ON [dbo].[F_LIVRAISON_HISTORIQUE] ([LivreurUserId], [CreatedAt]);
");

            // ----- F_LIVREUR_POSITION_HISTORY -----
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_LIVREUR_POSITION_HISTORY', 'U') IS NULL
    CREATE TABLE [dbo].[F_LIVREUR_POSITION_HISTORY] (
        [Id] bigint IDENTITY(1,1) NOT NULL,
        [LivreurId] uniqueidentifier NOT NULL,
        [Lat] decimal(10,7) NOT NULL,
        [Lng] decimal(10,7) NOT NULL,
        [Accuracy] decimal(8,2) NULL,
        [CapturedAt] datetime2 NOT NULL,
        [ReceivedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [ClientActionId] uniqueidentifier NULL,
        CONSTRAINT [PK_F_LIVREUR_POSITION_HISTORY] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_LivreurPosHistory'
                 AND object_id = OBJECT_ID('dbo.F_LIVREUR_POSITION_HISTORY'))
    CREATE INDEX [IX_LivreurPosHistory]
    ON [dbo].[F_LIVREUR_POSITION_HISTORY] ([LivreurId], [CapturedAt]);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name IN ('IX_LivreurPosHistory_ActionId', 'IX_F_LIVREUR_POSITION_HISTORY_ClientActionId')
                 AND object_id = OBJECT_ID('dbo.F_LIVREUR_POSITION_HISTORY'))
    CREATE UNIQUE INDEX [IX_F_LIVREUR_POSITION_HISTORY_ClientActionId]
    ON [dbo].[F_LIVREUR_POSITION_HISTORY] ([ClientActionId])
    WHERE [ClientActionId] IS NOT NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_CLIENT_DEVICE_TOKEN', 'U') IS NOT NULL DROP TABLE [dbo].[F_CLIENT_DEVICE_TOKEN];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_LIVRAISON_HISTORIQUE', 'U') IS NOT NULL DROP TABLE [dbo].[F_LIVRAISON_HISTORIQUE];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_LIVREUR_POSITION_HISTORY', 'U') IS NOT NULL DROP TABLE [dbo].[F_LIVREUR_POSITION_HISTORY];");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_LIVRAISON_DepotPassage' AND object_id = OBJECT_ID('dbo.F_LIVRAISON'))
    DROP INDEX [IX_F_LIVRAISON_DepotPassage] ON [dbo].[F_LIVRAISON];
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_F_LIVRAISON_DepotPassageNumber')
    ALTER TABLE [dbo].[F_LIVRAISON] DROP CONSTRAINT DF_F_LIVRAISON_DepotPassageNumber;
IF COL_LENGTH('dbo.F_LIVRAISON', 'DepotPassageNumber') IS NOT NULL
    ALTER TABLE [dbo].[F_LIVRAISON] DROP COLUMN [DepotPassageNumber];

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_DOCENTETE_ActiveDelivery' AND object_id = OBJECT_ID('dbo.F_DOCENTETE'))
    DROP INDEX [IX_F_DOCENTETE_ActiveDelivery] ON [dbo].[F_DOCENTETE];
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_F_DOCENTETE_IsActiveDelivery')
    ALTER TABLE [dbo].[F_DOCENTETE] DROP CONSTRAINT DF_F_DOCENTETE_IsActiveDelivery;
IF COL_LENGTH('dbo.F_DOCENTETE', 'IsActiveDelivery') IS NOT NULL
    ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [IsActiveDelivery];
");
        }
    }
}
