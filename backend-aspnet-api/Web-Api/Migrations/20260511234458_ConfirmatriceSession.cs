using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// A.2 — Crée la table F_CONFIRMATRICE_SESSION (trace work/pause).
    /// L'AlterColumn auto-généré sur F_APP_CONFIG.Id (DROP IDENTITY) a été
    /// retiré : impossible sur SQL Server sans recréer la table et le seed
    /// SeedAppConfigAsync (commit 1.B) résout déjà le bug 4xx thème.
    /// Migration rendue idempotente via IF NOT EXISTS pour pouvoir tourner
    /// sur une DB déjà partiellement migrée.
    /// </summary>
    public partial class ConfirmatriceSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CONFIRMATRICE_SESSION', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_CONFIRMATRICE_SESSION] (
        [Id] bigint IDENTITY(1,1) NOT NULL,
        [ConfirmatriceId] uniqueidentifier NOT NULL,
        [StartedAt] datetime2 NOT NULL,
        [EndedAt] datetime2 NULL,
        [EndReason] nvarchar(20) NULL,
        CONSTRAINT [PK_F_CONFIRMATRICE_SESSION] PRIMARY KEY ([Id])
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ConfirmatriceSession_User_Start'
                 AND object_id = OBJECT_ID('dbo.F_CONFIRMATRICE_SESSION'))
    CREATE INDEX [IX_ConfirmatriceSession_User_Start]
        ON [dbo].[F_CONFIRMATRICE_SESSION] ([ConfirmatriceId], [StartedAt]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ConfirmatriceSession_EndedAt'
                 AND object_id = OBJECT_ID('dbo.F_CONFIRMATRICE_SESSION'))
    CREATE INDEX [IX_ConfirmatriceSession_EndedAt]
        ON [dbo].[F_CONFIRMATRICE_SESSION] ([EndedAt]);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "IF OBJECT_ID('dbo.F_CONFIRMATRICE_SESSION', 'U') IS NOT NULL DROP TABLE [dbo].[F_CONFIRMATRICE_SESSION];");
        }
    }
}
