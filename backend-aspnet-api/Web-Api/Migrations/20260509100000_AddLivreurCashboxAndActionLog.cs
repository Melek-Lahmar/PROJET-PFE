using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Section 1.5 + 1.7.5 du brief PFE 2026-05-09 — Cashbox COD livreur + idempotence.
    ///
    /// Ajoute sur F_LIVRAISON :
    ///   - Encaisse (bit), EncaisseAt, MontantEncaisse (decimal 18,3)
    ///     → trace l'encaissement COD au moment du marquage Livré
    ///   - RemisAuDepot (bit), RemisAuDepotAt
    ///     → trace la remise de la caisse au dépôt en fin de journée
    ///
    /// Crée la table F_LIVREUR_ACTION_LOG :
    ///   - Stocke ClientActionId pour rejeter les replays après retry
    ///     depuis la queue offline Hive (mode dégradé Section 1.7).
    ///
    /// Index :
    ///   - F_LIVRAISON (LivreurId, EncaisseAt, RemisAuDepot) pour /api/livreur/stats
    ///   - F_LIVREUR_ACTION_LOG (ClientActionId UNIQUE)
    ///   - F_LIVREUR_ACTION_LOG (LivreurUserId, ProcessedAt)
    ///
    /// Migration idempotente.
    /// </summary>
    public partial class AddLivreurCashboxAndActionLog : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // F_LIVRAISON — colonnes cashbox
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'Encaisse') IS NULL
    ALTER TABLE [dbo].[F_LIVRAISON]
    ADD [Encaisse] bit NOT NULL CONSTRAINT DF_F_LIVRAISON_Encaisse DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'EncaisseAt') IS NULL
    ALTER TABLE [dbo].[F_LIVRAISON]
    ADD [EncaisseAt] datetime2 NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'MontantEncaisse') IS NULL
    ALTER TABLE [dbo].[F_LIVRAISON]
    ADD [MontantEncaisse] decimal(18,3) NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'RemisAuDepot') IS NULL
    ALTER TABLE [dbo].[F_LIVRAISON]
    ADD [RemisAuDepot] bit NOT NULL CONSTRAINT DF_F_LIVRAISON_RemisAuDepot DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'RemisAuDepotAt') IS NULL
    ALTER TABLE [dbo].[F_LIVRAISON]
    ADD [RemisAuDepotAt] datetime2 NULL;
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_F_LIVRAISON_LivreurId_EncaisseAt_RemisAuDepot'
      AND object_id = OBJECT_ID('dbo.F_LIVRAISON'))
    CREATE INDEX [IX_F_LIVRAISON_LivreurId_EncaisseAt_RemisAuDepot]
    ON [dbo].[F_LIVRAISON] ([LivreurId], [EncaisseAt], [RemisAuDepot]);
");

            // F_LIVREUR_ACTION_LOG — idempotence
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_LIVREUR_ACTION_LOG', 'U') IS NULL
    CREATE TABLE [dbo].[F_LIVREUR_ACTION_LOG] (
        [Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ClientActionId] uniqueidentifier NOT NULL,
        [LivreurUserId] uniqueidentifier NOT NULL,
        [Endpoint] nvarchar(255) NOT NULL,
        [PayloadHash] nvarchar(64) NOT NULL,
        [ProcessedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [HttpResponse] int NOT NULL,
        CONSTRAINT [PK_F_LIVREUR_ACTION_LOG] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_F_LIVREUR_ACTION_LOG_ClientActionId'
      AND object_id = OBJECT_ID('dbo.F_LIVREUR_ACTION_LOG'))
    CREATE UNIQUE INDEX [IX_F_LIVREUR_ACTION_LOG_ClientActionId]
    ON [dbo].[F_LIVREUR_ACTION_LOG] ([ClientActionId]);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_F_LIVREUR_ACTION_LOG_LivreurUserId_ProcessedAt'
      AND object_id = OBJECT_ID('dbo.F_LIVREUR_ACTION_LOG'))
    CREATE INDEX [IX_F_LIVREUR_ACTION_LOG_LivreurUserId_ProcessedAt]
    ON [dbo].[F_LIVREUR_ACTION_LOG] ([LivreurUserId], [ProcessedAt]);
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes
           WHERE name = 'IX_F_LIVREUR_ACTION_LOG_LivreurUserId_ProcessedAt'
             AND object_id = OBJECT_ID('dbo.F_LIVREUR_ACTION_LOG'))
    DROP INDEX [IX_F_LIVREUR_ACTION_LOG_LivreurUserId_ProcessedAt] ON [dbo].[F_LIVREUR_ACTION_LOG];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes
           WHERE name = 'IX_F_LIVREUR_ACTION_LOG_ClientActionId'
             AND object_id = OBJECT_ID('dbo.F_LIVREUR_ACTION_LOG'))
    DROP INDEX [IX_F_LIVREUR_ACTION_LOG_ClientActionId] ON [dbo].[F_LIVREUR_ACTION_LOG];
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_LIVREUR_ACTION_LOG', 'U') IS NOT NULL
    DROP TABLE [dbo].[F_LIVREUR_ACTION_LOG];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes
           WHERE name = 'IX_F_LIVRAISON_LivreurId_EncaisseAt_RemisAuDepot'
             AND object_id = OBJECT_ID('dbo.F_LIVRAISON'))
    DROP INDEX [IX_F_LIVRAISON_LivreurId_EncaisseAt_RemisAuDepot] ON [dbo].[F_LIVRAISON];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'RemisAuDepotAt') IS NOT NULL
    ALTER TABLE [dbo].[F_LIVRAISON] DROP COLUMN [RemisAuDepotAt];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_F_LIVRAISON_RemisAuDepot')
    ALTER TABLE [dbo].[F_LIVRAISON] DROP CONSTRAINT DF_F_LIVRAISON_RemisAuDepot;

IF COL_LENGTH('dbo.F_LIVRAISON', 'RemisAuDepot') IS NOT NULL
    ALTER TABLE [dbo].[F_LIVRAISON] DROP COLUMN [RemisAuDepot];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'MontantEncaisse') IS NOT NULL
    ALTER TABLE [dbo].[F_LIVRAISON] DROP COLUMN [MontantEncaisse];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_LIVRAISON', 'EncaisseAt') IS NOT NULL
    ALTER TABLE [dbo].[F_LIVRAISON] DROP COLUMN [EncaisseAt];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_F_LIVRAISON_Encaisse')
    ALTER TABLE [dbo].[F_LIVRAISON] DROP CONSTRAINT DF_F_LIVRAISON_Encaisse;

IF COL_LENGTH('dbo.F_LIVRAISON', 'Encaisse') IS NOT NULL
    ALTER TABLE [dbo].[F_LIVRAISON] DROP COLUMN [Encaisse];
");
        }
    }
}
