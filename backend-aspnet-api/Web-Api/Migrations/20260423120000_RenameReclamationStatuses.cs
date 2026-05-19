using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Phase 1 V1 : renommage des statuts métier Réclamation/Demande.
    /// RESOLUE  -> CLOTUREE
    /// EN_COURS -> EN_COURS_DE_TRAITEMENT
    /// Les motifs obsolètes ne sont pas touchés (données historiques conservées telles quelles).
    /// </summary>
    public partial class RenameReclamationStatuses : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE F_RECLAMATION SET Statut = 'EN_COURS_DE_TRAITEMENT' WHERE Statut = 'EN_COURS';");

            migrationBuilder.Sql(
                "UPDATE F_RECLAMATION SET Statut = 'CLOTUREE' WHERE Statut = 'RESOLUE';");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE F_RECLAMATION SET Statut = 'RESOLUE' WHERE Statut = 'CLOTUREE';");

            migrationBuilder.Sql(
                "UPDATE F_RECLAMATION SET Statut = 'EN_COURS' WHERE Statut = 'EN_COURS_DE_TRAITEMENT';");
        }
    }
}
