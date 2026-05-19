using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Phase 6 — Ajout de DO_RepereLivraison (nvarchar 200) et DO_InstructionsLivraison
    /// (nvarchar 500) sur F_DOCENTETE. Ces champs sont renseignés via la correction
    /// d'adresse (Demande A ou Réclamation CHANGEMENT_ADRESSE) et utilisés par le livreur.
    /// Migration idempotente.
    /// </summary>
    public partial class AddDeliveryRepereInstructions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_RepereLivraison') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_RepereLivraison] nvarchar(200) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_InstructionsLivraison') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_InstructionsLivraison] nvarchar(500) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_InstructionsLivraison') IS NOT NULL
    ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [DO_InstructionsLivraison];
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_RepereLivraison') IS NOT NULL
    ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [DO_RepereLivraison];
");
        }
    }
}
