using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Phase 2B — Ajout de la colonne DO_TelephoneLivraison sur F_DOCENTETE.
    ///
    /// Objet : permettre à la confirmatrice d'appliquer une correction de numéro
    /// (Demande NUMERO_INCORRECT) sur la commande en cours uniquement, sans
    /// écraser le téléphone global du profil client. La correction se fait
    /// exclusivement sur le snapshot de livraison de la commande.
    ///
    /// Colonne nullable (les commandes existantes n'ont pas forcément de snapshot
    /// téléphone) ; remplie à la demande lors d'une ApplyCorrection.
    ///
    /// Migration idempotente.
    /// </summary>
    public partial class AddDoTelephoneLivraison : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_TelephoneLivraison') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE]
    ADD [DO_TelephoneLivraison] nvarchar(20) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'DO_TelephoneLivraison') IS NOT NULL
    ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [DO_TelephoneLivraison];
");
        }
    }
}
