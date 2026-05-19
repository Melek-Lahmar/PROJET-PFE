using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Phase 2A — Ajout de la colonne VisibleClient sur F_RECLAMATION.
    ///
    /// Objet : distinguer les Demandes livreur visibles dans l'espace client
    /// (motifs A : ADRESSE_INCORRECTE, NUMERO_INCORRECT) des Demandes livreur
    /// qui remontent directement à la confirmatrice (motifs B : CLIENT_REFUSE,
    /// AUTRE ; motifs C après 3 tentatives : TELEPHONE_ETEINT, CLIENT_INJOIGNABLE,
    /// CLIENT_ABSENT).
    ///
    /// Par défaut : 0 (non visible client). Valeur mise à true à la création d'une
    /// Demande motif A dans ReclamationsService.CreateLivreurDemandeAsync.
    ///
    /// Migration idempotente (COL_LENGTH IS NULL) pour s'appliquer proprement
    /// sur toute DB existante.
    /// </summary>
    public partial class AddVisibleClientColumn : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'VisibleClient') IS NULL
    ALTER TABLE [dbo].[F_RECLAMATION]
    ADD [VisibleClient] bit NOT NULL
        CONSTRAINT [DF_F_RECLAMATION_VisibleClient] DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_F_RECLAMATION_VisibleClient'
      AND object_id = OBJECT_ID('dbo.F_RECLAMATION'))
    CREATE INDEX [IX_F_RECLAMATION_VisibleClient]
    ON [dbo].[F_RECLAMATION] ([VisibleClient]);
");

            // Aligner les lignes existantes :
            // - Toutes les Demandes livreur avec motif A (adresse/numéro incorrect)
            //   doivent passer à VisibleClient = 1 pour rester cohérentes avec la nouvelle règle.
            migrationBuilder.Sql(@"
UPDATE dbo.F_RECLAMATION
SET VisibleClient = 1
WHERE Source = 'LIVREUR'
  AND Motif IN ('ADRESSE_INCORRECTE', 'NUMERO_INCORRECT')
  AND VisibleClient = 0;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_F_RECLAMATION_VisibleClient'
      AND object_id = OBJECT_ID('dbo.F_RECLAMATION'))
    DROP INDEX [IX_F_RECLAMATION_VisibleClient] ON [dbo].[F_RECLAMATION];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_RECLAMATION', 'VisibleClient') IS NOT NULL
BEGIN
    IF OBJECT_ID('dbo.DF_F_RECLAMATION_VisibleClient', 'D') IS NOT NULL
        ALTER TABLE [dbo].[F_RECLAMATION] DROP CONSTRAINT [DF_F_RECLAMATION_VisibleClient];
    ALTER TABLE [dbo].[F_RECLAMATION] DROP COLUMN [VisibleClient];
END
");
        }
    }
}
