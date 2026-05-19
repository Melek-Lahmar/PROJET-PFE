using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class MergeKonnectVendeur : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_ClientMode') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_ClientMode] nvarchar(12) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_ClientUserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_ClientUserId] uniqueidentifier NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerAdresse') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerAdresse] nvarchar(300) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerAdresseComplementaire') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerAdresseComplementaire] nvarchar(300) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerCIN') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerCIN] nvarchar(20) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerCodePostal') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerCodePostal] nvarchar(20) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerDelegation') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerDelegation] nvarchar(100) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerGouvernorat') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerGouvernorat] nvarchar(50) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerMatriculeFiscal') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerMatriculeFiscal] nvarchar(50) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerNomComplet') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerNomComplet] nvarchar(150) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerNomSociete') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerNomSociete] nvarchar(200) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerNumeroTVA') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerNumeroTVA] nvarchar(50) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerRegistreCommerce') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerRegistreCommerce] nvarchar(50) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerTelephone') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerTelephone] nvarchar(30) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_PassagerTypeClient') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_PassagerTypeClient] nvarchar(10) NULL;
END

IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_VendeurUserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_VendeurUserId] uniqueidentifier NULL;
END

IF COL_LENGTH('dbo.B_PAIEMENT', 'PA_Fournisseur') IS NULL
BEGIN
    ALTER TABLE [dbo].[B_PAIEMENT] ADD [PA_Fournisseur] nvarchar(20) NULL;
END

IF COL_LENGTH('dbo.B_PAIEMENT', 'PA_IsSandbox') IS NULL
BEGIN
    ALTER TABLE [dbo].[B_PAIEMENT] ADD [PA_IsSandbox] bit NOT NULL DEFAULT CAST(0 AS bit);
END

IF COL_LENGTH('dbo.B_PAIEMENT', 'PA_ProviderPaymentId') IS NULL
BEGIN
    ALTER TABLE [dbo].[B_PAIEMENT] ADD [PA_ProviderPaymentId] nvarchar(50) NULL;
END

IF COL_LENGTH('dbo.B_PAIEMENT', 'PA_StatutExterne') IS NULL
BEGIN
    ALTER TABLE [dbo].[B_PAIEMENT] ADD [PA_StatutExterne] nvarchar(30) NULL;
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_B_PAIEMENT_DO_Piece_cbMarq'
    AND object_id = OBJECT_ID('dbo.B_PAIEMENT')
)
BEGIN
    EXEC(N'CREATE INDEX [IX_B_PAIEMENT_DO_Piece_cbMarq] ON [dbo].[B_PAIEMENT] ([DO_Piece], [cbMarq]);');
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_B_PAIEMENT_PA_ProviderPaymentId'
    AND object_id = OBJECT_ID('dbo.B_PAIEMENT')
)
BEGIN
    EXEC(N'CREATE INDEX [IX_B_PAIEMENT_PA_ProviderPaymentId] ON [dbo].[B_PAIEMENT] ([PA_ProviderPaymentId]) WHERE [PA_ProviderPaymentId] IS NOT NULL;');
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_B_PAIEMENT_PA_Reference'
    AND object_id = OBJECT_ID('dbo.B_PAIEMENT')
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_B_PAIEMENT_PA_Reference] ON [dbo].[B_PAIEMENT] ([PA_Reference]) WHERE [PA_Reference] IS NOT NULL;');
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_B_PAIEMENT_PA_Statut'
    AND object_id = OBJECT_ID('dbo.B_PAIEMENT')
)
BEGIN
    EXEC(N'CREATE INDEX [IX_B_PAIEMENT_PA_Statut] ON [dbo].[B_PAIEMENT] ([PA_Statut]);');
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            /*
             * Migration sécurisée.
             *
             * On ne supprime pas automatiquement les colonnes ni les index ici,
             * car cette migration est utilisée pour synchroniser une base déjà
             * partiellement modifiée avec l'historique EF Core.
             *
             * Supprimer ces colonnes automatiquement pourrait casser des données
             * existantes dans F_DOCENTETE ou B_PAIEMENT.
             */
        }
    }
}